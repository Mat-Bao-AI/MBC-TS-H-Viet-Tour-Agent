"""telegram_sender.py — bọc app/services/telegram_service.py theo interface
NotificationSender chung. Khác ZaloSender: KHÔNG có cách resolve chat_id từ
số điện thoại (Telegram không cho tra như vậy) — khách BẮT BUỘC phải tự bấm
deep-link t.me/<bot>?start=<guest_id> trước (webhook ghi nhận
telegram_chat_id, xem app/api/v1/telegram_webhook.py). Đây là giới hạn thật
của nền tảng Telegram, không phải thiếu sót ở đây."""

from app.models.guest import Guest
from app.services.notification.base import NotificationError
from app.services.telegram_service import TelegramServiceError, send_message_sync


class TelegramSender:
    def resolve_recipient(self, guest: Guest) -> str:
        if guest.telegram_chat_id:
            return guest.telegram_chat_id
        raise NotificationError(
            "Khách chưa kết nối Telegram — cần bấm link mời (t.me/<bot>?start=<mã khách>) và bấm "
            "Start với Bot trước khi hệ thống gửi được tin."
        )

    def send(self, recipient_id: str, text: str) -> None:
        try:
            send_message_sync(recipient_id, text)
        except TelegramServiceError as exc:
            raise NotificationError(str(exc)) from exc
