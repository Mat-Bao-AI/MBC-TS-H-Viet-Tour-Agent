"""Schema cho GET /api/v1/dashboard — mọi field tính trực tiếp từ dữ liệu
thật đã có (tours/guests), KHÔNG có field nào là placeholder/bịa."""

from datetime import datetime

from pydantic import BaseModel

from app.schemas.tour import TourListItem


class DashboardActivity(BaseModel):
    # "tour_created" | "guest_dispatched" | "tour_failed"
    type: str
    text: str
    timestamp: datetime


class DashboardSummary(BaseModel):
    # Tour được cập nhật gần nhất (đang làm dở/đáng chú ý nhất) — None nếu
    # workspace chưa có tour nào.
    active_tour: TourListItem | None
    recent_activities: list[DashboardActivity]
