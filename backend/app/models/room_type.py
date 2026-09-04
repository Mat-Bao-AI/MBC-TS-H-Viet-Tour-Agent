"""RoomType — 1 loại phòng khách sạn HDV khai báo cho tour (vd "Phòng đơn",
"Phòng đôi", "Phòng gia đình"), dùng làm tồn kho cho thuật toán tự động xếp
phòng (Phase 4, xem docs/PLAN). Gắn theo TOUR (không phải theo từng đêm nghỉ
riêng) — hợp lý cho đa số tour dùng 1 khách sạn cố định cả chuyến."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RoomType(Base):
    __tablename__ = "room_types"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tour_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tours.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # Sức chứa tối đa/phòng (số người) — dùng để thuật toán Phase 4 chọn loại
    # phòng vừa đủ cho 1 nhóm travel_group (xem app/models/guest.py).
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    # Số phòng loại này HDV có sẵn cho tour — thuật toán Phase 4 trừ dần khi
    # gán, nhóm nào không còn phòng phù hợp thì báo "chưa xếp được".
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    tour: Mapped["Tour"] = relationship("Tour", back_populates="room_types")
