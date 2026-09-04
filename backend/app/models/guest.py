"""Guest — 1 khách trong đoàn tour, nhận tin nhắn Zalo cá nhân hoá."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DispatchStatus(str, enum.Enum):
    PENDING = "pending"  # chưa gửi
    SENT = "sent"  # đã gửi qua Zalo
    READ = "read"  # khách đã đọc (HDV tự đánh dấu — chưa có webhook seen-status tự động)
    CONFIRMED = "confirmed"  # khách xác nhận tham gia (HDV tự đánh dấu)
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
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Nhãn nhóm đi cùng — khách trong CÙNG 1 tour có cùng giá trị này được coi
    # là 1 nhóm đi chung (gia đình/cặp đôi/bạn bè...), dùng để xếp phòng
    # thông minh (Phase 3-4, xem docs/PLAN). Agent trích xuất tự đặt nhãn theo
    # suy luận từ văn bản (vd "anh Long, chị Hoa và bé Bin" → cùng 1 nhãn);
    # HDV có thể tự sửa lại qua UI. Để trống = đi 1 mình / chưa xác định nhóm.
    travel_group: Mapped[str | None] = mapped_column(String(100), nullable=True)

    seat_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Số phòng THẬT — HDV tự điền tay sau khi khách sạn xác nhận lúc check-in.
    # KHÁC room_type_id bên dưới — thuật toán tự động xếp phòng (Phase 4)
    # KHÔNG BAO GIỜ đụng tới field này.
    room_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Loại phòng GỢI Ý do thuật toán tự động xếp phòng gán (app/services/
    # room_assignment.py, POST /tours/{id}/auto-assign-rooms) — chỉ là đề
    # xuất, không phải số phòng thật. SET NULL khi loại phòng bị xoá (không
    # xoá khách theo) — mỗi lần chạy lại thuật toán sẽ tính lại và ghi đè.
    room_type_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("room_types.id", ondelete="SET NULL"), nullable=True
    )
    dietary_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    dispatch_status: Mapped[DispatchStatus] = mapped_column(
        Enum(DispatchStatus, native_enum=False, length=20),
        default=DispatchStatus.PENDING,
        nullable=False,
    )
    last_dispatched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Lý do thật lần gửi gần nhất thất bại (nếu có) — trước đây Celery task
    # chỉ set dispatch_status=FAILED, không lưu lý do ở đâu HDV xem được, nên
    # tin gửi lỗi trông như "đã gửi" mà khách không nhận được. Xoá (None) khi
    # gửi thành công lần kế tiếp.
    dispatch_error: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    tour: Mapped["Tour"] = relationship("Tour", back_populates="guests")
    room_type: Mapped["RoomType | None"] = relationship("RoomType")
