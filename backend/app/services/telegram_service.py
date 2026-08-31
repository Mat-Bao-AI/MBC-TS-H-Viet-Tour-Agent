"""telegram_service — gọi thẳng Telegram Bot API (chính thức, có tài liệu rõ
ràng: https://core.telegram.org/bots/api) — KHÔNG cần service bridge riêng
như Zalo (zca-js là API không chính thức, Telegram Bot API thì ngược lại).

Có 2 biến thể giống zalo_service.py: async (FastAPI endpoints — webhook, info,
setup) và sync (Celery task — app/tasks/celery_worker.py qua
notification/telegram_sender.py).

Token/secret đọc qua app/core/dynamic_config.py (ưu tiên Admin đã nhập qua
UI, fallback .env) — KHÔNG đọc thẳng get_settings() nữa.
"""

import httpx

from app.core import dynamic_config

_API_BASE = "https://api.telegram.org"


class TelegramServiceError(RuntimeError):
    """Lỗi gọi Telegram Bot API (chưa cấu hình token, token sai, chat_id
    không hợp lệ, khách đã chặn bot...)."""


_NOT_CONFIGURED_MSG = (
    "Chưa cấu hình Telegram (Bot Token/Webhook Secret) — nhập qua UI Admin "
    "(Cài đặt hệ thống) hoặc TELEGRAM_BOT_TOKEN/TELEGRAM_WEBHOOK_SECRET trong .env. "
    "Tạo bot qua @BotFather trước, xem .env.example."
)


async def _require_token() -> str:
    if not await dynamic_config.is_telegram_configured():
        raise TelegramServiceError(_NOT_CONFIGURED_MSG)
    return await dynamic_config.get_telegram_bot_token()


def _require_token_sync() -> str:
    if not dynamic_config.is_telegram_configured_sync():
        raise TelegramServiceError(_NOT_CONFIGURED_MSG)
    return dynamic_config.get_telegram_bot_token_sync()


def _raise_for_telegram_error(data: dict) -> None:
    if not data.get("ok"):
        raise TelegramServiceError(data.get("description", "Telegram API lỗi không rõ nguyên nhân"))


# ---- Async (dùng trong FastAPI endpoints) ----------------------------------


async def get_bot_username() -> str | None:
    """None nếu chưa cấu hình token — để FE/endpoint info tự biết mà không
    phải bắt exception cho trường hợp bình thường (chưa setup)."""
    if not await dynamic_config.is_telegram_configured():
        return None
    token = await _require_token()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{_API_BASE}/bot{token}/getMe")
    data = response.json()
    _raise_for_telegram_error(data)
    return data["result"]["username"]


async def set_webhook(base_url: str) -> dict:
    token = await _require_token()
    webhook_url = f"{base_url.rstrip('/')}/api/v1/telegram/webhook"
    secret = await dynamic_config.get_telegram_webhook_secret()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{_API_BASE}/bot{token}/setWebhook",
            json={"url": webhook_url, "secret_token": secret},
        )
    data = response.json()
    _raise_for_telegram_error(data)
    return {"webhook_url": webhook_url, "telegram_response": data}


async def send_message(chat_id: str, text: str) -> None:
    token = await _require_token()
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(f"{_API_BASE}/bot{token}/sendMessage", json={"chat_id": chat_id, "text": text})
    data = response.json()
    _raise_for_telegram_error(data)


# ---- Sync (dùng trong Celery task qua notification/telegram_sender.py) ----


def send_message_sync(chat_id: str, text: str) -> None:
    token = _require_token_sync()
    with httpx.Client(timeout=20) as client:
        response = client.post(f"{_API_BASE}/bot{token}/sendMessage", json={"chat_id": chat_id, "text": text})
    data = response.json()
    _raise_for_telegram_error(data)
