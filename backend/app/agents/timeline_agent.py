"""timeline_agent — sinh timeline chi tiết theo từng mốc giờ từ dữ liệu đã
trích xuất (ExtractedTourInfo).

Phase 1: chưa tích hợp weather_service (dời Phase 2 — xem README).
"""

from app.core.llm import get_structured_llm
from app.schemas.extraction import ExtractedTourInfo
from app.schemas.timeline import TimelineEventSchema, TimelineResult

_COMMON_RULES = """\
- Nếu raw_notes có thông tin liên quan (giờ bay, giờ hẹn cụ thể...), ưu tiên \
dùng đúng giờ đó thay vì tự ước lượng.
- Nếu thiếu dữ liệu để dựng timeline đầy đủ nhiều ngày, dựng đúng số ngày suy \
ra được từ start_date/end_date hoặc số điểm đến, không bịa thêm ngày.
- Với mốc là 1 SỰ KIỆN CÓ CHƯƠNG TRÌNH CHI TIẾT RIÊNG trong toàn văn tài liệu \
(hội thảo/hội nghị/họp có agenda theo giờ, thành phần tham dự, liên hệ BTC) — \
điền đầy đủ vào `program` của ĐÚNG mốc đó: agenda lấy nguyên đúng giờ+nội dung \
+diễn giả có trong tài liệu (không bịa thêm mục agenda không có thật), \
organizer/attendees/contact lấy đúng như tài liệu ghi. suggestions chỉ nêu \
điều RÚT ĐƯỢC từ chính tài liệu (giờ giấc cần lưu ý, trang phục, cần mang gì, \
liên hệ khi cần) — KHÔNG suy đoán quan hệ kinh doanh/chiến lược ngoài phạm vi \
tài liệu.
- Mốc đơn giản (ăn uống, di chuyển, nghỉ ngơi, check-in/check-out khách sạn) \
để `program` = null — đừng tạo program rỗng/hời hợt cho có.
- Nguồn Brave Search (nếu có) chỉ là thông tin tham khảo bổ sung: không coi \
là dữ kiện chắc chắn, không bịa giờ mở cửa/giá vé/lịch vận hành và không \
trích dẫn nó như xác nhận đặt chỗ.
"""

_TYPE_GUIDANCE = {
    "tourism": """\
Bạn là trợ lý AI lập timeline chi tiết cho tour du lịch tại Việt Nam, dùng \
cho hướng dẫn viên (HDV) và khách hàng.

- Ước tính khoảng cách thời gian di chuyển thực tế hợp lý giữa các điểm đến \
tại Việt Nam (không cần chính xác tuyệt đối, chỉ cần hợp lý về mặt logic — \
vd: không xếp 2 điểm cách nhau 100km chỉ 15 phút).
- Mỗi ngày nên có mốc: giờ khởi hành/tập trung, các điểm tham quan theo thứ tự \
trong destinations, giờ ăn trưa/tối hợp lý (11:30-13:00, 18:00-19:30), giờ về \
khách sạn/kết thúc.
- notes: lưu ý thực tế ngắn gọn cho khách (trang phục phù hợp điểm đến, vật \
dụng nên mang — mũ nón/áo mưa/giày đi bộ..., lưu ý sức khoẻ nếu điểm đến đặc \
thù như leo núi/lặn biển). Chỉ ghi khi thực sự hữu ích, không thêm cho có.
""",
    "business_trip": """\
Bạn là trợ lý AI lập timeline chi tiết cho 1 chuyến công tác, dùng cho người \
đi công tác chuẩn bị và theo dõi lịch trình.

- Timeline xoay quanh LOGISTICS công việc: giờ bay/tàu/xe, check-in/check-out \
khách sạn, các cuộc họp/hội thảo theo đúng giờ đã biết — KHÔNG chèn thêm mốc \
"tham quan"/"nghỉ dưỡng" nếu tài liệu không nhắc tới.
- Giữa các mốc chính (họp/di chuyển), có thể thêm mốc ăn uống hợp lý \
(11:30-13:00, 18:00-19:30) và mốc di chuyển thực tế giữa các địa điểm nếu \
tài liệu có đủ địa chỉ để ước lượng.
- notes: lưu ý thực tế cho người đi công tác (trang phục họp, giấy tờ cần \
mang, thời gian đệm trước chuyến bay/cuộc họp quan trọng). Chỉ ghi khi thực \
sự hữu ích.
""",
    "event": """\
Bạn là trợ lý AI dựng lại chương trình 1 sự kiện/hội thảo/hội nghị thành \
timeline theo mốc giờ, dùng cho người tham dự theo dõi.

- Bám sát ĐÚNG giờ và nội dung agenda đã có trong tài liệu — đây là dữ liệu \
quan trọng nhất, không tự thêm mốc không có căn cứ.
- Nếu tài liệu chỉ có 1 buổi/1 ngày, không tự kéo dài thành nhiều ngày.
- notes: ghi lại thông tin thành phần/liên hệ BTC nếu tài liệu có, giúp người \
tham dự biết cần chuẩn bị gì.
""",
}


async def build_timeline(
    extracted: ExtractedTourInfo, itinerary_text: str, web_context: str | None = None
) -> list[TimelineEventSchema]:
    structured_llm = await get_structured_llm(TimelineResult, temperature=0.3)

    system_prompt = _TYPE_GUIDANCE.get(extracted.tour_type, _TYPE_GUIDANCE["tourism"]) + "\n" + _COMMON_RULES

    user_content = (
        f"Tên tour: {extracted.tour_name}\n"
        f"Loại hình: {extracted.tour_type}\n"
        f"Ngày bắt đầu: {extracted.start_date or 'chưa xác định'}\n"
        f"Ngày kết thúc: {extracted.end_date or 'chưa xác định'}\n"
        f"Điểm đến theo thứ tự: {', '.join(extracted.destinations) or 'chưa xác định'}\n"
        f"Ghi chú thêm: {extracted.raw_notes or 'không có'}\n"
        f"Số lượng khách: {len(extracted.guests)}\n\n"
        f"## Toàn văn tài liệu nguồn (dùng để trích chi tiết chương trình 'program' cho mốc sự kiện chính)\n"
        f"{itinerary_text.strip()}"
    )
    if web_context:
        user_content += f"\n\n## Nguồn Brave Search tham khảo (tuỳ chọn)\n{web_context}"

    result: TimelineResult = await structured_llm.ainvoke(
        [
            ("system", system_prompt),
            ("human", user_content),
        ]
    )

    return sorted(result.events, key=lambda e: (e.day_index, e.start_time))
