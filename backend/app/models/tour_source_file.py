"""TourSourceFile — 1 trong tối đa 5 tài liệu nguồn HDV upload cho 1 tour
(vé máy bay, khách sạn, giấy mời, agenda...). Agent đọc + nối text từ TẤT
CẢ file theo order_index rồi mới trích xuất (xem app/api/v1/agent.py)."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TourSourceFile(Base):
    __tablename__ = "tour_source_files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tour_id: Mapped[str] = mapped_column(String(36), ForeignKey("tours.id", ondelete="CASCADE"), nullable=False, index=True)
    path: Mapped[str] = mapped_column(String(500), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    tour: Mapped["Tour"] = relationship("Tour", back_populates="source_files")
