"""User — tài khoản đăng nhập CHÍNH APP (Admin/HDV). Khác Guest.zalo_id hay
zalo_service (đó là tài khoản Zalo CÁ NHÂN dùng để gửi tin, xem app/api/v1/auth.py) —
đây là danh tính người dùng app, dùng cho login + multi-tenant (mỗi HDV chỉ
thấy tour do chính mình tạo, xem app/core/access.py)."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"  # HDV — chỉ thấy/thao tác tour do chính mình tạo


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, length=20), default=UserRole.USER, nullable=False
    )

    # Liên hệ phụ, tuỳ chọn — hiển thị ở hồ sơ, KHÔNG dùng cho auth.
    facebook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    zalo_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Ảnh đại diện HDV — tự upload qua PUT /auth/me/avatar (Phase 3), hiển thị
    # ở Sidebar/hồ sơ. Lưu file disk cùng cơ chế cover_image_path (Tour).
    avatar_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Admin khoá tài khoản HDV bằng cờ này thay vì xoá (giữ lại tour đã tạo).
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    tours: Mapped[list["Tour"]] = relationship("Tour", back_populates="owner")

    @property
    def has_avatar(self) -> bool:
        """Property thường (không phải cột DB) — Pydantic from_attributes đọc
        được qua getattr như field bình thường, xem app/schemas/user.py
        UserOut.has_avatar. Không lộ đường dẫn file thật ra API."""
        return bool(self.avatar_path)
