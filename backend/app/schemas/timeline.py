"""Schema structured-output cho timeline_agent, và schema I/O cho API tours.py."""

from pydantic import BaseModel, Field


class AgendaItemSchema(BaseModel):
    time: str | None = Field(
        default=None, description="Khung giờ mục này trong chương trình con, vd '14:00-14:10'; để trống nếu tài liệu không ghi rõ"
    )
    content: str = Field(description="Nội dung mục chương trình")
    speaker: str | None = Field(default=None, description="Người trình bày/phụ trách nếu tài liệu có ghi rõ")


class EventProgramSchema(BaseModel):
    """Chương trình con của 1 mốc timeline — CHỈ tồn tại khi tài liệu nguồn
    mô tả chi tiết riêng cho mốc đó (agenda, thành phần tham dự, liên hệ
    BTC) như 1 hội thảo/hội nghị/buổi họp có giấy mời/chương trình riêng.
    Mốc đơn giản (ăn uống, di chuyển, nghỉ ngơi) KHÔNG có program (None)."""

    organizer: str | None = Field(default=None, description="Đơn vị/người tổ chức, nếu tài liệu có ghi")
    attendees: str | None = Field(default=None, description="Thành phần tham dự, nếu tài liệu có mô tả")
    contact_name: str | None = Field(default=None, description="Tên người liên hệ của BTC, nếu có")
    contact_phone: str | None = Field(default=None, description="SĐT liên hệ BTC, nếu có")
    agenda: list[AgendaItemSchema] = Field(
        default_factory=list, description="Chi tiết chương trình theo thứ tự thời gian, lấy đúng từ tài liệu"
    )
    suggestions: list[str] = Field(
        default_factory=list,
        description=(
            "Gợi ý chuẩn bị/lưu ý RÚT THẲNG từ nội dung tài liệu (vd trang phục, giờ giấc, mang gì) — "
            "KHÔNG suy diễn quan hệ kinh doanh/chiến lược không có căn cứ trong tài liệu."
        ),
    )


class TimelineEventSchema(BaseModel):
    day_index: int = Field(description="Ngày thứ mấy trong tour, bắt đầu từ 1 (Day 1, Day 2...)")
    start_time: str = Field(description="Giờ bắt đầu, định dạng HH:MM 24h")
    title: str = Field(description="Tên hoạt động/mốc sự kiện, ngắn gọn")
    location: str | None = Field(default=None, description="Địa điểm diễn ra")
    notes: str | None = Field(
        default=None,
        description="Lưu ý thực tế cho khách: trang phục, vật dụng cần mang, lưu ý sức khoẻ...",
    )
    program: EventProgramSchema | None = Field(
        default=None,
        description=(
            "CHỈ điền khi tài liệu nguồn mô tả chi tiết riêng cho mốc này (hội thảo/hội nghị/họp có "
            "agenda/thành phần/liên hệ riêng) — để None cho mốc đơn giản (ăn uống, di chuyển, nghỉ ngơi, "
            "check-in/check-out). Không tự bịa program nếu tài liệu chỉ nhắc tên sự kiện mà không có "
            "chương trình chi tiết đi kèm."
        ),
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
