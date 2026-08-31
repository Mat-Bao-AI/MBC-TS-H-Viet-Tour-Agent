"""telegram.py — thông tin Bot + đăng ký webhook (HDV dùng, cần đăng nhập JWT
như mọi router khác trong api/v1 — khác app/api/v1/telegram_webhook.py, nơi
Telegram tự gọi vào và KHÔNG gửi được JWT)."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core import dynamic_config
from app.services import telegram_service
from app.services.telegram_service import TelegramServiceError

router = APIRouter(prefix="/telegram", tags=["telegram"])


class TelegramInfo(BaseModel):
    configured: bool
    bot_username: str | None = None


class SetupWebhookRequest(BaseModel):
    base_url: str  # domain HTTPS thật sau khi deploy, vd https://tour.ts.dev.matbao.ai


class SetupWebhookResponse(BaseModel):
    webhook_url: str


@router.get("/info", response_model=TelegramInfo)
async def get_telegram_info() -> TelegramInfo:
    """FE dùng để dựng deep-link mời khách (t.me/<bot_username>?start=<guest_id>)
    và biết có nên hiện tuỳ chọn kênh Telegram hay không."""
    if not await dynamic_config.is_telegram_configured():
        return TelegramInfo(configured=False)
    try:
        username = await telegram_service.get_bot_username()
    except TelegramServiceError as exc:
        raise HTTPException(status_code=502, detail=f"Telegram lỗi: {exc}") from exc
    return TelegramInfo(configured=True, bot_username=username)


@router.post("/setup", response_model=SetupWebhookResponse)
async def setup_telegram_webhook(payload: SetupWebhookRequest) -> SetupWebhookResponse:
    """Gọi 1 LẦN sau khi deploy có domain HTTPS thật — đăng ký webhook để
    Telegram báo về khi khách bấm Start với bot. Xem .env.example."""
    try:
        result = await telegram_service.set_webhook(payload.base_url)
    except TelegramServiceError as exc:
        raise HTTPException(status_code=502, detail=f"Telegram lỗi đăng ký webhook: {exc}") from exc
    return SetupWebhookResponse(webhook_url=result["webhook_url"])
