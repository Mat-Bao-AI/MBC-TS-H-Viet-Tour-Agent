"""notification — trừu tượng hoá kênh gửi thông báo cho khách.

Thêm kênh mới (Telegram, Phase 3): viết 1 sender mới implement
NotificationSender (base.py), đăng ký vào get_sender() bên dưới — KHÔNG cần
sửa app/tasks/celery_worker.py.
"""

from app.core.config import get_settings
from app.models.guest import NotificationChannel
from app.services.notification.base import NotificationError, NotificationSender
from app.services.notification.telegram_sender import TelegramSender
from app.services.notification.zalo_sender import ZaloSender

__all__ = ["NotificationError", "NotificationSender", "get_sender"]


def get_sender(channel: NotificationChannel) -> NotificationSender:
    if channel == NotificationChannel.ZALO:
        return ZaloSender()
    if channel == NotificationChannel.TELEGRAM:
        if not get_settings().telegram_configured:
            raise NotificationError(
                "Chưa cấu hình Telegram (TELEGRAM_BOT_TOKEN/TELEGRAM_WEBHOOK_SECRET) — "
                "đổi khách này về kênh Zalo để gửi được ngay, hoặc cấu hình Telegram trong .env."
            )
        return TelegramSender()
    raise NotificationError(f"Kênh thông báo không hợp lệ: {channel}")
