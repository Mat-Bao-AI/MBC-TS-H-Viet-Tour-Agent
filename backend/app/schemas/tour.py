"""Schema request/response cho API v1: tours, guests."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.guest import DispatchStatus
from app.models.tour import TourStatus, TourType
from app.schemas.timeline import MapPoint, TimelineEventSchema


class GuestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    phone_number: str | None
    zalo_id: str | None
    age: int | None = None
    travel_group: str | None = None
    room_type_id: str | None = None
    seat_number: str | None
    room_number: str | None
    dietary_note: str | None
    dispatch_status: DispatchStatus
    last_dispatched_at: datetime | None
    dispatch_error: str | None = None


class GuestStatusUpdateRequest(BaseModel):
    """HDV tự đánh dấu trạng thái RSVP (Đã xem/Đã xác nhận) sau khi liên hệ
    khách ngoài app (gọi điện, nhắn tay) — Phase 1 chưa có webhook seen-message
    tự động từ Zalo, nên đây là cách ghi nhận thật duy nhất, không phải giả
    lập. HDV có thể chỉnh lại nếu bấm nhầm (không giới hạn 1 chiều)."""

    dispatch_status: DispatchStatus


class GuestUpdateRequest(BaseModel):
    full_name: str | None = None
    phone_number: str | None = None
    age: int | None = None
    travel_group: str | None = None
    # Cho HDV tự sửa lại gợi ý của thuật toán (app/services/room_assignment.py)
    # nếu thấy chưa hợp lý — gán thủ công qua field này, không có validate
    # "loại phòng còn tồn kho không" (HDV tự chịu trách nhiệm khi ghi đè tay).
    room_type_id: str | None = None
    seat_number: str | None = None
    room_number: str | None = None
    dietary_note: str | None = None


class GuestCreateRequest(BaseModel):
    full_name: str
    phone_number: str | None = None
    age: int | None = None
    travel_group: str | None = None
    seat_number: str | None = None
    room_number: str | None = None
    dietary_note: str | None = None


class GuestImportResponse(BaseModel):
    added: int
    updated: int
    guests: list[GuestOut]


class TourListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    start_date: date | None
    end_date: date | None
    status: TourStatus
    tour_type: TourType
    created_at: datetime
    guests_total: int = 0
    # "Đã gửi" = dispatch_status khác pending/failed (sent/read/confirmed) —
    # tiến độ thật tính từ dữ liệu khách trong DB, không phải số bịa.
    guests_sent: int = 0
    cover_image_url: str | None = None


class TourDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    start_date: date | None
    end_date: date | None
    status: TourStatus
    tour_type: TourType
    summary: str | None
    process_error: str | None
    source_filenames: list[str]
    guest_list_filename: str | None
    guests: list[GuestOut]
    timeline_events: list[TimelineEventSchema]
    created_at: datetime
    updated_at: datetime
    zalo_group_id: str | None = None
    has_cover_image: bool = False
    source_url: str | None = None
    source_title: str | None = None
    map_points: list[MapPoint] = Field(default_factory=list)


class TourCreateResponse(BaseModel):
    id: str
    status: TourStatus
    message: str


class UrlValidationRequest(BaseModel):
    source_url: str


class UrlValidationResponse(BaseModel):
    valid: bool
    title: str | None = None
    message: str
    destinations: list[str] = Field(default_factory=list)


class UrlTourCreateRequest(BaseModel):
    source_url: str
    start_date: date
    end_date: date
    confirm_same_day: bool = False
