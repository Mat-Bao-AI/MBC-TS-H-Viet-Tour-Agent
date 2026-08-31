"""Celery worker — hàng đợi gửi tin nhắn Zalo tuần tự.

Chạy tuần tự + rate_limit thay vì gửi song song toàn bộ khách cùng lúc: giảm
rủi ro bị Zalo đánh dấu spam/khoá tài khoản khi dispatch cho đoàn đông khách.
"""

from datetime import datetime

from celery import Celery

from app.agents.zalo_format_agent import format_guest_message
from app.core.config import get_settings
from app.core.database import SyncSessionLocal
from app.models.guest import DispatchStatus, Guest
from app.models.timeline_event import Timeline
from app.models.tour import Tour
from app.schemas.timeline import TimelineEventSchema
from app.services.zalo_service import resolve_user_by_phone_sync, send_message_sync

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
            session.commit()
            return {"ok": False, "error": "Tour hoặc timeline không tồn tại"}

        if not guest.zalo_id:
            if not guest.phone_number:
                guest.dispatch_status = DispatchStatus.FAILED
                session.commit()
                return {"ok": False, "error": f"Guest {guest_id} thiếu cả zalo_id lẫn phone_number"}

            resolved = resolve_user_by_phone_sync(guest.phone_number)
            if resolved is None:
                guest.dispatch_status = DispatchStatus.FAILED
                session.commit()
                return {"ok": False, "error": f"Không resolve được Zalo ID cho SĐT {guest.phone_number}"}
            guest.zalo_id = resolved["zaloId"]
            session.commit()

        events = [TimelineEventSchema(**e) for e in (timeline.events or [])]
        message_text = format_guest_message(tour, events, guest)

        try:
            send_message_sync(guest.zalo_id, message_text)
        except Exception:
            guest.dispatch_status = DispatchStatus.FAILED
            session.commit()
            raise

        guest.dispatch_status = DispatchStatus.SENT
        guest.last_dispatched_at = datetime.utcnow()
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

        if not guest.zalo_id:
            if not guest.phone_number:
                return {"ok": False, "error": f"Guest {guest_id} thiếu cả zalo_id lẫn phone_number"}
            resolved = resolve_user_by_phone_sync(guest.phone_number)
            if resolved is None:
                return {"ok": False, "error": f"Không resolve được Zalo ID cho SĐT {guest.phone_number}"}
            guest.zalo_id = resolved["zaloId"]
            session.commit()

        send_message_sync(guest.zalo_id, message_text)

        guest.last_dispatched_at = datetime.utcnow()
        if guest.dispatch_status == DispatchStatus.PENDING:
            guest.dispatch_status = DispatchStatus.SENT
        session.commit()

        return {"ok": True, "guest_id": guest_id}
