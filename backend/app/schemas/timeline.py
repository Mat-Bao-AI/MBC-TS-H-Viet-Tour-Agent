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


class EventWeather(BaseModel):
    """Thời tiết cho 1 (ngày, địa điểm) trong timeline — trả về
    GET /tours/{id}/weather và GET /public/tours/{id}, ghép lại ở FE theo
    (day_index, location). Không có bản ghi nào bịa — thiếu ngày tour hoặc
    Open-Meteo không có dữ liệu (cả dự báo lẫn khí hậu lịch sử) thì đơn giản
    là không có trong danh sách.

    is_forecast phân biệt 2 loại dữ liệu THẬT nhưng khác bản chất — FE PHẢI
    hiển thị khác nhau, không được gộp chung coi như nhau:
    - True: dự báo thật (Open-Meteo forecast, chỉ có trong ~16 ngày tới).
    - False: trung bình nhiều năm — dữ liệu khí hậu thực đo quá khứ
      (Open-Meteo Archive), dùng khi tour ngoài phạm vi dự báo. Là THAM
      KHẢO xu hướng thời tiết mùa đó, KHÔNG phải dự báo chính xác cho đúng
      ngày đó."""

    day_index: int
    location: str
    date: str  # YYYY-MM-DD
    temp_min: float
    temp_max: float
    description: str
    icon: str
    is_forecast: bool = True
