"""tours.py — CRUD tour, upload tài liệu, xem/sửa timeline & khách."""

import asyncio
import tempfile
import uuid
from datetime import date, datetime, timedelta
from io import BytesIO
from pathlib import Path
from zoneinfo import ZoneInfo

import openpyxl
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from openpyxl.styles import Font
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.access import get_owned_tour
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.guest import DispatchStatus, Guest
from app.models.room_type import RoomType
from app.models.timeline_event import Timeline
from app.models.tour import Tour, TourStatus
from app.models.tour_source_file import TourSourceFile
from app.models.user import User, UserRole
from app.schemas.extraction import ExtractedGuest
from app.schemas.room_assignment import AssignedGroupOut, AutoAssignRoomsResponse, UnassignedGroupOut
from app.schemas.room_type import RoomTypeCreateRequest, RoomTypeOut, RoomTypeUpdateRequest
from app.schemas.timeline import EventWeather, MapPoint, TimelineEventSchema, TimelineUpdateRequest
from app.services import weather_service
from app.services.room_assignment import assign_rooms
from app.schemas.tour import (
    GuestCreateRequest,
    GuestImportResponse,
    GuestOut,
    GuestStatusUpdateRequest,
    GuestUpdateRequest,
    TourCreateResponse,
    TourDetail,
    TourListItem,
    UrlTourCreateRequest,
    UrlValidationRequest,
    UrlValidationResponse,
)

router = APIRouter(prefix="/tours", tags=["tours"])

settings = get_settings()


_CHUNK_SIZE = 1024 * 1024  # 1MB

# Tài liệu lịch trình cho phép gộp tối đa 5 file (vé máy bay, khách sạn, giấy
# mời, agenda...) thành 1 bộ nguồn cho 1 tour — giới hạn riêng 10MB/file
# (chặt hơn MAX_UPLOAD_SIZE_MB mặc định 20MB dùng cho avatar/logo) để tránh
# lạm dụng khi cho phép nhiều file cùng lúc.
_MAX_ITINERARY_FILES = 5
_MAX_ITINERARY_FILE_SIZE_MB = 10


def _validate_url_tour_dates(start_date: date, end_date: date, confirm_same_day: bool) -> None:
    today = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()
    if start_date < today:
        raise HTTPException(status_code=400, detail="Ngày đi không thể trước hôm nay.")
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="Ngày về không thể trước ngày đi.")
    if end_date == start_date and not confirm_same_day:
        raise HTTPException(
            status_code=409,
            detail="Đây là chuyến đi trong ngày. Xác nhận để tiếp tục tạo lịch trình phù hợp.",
        )


async def _validate_web_source(source_url: str):
    from app.agents.parser_agent import assess_travel_url
    from app.services.web_source import WebSourceError, fetch_public_web_source

    try:
        source = await fetch_public_web_source(source_url)
        relevance = await assess_travel_url(source.text)
    except WebSourceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # LLM/provider errors must not create an unvalidated tour
        raise HTTPException(status_code=502, detail=f"Không thể đánh giá nội dung URL: {exc}") from exc
    return source, relevance


async def _prepare_web_cover(source, destinations: list[str], tour_id: str) -> str | None:
    """Prefer source og:image, then optional Brave Image Search candidates."""
    from app.services.web_source import download_public_image

    candidates: list[str] = []
    if source.image_url:
        candidates.append(source.image_url)
    if not candidates:
        from app.services.brave_search import find_travel_image_urls

        candidates.extend(await find_travel_image_urls(" ".join(destinations[:3]) or source.title or "Vietnam travel"))

    for image_url in candidates[:10]:
        downloaded = await download_public_image(image_url)
        if downloaded:
            content, extension = downloaded
            upload_dir = Path(settings.upload_dir)
            upload_dir.mkdir(parents=True, exist_ok=True)
            path = upload_dir / f"{tour_id}_web_cover_{uuid.uuid4().hex[:8]}{extension}"
            path.write_bytes(content)
            return str(path)
    return None


def _save_upload(file: UploadFile, tour_id: str, max_size_mb: int | None = None) -> tuple[str, str]:
    """Lưu file upload vào disk, trả về (đường dẫn đã lưu, tên file gốc).

    Đọc theo chunk + chặn ngay khi vượt giới hạn — tránh vừa buffer nguyên
    file khổng lồ vào RAM vừa ghi hết ra disk trước khi biết là quá lớn
    (DoS bằng file dung lượng lớn). `max_size_mb` cho phép giới hạn chặt hơn
    settings.max_upload_size_mb (vd tài liệu lịch trình).
    """
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "").suffix
    saved_name = f"{tour_id}_{uuid.uuid4().hex[:8]}{ext}"
    saved_path = upload_dir / saved_name

    limit_mb = max_size_mb if max_size_mb is not None else settings.max_upload_size_mb
    max_bytes = limit_mb * 1024 * 1024
    total = 0
    try:
        with saved_path.open("wb") as out:
            while chunk := file.file.read(_CHUNK_SIZE):
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File '{file.filename}' vượt quá giới hạn {limit_mb}MB.",
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
            existing.age = eg.age if eg.age is not None else existing.age
            existing.travel_group = eg.travel_group or existing.travel_group
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
                age=eg.age,
                travel_group=eg.travel_group,
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
    itinerary_files: list[UploadFile] = File(...),
    guest_list_file: UploadFile | None = None,
    name: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TourCreateResponse:
    if not itinerary_files:
        raise HTTPException(status_code=400, detail="Cần ít nhất 1 tài liệu lịch trình.")
    if len(itinerary_files) > _MAX_ITINERARY_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ được tải lên tối đa {_MAX_ITINERARY_FILES} tài liệu lịch trình.",
        )

    tour = Tour(
        name=name or (itinerary_files[0].filename or "Tour chưa đặt tên"),
        status=TourStatus.DRAFT,
        owner_id=current_user.id,
    )
    db.add(tour)
    await db.flush()  # có tour.id trước khi lưu file, để đặt tên file theo id

    for order_index, itinerary_file in enumerate(itinerary_files, start=1):
        path, filename = _save_upload(itinerary_file, tour.id, max_size_mb=_MAX_ITINERARY_FILE_SIZE_MB)
        db.add(TourSourceFile(tour_id=tour.id, path=path, filename=filename, order_index=order_index))

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


@router.post("/validate-url", response_model=UrlValidationResponse)
async def validate_url_tour_source(
    payload: UrlValidationRequest, current_user: User = Depends(get_current_user)
) -> UrlValidationResponse:
    """Read and classify a URL without persisting a draft tour."""
    source, relevance = await _validate_web_source(payload.source_url)
    return UrlValidationResponse(
        valid=relevance.is_travel_related,
        title=source.title,
        message=relevance.reason,
        destinations=relevance.destinations,
    )


@router.post("/from-url", response_model=TourCreateResponse)
async def create_tour_from_url(
    payload: UrlTourCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TourCreateResponse:
    _validate_url_tour_dates(payload.start_date, payload.end_date, payload.confirm_same_day)
    source, relevance = await _validate_web_source(payload.source_url)
    if not relevance.is_travel_related:
        raise HTTPException(status_code=422, detail=relevance.reason)

    tour = Tour(
        name=source.title or "Tour từ nguồn web",
        start_date=payload.start_date,
        end_date=payload.end_date,
        source_url=source.url,
        source_title=source.title,
        source_content=source.text,
        status=TourStatus.DRAFT,
        owner_id=current_user.id,
    )
    db.add(tour)
    await db.flush()
    tour.cover_image_path = await _prepare_web_cover(source, relevance.destinations, tour.id)
    await db.commit()
    await db.refresh(tour)

    from app.api.v1.agent import process_tour

    background_tasks.add_task(process_tour, tour.id)
    return TourCreateResponse(id=tour.id, status=tour.status, message="Đã nhận URL, đang tạo lịch trình nháp...")


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
        tour_type=tour.tour_type,
        created_at=tour.created_at,
        guests_total=len(tour.guests),
        guests_sent=guests_sent,
        cover_image_url=f"/api/v1/public/tours/{tour.id}/cover" if tour.cover_image_path else None,
    )


@router.get("", response_model=list[TourListItem])
async def list_tours(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[TourListItem]:
    query = select(Tour).options(selectinload(Tour.guests)).order_by(Tour.created_at.desc())
    if current_user.role != UserRole.ADMIN:
        query = query.where(Tour.owner_id == current_user.id)
    result = await db.execute(query)
    return [tour_to_list_item(t) for t in result.scalars().all()]


_GUEST_TEMPLATE_HEADERS = ["Họ tên", "Tuổi", "Số điện thoại", "Nhóm đi cùng", "Ghi chú ăn uống"]
_GUEST_TEMPLATE_EXAMPLE_ROWS = [
    ["Nguyễn Văn Long", 35, "0901234567", "Gia đình anh Long", ""],
    ["Trần Thị Hoa", 33, "0901234568", "Gia đình anh Long", "Ăn chay"],
    ["Nguyễn Bin", 5, "", "Gia đình anh Long", ""],
    ["Lê Văn Minh", 28, "0909876543", "", "Dị ứng hải sản"],
]


# ĐẶT TRƯỚC route "/{tour_id}" bên dưới — FastAPI khớp theo thứ tự đăng ký,
# nếu để sau thì "/tours/guest-list-template" sẽ bị "/{tour_id}" nuốt mất
# (hiểu "guest-list-template" là 1 tour_id thật, trả 404 sai).
@router.get("/guest-list-template")
async def download_guest_list_template(current_user: User = Depends(get_current_user)) -> StreamingResponse:
    """File Excel mẫu cho HDV tham khảo cột nào nên có khi import danh sách
    khách (POST /tours/{id}/guests/import, hoặc kèm lúc tạo tour) — không bắt
    buộc đúng khuôn (agent đọc tự do), nhưng CÀNG NHIỀU cột như Tuổi/Nhóm đi
    cùng thì AI càng xếp phòng thông minh được (gia đình 3 người → phòng lớn,
    2 người đi chung → phòng đôi...), xem app/schemas/extraction.py."""
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "Danh sách khách"
    sheet.append(_GUEST_TEMPLATE_HEADERS)
    for cell in sheet[1]:
        cell.font = Font(bold=True)
    for row in _GUEST_TEMPLATE_EXAMPLE_ROWS:
        sheet.append(row)
    for col_letter, width in zip("ABCDE", (22, 8, 16, 22, 20)):
        sheet.column_dimensions[col_letter].width = width

    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=mau-danh-sach-khach.xlsx"},
    )


async def _get_tour_or_404(tour_id: str, db: AsyncSession, current_user: User) -> Tour:
    return await get_owned_tour(tour_id, db, current_user, with_relations=True)


@router.get("/{tour_id}", response_model=TourDetail)
async def get_tour(
    tour_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> TourDetail:
    tour = await _get_tour_or_404(tour_id, db, current_user)
    map_points = await compute_tour_map_points(tour)
    return TourDetail(
        id=tour.id,
        name=tour.name,
        start_date=tour.start_date,
        end_date=tour.end_date,
        status=tour.status,
        tour_type=tour.tour_type,
        summary=tour.summary,
        process_error=tour.process_error,
        source_filenames=[f.filename for f in tour.source_files],
        guest_list_filename=tour.guest_list_filename,
        guests=[GuestOut.model_validate(g) for g in tour.guests],
        timeline_events=(tour.timeline.events if tour.timeline else []),
        created_at=tour.created_at,
        updated_at=tour.updated_at,
        zalo_group_id=tour.zalo_group_id,
        has_cover_image=bool(tour.cover_image_path),
        source_url=tour.source_url,
        source_title=tour.source_title,
        map_points=map_points,
    )


@router.delete("/{tour_id}", status_code=204)
async def delete_tour(
    tour_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> None:
    """Xoá hẳn 1 tour — trước đây KHÔNG có cách nào xoá tour tạo nhầm/trùng
    (thiếu chức năng, không phải HDV không tìm ra nút). Cho xoá ở MỌI trạng
    thái kể cả đã gửi (quyết định đã chốt với user) — FE chịu trách nhiệm xác
    nhận 2 lần trước khi gọi, backend không tự chặn theo status.

    Guests/timeline tự xoá theo (cascade="all, delete-orphan" trên
    Tour.guests/Tour.timeline, xem app/models/tour.py) — chỉ cần dọn thêm các
    file đã lưu riêng trên disk (không thuộc DB) như _save_upload/cover-image.

    with_relations=True BẮT BUỘC: cascade delete của SQLAlchemy cần load sẵn
    guests/timeline TRƯỚC — lazy-load ngầm lúc cascade sẽ lỗi MissingGreenlet
    trong AsyncSession nếu chưa load."""
    tour = await get_owned_tour(tour_id, db, current_user, with_relations=True)

    for path in (tour.guest_list_path, tour.cover_image_path):
        if path:
            Path(path).unlink(missing_ok=True)
    for source_file in tour.source_files:
        Path(source_file.path).unlink(missing_ok=True)

    await db.delete(tour)
    await db.commit()


_ALLOWED_COVER_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.put("/{tour_id}/cover-image", status_code=204)
async def set_cover_image(
    tour_id: str,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    tour = await get_owned_tour(tour_id, db, current_user)
    if file.content_type not in _ALLOWED_COVER_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Chỉ nhận ảnh JPEG/PNG/WebP.")

    old_path = tour.cover_image_path
    saved_path, _ = _save_upload(file, f"{tour_id}_cover")
    tour.cover_image_path = saved_path
    await db.commit()

    if old_path:
        Path(old_path).unlink(missing_ok=True)


@router.delete("/{tour_id}/cover-image", status_code=204)
async def clear_cover_image(
    tour_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> None:
    tour = await get_owned_tour(tour_id, db, current_user)
    old_path = tour.cover_image_path
    tour.cover_image_path = None
    await db.commit()
    if old_path:
        Path(old_path).unlink(missing_ok=True)


@router.put("/{tour_id}/timeline", response_model=TourDetail)
async def update_timeline(
    tour_id: str,
    payload: TimelineUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TourDetail:
    """HDV lưu timeline đã xem/sửa (kéo-thả sắp xếp lại, đổi giờ, thêm ghi chú...)."""
    tour = await _get_tour_or_404(tour_id, db, current_user)

    events_json = [e.model_dump() for e in payload.events]
    if tour.timeline is None:
        tour.timeline = Timeline(tour_id=tour.id, events=events_json)
        db.add(tour.timeline)
    else:
        tour.timeline.events = events_json

    # Sửa sau khi đã xác nhận thì phải quay lại bước kiểm tra trước khi gửi.
    if tour.status == TourStatus.READY_TO_SEND:
        tour.status = TourStatus.REVIEW

    await db.commit()

    return await get_tour(tour_id, db, current_user)


@router.post("/{tour_id}/confirm", response_model=TourDetail)
async def confirm_tour_timeline(
    tour_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TourDetail:
    """HDV xác nhận nội dung cuối sau khi kiểm tra timeline."""
    tour = await _get_tour_or_404(tour_id, db, current_user)
    if tour.status != TourStatus.REVIEW:
        raise HTTPException(status_code=400, detail="Tour chưa ở trạng thái cần kiểm tra.")
    if tour.timeline is None or not tour.timeline.events:
        raise HTTPException(status_code=400, detail="Tour chưa có lịch trình để xác nhận.")

    tour.status = TourStatus.READY_TO_SEND
    await db.commit()
    return await get_tour(tour_id, db, current_user)


@router.post("/{tour_id}/reopen", response_model=TourDetail)
async def reopen_tour_timeline(
    tour_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TourDetail:
    """HDV mở lại tour đã xác nhận để chỉnh sửa trước khi gửi."""
    tour = await _get_tour_or_404(tour_id, db, current_user)
    if tour.status != TourStatus.READY_TO_SEND:
        raise HTTPException(status_code=400, detail="Tour chưa ở trạng thái sẵn sàng gửi.")

    tour.status = TourStatus.REVIEW
    await db.commit()
    return await get_tour(tour_id, db, current_user)


async def _resolve_reference_location(tour: Tour, events: list[TimelineEventSchema]) -> tuple[float, float, str] | None:
    """1 toạ độ ĐẠI DIỆN cho cả tour, dùng chung cho MỌI ngày — thay vì
    geocode riêng từng địa điểm cụ thể trong lịch trình (thường là tên nhà
    hàng/khách sạn/quán ăn không phải địa danh nên Open-Meteo không tìm ra),
    khiến nhiều ngày không có card thời tiết. Thử tên tour trước (thường
    chứa tên điểm đến, vd "Lịch Trình Đà Lạt" -> "Đà Lạt"), rồi lần lượt từng
    địa điểm trong timeline tới khi geocode được — chỉ cần 1 nơi geocode
    được là mọi ngày đều có thời tiết."""
    seen: set[str] = set()
    candidates: list[str] = []
    for c in [tour.name] + [e.location for e in events if e.location]:
        if c not in seen:
            seen.add(c)
            candidates.append(c)

    # Gọi geocode cho MỌI candidate SONG SONG rồi chọn kết quả đầu tiên khớp
    # đúng thứ tự ưu tiên — tránh dò tuần tự (chậm thấy rõ: mỗi lần thử thất
    # bại vẫn tốn round-trip network thật, dò tuần tự qua hàng chục địa điểm
    # trước khi tìm được 1 cái đúng có thể mất cả phút; song song thì tổng
    # thời gian chỉ bằng đúng 1 lần gọi chậm nhất, không cộng dồn).
    results = await asyncio.gather(*(weather_service.geocode(c) for c in candidates))
    for result in results:
        if result is not None:
            return result
    return None


async def compute_tour_weather(tour: Tour) -> list[EventWeather]:
    """Thời tiết cho MỌI ngày trong timeline — dùng chung cho
    GET /tours/{id}/weather (trang duyệt lịch trình, cần đăng nhập) VÀ
    GET /public/tours/{id} (trang công khai, không cần key — xem
    app/api/v1/public.py). Trả rỗng (KHÔNG lỗi) nếu tour chưa có start_date,
    chưa có timeline, hoặc không geocode được bất kỳ địa điểm nào trong cả
    tour. `tour` phải đã load sẵn `.timeline` (selectinload)."""
    if not tour.start_date or tour.timeline is None:
        return []

    events = [TimelineEventSchema(**e) for e in tour.timeline.events]
    day_indexes = sorted({e.day_index for e in events})
    if not day_indexes:
        return []

    reference = await _resolve_reference_location(tour, events)
    if reference is None:
        return []
    latitude, longitude, display_name = reference

    async def _fetch_day(day_index: int) -> EventWeather | None:
        event_date = tour.start_date + timedelta(days=day_index - 1)
        date_str = event_date.isoformat()

        forecast = await weather_service.get_forecast(latitude, longitude, date_str)
        if forecast is not None:
            return EventWeather(
                day_index=day_index, location=display_name, date=date_str, is_forecast=True, **forecast
            )

        # Ngoài phạm vi dự báo thật (~16 ngày tới) — fallback sang trung bình
        # nhiều năm (dữ liệu khí hậu thực đo quá khứ). is_forecast=False vẫn
        # được lưu ở tầng API cho mục đích nội bộ/tương lai, nhưng FE hiện
        # tại KHÔNG hiển thị khác biệt kỹ thuật này ra ngoài (xem
        # frontend/src/app/t/[id]/page.tsx) — người dùng cuối chỉ cần biết
        # đây là thông tin tham khảo chung.
        climate = await weather_service.get_climate_average(latitude, longitude, event_date.month, event_date.day)
        if climate is None:
            return None
        return EventWeather(day_index=day_index, location=display_name, date=date_str, is_forecast=False, **climate)

    # Gọi song song cho mọi ngày thay vì tuần tự.
    fetched = await asyncio.gather(*(_fetch_day(d) for d in day_indexes))
    return [w for w in fetched if w is not None]


async def compute_tour_map_points(tour: Tour) -> list[MapPoint]:
    """Geocode các location thực tế trong timeline, best-effort."""
    if tour.timeline is None:
        return []
    events = [TimelineEventSchema(**e) for e in tour.timeline.events]
    unique = list(dict.fromkeys(e.location for e in events if e.location))
    results = await asyncio.gather(*(weather_service.geocode(location) for location in unique))
    coordinates = {name: result for name, result in zip(unique, results) if result is not None}
    points: list[MapPoint] = []
    for event in events:
        if not event.location or event.location not in coordinates:
            continue
        latitude, longitude, display_name = coordinates[event.location]
        points.append(MapPoint(
            day_index=event.day_index,
            title=event.title,
            location=event.location,
            latitude=latitude,
            longitude=longitude,
            display_name=display_name,
        ))
    return points


@router.get("/{tour_id}/weather", response_model=list[EventWeather])
async def get_tour_weather(
    tour_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[EventWeather]:
    tour = await _get_tour_or_404(tour_id, db, current_user)
    return await compute_tour_weather(tour)


@router.post("/{tour_id}/guests", response_model=GuestOut)
async def add_guest(
    tour_id: str,
    payload: GuestCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Guest:
    """Thêm 1 khách thủ công — dùng khi HDV quên upload danh sách đoàn lúc
    tạo tour, hoặc chỉ có vài khách phát sinh thêm sau."""
    await _get_tour_or_404(tour_id, db, current_user)  # 404 sớm nếu tour không tồn tại/không thuộc quyền

    guest = Guest(tour_id=tour_id, **payload.model_dump())
    db.add(guest)
    await db.commit()
    await db.refresh(guest)
    return guest


@router.post("/{tour_id}/guests/import", response_model=GuestImportResponse)
async def import_guests(
    tour_id: str,
    guest_list_file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GuestImportResponse:
    """Import danh sách khách từ 1 file riêng (PDF/DOCX/XLSX/TXT) vào tour đã
    có sẵn — bù cho trường hợp HDV không upload danh sách đoàn lúc tạo tour.
    Không lưu file lâu dài (chỉ dùng tạm để trích xuất), khác _save_upload."""
    from app.agents.parser_agent import extract_guest_list
    from app.services import file_processor

    tour = await _get_tour_or_404(tour_id, db, current_user)

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
async def delete_guest(
    tour_id: str,
    guest_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await get_owned_tour(tour_id, db, current_user)  # 404 sớm nếu tour không tồn tại/không thuộc quyền
    result = await db.execute(select(Guest).where(Guest.id == guest_id, Guest.tour_id == tour_id))
    guest = result.scalar_one_or_none()
    if guest is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy khách {guest_id} trong tour {tour_id}")

    await db.delete(guest)
    await db.commit()


@router.put("/{tour_id}/guests/{guest_id}", response_model=GuestOut)
async def update_guest(
    tour_id: str,
    guest_id: str,
    payload: GuestUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Guest:
    await get_owned_tour(tour_id, db, current_user)  # 404 sớm nếu tour không tồn tại/không thuộc quyền
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
    tour_id: str,
    guest_id: str,
    payload: GuestStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Guest:
    """HDV tự đánh dấu RSVP (Đã xem/Đã xác nhận) sau khi liên hệ khách ngoài
    app — xem docstring GuestStatusUpdateRequest. Tách khỏi PUT update_guest
    ở trên để không lẫn với sửa thông tin cá nhân khách."""
    await get_owned_tour(tour_id, db, current_user)  # 404 sớm nếu tour không tồn tại/không thuộc quyền
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
    tour_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TourCreateResponse:
    """Chạy lại agent parse+timeline — dùng khi lần xử lý trước lỗi (status=failed)."""
    tour = await _get_tour_or_404(tour_id, db, current_user)
    if not tour.source_files and not tour.source_content:
        raise HTTPException(status_code=400, detail="Tour chưa có nguồn gốc để xử lý lại")

    from app.api.v1.agent import process_tour

    background_tasks.add_task(process_tour, tour.id)
    return TourCreateResponse(id=tour.id, status=tour.status, message="Đang xử lý lại...")


# ------------------------------------------------------------- Loại phòng (Phase 3)
# Tồn kho loại phòng HDV khai báo cho tour (vd "Phòng đơn" x2, "Phòng đôi"
# x5) — nền tảng cho thuật toán tự động xếp phòng dựa theo travel_group của
# khách (Phase 4, xem app/models/guest.py, app/models/room_type.py).


@router.get("/{tour_id}/room-types", response_model=list[RoomTypeOut])
async def list_room_types(
    tour_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[RoomType]:
    tour = await get_owned_tour(tour_id, db, current_user, with_relations=True)
    return tour.room_types


@router.post("/{tour_id}/room-types", response_model=RoomTypeOut, status_code=201)
async def create_room_type(
    tour_id: str,
    payload: RoomTypeCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RoomType:
    await get_owned_tour(tour_id, db, current_user)  # 404 sớm nếu tour không tồn tại/không thuộc quyền
    room_type = RoomType(tour_id=tour_id, **payload.model_dump())
    db.add(room_type)
    await db.commit()
    await db.refresh(room_type)
    return room_type


async def _get_room_type_or_404(tour_id: str, room_type_id: str, db: AsyncSession) -> RoomType:
    result = await db.execute(
        select(RoomType).where(RoomType.id == room_type_id, RoomType.tour_id == tour_id)
    )
    room_type = result.scalar_one_or_none()
    if room_type is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy loại phòng {room_type_id} trong tour {tour_id}")
    return room_type


@router.put("/{tour_id}/room-types/{room_type_id}", response_model=RoomTypeOut)
async def update_room_type(
    tour_id: str,
    room_type_id: str,
    payload: RoomTypeUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RoomType:
    await get_owned_tour(tour_id, db, current_user)
    room_type = await _get_room_type_or_404(tour_id, room_type_id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(room_type, field, value)

    await db.commit()
    await db.refresh(room_type)
    return room_type


@router.delete("/{tour_id}/room-types/{room_type_id}", status_code=204)
async def delete_room_type(
    tour_id: str,
    room_type_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await get_owned_tour(tour_id, db, current_user)
    room_type = await _get_room_type_or_404(tour_id, room_type_id, db)
    await db.delete(room_type)
    await db.commit()


@router.post("/{tour_id}/auto-assign-rooms", response_model=AutoAssignRoomsResponse)
async def auto_assign_rooms(
    tour_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> AutoAssignRoomsResponse:
    """Chạy thuật toán xếp phòng (app/services/room_assignment.py) — mỗi khách
    KHÔNG có travel_group tự thành 1 nhóm riêng. Ghi đè room_type_id của MỌI
    khách trong tour theo kết quả mới nhất (không cộng dồn), KHÔNG đụng
    room_number (số phòng thật, HDV tự điền)."""
    tour = await get_owned_tour(tour_id, db, current_user, with_relations=True)

    if not tour.room_types:
        raise HTTPException(status_code=400, detail="Tour chưa khai báo loại phòng nào — thêm loại phòng trước.")
    if not tour.guests:
        raise HTTPException(status_code=400, detail="Tour chưa có khách nào để xếp phòng.")

    result = assign_rooms(tour.guests, tour.room_types)
    await db.commit()

    return AutoAssignRoomsResponse(
        assigned=[
            AssignedGroupOut(
                group_label=g.group_label,
                guest_ids=g.guest_ids,
                room_type_id=g.room_type.id,
                room_type_name=g.room_type.name,
            )
            for g in result.assigned
        ],
        unassigned=[
            UnassignedGroupOut(
                group_label=g.group_label, guest_ids=g.guest_ids, group_size=g.group_size, reason=g.reason
            )
            for g in result.unassigned
        ],
    )
