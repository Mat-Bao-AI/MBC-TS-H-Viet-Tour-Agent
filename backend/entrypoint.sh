#!/bin/sh
set -e

# SERVICE_ROLE cho phép deploy backend + celery worker từ CÙNG 1 image (cùng
# Dockerfile) — cần thiết cho nền tảng chỉ build 1 Dockerfile/subdir và không
# đọc docker-compose.yml (không có chỗ override `command:` như compose làm).
#
#   web    -> deploy Vibe Host (production, không --reload, đọc PORT do nền
#             tảng tiêm vào, giống lesson từ Legal_AI_Platform)
#   worker -> deploy Vibe Host cho Celery worker, dùng lại đúng image này
#   (trống) -> mặc định giữ NGUYÊN hành vi cũ (uvicorn --reload) cho docker
#             compose local — không có SERVICE_ROLE nào set ở đó nên không ảnh
#             hưởng luồng dev hiện tại.
# Deploy thật lên Vibe Host (2026-09-16): managed MySQL do nền tảng tự tạo
# LUÔN rỗng — không ai chạy `alembic upgrade head` giúp cả (khác local dev,
# nơi DB đã tồn tại từ trước hoặc dev tự chạy tay). Thiếu bước này thì mọi
# query đầu tiên (kể cả /health) crash "Table '...' doesn't exist" ngay lúc
# khởi động. Chạy ở CẢ web lẫn worker vì không đảm bảo thứ tự 2 project nào
# lên trước trên Vibe Host (deploy riêng, không có depends_on như compose);
# alembic tự an toàn khi 2 tiến trình cùng upgrade một DATABASE_URL.
case "$SERVICE_ROLE" in
  worker)
    alembic upgrade head
    exec celery -A app.tasks.celery_worker worker --loglevel=info
    ;;
  web)
    alembic upgrade head
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
    ;;
  *)
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --reload
    ;;
esac
