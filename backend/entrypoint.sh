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
case "$SERVICE_ROLE" in
  worker)
    exec celery -A app.tasks.celery_worker worker --loglevel=info
    ;;
  web)
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
    ;;
  *)
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --reload
    ;;
esac
