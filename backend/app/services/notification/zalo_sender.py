"""zalo_sender.py — bọc app/services/zalo_service.py (sync, dùng trong Celery
task) theo interface NotificationSender chung. Không đổi hành vi thật, chỉ
tách lớp để celery_worker.py không gọi thẳng zalo_service nữa."""

from app.models.guest import Guest
from app.services.notification.base import NotificationError
from app.services.zalo_service import ZaloServiceError, resolve_user_by_phone_sync, send_message_sync


class ZaloSender:
    def resolve_recipient(self, guest: Guest) -> str:
        if guest.zalo_id:
            return guest.zalo_id
        if not guest.phone_number:
            raise NotificationError("Thiếu cả zalo_id lẫn số điện thoại — không có cách nào gửi được.")
        try:
            resolved = resolve_user_by_phone_sync(guest.phone_number)
        except ZaloServiceError as exc:
            raise NotificationError(str(exc)) from exc
        if resolved is None:
            raise NotificationError(
                f"Không tìm được tài khoản Zalo cho SĐT {guest.phone_number} — SĐT sai, "
                "khách chưa dùng Zalo với SĐT này, hoặc khách chưa là bạn Zalo với tài khoản đang dùng để gửi tin."
            )
        guest.zalo_id = resolved["zaloId"]
        return guest.zalo_id

    def send(self, recipient_id: str, text: str) -> None:
        try:
            send_message_sync(recipient_id, text)
        except ZaloServiceError as exc:
            raise NotificationError(str(exc)) from exc
