"""public.py — trang lịch trình công khai, xuất URL chia sẻ cho khách xem MÀ
KHÔNG cần đăng nhập/API key (khác mọi router khác trong api/v1, đều bắt buộc
X-API-Key qua dependency ở api/v1/__init__.py — router này KHÔNG mount qua
api_router, xem app/main.py).

⚠️ BẢO MẬT — quyết định thiết kế đã chốt: 1 URL DÙNG CHUNG cho cả đoàn khách
(không phải link riêng từng người). Vì vậy handler ở đây TUYỆT ĐỐI KHÔNG được
truy vấn/trả về Guest hay bất kỳ field cá nhân nào (SĐT, ghế, phòng, ghi chú
ăn uống...) — chỉ lịch trình chung (tên tour, ngày, mốc giờ, thời tiết). Nếu
sau này cần link riêng từng khách (cá nhân hoá), đó là thiết kế khác (token
riêng/khách) chứ không phải nới endpoint này.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.tours import compute_tour_weather
from app.core.database import get_db
from app.models.tour import Tour
from app.schemas.public import PublicTourView
from app.schemas.timeline import TimelineEventSchema

router = APIRouter(prefix="/public/tours", tags=["public"])


@router.get("/{tour_id}", response_model=PublicTourView)
async def get_public_tour(tour_id: str, db: AsyncSession = Depends(get_db)) -> PublicTourView:
    result = await db.execute(select(Tour).where(Tour.id == tour_id).options(selectinload(Tour.timeline)))
    tour = result.scalar_one_or_none()
    if tour is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch trình.")

    timeline_events = [TimelineEventSchema(**e) for e in tour.timeline.events] if tour.timeline else []
    weather = await compute_tour_weather(tour)

    return PublicTourView(
        id=tour.id,
        name=tour.name,
        start_date=tour.start_date,
        end_date=tour.end_date,
        ready=bool(timeline_events),
        timeline_events=timeline_events,
        weather=weather,
    )
