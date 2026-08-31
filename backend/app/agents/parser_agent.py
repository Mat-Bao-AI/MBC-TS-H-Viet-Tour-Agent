"""parser_agent — trích xuất dữ liệu có cấu trúc từ tài liệu tour thô.

Input: text thuần đã đọc từ file (app/services/file_processor.py).
Output: ExtractedTourInfo — tên tour, ngày, điểm đến, danh sách khách.
"""

from app.core.llm import get_structured_llm
from app.schemas.extraction import ExtractedGuest, ExtractedGuestList, ExtractedTourInfo

_SYSTEM_PROMPT = """\
Bạn là trợ lý AI chuyên xử lý tài liệu lữ hành tiếng Việt cho hướng dẫn viên \
du lịch (HDV). Nhiệm vụ: đọc tài liệu lịch trình tour thô (thường sơ sài, \
trình bày không nhất quán) và danh sách khách (nếu có), rồi trích xuất đúng \
những gì tài liệu thể hiện.

Quy tắc:
- KHÔNG bịa thông tin không có trong tài liệu. Trường nào không xác định được \
thì để trống (null / danh sách rỗng), đừng đoán.
- Giữ nguyên tên riêng, địa danh, số điện thoại đúng như trong tài liệu gốc.
- Nếu ngày tháng ghi kiểu "15/03" mà không rõ năm, để nguyên định dạng gốc vào \
raw_notes thay vì tự suy đoán năm.
- Danh sách khách có thể xuất hiện ở cả 2 nguồn (tài liệu lịch trình lẫn danh \
sách đoàn riêng) — gộp lại, tránh trùng lặp theo tên+SĐT.
"""


async def extract_tour_info(itinerary_text: str, guest_list_text: str | None = None) -> ExtractedTourInfo:
    structured_llm = await get_structured_llm(ExtractedTourInfo, temperature=0.1)

    user_content = f"## Tài liệu lịch trình tour\n{itinerary_text.strip()}"
    if guest_list_text and guest_list_text.strip():
        user_content += f"\n\n## Danh sách đoàn (file riêng)\n{guest_list_text.strip()}"

    result = await structured_llm.ainvoke(
        [
            ("system", _SYSTEM_PROMPT),
            ("human", user_content),
        ]
    )
    return result


_GUEST_LIST_SYSTEM_PROMPT = """\
Bạn là trợ lý AI đọc danh sách đoàn khách du lịch tiếng Việt (thường ở dạng \
bảng Excel hoặc text tự do: tên, số điện thoại, số ghế, số phòng, ghi chú ăn \
uống...) và trích xuất đúng từng khách một.

Quy tắc:
- KHÔNG bịa thông tin không có trong tài liệu — trường nào không thấy thì để trống.
- Giữ nguyên tên riêng, số điện thoại đúng định dạng gốc.
- Mỗi dòng/mỗi mục thường là 1 khách — đừng gộp nhiều người vào 1 bản ghi trừ \
khi tài liệu rõ ràng ghi chung (vd "2 vợ chồng: Anh A & chị B" thì tách thành 2).
"""


async def extract_guest_list(text: str) -> list[ExtractedGuest]:
    """Trích xuất DANH SÁCH KHÁCH từ 1 file độc lập (không kèm tài liệu lịch
    trình) — dùng cho luồng "Nhập danh sách" bổ sung khách vào tour đã có
    (app/api/v1/tours.py: import_guests), khác với extract_tour_info ở trên
    (bắt buộc phải có tour_name nên không hợp cho trường hợp chỉ có khách)."""
    structured_llm = await get_structured_llm(ExtractedGuestList, temperature=0.1)

    result = await structured_llm.ainvoke(
        [
            ("system", _GUEST_LIST_SYSTEM_PROMPT),
            ("human", f"## Danh sách đoàn\n{text.strip()}"),
        ]
    )
    return result.guests
