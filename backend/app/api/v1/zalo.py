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
from app.schemas.zalo import (
    DispatchRequest,
    DispatchResponse,
    GroupCreateResponse,
    GroupSendRequest,
    MessagePreview,
    QuickUpdateRequest,
)
from app.services import zalo_service
from app.services.zalo_service import ZaloServiceError
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
    """Danh sách khách kèm dispatch_status — nguồn dữ liệu cho RSVP dashboard
    (tab Đã gửi/Đã xem/Đã xác nhận ở FE), đủ để HDV biết đã gửi cho ai / còn
    thiếu ai."""
    result = await db.execute(select(Guest).where(Guest.tour_id == tour_id))
    guests = list(result.scalars().all())
    if not guests:
        tour = await db.get(Tour, tour_id)
        if tour is None:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy tour {tour_id}")
    return guests


async def _resolve_missing_zalo_ids(db: AsyncSession, guests: list[Guest]) -> list[str]:
    """Với khách chưa có zalo_id sẵn (chỉ có SĐT), gọi resolve thật qua
    zalo_bridge rồi lưu lại — dùng chung cho tạo nhóm (cần zaloId thật của
    từng thành viên trước khi gọi createGroup)."""
    member_ids: list[str] = []
    dirty = False
    for guest in guests:
        if not guest.zalo_id:
            if not guest.phone_number:
                continue
            resolved = await zalo_service.resolve_user_by_phone(guest.phone_number)
            if resolved is None:
                continue
            guest.zalo_id = resolved["zaloId"]
            dirty = True
        member_ids.append(guest.zalo_id)
    if dirty:
        await db.commit()
    return member_ids


@router.post("/tours/{tour_id}/group/create", response_model=GroupCreateResponse)
async def create_tour_group(tour_id: str, db: AsyncSession = Depends(get_db)) -> GroupCreateResponse:
    """Tạo 1 nhóm Zalo thật cho tour (zca-js createGroup), lưu group_id vào
    tour để các lần "Gửi Zalo Group" sau tái dùng — không tạo nhóm mới mỗi
    lần gửi."""
    tour = await db.get(Tour, tour_id)
    if tour is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tour {tour_id}")

    guests_result = await db.execute(select(Guest).where(Guest.tour_id == tour_id))
    guests = list(guests_result.scalars().all())
    skipped = [g.id for g in guests if not g.zalo_id and not g.phone_number]

    # Cả bước resolve zalo_id lẫn tạo nhóm đều gọi zalo_bridge — gộp chung 1
    # try/except: "chưa đăng nhập Zalo" là lỗi ở NGAY bước resolve đầu tiên,
    # không phải chỉ ở create_group, nên phải bọc từ đây.
    try:
        member_ids = await _resolve_missing_zalo_ids(db, guests)
        if not member_ids:
            raise HTTPException(
                status_code=400, detail="Không có khách nào đủ thông tin (zalo_id/SĐT) để thêm vào nhóm."
            )
        result = await zalo_service.create_group(tour.name, member_ids)
    except ZaloServiceError as exc:
        detail = f"zalo_bridge lỗi tạo nhóm: {exc}"
        # Lỗi thật gặp lúc HDV test (đã đăng nhập Zalo thật): Zalo trả "Không
        # tìm thấy" khi tạo nhóm dù zalo_id đã resolve được — nguyên nhân
        # THƯỜNG GẶP NHẤT (chưa xác nhận 100% vì zca-js không tài liệu hoá rõ
        # mã lỗi): Zalo chỉ cho thêm vào nhóm mới những người ĐÃ LÀ BẠN BÈ với
        # tài khoản đang dùng để gửi tin. Chỉ thêm gợi ý này khi KHÔNG phải lỗi
        # "chưa đăng nhập" (lỗi đó đã tự giải thích rõ, thêm vào sẽ gây nhiễu).
        if "chưa đăng nhập" not in str(exc).lower():
            detail += (
                ". Nguyên nhân thường gặp nhất: khách chưa là bạn bè Zalo với tài khoản cá nhân đang "
                "dùng để gửi tin — Zalo yêu cầu kết bạn trước mới thêm vào nhóm được. Kiểm tra lại bằng "
                "cách kết bạn Zalo với khách rồi thử tạo nhóm lại."
            )
        raise HTTPException(status_code=502, detail=detail) from exc

    tour.zalo_group_id = result["groupId"]
    await db.commit()

    return GroupCreateResponse(
        group_id=result["groupId"],
        added=len(result.get("sucessMembers", [])),
        failed=len(result.get("errorMembers", [])),
        skipped=skipped,
    )


@router.post("/tours/{tour_id}/group/send")
async def send_group_message(
    tour_id: str, payload: GroupSendRequest, db: AsyncSession = Depends(get_db)
) -> dict:
    tour = await db.get(Tour, tour_id)
    if tour is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tour {tour_id}")
    if not tour.zalo_group_id:
        raise HTTPException(status_code=400, detail="Tour chưa có nhóm Zalo — tạo nhóm trước khi gửi.")

    try:
        await zalo_service.send_group_message(tour.zalo_group_id, payload.message)
    except ZaloServiceError as exc:
        raise HTTPException(status_code=502, detail=f"zalo_bridge lỗi gửi nhóm: {exc}") from exc

    return {"ok": True}
