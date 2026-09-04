"""notification — bọc kênh gửi thông báo cho khách (hiện chỉ Zalo)."""

from app.services.notification.base import NotificationError, NotificationSender
from app.services.notification.zalo_sender import ZaloSender

__all__ = ["NotificationError", "NotificationSender", "get_sender"]


def get_sender() -> NotificationSender:
    return ZaloSender()
