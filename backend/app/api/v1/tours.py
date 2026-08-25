"""tours.py — CRUD tour, upload tài liệu, xem/sửa timeline & khách."""

import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.database import get_db
from app.models.guest import Guest
from app.models.timeline_event import Timeline
from app.models.tour import Tour, TourStatus
from app.schemas.timeline import TimelineUpdateRequest
from app.schemas.tour import GuestOut, GuestUpdateRequest, TourCreateResponse, TourDetail, TourListItem

router = APIRouter(prefix="/tours", tags=["tours"])

settings = get_settings()


_CHUNK_SIZE = 1024 * 1024  # 1MB


def _save_upload(file: UploadFile, tour_id: str) -> tuple[str, str]:
    """Lưu file upload vào disk, trả về (đường dẫn đã lưu, tên file gốc).

    Đọc theo chunk + chặn ngay khi vượt max_upload_size_mb — tránh vừa buffer
    nguyên file khổng lồ vào RAM vừa ghi hết ra disk trước khi biết là quá lớn
    (DoS bằng file dung lượng lớn).
    """
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "").suffix
    saved_name = f"{tour_id}_{uuid.uuid4().hex[:8]}{ext}"
    saved_path = upload_dir / saved_name

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    total = 0
    try:
        with saved_path.open("wb") as out:
            while chunk := file.file.read(_CHUNK_SIZE):
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File vượt quá giới hạn {settings.max_upload_size_mb}MB.",
                    )
                out.write(chunk)
    except HTTPException:
        saved_path.unlink(missing_ok=True)
        raise

    return str(saved_path), file.filename or saved_name


@router.post("", response_model=TourCreateResponse)
async def create_tour(
    background_tasks: BackgroundTasks,
    itinerary_file: UploadFile,
    guest_list_file: UploadFile | None = None,
    name: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> TourCreateResponse:
    tour = Tour(name=name or (itinerary_file.filename or "Tour chưa đặt tên"), status=TourStatus.DRAFT)
    db.add(tour)
    await db.flush()  # có tour.id trước khi lưu file, để đặt tên file theo id

    source_path, source_filename = _save_upload(itinerary_file, tour.id)
    tour.source_path = source_path
    tour.source_filename = source_filename

    if guest_list_file is not None:
        guest_list_path, guest_list_filename = _save_upload(guest_list_file, tour.id)
        tour.guest_list_path = guest_list_path
        tour.guest_list_filename = guest_list_filename

    await db.commit()
    await db.refresh(tour)

    # Trigger agent xử lý ngay trong background — HDV không cần bấm thêm nút
    # nào, khớp đúng flow "upload → agent tự phân tích" mô tả trong tài liệu.
    # (import ở đây để tránh vòng lặp import module giữa tours.py <-> agent.py)
    from app.api.v1.agent import process_tour

    background_tasks.add_task(process_tour, tour.id)

    return TourCreateResponse(id=tour.id, status=tour.status, message="Đã nhận tài liệu, đang phân tích...")


@router.get("", response_model=list[TourListItem])
async def list_tours(db: AsyncSession = Depends(get_db)) -> list[Tour]:
    result = await db.execute(select(Tour).order_by(Tour.created_at.desc()))
    return list(result.scalars().all())


async def _get_tour_or_404(tour_id: str, db: AsyncSession) -> Tour:
    result = await db.execute(
        select(Tour)
        .where(Tour.id == tour_id)
        .options(selectinload(Tour.guests), selectinload(Tour.timeline))
    )
    tour = result.scalar_one_or_none()
    if tour is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tour {tour_id}")
    return tour


@router.get("/{tour_id}", response_model=TourDetail)
async def get_tour(tour_id: str, db: AsyncSession = Depends(get_db)) -> TourDetail:
    tour = await _get_tour_or_404(tour_id, db)
    return TourDetail(
        id=tour.id,
        name=tour.name,
        start_date=tour.start_date,
        end_date=tour.end_date,
        status=tour.status,
        process_error=tour.process_error,
        source_filename=tour.source_filename,
        guest_list_filename=tour.guest_list_filename,
        guests=[GuestOut.model_validate(g) for g in tour.guests],
        timeline_events=(tour.timeline.events if tour.timeline else []),
        created_at=tour.created_at,
        updated_at=tour.updated_at,
    )


@router.put("/{tour_id}/timeline", response_model=TourDetail)
async def update_timeline(
    tour_id: str, payload: TimelineUpdateRequest, db: AsyncSession = Depends(get_db)
) -> TourDetail:
    """HDV lưu timeline đã xem/sửa (kéo-thả sắp xếp lại, đổi giờ, thêm ghi chú...)."""
    tour = await _get_tour_or_404(tour_id, db)

    events_json = [e.model_dump() for e in payload.events]
    if tour.timeline is None:
        tour.timeline = Timeline(tour_id=tour.id, events=events_json)
        db.add(tour.timeline)
    else:
        tour.timeline.events = events_json

    await db.commit()

    return await get_tour(tour_id, db)


@router.put("/{tour_id}/guests/{guest_id}", response_model=GuestOut)
async def update_guest(
    tour_id: str, guest_id: str, payload: GuestUpdateRequest, db: AsyncSession = Depends(get_db)
) -> Guest:
    result = await db.execute(select(Guest).where(Guest.id == guest_id, Guest.tour_id == tour_id))
    guest = result.scalar_one_or_none()
    if guest is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy khách {guest_id} trong tour {tour_id}")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(guest, field, value)

    await db.commit()
    await db.refresh(guest)
    return guest


@router.post("/{tour_id}/reprocess", response_model=TourCreateResponse)
async def reprocess_tour(
    tour_id: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)
) -> TourCreateResponse:
    """Chạy lại agent parse+timeline — dùng khi lần xử lý trước lỗi (status=failed)."""
    tour = await _get_tour_or_404(tour_id, db)
    if not tour.source_path:
        raise HTTPException(status_code=400, detail="Tour chưa có tài liệu gốc để xử lý lại")

    from app.api.v1.agent import process_tour

    background_tasks.add_task(process_tour, tour.id)
    return TourCreateResponse(id=tour.id, status=tour.status, message="Đang xử lý lại...")
