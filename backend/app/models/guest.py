"""Guest — 1 khách trong đoàn tour, nhận tin nhắn Zalo cá nhân hoá."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DispatchStatus(str, enum.Enum):
    PENDING = "pending"  # chưa gửi
    SENT = "sent"  # đã gửi qua Zalo
    READ = "read"  # khách đã đọc (Phase 2: cần Zalo trả webhook/seen status)
    CONFIRMED = "confirmed"  # khách xác nhận tham gia (Phase 2: RSVP)
    FAILED = "failed"  # gửi lỗi (vd. không tìm được zalo_id từ SĐT)


class Guest(Base):
    __tablename__ = "guests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tour_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tours.id", ondelete="CASCADE"), nullable=False, index=True
    )

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    zalo_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    seat_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    room_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dietary_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    dispatch_status: Mapped[DispatchStatus] = mapped_column(
        Enum(DispatchStatus, native_enum=False, length=20),
        default=DispatchStatus.PENDING,
        nullable=False,
    )
    last_dispatched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    tour: Mapped["Tour"] = relationship("Tour", back_populates="guests")
