"""Tour — 1 chuyến tour do HDV tạo từ tài liệu thô upload lên."""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TourStatus(str, enum.Enum):
    DRAFT = "draft"  # vừa upload, chưa parse
    PARSING = "parsing"  # agent đang trích xuất/sinh timeline
    REVIEW = "review"  # HDV đang xem/sửa
    DISPATCHED = "dispatched"  # đã gửi Zalo cho khách
    FAILED = "failed"  # agent xử lý lỗi (file hỏng, Gemini lỗi...) — HDV có thể bấm xử lý lại


class Tour(Base):
    __tablename__ = "tours"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    source_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    guest_list_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    guest_list_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    process_error: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    # ID nhóm Zalo đã tạo cho tour này (qua zca-js createGroup) — null nếu
    # HDV chưa bấm "Tạo nhóm Zalo". 1 tour chỉ tạo nhóm 1 lần, các lần gửi
    # nhóm sau tái dùng ID này.
    zalo_group_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[TourStatus] = mapped_column(
        Enum(TourStatus, native_enum=False, length=20), default=TourStatus.DRAFT, nullable=False
    )
    # Multi-tenant theo HDV — nullable vì tour tạo TRƯỚC khi có hệ thống auth
    # (không có chủ) vẫn phải đọc/hiển thị được; seed_admin_if_configured()
    # (app/core/seed.py) backfill các tour này về Admin đầu tiên lúc khởi
    # động. Tour tạo mới LUÔN có owner_id (set ở create_tour). Xem
    # app/core/access.py cho logic lọc theo quyền sở hữu.
    owner_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    guests: Mapped[list["Guest"]] = relationship(
        "Guest", back_populates="tour", cascade="all, delete-orphan"
    )
    timeline: Mapped["Timeline | None"] = relationship(
        "Timeline", back_populates="tour", uselist=False, cascade="all, delete-orphan"
    )
    owner: Mapped["User | None"] = relationship("User", back_populates="tours")
