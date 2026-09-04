"""Schema structured-output cho parser_agent (Gemini trích xuất dữ liệu thô).

Dùng làm target của `ChatGoogleGenerativeAI.with_structured_output(...)` —
Gemini bắt buộc trả đúng shape này thay vì text tự do, giảm rủi ro parse lỗi.
"""

from pydantic import BaseModel, Field


class ExtractedGuest(BaseModel):
    full_name: str = Field(description="Họ tên đầy đủ của khách, giữ nguyên dấu tiếng Việt")
    phone_number: str | None = Field(
        default=None, description="Số điện thoại nếu tài liệu có, giữ nguyên định dạng gốc"
    )
    age: int | None = Field(default=None, description="Tuổi nếu tài liệu có ghi rõ hoặc suy ra được (vd 'bé Bin, 5 tuổi')")
    travel_group: str | None = Field(
        default=None,
        description=(
            "Nhãn NGẮN GỌN cho nhóm đi cùng — đặt CÙNG 1 nhãn cho những khách rõ ràng đi chung "
            "(gia đình, cặp đôi, nhóm bạn được liệt kê/nhắc tới cùng nhau trong tài liệu). "
            "Vd 'Gia đình anh Long' cho cả 3 người anh Long/chị Hoa/bé Bin nếu văn bản cho thấy họ đi cùng nhau. "
            "Để trống nếu tài liệu KHÔNG có gợi ý gì về việc đi cùng ai — KHÔNG tự suy đoán/bịa nhóm khi không có căn cứ."
        ),
    )
    seat_number: str | None = Field(default=None, description="Số ghế xe/máy bay nếu có")
    room_number: str | None = Field(default=None, description="Số phòng khách sạn nếu có")
    dietary_note: str | None = Field(
        default=None, description="Lưu ý ăn uống riêng / dị ứng / yêu cầu đặc biệt nếu có"
    )


class ExtractedGuestList(BaseModel):
    """Wrapper cho structured output — with_structured_output cần 1 model gốc,
    không nhận thẳng list[ExtractedGuest]. Dùng cho import danh sách đoàn độc
    lập (không kèm tài liệu lịch trình) — xem parser_agent.extract_guest_list."""

    guests: list[ExtractedGuest] = Field(default_factory=list, description="Toàn bộ khách tìm thấy trong tài liệu")


class ExtractedTourInfo(BaseModel):
    tour_name: str = Field(description="Tên tour, suy ra từ tài liệu nếu không ghi rõ")
    start_date: str | None = Field(default=None, description="Ngày bắt đầu, định dạng YYYY-MM-DD nếu xác định được")
    end_date: str | None = Field(default=None, description="Ngày kết thúc, định dạng YYYY-MM-DD nếu xác định được")
    destinations: list[str] = Field(
        default_factory=list, description="Danh sách điểm đến/điểm tham quan chính theo thứ tự trong tài liệu"
    )
    raw_notes: str | None = Field(
        default=None, description="Ghi chú tổng quan khác không thuộc timeline hay danh sách khách"
    )
    guests: list[ExtractedGuest] = Field(
        default_factory=list, description="Danh sách khách trích xuất được (từ tài liệu lịch trình và/hoặc danh sách đoàn)"
    )
