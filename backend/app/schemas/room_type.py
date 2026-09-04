"""Schema cho quản lý loại phòng (app/api/v1/tours.py: /tours/{id}/room-types)
— tồn kho HDV khai báo cho thuật toán tự động xếp phòng (Phase 4)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RoomTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    capacity: int
    quantity: int
    created_at: datetime
    updated_at: datetime


class RoomTypeCreateRequest(BaseModel):
    name: str
    capacity: int = Field(gt=0, description="Số người tối đa/phòng, phải > 0")
    quantity: int = Field(gt=0, description="Số phòng loại này có sẵn, phải > 0")


class RoomTypeUpdateRequest(BaseModel):
    name: str | None = None
    capacity: int | None = Field(default=None, gt=0)
    quantity: int | None = Field(default=None, gt=0)
