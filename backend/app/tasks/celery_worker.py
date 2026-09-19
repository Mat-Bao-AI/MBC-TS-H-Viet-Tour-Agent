"""Celery worker — hàng đợi gửi tin nhắn Zalo tuần tự.

Chạy tuần tự + rate_limit thay vì gửi song song toàn bộ khách cùng lúc: giảm
rủi ro bị Zalo đánh dấu spam khi dispatch cho đoàn đông khách. Gửi qua
app.services.notification (interface chung), xem notification/base.py.
"""

from datetime import datetime

from celery import Celery

from app.agents.zalo_format_agent import format_guest_message
from app.core.config import get_settings
from app.core.database import SyncSessionLocal
from app.models.guest import DispatchStatus, Guest
from app.models.timeline_event import Timeline
from app.models.tour import Tour, TourStatus
from app.schemas.timeline import TimelineEventSchema
from app.services.notification import NotificationError, get_sender

settings = get_settings()

celery_app = Celery(
    "viet_tour_agent_zalo",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
)


@celery_app.task(
    name="dispatch_guest_message",
    rate_limit="20/m",  # tối đa 20 tin/phút toàn worker — giảm rủi ro khoá tài khoản
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=3,
)
def dispatch_guest_message(guest_id: str) -> dict:
    with SyncSessionLocal() as session:
        guest = session.get(Guest, guest_id)
        if guest is None:
            return {"ok": False, "error": f"Không tìm thấy guest {guest_id}"}

        tour = session.get(Tour, guest.tour_id)
        timeline = session.query(Timeline).filter(Timeline.tour_id == guest.tour_id).first()
        if tour is None or timeline is None:
            guest.dispatch_status = DispatchStatus.FAILED
            guest.dispatch_error = "Tour hoặc timeline không tồn tại"
            session.commit()
            return {"ok": False, "error": guest.dispatch_error}

        events = [TimelineEventSchema(**e) for e in (timeline.events or [])]

        # 1 try/except DUY NHẤT bọc cả bước resolve recipient lẫn bước gửi —
        # đảm bảo MỌI exception (bug thật đã gặp: 1 exception lọt khỏi
        # try/except khiến task fail âm thầm sau 3 lần retry, dispatch_status
        # kẹt "pending" mãi mãi) đều được ghi vào dispatch_error.
        try:
            sender = get_sender()
            recipient_id = sender.resolve_recipient(guest)
            session.commit()
            message_text = format_guest_message(tour, events, guest)
            sender.send(recipient_id, message_text)
        except NotificationError as exc:
            guest.dispatch_status = DispatchStatus.FAILED
            guest.dispatch_error = str(exc)[:500]
            session.commit()
            raise

        guest.dispatch_status = DispatchStatus.SENT
        guest.dispatch_error = None
        guest.last_dispatched_at = datetime.utcnow()
        # Lần gửi thành công ĐẦU TIÊN của tour — trước đây KHÔNG có chỗ nào
        # Chuyển sang đã gửi sau khi tin đầu tiên gửi thành công.
        if tour.status in (TourStatus.REVIEW, TourStatus.READY_TO_SEND):
            tour.status = TourStatus.DISPATCHED
        session.commit()

        return {"ok": True, "guest_id": guest_id}


@celery_app.task(
    name="dispatch_quick_update_message",
    rate_limit="20/m",
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=3,
)
def dispatch_quick_update_message(guest_id: str, message_text: str) -> dict:
    """Gửi 1 tin tự do, tức thời cho 1 khách — dùng cho "Cập nhật nhanh" (FAB
    timeline) và "Gửi Zalo" trên từng mốc riêng lẻ. Khác dispatch_guest_message
    ở trên: KHÔNG dùng format_guest_message (template lịch trình đầy đủ),
    message_text đã được soạn sẵn từ trước khi queue task."""
    with SyncSessionLocal() as session:
        guest = session.get(Guest, guest_id)
        if guest is None:
            return {"ok": False, "error": f"Không tìm thấy guest {guest_id}"}

        tour = session.get(Tour, guest.tour_id)

        try:
            sender = get_sender()
            recipient_id = sender.resolve_recipient(guest)
            session.commit()
            sender.send(recipient_id, message_text)
        except NotificationError as exc:
            guest.dispatch_error = str(exc)[:500]
            session.commit()
            raise

        guest.last_dispatched_at = datetime.utcnow()
        guest.dispatch_error = None
        if guest.dispatch_status == DispatchStatus.PENDING:
            guest.dispatch_status = DispatchStatus.SENT
        # Cập nhật nhanh cũng có thể là lần gửi ĐẦU TIÊN của tour (HDV gửi tin
        # khẩn trước khi bấm "Gửi thông báo toàn đoàn") — cùng logic tự chuyển
        # trạng thái như dispatch_guest_message ở trên.
        if tour is not None and tour.status in (TourStatus.REVIEW, TourStatus.READY_TO_SEND):
            tour.status = TourStatus.DISPATCHED
        session.commit()

        return {"ok": True, "guest_id": guest_id}
