"""Schema structured-output cho timeline_agent, và schema I/O cho API tours.py."""

from pydantic import BaseModel, Field


class TimelineEventSchema(BaseModel):
    day_index: int = Field(description="Ngày thứ mấy trong tour, bắt đầu từ 1 (Day 1, Day 2...)")
    start_time: str = Field(description="Giờ bắt đầu, định dạng HH:MM 24h")
    title: str = Field(description="Tên hoạt động/mốc sự kiện, ngắn gọn")
    location: str | None = Field(default=None, description="Địa điểm diễn ra")
    notes: str | None = Field(
        default=None,
        description="Lưu ý thực tế cho khách: trang phục, vật dụng cần mang, lưu ý sức khoẻ...",
    )


class TimelineResult(BaseModel):
    events: list[TimelineEventSchema] = Field(
        description="Toàn bộ mốc sự kiện của tour, sắp xếp theo day_index rồi start_time tăng dần"
    )


class TimelineEventIn(TimelineEventSchema):
    """Payload khi HDV lưu timeline đã chỉnh sửa (PUT /tours/{id}/timeline)."""


class TimelineUpdateRequest(BaseModel):
    events: list[TimelineEventIn]
