"""Schema request/response cho API v1: tours, guests."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.guest import DispatchStatus
from app.models.tour import TourStatus
from app.schemas.timeline import TimelineEventSchema


class GuestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    phone_number: str | None
    zalo_id: str | None
    seat_number: str | None
    room_number: str | None
    dietary_note: str | None
    dispatch_status: DispatchStatus
    last_dispatched_at: datetime | None


class GuestUpdateRequest(BaseModel):
    full_name: str | None = None
    phone_number: str | None = None
    seat_number: str | None = None
    room_number: str | None = None
    dietary_note: str | None = None


class TourListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    start_date: date | None
    end_date: date | None
    status: TourStatus
    created_at: datetime


class TourDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    start_date: date | None
    end_date: date | None
    status: TourStatus
    process_error: str | None
    source_filename: str | None
    guest_list_filename: str | None
    guests: list[GuestOut]
    timeline_events: list[TimelineEventSchema]
    created_at: datetime
    updated_at: datetime


class TourCreateResponse(BaseModel):
    id: str
    status: TourStatus
    message: str
