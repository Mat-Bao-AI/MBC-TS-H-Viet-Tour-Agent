"""zalo.py — preview & dispatch tin nhắn Zalo cho khách trong tour."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.zalo_format_agent import format_guest_message
from app.core.database import get_db
from app.models.guest import Guest
from app.models.timeline_event import Timeline
from app.models.tour import Tour
from app.schemas.timeline import TimelineEventSchema
from app.schemas.tour import GuestOut
from app.schemas.zalo import DispatchRequest, DispatchResponse, MessagePreview, QuickUpdateRequest
from app.tasks.celery_worker import dispatch_guest_message, dispatch_quick_update_message

router = APIRouter(prefix="/zalo", tags=["zalo"])


async def _load_tour_with_timeline(tour_id: str, db: AsyncSession) -> tuple[Tour, list[TimelineEventSchema]]:
    tour = await db.get(Tour, tour_id)
    if tour is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tour {tour_id}")

    timeline_result = await db.execute(select(Timeline).where(Timeline.tour_id == tour_id))
    timeline = timeline_result.scalar_one_or_none()
    events = [TimelineEventSchema(**e) for e in (timeline.events if timeline else [])]
    return tour, events


@router.get("/tours/{tour_id}/preview/{guest_id}", response_model=MessagePreview)
async def preview_message(tour_id: str, guest_id: str, db: AsyncSession = Depends(get_db)) -> MessagePreview:
    tour, events = await _load_tour_with_timeline(tour_id, db)

    guest_result = await db.execute(select(Guest).where(Guest.id == guest_id, Guest.tour_id == tour_id))
    guest = guest_result.scalar_one_or_none()
    if guest is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy khách {guest_id} trong tour {tour_id}")

    text = format_guest_message(tour, events, guest)
    return MessagePreview(guest_id=guest.id, guest_name=guest.full_name, message_text=text)


@router.post("/tours/{tour_id}/dispatch", response_model=DispatchResponse)
async def dispatch(tour_id: str, payload: DispatchRequest, db: AsyncSession = Depends(get_db)) -> DispatchResponse:
    tour = await db.get(Tour, tour_id)
    if tour is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tour {tour_id}")

    query = select(Guest).where(Guest.tour_id == tour_id)
    if payload.guest_ids:
        query = query.where(Guest.id.in_(payload.guest_ids))
    guests_result = await db.execute(query)
    guests = list(guests_result.scalars().all())

    queued = 0
    skipped: list[str] = []
    for guest in guests:
        if not guest.zalo_id and not guest.phone_number:
            skipped.append(guest.id)
            continue
        dispatch_guest_message.delay(guest.id)
        queued += 1

    return DispatchResponse(queued=queued, skipped=skipped)


@router.post("/tours/{tour_id}/quick-update", response_model=DispatchResponse)
async def quick_update(
    tour_id: str, payload: QuickUpdateRequest, db: AsyncSession = Depends(get_db)
) -> DispatchResponse:
    """Gửi 1 tin tự do, tức thời cho khách — dùng cho FAB "Cập nhật nhanh"
    (tin tự soạn) và nút "Gửi Zalo" trên từng mốc timeline (tin ghép sẵn từ
    FE). Khác /dispatch: không dùng template lịch trình đầy đủ."""
    tour = await db.get(Tour, tour_id)
    if tour is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tour {tour_id}")

    query = select(Guest).where(Guest.tour_id == tour_id)
    if payload.guest_ids:
        query = query.where(Guest.id.in_(payload.guest_ids))
    guests_result = await db.execute(query)
    guests = list(guests_result.scalars().all())

    queued = 0
    skipped: list[str] = []
    for guest in guests:
        if not guest.zalo_id and not guest.phone_number:
            skipped.append(guest.id)
            continue
        dispatch_quick_update_message.delay(guest.id, payload.message)
        queued += 1

    return DispatchResponse(queued=queued, skipped=skipped)


@router.get("/tours/{tour_id}/dispatch-status", response_model=list[GuestOut])
async def dispatch_status(tour_id: str, db: AsyncSession = Depends(get_db)) -> list[Guest]:
    """Danh sách khách kèm dispatch_status — bản rút gọn của RSVP dashboard
    đầy đủ (Phase 2), đủ để HDV biết đã gửi cho ai / còn thiếu ai."""
    result = await db.execute(select(Guest).where(Guest.tour_id == tour_id))
    guests = list(result.scalars().all())
    if not guests:
        tour = await db.get(Tour, tour_id)
        if tour is None:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy tour {tour_id}")
    return guests
