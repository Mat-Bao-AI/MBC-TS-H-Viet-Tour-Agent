"""telegram_webhook.py — Telegram tự gọi vào endpoint này khi bot có tin nhắn
mới (sau khi đăng ký qua POST /api/v1/telegram/setup). Router RIÊNG, KHÔNG
mount qua api_router (Telegram không gửi được JWT) — xác thực bằng
header X-Telegram-Bot-Api-Secret-Token thay thế (Telegram tự đính kèm đúng
secret đã đăng ký lúc setWebhook, xem telegram_service.set_webhook).

Luồng: khách bấm deep-link t.me/<bot>?start=<guest_id> (HDV lấy link này từ
GET /api/v1/telegram/info + guest_id, xem Phase 4 UI) -> Telegram tự gửi
"/start <guest_id>" tới bot -> webhook ghi guest.telegram_chat_id."""

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.guest import Guest
from app.services import telegram_service
from app.services.telegram_service import TelegramServiceError

router = APIRouter(prefix="/telegram", tags=["telegram-webhook"])


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict:
    settings = get_settings()
    if not settings.telegram_configured or x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
        raise HTTPException(status_code=401, detail="Sai hoặc thiếu secret token")

    update = await request.json()
    message = update.get("message") or {}
    text = (message.get("text") or "").strip()
    chat_id = message.get("chat", {}).get("id")

    # Bỏ qua mọi update không phải "/start <guest_id>" (tin nhắn thường, sticker,
    # edited_message...) — trả 200 để Telegram không retry vô ích.
    if chat_id is None or not text.startswith("/start"):
        return {"ok": True}

    parts = text.split(maxsplit=1)
    guest_id = parts[1].strip() if len(parts) > 1 else None
    if not guest_id:
        return {"ok": True}

    guest = await db.get(Guest, guest_id)
    if guest is None:
        # Mã khách không hợp lệ/tour đã xoá — im lặng bỏ qua, không tiết lộ
        # thông tin gì cho người gửi (có thể không phải khách thật).
        return {"ok": True}

    guest.telegram_chat_id = str(chat_id)
    await db.commit()

    try:
        await telegram_service.send_message(
            str(chat_id),
            f"Xin chào {guest.full_name}! Bạn đã kết nối thành công — "
            "mọi thông báo lịch trình tour sẽ được gửi tại đây.",
        )
    except TelegramServiceError:
        # Kết nối (telegram_chat_id) đã lưu thành công dù tin xác nhận lỗi —
        # không raise để tránh Telegram hiểu nhầm là webhook lỗi rồi retry.
        pass

    return {"ok": True}
