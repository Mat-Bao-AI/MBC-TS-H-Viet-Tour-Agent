"""Import tất cả models ở đây để Base.metadata "thấy" đủ bảng khi Alembic
autogenerate hoặc khi app khởi động (create_all trong lúc dev nếu cần)."""

from app.models.ai_provider_config import AIProviderConfig
from app.models.app_setting import AppSetting
from app.models.changelog_entry import ChangelogEntry
from app.models.guest import DispatchStatus, Guest
from app.models.room_type import RoomType
from app.models.timeline_event import Timeline
from app.models.tour import Tour, TourStatus
from app.models.user import User, UserRole

__all__ = [
    "Tour",
    "TourStatus",
    "Guest",
    "DispatchStatus",
    "Timeline",
    "RoomType",
    "User",
    "UserRole",
    "AppSetting",
    "AIProviderConfig",
    "ChangelogEntry",
]
