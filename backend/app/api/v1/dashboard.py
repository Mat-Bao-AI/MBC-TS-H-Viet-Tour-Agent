"""dashboard.py — tổng quan cho HDV: tour đang làm dở + hoạt động gần đây.

Không có bảng activity-log riêng (chưa cần ở quy mô MVP) — "hoạt động gần
đây" suy ra trực tiếp từ timestamp thật đã có sẵn (Tour.created_at,
Guest.last_dispatched_at), sắp xếp lại theo thời gian. Không mock, không
bịa số liệu.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.tours import tour_to_list_item
from app.core.database import get_db
from app.models.guest import Guest
from app.models.tour import Tour, TourStatus
from app.schemas.dashboard import DashboardActivity, DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_RECENT_LIMIT = 5


@router.get("", response_model=DashboardSummary)
async def get_dashboard(db: AsyncSession = Depends(get_db)) -> DashboardSummary:
    tours_result = await db.execute(
        select(Tour).options(selectinload(Tour.guests)).order_by(Tour.updated_at.desc())
    )
    tours = list(tours_result.scalars().all())
    active_tour = tour_to_list_item(tours[0]) if tours else None

    activities: list[DashboardActivity] = []

    for tour in sorted(tours, key=lambda t: t.created_at, reverse=True)[:_RECENT_LIMIT]:
        activities.append(
            DashboardActivity(type="tour_created", text=f"Tạo tour '{tour.name}'", timestamp=tour.created_at)
        )
        if tour.status == TourStatus.FAILED and tour.process_error:
            activities.append(
                DashboardActivity(
                    type="tour_failed",
                    text=f"Agent xử lý lỗi tour '{tour.name}': {tour.process_error[:100]}",
                    timestamp=tour.updated_at,
                )
            )

    guests_result = await db.execute(
        select(Guest)
        .options(selectinload(Guest.tour))
        .where(Guest.last_dispatched_at.is_not(None))
        .order_by(Guest.last_dispatched_at.desc())
        .limit(_RECENT_LIMIT)
    )
    for guest in guests_result.scalars().all():
        activities.append(
            DashboardActivity(
                type="guest_dispatched",
                text=f"Đã gửi Zalo cho {guest.full_name} ({guest.tour.name})",
                timestamp=guest.last_dispatched_at,
            )
        )

    activities.sort(key=lambda a: a.timestamp, reverse=True)

    return DashboardSummary(active_tour=active_tour, recent_activities=activities[:_RECENT_LIMIT])
