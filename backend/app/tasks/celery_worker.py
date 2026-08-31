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
from app.services.zalo_service import ZaloServiceError, resolve_user_by_phone_sync, send_message_sync


def _resolve_zalo_id_or_raise(guest: Guest) -> None:
    """Đảm bảo guest.zalo_id có giá trị trước khi gửi — raise ZaloServiceError
    với message rõ ràng cho MỌI lý do thất bại (không tìm thấy SĐT, thiếu
    SĐT, hay bridge lỗi khác như "chưa đăng nhập") để nơi gọi luôn bắt được
    và ghi vào dispatch_error. Bug thật đã gặp: trước đây resolve_user_by_
    phone_sync raise thẳng ZaloServiceError (vd lỗi 409 "chưa đăng nhập") mà
    KHÔNG nằm trong try/except nào — task fail âm thầm sau 3 lần retry,
    dispatch_status vẫn "pending" mãi mãi, không ghi lý do gì cả."""
    if guest.zalo_id:
        return
    if not guest.phone_number:
        raise ZaloServiceError("Thiếu cả zalo_id lẫn số điện thoại — không có cách nào gửi được.")
    resolved = resolve_user_by_phone_sync(guest.phone_number)
    if resolved is None:
        raise ZaloServiceError(
            f"Không tìm được tài khoản Zalo cho SĐT {guest.phone_number} — SĐT sai, "
            "khách chưa dùng Zalo với SĐT này, hoặc khách chưa là bạn Zalo với tài khoản đang dùng để gửi tin."
        )
    guest.zalo_id = resolved["zaloId"]


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

        # 1 try/except DUY NHẤT bọc cả bước resolve zalo_id lẫn bước gửi —
        # đảm bảo MỌI exception (kể cả ZaloServiceError không phải do resolve
        # trả None, vd lỗi 409 "chưa đăng nhập") đều được ghi vào
        # dispatch_error trước khi Celery autoretry, không lọt lưới.
        try:
            _resolve_zalo_id_or_raise(guest)
            session.commit()
            message_text = format_guest_message(tour, events, guest)
            send_message_sync(guest.zalo_id, message_text)
        except Exception as exc:
            guest.dispatch_status = DispatchStatus.FAILED
            guest.dispatch_error = str(exc)[:500]
            session.commit()
            raise

        guest.dispatch_status = DispatchStatus.SENT
        guest.dispatch_error = None
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

        try:
            _resolve_zalo_id_or_raise(guest)
            session.commit()
            send_message_sync(guest.zalo_id, message_text)
        except Exception as exc:
            guest.dispatch_error = str(exc)[:500]
            session.commit()
            raise

        guest.last_dispatched_at = datetime.utcnow()
        guest.dispatch_error = None
        if guest.dispatch_status == DispatchStatus.PENDING:
            guest.dispatch_status = DispatchStatus.SENT
        session.commit()

        return {"ok": True, "guest_id": guest_id}
