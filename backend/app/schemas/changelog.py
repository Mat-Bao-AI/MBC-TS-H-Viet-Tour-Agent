"""Schema cho trang "Về ứng dụng" (app/api/v1/changelog.py) — GET mở cho mọi
User đăng nhập, POST/PUT/DELETE chỉ Admin (require_admin, xem router)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChangelogEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None
    created_at: datetime


class ChangelogEntryCreateRequest(BaseModel):
    title: str
    description: str | None = None


class ChangelogEntryUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
