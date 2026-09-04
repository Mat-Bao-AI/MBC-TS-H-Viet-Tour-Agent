"""ChangelogEntry — 1 mục trong lịch sử cập nhật app, Admin tự nhập qua UI
(trang "Về ứng dụng"). Không gắn theo tour/user — dùng chung cho cả
workspace, hiển thị cho mọi User đăng nhập (chỉ Admin mới thêm/sửa/xoá được)."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ChangelogEntry(Base):
    __tablename__ = "changelog_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
