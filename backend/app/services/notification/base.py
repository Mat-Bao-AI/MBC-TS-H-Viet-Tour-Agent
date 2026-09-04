"""base.py — interface chung cho kênh gửi thông báo (hiện chỉ Zalo).

Celery task (app/tasks/celery_worker.py) chỉ nói chuyện qua interface này,
KHÔNG import trực tiếp zalo_service.
"""

from typing import Protocol

from app.models.guest import Guest


class NotificationError(RuntimeError):
    """Lỗi chung — lỗi riêng của zalo_service được bọc lại thành lỗi này
    trước khi ném ra ngoài, để nơi gọi (celery task) không cần biết/import
    exception riêng của zalo_service."""


class NotificationSender(Protocol):
    def resolve_recipient(self, guest: Guest) -> str:
        """Đảm bảo có ID người nhận (guest.zalo_id) và trả về giá trị đó. Có
        thể GÁN thêm field lên guest (khi resolve được lần đầu) nhưng KHÔNG
        tự commit DB — nơi gọi chịu trách nhiệm persist. Raise
        NotificationError nếu không thể resolve (thiếu thông tin, không tìm
        thấy...)."""
        ...

    def send(self, recipient_id: str, text: str) -> None:
        """Gửi tin thật tới recipient_id. Raise NotificationError nếu lỗi."""
        ...
