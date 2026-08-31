"""timeline_agent — sinh timeline chi tiết theo từng mốc giờ từ dữ liệu đã
trích xuất (ExtractedTourInfo).

Phase 1: chưa tích hợp weather_service (dời Phase 2 — xem README).
"""

from app.core.llm import get_structured_llm
from app.schemas.extraction import ExtractedTourInfo
from app.schemas.timeline import TimelineEventSchema, TimelineResult

_SYSTEM_PROMPT = """\
Bạn là trợ lý AI lập timeline chi tiết cho tour du lịch tại Việt Nam, dùng \
cho hướng dẫn viên (HDV) và khách hàng.

Từ thông tin tour đã trích xuất (tên tour, ngày, điểm đến, ghi chú), hãy dựng \
timeline chi tiết theo từng ngày (Day 1, Day 2, ...) với các mốc giờ hợp lý:

- Ước tính khoảng cách thời gian di chuyển thực tế hợp lý giữa các điểm đến \
tại Việt Nam (không cần chính xác tuyệt đối, chỉ cần hợp lý về mặt logic — \
vd: không xếp 2 điểm cách nhau 100km chỉ 15 phút).
- Mỗi ngày nên có mốc: giờ khởi hành/tập trung, các điểm tham quan theo thứ tự \
trong destinations, giờ ăn trưa/tối hợp lý (11:30-13:00, 18:00-19:30), giờ về \
khách sạn/kết thúc.
- notes: lưu ý thực tế ngắn gọn cho khách (trang phục phù hợp điểm đến, vật \
dụng nên mang — mũ nón/áo mưa/giày đi bộ..., lưu ý sức khoẻ nếu điểm đến đặc \
thù như leo núi/lặn biển). Chỉ ghi khi thực sự hữu ích, không thêm cho có.
- Nếu raw_notes có thông tin liên quan (giờ bay, giờ hẹn cụ thể...), ưu tiên \
dùng đúng giờ đó thay vì tự ước lượng.
- Nếu thiếu dữ liệu để dựng timeline đầy đủ nhiều ngày, dựng đúng số ngày suy \
ra được từ start_date/end_date hoặc số điểm đến, không bịa thêm ngày.
"""


async def build_timeline(extracted: ExtractedTourInfo) -> list[TimelineEventSchema]:
    structured_llm = await get_structured_llm(TimelineResult, temperature=0.3)

    user_content = (
        f"Tên tour: {extracted.tour_name}\n"
        f"Ngày bắt đầu: {extracted.start_date or 'chưa xác định'}\n"
        f"Ngày kết thúc: {extracted.end_date or 'chưa xác định'}\n"
        f"Điểm đến theo thứ tự: {', '.join(extracted.destinations) or 'chưa xác định'}\n"
        f"Ghi chú thêm: {extracted.raw_notes or 'không có'}\n"
        f"Số lượng khách: {len(extracted.guests)}"
    )

    result: TimelineResult = await structured_llm.ainvoke(
        [
            ("system", _SYSTEM_PROMPT),
            ("human", user_content),
        ]
    )

    return sorted(result.events, key=lambda e: (e.day_index, e.start_time))
