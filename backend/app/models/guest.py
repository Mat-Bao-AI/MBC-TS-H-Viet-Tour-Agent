"""Guest — 1 khách trong đoàn tour, nhận tin nhắn Zalo cá nhân hoá."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DispatchStatus(str, enum.Enum):
    PENDING = "pending"  # chưa gửi
    SENT = "sent"  # đã gửi qua kênh đã chọn (Zalo/Telegram)
    READ = "read"  # khách đã đọc (HDV tự đánh dấu — chưa có webhook seen-status tự động)
    CONFIRMED = "confirmed"  # khách xác nhận tham gia (HDV tự đánh dấu)
    FAILED = "failed"  # gửi lỗi (vd. không tìm được id kênh từ SĐT)


class NotificationChannel(str, enum.Enum):
    """Kênh HDV chọn để gửi thông báo cho khách này — mỗi khách 1 kênh
    (không multi-channel per-guest, xem docs/PLAN — quyết định giữ đơn giản
    khi thêm Telegram/Web link cạnh Zalo)."""

    ZALO = "zalo"
    TELEGRAM = "telegram"


class Guest(Base):
    __tablename__ = "guests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tour_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tours.id", ondelete="CASCADE"), nullable=False, index=True
    )

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    zalo_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # ID chat Telegram của khách — chỉ có sau khi khách tự bấm deep-link
    # t.me/<bot>?start=<mã_khách> và bot ghi nhận qua webhook (xem
    # app/services/notification/telegram_sender.py). Bot KHÔNG có cách nào
    # tự tìm ra chat_id từ SĐT như Zalo — bắt buộc khách phải chủ động bấm
    # trước, đây là giới hạn thật của nền tảng Telegram, không phải thiếu sót.
    telegram_chat_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notification_channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, native_enum=False, length=20),
        default=NotificationChannel.ZALO,
        nullable=False,
    )

    seat_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    room_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
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
