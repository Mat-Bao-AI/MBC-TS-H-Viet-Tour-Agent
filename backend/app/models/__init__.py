"""Import tất cả models ở đây để Base.metadata "thấy" đủ bảng khi Alembic
autogenerate hoặc khi app khởi động (create_all trong lúc dev nếu cần)."""

from app.models.guest import DispatchStatus, Guest
from app.models.timeline_event import Timeline
from app.models.tour import Tour, TourStatus

__all__ = [
    "Tour",
    "TourStatus",
    "Guest",
    "DispatchStatus",
    "Timeline",
]
