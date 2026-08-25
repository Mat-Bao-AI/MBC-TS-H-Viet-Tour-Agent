"""Timeline — timeline chi tiết của 1 tour, 1-1 với Tour.

Theo thiết kế trong tài liệu mô tả sản phẩm: tận dụng JSON datatype của MySQL
8.0 để lưu mảng sự kiện (`events`) linh hoạt thay vì 1 bảng quan hệ riêng cho
từng event — phù hợp với thao tác kéo-thả sắp xếp lại timeline trên frontend
(timeline-builder.tsx) chỉ cần ghi đè lại mảng, không cần đồng bộ nhiều dòng.

Mỗi phần tử trong `events` có dạng:
    {
        "day_index": 1,
        "start_time": "07:30",
        "title": "Đón khách tại sân bay Tân Sơn Nhất",
        "location": "Sân bay Tân Sơn Nhất, TP.HCM",
        "notes": "Mang biển tên đoàn, tập trung tại cổng A"
    }
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Timeline(Base):
    __tablename__ = "timelines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tour_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tours.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    events: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    extra_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    tour: Mapped["Tour"] = relationship("Tour", back_populates="timeline")
