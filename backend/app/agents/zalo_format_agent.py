"""zalo_format_agent — định dạng tin nhắn Zalo cá nhân hoá cho từng khách.

Cố tình dùng template xác định (không gọi LLM) thay vì để Gemini tự soạn:
nội dung tin nhắn chứa số ghế/số phòng/giờ đón chính xác — để LLM tự do diễn
đạt lại có rủi ro hallucination đúng vào phần thông tin quan trọng nhất.
Phần "văn phong thân thiện, đúng chuẩn mực dịch vụ lữ hành" đạt được bằng
template cố định do người viết soạn sẵn, không phải sinh động theo từng lần.
"""

from app.core.dynamic_config import get_app_setting_sync
from app.models.guest import Guest
from app.models.tour import Tour
from app.schemas.timeline import TimelineEventSchema

# Khớp _NAME_KEY/_DEFAULT_NAME trong app/api/v1/company.py — không import
# thẳng từ đó (agent không nên phụ thuộc ngược vào tầng api).
_COMPANY_NAME_KEY = "company_name"
_DEFAULT_COMPANY_NAME = "VietTour Agent"


def _format_signature(tour: Tour) -> list[str]:
    """Chữ ký cuối tin nhắn — tên công ty (Phase 2, app/api/v1/company.py) +
    thông tin liên hệ HDV phụ trách CHÍNH tour này (Phase 3, tour.owner).
    tour.owner có thể None (tour tạo từ trước khi có hệ thống auth, đã
    backfill về Admin đầu tiên — hiếm nhưng vẫn phải chịu được, xem
    app/core/seed.py) — bỏ dòng HDV nếu vậy, không lỗi cả tin nhắn."""
    company_name = get_app_setting_sync(_COMPANY_NAME_KEY) or _DEFAULT_COMPANY_NAME
    lines = ["—", company_name]

    owner = tour.owner
    if owner is not None:
        contact_parts = []
        if owner.phone_number:
            contact_parts.append(owner.phone_number)
        if owner.zalo_link:
            contact_parts.append(owner.zalo_link)
        contact_suffix = f" — {' / '.join(contact_parts)}" if contact_parts else ""
        lines.append(f"HDV phụ trách: {owner.full_name}{contact_suffix}")

    return lines


def _format_day_events(day_index: int, events: list[TimelineEventSchema]) -> str:
    day_events = [e for e in events if e.day_index == day_index]
    lines = [f"📅 Ngày {day_index}:"]
    for e in day_events:
        line = f"  • {e.start_time} — {e.title}"
        if e.location:
            line += f" ({e.location})"
        lines.append(line)
        if e.notes:
            lines.append(f"     ⚠️ {e.notes}")
    return "\n".join(lines)


def format_guest_message(tour: Tour, events: list[TimelineEventSchema], guest: Guest) -> str:
    """Tin nhắn Zalo 1-1 gửi riêng cho 1 khách — có thông tin cá nhân hoá
    (số ghế, số phòng, lưu ý ăn uống riêng)."""
    day_indexes = sorted({e.day_index for e in events})
    timeline_text = "\n\n".join(_format_day_events(d, events) for d in day_indexes)

    personal_lines = [f"Xin chào {guest.full_name},", "", f"Lịch trình tour \"{tour.name}\" của bạn:"]

    personal_info = []
    if guest.seat_number:
        personal_info.append(f"🚌 Số ghế: {guest.seat_number}")
    if guest.room_number:
        personal_info.append(f"🛏️ Số phòng: {guest.room_number}")
    if guest.dietary_note:
        personal_info.append(f"🍽️ Lưu ý ăn uống: {guest.dietary_note}")

    parts = personal_lines
    if personal_info:
        parts += ["", *personal_info]
    parts += ["", timeline_text]
    parts += ["", "Chúc quý khách có chuyến đi vui vẻ! 🌸"]
    parts += ["", *_format_signature(tour)]

    return "\n".join(parts)
