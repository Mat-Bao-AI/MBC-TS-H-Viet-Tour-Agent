"""public.py — trang lịch trình công khai, xuất URL chia sẻ cho khách xem MÀ
KHÔNG cần đăng nhập (khác mọi router khác trong api/v1, đều bắt buộc JWT thật
qua dependency ở api/v1/__init__.py — router này KHÔNG mount qua api_router,
xem app/main.py).

⚠️ BẢO MẬT — quyết định thiết kế đã chốt: 1 URL DÙNG CHUNG cho cả đoàn khách
(không phải link riêng từng người). Vì vậy handler ở đây TUYỆT ĐỐI KHÔNG được
truy vấn/trả về Guest hay bất kỳ field cá nhân nào (SĐT, ghế, phòng, ghi chú
ăn uống...) — chỉ lịch trình chung (tên tour, ngày, mốc giờ, thời tiết). Nếu
sau này cần link riêng từng khách (cá nhân hoá), đó là thiết kế khác (token
riêng/khách) chứ không phải nới endpoint này.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.tours import compute_tour_weather
from app.core.database import get_db
from app.models.tour import Tour
from app.schemas.public import PublicTourView
from app.schemas.timeline import TimelineEventSchema

router = APIRouter(prefix="/public/tours", tags=["public"])


async def _get_tour_or_404(tour_id: str, db: AsyncSession) -> Tour:
    result = await db.execute(select(Tour).where(Tour.id == tour_id).options(selectinload(Tour.timeline)))
    tour = result.scalar_one_or_none()
    if tour is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch trình.")
    return tour


@router.get("/{tour_id}", response_model=PublicTourView)
async def get_public_tour(tour_id: str, db: AsyncSession = Depends(get_db)) -> PublicTourView:
    tour = await _get_tour_or_404(tour_id, db)

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
        cover_image_url=f"/api/v1/public/tours/{tour.id}/cover" if tour.cover_image_path else None,
    )


@router.get("/{tour_id}/cover")
async def get_public_tour_cover(tour_id: str, db: AsyncSession = Depends(get_db)) -> FileResponse:
    """Ảnh bìa tour — public, không có field cá nhân nào nên không vi phạm
    quyết định bảo mật ở đầu file. Dùng làm og:image + hiển thị trên chính
    trang /t/<id>."""
    tour = await _get_tour_or_404(tour_id, db)
    if not tour.cover_image_path:
        raise HTTPException(status_code=404, detail="Tour chưa có ảnh bìa.")
    return FileResponse(tour.cover_image_path)
