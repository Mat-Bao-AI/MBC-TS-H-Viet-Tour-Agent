"""parser_agent — trích xuất dữ liệu có cấu trúc từ tài liệu tour thô.

Input: text thuần đã đọc từ file (app/services/file_processor.py).
Output: ExtractedTourInfo — tên tour, ngày, điểm đến, danh sách khách.
"""

from app.core.llm import get_structured_llm
from app.schemas.extraction import ExtractedGuest, ExtractedGuestList, ExtractedTourInfo

_SYSTEM_PROMPT = """\
Bạn là trợ lý AI xử lý tài liệu lịch trình/briefing tiếng Việt — dùng cho cả \
hướng dẫn viên du lịch (HDV) lẫn nhân sự đi công tác/dự sự kiện. Tài liệu đầu \
vào có thể là 1 HOẶC NHIỀU file gộp lại (vé máy bay, khách sạn, giấy mời, \
agenda, lịch trình tham quan...) — đọc hết rồi hợp nhất thành 1 bức tranh \
chung, đừng xử lý riêng lẻ từng đoạn.

Nhiệm vụ: đọc tài liệu (thường sơ sài, trình bày không nhất quán) và danh \
sách khách/người tham dự (nếu có), rồi trích xuất đúng những gì tài liệu thể \
hiện — bao gồm PHÂN LOẠI loại hình (tour_type) và TÓM TẮT ngắn (summary).

Quy tắc:
- KHÔNG bịa thông tin không có trong tài liệu. Trường nào không xác định được \
thì để trống (null / danh sách rỗng), đừng đoán.
- Giữ nguyên tên riêng, địa danh, số điện thoại đúng như trong tài liệu gốc.
- Nếu ngày tháng ghi kiểu "15/03" mà không rõ năm, để nguyên định dạng gốc vào \
raw_notes thay vì tự suy đoán năm.
- Danh sách khách/người tham dự có thể xuất hiện ở cả 2 nguồn (tài liệu chính \
lẫn danh sách riêng) — gộp lại, tránh trùng lặp theo tên+SĐT.
- Nếu tài liệu cho thấy rõ ai đi CÙNG ai (gia đình, cặp đôi, đoàn nhóm được \
nhắc tới chung với nhau), gán CÙNG 1 nhãn travel_group ngắn gọn cho những \
khách đó — phục vụ xếp phòng sau này (CHỈ áp dụng khi tour_type='tourism', \
công tác/sự kiện thường không cần xếp phòng theo nhóm). KHÔNG tự suy đoán \
nhóm nếu tài liệu không có căn cứ rõ ràng.
- tour_type: đọc kỹ mục đích chuyến đi/tài liệu trước khi gán, đừng mặc định \
'tourism' — 1 tài liệu có vé máy bay + khách sạn + lịch họp là 'business_trip', \
không phải 'tourism' dù có di chuyển/lưu trú.
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
bảng Excel hoặc text tự do: tên, tuổi, số điện thoại, nhóm đi cùng, số ghế, \
số phòng, ghi chú ăn uống...) và trích xuất đúng từng khách một.

Quy tắc:
- KHÔNG bịa thông tin không có trong tài liệu — trường nào không thấy thì để trống.
- Giữ nguyên tên riêng, số điện thoại đúng định dạng gốc.
- Mỗi dòng/mỗi mục thường là 1 khách — đừng gộp nhiều người vào 1 bản ghi trừ \
khi tài liệu rõ ràng ghi chung (vd "2 vợ chồng: Anh A & chị B" thì tách thành 2).
- Nếu có cột/ghi chú kiểu "nhóm", "đi cùng", "gia đình" hoặc văn bản nêu rõ ai \
đi với ai, gán CÙNG 1 nhãn travel_group ngắn gọn cho những khách đó — phục vụ \
xếp phòng sau này. KHÔNG tự suy đoán nhóm nếu tài liệu không có căn cứ rõ ràng.
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
