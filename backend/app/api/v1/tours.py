"""tours.py — CRUD tour, upload tài liệu, xem/sửa timeline & khách."""

import asyncio
import tempfile
import uuid
from datetime import date, timedelta
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.database import get_db
from app.models.guest import DispatchStatus, Guest
from app.models.timeline_event import Timeline
from app.models.tour import Tour, TourStatus
from app.schemas.extraction import ExtractedGuest
from app.schemas.timeline import EventWeather, TimelineEventSchema, TimelineUpdateRequest
from app.services import weather_service
from app.schemas.tour import (
    GuestCreateRequest,
    GuestImportResponse,
    GuestOut,
    GuestStatusUpdateRequest,
    GuestUpdateRequest,
    TourCreateResponse,
    TourDetail,
    TourListItem,
)

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


def upsert_guests_from_extraction(
    db: AsyncSession, tour_id: str, extracted_guests: list[ExtractedGuest], existing_by_phone: dict[str, Guest]
) -> tuple[int, int, list[Guest]]:
    """Ghi danh sách khách trích xuất được vào DB — match theo SĐT, khách đã
    có thì cập nhật (không mất dispatch_status/zalo_id), khách mới thì thêm.
    Dùng chung cho cả lúc parse tour ban đầu (agent.py) lẫn import bổ sung
    (POST /tours/{id}/guests/import bên dưới)."""
    added = 0
    updated = 0
    result_guests: list[Guest] = []

    for eg in extracted_guests:
        existing = existing_by_phone.get(eg.phone_number) if eg.phone_number else None
        if existing:
            existing.full_name = eg.full_name or existing.full_name
            existing.seat_number = eg.seat_number or existing.seat_number
            existing.room_number = eg.room_number or existing.room_number
            existing.dietary_note = eg.dietary_note or existing.dietary_note
            updated += 1
            result_guests.append(existing)
        else:
            new_guest = Guest(
                tour_id=tour_id,
                full_name=eg.full_name,
                phone_number=eg.phone_number,
                seat_number=eg.seat_number,
                room_number=eg.room_number,
                dietary_note=eg.dietary_note,
            )
            db.add(new_guest)
            added += 1
            result_guests.append(new_guest)
            if eg.phone_number:
                existing_by_phone[eg.phone_number] = new_guest

    return added, updated, result_guests


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


def tour_to_list_item(tour: Tour) -> TourListItem:
    """Tour ORM (đã eager-load guests) -> TourListItem kèm tiến độ gửi Zalo
    thật, tính trực tiếp từ Guest.dispatch_status — dùng chung cho
    GET /tours và GET /dashboard."""
    guests_sent = sum(
        1 for g in tour.guests if g.dispatch_status != DispatchStatus.PENDING and g.dispatch_status != DispatchStatus.FAILED
    )
    return TourListItem(
        id=tour.id,
        name=tour.name,
        start_date=tour.start_date,
        end_date=tour.end_date,
        status=tour.status,
        created_at=tour.created_at,
        guests_total=len(tour.guests),
        guests_sent=guests_sent,
    )


@router.get("", response_model=list[TourListItem])
async def list_tours(db: AsyncSession = Depends(get_db)) -> list[TourListItem]:
    result = await db.execute(
        select(Tour).options(selectinload(Tour.guests)).order_by(Tour.created_at.desc())
    )
    return [tour_to_list_item(t) for t in result.scalars().all()]


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
        zalo_group_id=tour.zalo_group_id,
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


async def compute_tour_weather(tour: Tour) -> list[EventWeather]:
    """Dự báo thời tiết thật (Open-Meteo) cho từng (ngày, địa điểm) có trong
    timeline — dùng chung cho GET /tours/{id}/weather (trang duyệt lịch
    trình, cần X-API-Key) VÀ GET /public/tours/{id} (trang công khai, không
    cần key — xem app/api/v1/public.py). Trả rỗng (KHÔNG lỗi) nếu tour chưa
    có start_date hoặc chưa có timeline — chưa đủ thông tin để tính ngày cụ
    thể cho từng mốc. `tour` phải đã load sẵn `.timeline` (selectinload)."""
    if not tour.start_date or tour.timeline is None:
        return []

    events = [TimelineEventSchema(**e) for e in tour.timeline.events]
    # (day_index, location) duy nhất -> event_date — nhiều event cùng ngày +
    # địa điểm chỉ cần gọi Open-Meteo 1 lần.
    unique_keys: dict[tuple[int, str], str] = {}
    for event in events:
        if not event.location:
            continue
        key = (event.day_index, event.location)
        if key not in unique_keys:
            event_date = tour.start_date + timedelta(days=event.day_index - 1)
            unique_keys[key] = event_date.isoformat()

    async def _fetch_one(key: tuple[int, str], date_str: str) -> EventWeather | None:
        day_index, location = key
        coords = await weather_service.geocode(location)
        if coords is None:
            return None

        forecast = await weather_service.get_forecast(coords[0], coords[1], date_str)
        if forecast is not None:
            return EventWeather(day_index=day_index, location=location, date=date_str, is_forecast=True, **forecast)

        # Ngoài phạm vi dự báo thật (~16 ngày tới) — fallback sang trung bình
        # nhiều năm (dữ liệu khí hậu thực đo quá khứ), is_forecast=False để
        # FE hiển thị khác rõ, không lẫn với dự báo chính xác.
        event_date = date.fromisoformat(date_str)
        climate = await weather_service.get_climate_average(coords[0], coords[1], event_date.month, event_date.day)
        if climate is None:
            return None
        return EventWeather(day_index=day_index, location=location, date=date_str, is_forecast=False, **climate)

    # Gọi song song cho mọi (ngày, địa điểm) thay vì tuần tự — trang không
    # phải chờ N x 2 request nối tiếp nhau.
    fetched = await asyncio.gather(*(_fetch_one(k, d) for k, d in unique_keys.items()))
    return [w for w in fetched if w is not None]


@router.get("/{tour_id}/weather", response_model=list[EventWeather])
async def get_tour_weather(tour_id: str, db: AsyncSession = Depends(get_db)) -> list[EventWeather]:
    tour = await _get_tour_or_404(tour_id, db)
    return await compute_tour_weather(tour)


@router.post("/{tour_id}/guests", response_model=GuestOut)
async def add_guest(tour_id: str, payload: GuestCreateRequest, db: AsyncSession = Depends(get_db)) -> Guest:
    """Thêm 1 khách thủ công — dùng khi HDV quên upload danh sách đoàn lúc
    tạo tour, hoặc chỉ có vài khách phát sinh thêm sau."""
    await _get_tour_or_404(tour_id, db)  # 404 sớm nếu tour không tồn tại

    guest = Guest(tour_id=tour_id, **payload.model_dump())
    db.add(guest)
    await db.commit()
    await db.refresh(guest)
    return guest


@router.post("/{tour_id}/guests/import", response_model=GuestImportResponse)
async def import_guests(
    tour_id: str, guest_list_file: UploadFile, db: AsyncSession = Depends(get_db)
) -> GuestImportResponse:
    """Import danh sách khách từ 1 file riêng (PDF/DOCX/XLSX/TXT) vào tour đã
    có sẵn — bù cho trường hợp HDV không upload danh sách đoàn lúc tạo tour.
    Không lưu file lâu dài (chỉ dùng tạm để trích xuất), khác _save_upload."""
    from app.agents.parser_agent import extract_guest_list
    from app.services import file_processor

    tour = await _get_tour_or_404(tour_id, db)

    suffix = Path(guest_list_file.filename or "").suffix
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        content = await guest_list_file.read()
        if len(content) > settings.max_upload_size_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"File vượt quá giới hạn {settings.max_upload_size_mb}MB.")
        tmp.write(content)
        tmp.flush()

        try:
            text = file_processor.extract_text(tmp.name)
        except file_processor.UnsupportedFileTypeError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        extracted_guests = await extract_guest_list(text)
    except Exception as exc:  # noqa: BLE001 — lỗi LLM (quota, key sai...) cần hiện rõ cho HDV, không chỉ 500 trơn
        raise HTTPException(status_code=502, detail=f"Agent trích xuất danh sách lỗi: {exc}") from exc

    if not extracted_guests:
        raise HTTPException(status_code=422, detail="Không tìm thấy khách nào trong file — kiểm tra lại định dạng.")

    existing_result = await db.execute(select(Guest).where(Guest.tour_id == tour.id))
    existing_by_phone = {g.phone_number: g for g in existing_result.scalars().all() if g.phone_number}

    added, updated, guests = upsert_guests_from_extraction(db, tour.id, extracted_guests, existing_by_phone)
    await db.commit()
    for g in guests:
        await db.refresh(g)

    return GuestImportResponse(added=added, updated=updated, guests=[GuestOut.model_validate(g) for g in guests])


@router.delete("/{tour_id}/guests/{guest_id}", status_code=204)
async def delete_guest(tour_id: str, guest_id: str, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(select(Guest).where(Guest.id == guest_id, Guest.tour_id == tour_id))
    guest = result.scalar_one_or_none()
    if guest is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy khách {guest_id} trong tour {tour_id}")

    await db.delete(guest)
    await db.commit()


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


@router.patch("/{tour_id}/guests/{guest_id}/status", response_model=GuestOut)
async def update_guest_status(
    tour_id: str, guest_id: str, payload: GuestStatusUpdateRequest, db: AsyncSession = Depends(get_db)
) -> Guest:
    """HDV tự đánh dấu RSVP (Đã xem/Đã xác nhận) sau khi liên hệ khách ngoài
    app — xem docstring GuestStatusUpdateRequest. Tách khỏi PUT update_guest
    ở trên để không lẫn với sửa thông tin cá nhân khách."""
    result = await db.execute(select(Guest).where(Guest.id == guest_id, Guest.tour_id == tour_id))
    guest = result.scalar_one_or_none()
    if guest is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy khách {guest_id} trong tour {tour_id}")

    guest.dispatch_status = payload.dispatch_status
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
