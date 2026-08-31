"""telegram_service — gọi thẳng Telegram Bot API (chính thức, có tài liệu rõ
ràng: https://core.telegram.org/bots/api) — KHÔNG cần service bridge riêng
như Zalo (zca-js là API không chính thức, Telegram Bot API thì ngược lại).

Có 2 biến thể giống zalo_service.py: async (FastAPI endpoints — webhook, info,
setup) và sync (Celery task — app/tasks/celery_worker.py qua
notification/telegram_sender.py).
"""

import httpx

from app.core.config import get_settings

_API_BASE = "https://api.telegram.org"


class TelegramServiceError(RuntimeError):
    """Lỗi gọi Telegram Bot API (chưa cấu hình token, token sai, chat_id
    không hợp lệ, khách đã chặn bot...)."""


def _require_token() -> str:
    token = get_settings().telegram_bot_token
    if not get_settings().telegram_configured:
        raise TelegramServiceError(
            "Chưa cấu hình Telegram (TELEGRAM_BOT_TOKEN/TELEGRAM_WEBHOOK_SECRET trong .env) — "
            "tạo bot qua @BotFather trước, xem .env.example."
        )
    return token


def _raise_for_telegram_error(data: dict) -> None:
    if not data.get("ok"):
        raise TelegramServiceError(data.get("description", "Telegram API lỗi không rõ nguyên nhân"))


# ---- Async (dùng trong FastAPI endpoints) ----------------------------------


async def get_bot_username() -> str | None:
    """None nếu chưa cấu hình token — để FE/endpoint info tự biết mà không
    phải bắt exception cho trường hợp bình thường (chưa setup)."""
    if not get_settings().telegram_configured:
        return None
    token = _require_token()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{_API_BASE}/bot{token}/getMe")
    data = response.json()
    _raise_for_telegram_error(data)
    return data["result"]["username"]


async def set_webhook(base_url: str) -> dict:
    token = _require_token()
    webhook_url = f"{base_url.rstrip('/')}/api/v1/telegram/webhook"
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{_API_BASE}/bot{token}/setWebhook",
            json={"url": webhook_url, "secret_token": get_settings().telegram_webhook_secret},
        )
    data = response.json()
    _raise_for_telegram_error(data)
    return {"webhook_url": webhook_url, "telegram_response": data}


async def send_message(chat_id: str, text: str) -> None:
    token = _require_token()
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(f"{_API_BASE}/bot{token}/sendMessage", json={"chat_id": chat_id, "text": text})
    data = response.json()
    _raise_for_telegram_error(data)


# ---- Sync (dùng trong Celery task qua notification/telegram_sender.py) ----


def send_message_sync(chat_id: str, text: str) -> None:
    token = _require_token()
    with httpx.Client(timeout=20) as client:
        response = client.post(f"{_API_BASE}/bot{token}/sendMessage", json={"chat_id": chat_id, "text": text})
    data = response.json()
    _raise_for_telegram_error(data)
