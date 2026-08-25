"""parser_agent — trích xuất dữ liệu có cấu trúc từ tài liệu tour thô.

Input: text thuần đã đọc từ file (app/services/file_processor.py).
Output: ExtractedTourInfo — tên tour, ngày, điểm đến, danh sách khách.
"""

from app.core.llm import get_structured_llm
from app.schemas.extraction import ExtractedTourInfo

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
    structured_llm = get_structured_llm(ExtractedTourInfo, temperature=0.1)

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
