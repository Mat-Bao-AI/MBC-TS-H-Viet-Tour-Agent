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
from app.core.security import get_current_user
from app.models.guest import Guest
from app.models.tour import Tour, TourStatus
from app.models.user import User, UserRole
from app.schemas.dashboard import DashboardActivity, DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_RECENT_LIMIT = 5


async def build_recent_activities(db: AsyncSession, current_user: User, limit: int) -> list[DashboardActivity]:
    """Dùng chung cho GET /dashboard (top 5, xem docstring module) và
    GET /dashboard/activities (trang "Thông báo" — xem lại toàn bộ, xem
    frontend/src/app/notifications/page.tsx)."""
    tours_query = select(Tour).options(selectinload(Tour.guests)).order_by(Tour.created_at.desc()).limit(limit)
    if current_user.role != UserRole.ADMIN:
        tours_query = tours_query.where(Tour.owner_id == current_user.id)
    tours_result = await db.execute(tours_query)
    tours = list(tours_result.scalars().all())

    activities: list[DashboardActivity] = []

    for tour in tours:
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

    guests_query = (
        select(Guest)
        .join(Tour, Guest.tour_id == Tour.id)
        .options(selectinload(Guest.tour))
        .where(Guest.last_dispatched_at.is_not(None))
        .order_by(Guest.last_dispatched_at.desc())
        .limit(limit)
    )
    if current_user.role != UserRole.ADMIN:
        guests_query = guests_query.where(Tour.owner_id == current_user.id)
    guests_result = await db.execute(guests_query)
    for guest in guests_result.scalars().all():
        activities.append(
            DashboardActivity(
                type="guest_dispatched",
                text=f"Đã gửi Zalo cho {guest.full_name} ({guest.tour.name})",
                timestamp=guest.last_dispatched_at,
            )
        )

    activities.sort(key=lambda a: a.timestamp, reverse=True)
    return activities[:limit]


@router.get("", response_model=DashboardSummary)
async def get_dashboard(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> DashboardSummary:
    tours_query = select(Tour).options(selectinload(Tour.guests)).order_by(Tour.updated_at.desc())
    if current_user.role != UserRole.ADMIN:
        tours_query = tours_query.where(Tour.owner_id == current_user.id)
    tours_result = await db.execute(tours_query)
    tours = list(tours_result.scalars().all())
    active_tour = tour_to_list_item(tours[0]) if tours else None

    activities = await build_recent_activities(db, current_user, _RECENT_LIMIT)

    return DashboardSummary(active_tour=active_tour, recent_activities=activities)


@router.get("/activities", response_model=list[DashboardActivity])
async def list_activities(
    limit: int = 100, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[DashboardActivity]:
    """Toàn bộ lịch sử hoạt động (trang "Thông báo") — khác GET /dashboard
    (chỉ 5 cái mới nhất cho tổng quan nhanh)."""
    return await build_recent_activities(db, current_user, limit)
