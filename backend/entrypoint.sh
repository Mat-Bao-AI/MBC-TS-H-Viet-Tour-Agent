#!/bin/bash
set -e

# SERVICE_ROLE cho phép deploy backend từ CÙNG 1 image (cùng Dockerfile) — cần
# thiết cho nền tảng chỉ build 1 Dockerfile/subdir và không đọc
# docker-compose.yml (không có chỗ override `command:` như compose làm).
#
#   web    -> deploy Vibe Host: chạy CẢ uvicorn LẪN celery worker trong CÙNG 1
#             container (xem lý do dưới). Không --reload, đọc PORT do nền
#             tảng tiêm vào, giống lesson từ Legal_AI_Platform.
#   worker -> giữ lại cho nền tảng/kịch bản KHÁC có hỗ trợ nhiều docker cùng
#             nối 1 managed DB (Vibe Host hiện KHÔNG hỗ trợ — xem dưới).
#   (trống) -> mặc định giữ NGUYÊN hành vi cũ (uvicorn --reload) cho docker
#             compose local — không có SERVICE_ROLE nào set ở đó nên không ảnh
#             hưởng luồng dev hiện tại.
#
# Deploy thật lên Vibe Host (2026-09-16): managed MySQL do nền tảng tự tạo
# LUÔN rỗng — không ai chạy `alembic upgrade head` giúp cả (khác local dev,
# nơi DB đã tồn tại từ trước hoặc dev tự chạy tay). Thiếu bước này thì mọi
# query đầu tiên (kể cả /health) crash "Table '...' doesn't exist" ngay lúc
# khởi động.
#
# web CHẠY CHUNG celery worker trong cùng container (thay vì tách project
# riêng như "worker" bên dưới) vì lý do nền tảng, không phải lý do kỹ thuật:
# Vibe Host chỉ cho 1 database managed nối vào ĐÚNG 1 docker — celery worker
# tách project riêng sẽ tự được cấp 1 MySQL+Redis MỚI, RỖNG, khác hẳn DB
# backend đang dùng (đã xác nhận thật qua UI Vibe Host). Gộp chung container
# là cách duy nhất để cả 2 tiến trình cùng thấy đúng 1 DATABASE_URL/REDIS_URL.
run_web_and_worker() {
  alembic upgrade head

  # concurrency=2: container chỉ có 512MB, mặc định celery tự dò theo số CPU
  # host thật (đo được 12 lúc test local) — quá nặng khi phải chia RAM với
  # uvicorn trong cùng container.
  celery -A app.tasks.celery_worker worker --loglevel=info --concurrency=2 &
  CELERY_PID=$!

  uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" &
  UVICORN_PID=$!

  # wait -n: tiến trình nào chết trước cũng khiến script thoát theo — để
  # container restart qua health-check của Vibe Host thay vì worker chết âm
  # thầm mà uvicorn vẫn "khoẻ" (health check không biết celery đã chết).
  wait -n "$CELERY_PID" "$UVICORN_PID"
  EXIT_CODE=$?
  kill "$CELERY_PID" "$UVICORN_PID" 2>/dev/null || true
  exit "$EXIT_CODE"
}

case "$SERVICE_ROLE" in
  worker)
    alembic upgrade head
    exec celery -A app.tasks.celery_worker worker --loglevel=info
    ;;
  web)
    run_web_and_worker
    ;;
  *)
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --reload
    ;;
esac
