"""base.py — interface chung cho mọi kênh gửi thông báo (Zalo, Telegram...).

Celery task (app/tasks/celery_worker.py) chỉ nói chuyện qua interface này,
KHÔNG import trực tiếp zalo_service/telegram_service — thêm kênh mới không
phải sửa lại logic task.
"""

from typing import Protocol

from app.models.guest import Guest


class NotificationError(RuntimeError):
    """Lỗi chung (channel-agnostic) — mọi lỗi riêng của từng kênh (Zalo,
    Telegram...) đều bọc lại thành lỗi này trước khi ném ra ngoài, để nơi gọi
    (celery task) không cần biết/import exception riêng của từng kênh."""


class NotificationSender(Protocol):
    def resolve_recipient(self, guest: Guest) -> str:
        """Đảm bảo có ID người nhận theo kênh (vd guest.zalo_id,
        guest.telegram_chat_id) và trả về giá trị đó. Có thể GÁN thêm field
        lên guest (khi resolve được lần đầu) nhưng KHÔNG tự commit DB — nơi
        gọi chịu trách nhiệm persist. Raise NotificationError nếu không thể
        resolve (thiếu thông tin, không tìm thấy, lỗi kênh...)."""
        ...

    def send(self, recipient_id: str, text: str) -> None:
        """Gửi tin thật tới recipient_id. Raise NotificationError nếu lỗi."""
        ...
