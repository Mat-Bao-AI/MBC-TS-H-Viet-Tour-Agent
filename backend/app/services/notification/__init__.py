"""notification — trừu tượng hoá kênh gửi thông báo cho khách.

Thêm kênh mới (Telegram, Phase 3): viết 1 sender mới implement
NotificationSender (base.py), đăng ký vào get_sender() bên dưới — KHÔNG cần
sửa app/tasks/celery_worker.py.
"""

from app.models.guest import NotificationChannel
from app.services.notification.base import NotificationError, NotificationSender
from app.services.notification.zalo_sender import ZaloSender

__all__ = ["NotificationError", "NotificationSender", "get_sender"]


def get_sender(channel: NotificationChannel) -> NotificationSender:
    if channel == NotificationChannel.ZALO:
        return ZaloSender()
    if channel == NotificationChannel.TELEGRAM:
        # Phase 3 (chưa triển khai) — raise rõ ràng thay vì import lỗi mù mờ,
        # để dispatch_error hiện đúng lý do thay vì task crash không rõ ràng.
        raise NotificationError(
            "Kênh Telegram chưa được triển khai — đang ở Phase 3, đổi khách này về kênh Zalo để gửi được ngay."
        )
    raise NotificationError(f"Kênh thông báo không hợp lệ: {channel}")
