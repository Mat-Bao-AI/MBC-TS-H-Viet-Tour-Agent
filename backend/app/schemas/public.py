"""Schema cho GET /api/v1/public/tours/{id} — trang lịch trình công khai,
1 URL DÙNG CHUNG cho cả đoàn (không phải link riêng từng khách, xem
app/api/v1/public.py). CHỈ liệt kê field không mang thông tin cá nhân khách —
KHÔNG được thêm field guests/phone_number/seat_number/room_number/... vào
đây dù có tiện đến đâu."""

from datetime import date

from pydantic import BaseModel

from app.schemas.timeline import EventWeather, TimelineEventSchema


class PublicTourView(BaseModel):
    id: str
    name: str
    start_date: date | None
    end_date: date | None
    # False khi HDV chưa duyệt xong timeline (agent còn đang xử lý / lỗi) —
    # FE hiện thông báo "đang chuẩn bị" thay vì trang trống trông như hỏng.
    ready: bool
    timeline_events: list[TimelineEventSchema]
    weather: list[EventWeather] = []
    # Đường dẫn TƯƠNG ĐỐI tới GET /api/v1/public/tours/{id}/cover — None nếu
    # HDV chưa upload ảnh bìa. FE tự ghép với API base để ra URL tuyệt đối
    # (bắt buộc cho <meta property="og:image">, xem frontend/src/app/t/[id]/page.tsx).
    cover_image_url: str | None = None
