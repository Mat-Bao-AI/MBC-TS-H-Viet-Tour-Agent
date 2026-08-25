#!/usr/bin/env bash
# scripts/app.sh — start / stop / restart toàn bộ stack (docker compose)
#
# Dùng:
#   scripts/app.sh start     build lại nếu code đổi + khởi động toàn bộ service
#   scripts/app.sh stop      dừng + gỡ container (docker compose down)
#   scripts/app.sh restart   khởi động lại container ĐANG CHẠY, KHÔNG rebuild
#                            (vừa sửa code thì dùng "start", không dùng cái này)
#   scripts/app.sh status    xem trạng thái container hiện tại

set -euo pipefail

# Luôn chạy từ thư mục gốc project (chứa docker-compose.yml), bất kể gọi từ đâu
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$(dirname -- "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

ENV_FILE="$PROJECT_ROOT/.env"
FRONTEND_PORT="3000"
BACKEND_PORT="8000"
if [ -f "$ENV_FILE" ]; then
  FRONTEND_PORT="$(grep -E '^FRONTEND_PORT=' "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"
  BACKEND_PORT="$(grep -E '^BACKEND_PORT=' "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"
  FRONTEND_PORT="${FRONTEND_PORT:-3000}"
  BACKEND_PORT="${BACKEND_PORT:-8000}"
fi

print_urls() {
  echo
  echo "  Giao diện HDV:     http://localhost:${FRONTEND_PORT}"
  echo "  Backend API docs:  http://localhost:${BACKEND_PORT}/docs"
  echo
}

usage() {
  echo "Dùng: $0 {start|stop|restart|status}"
  exit 1
}

cmd="${1:-}"

case "$cmd" in
  start)
    echo "▶ Đang build + khởi động..."
    docker compose up -d --build
    echo "✓ Đã khởi động."
    print_urls
    ;;
  stop)
    echo "▶ Đang dừng..."
    docker compose down
    echo "✓ Đã dừng toàn bộ service."
    ;;
  restart)
    echo "▶ Đang restart container đang chạy (không rebuild — dùng 'start' nếu vừa sửa code)..."
    docker compose restart
    echo "✓ Đã restart."
    print_urls
    ;;
  status)
    docker compose ps
    print_urls
    ;;
  *)
    usage
    ;;
esac
