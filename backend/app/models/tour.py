"""Tour — 1 chuyến tour do HDV tạo từ tài liệu thô upload lên."""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TourStatus(str, enum.Enum):
    DRAFT = "draft"  # vừa upload, chưa parse
    PARSING = "parsing"  # agent đang trích xuất/sinh timeline
    REVIEW = "review"  # HDV đang xem/sửa
    READY_TO_SEND = "ready_to_send"  # HDV đã xác nhận nội dung cuối
    DISPATCHED = "dispatched"  # đã gửi Zalo cho khách
    FAILED = "failed"  # agent xử lý lỗi (file hỏng, Gemini lỗi...) — HDV có thể bấm xử lý lại


class TourType(str, enum.Enum):
    """Phase 5 (2026-09-05) — tổng quát hoá ngoài tour du lịch thuần tuý,
    dùng chung 1 hạ tầng (upload/agent/timeline/Zalo/trang công khai) cho cả
    công tác/sự kiện. AI tự nhận diện từ tài liệu (xem parser_agent.py), HDV
    không cần chọn tay. Field ảnh hưởng UI: BUSINESS_TRIP/EVENT ẩn quản lý
    loại phòng (RoomTypeManager) — không có khái niệm "xếp phòng theo đoàn"
    cho công tác/sự kiện."""

    TOURISM = "tourism"  # Du lịch — có điểm đến tham quan, đoàn khách, xếp phòng
    BUSINESS_TRIP = "business_trip"  # Công tác — di chuyển vì công việc (vé bay, khách sạn, họp)
    EVENT = "event"  # Sự kiện — chủ yếu mô tả 1 hội thảo/hội nghị/chương trình cụ thể


class Tour(Base):
    __tablename__ = "tours"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    guest_list_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    guest_list_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    process_error: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    # Ảnh bìa tour — tuỳ chọn, dùng cho Open Graph preview khi dán link công
    # khai (/t/<id>) vào Zalo/Messenger, và hiển thị trên chính trang đó. Lưu
    # đường dẫn disk cùng cơ chế với source_path/guest_list_path (xem
    # _save_upload trong app/api/v1/tours.py), phục vụ qua
    # GET /api/v1/public/tours/{id}/cover (app/api/v1/public.py).
    cover_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # ID nhóm Zalo đã tạo cho tour này (qua zca-js createGroup) — null nếu
    # HDV chưa bấm "Tạo nhóm Zalo". 1 tour chỉ tạo nhóm 1 lần, các lần gửi
    # nhóm sau tái dùng ID này.
    zalo_group_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[TourStatus] = mapped_column(
        Enum(TourStatus, native_enum=False, length=20), default=TourStatus.DRAFT, nullable=False
    )
    tour_type: Mapped[TourType] = mapped_column(
        Enum(TourType, native_enum=False, length=20), default=TourType.TOURISM, nullable=False
    )
    # Tóm tắt ngắn (2-3 câu) giúp người đọc chuẩn bị — AI rút từ tài liệu
    # nguồn, KHÔNG bịa nếu tài liệu không đủ ý (xem parser_agent.py).
    summary: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    # Nguồn web của tour tạo từ URL. Lưu snapshot text đã đọc tại thời điểm
    # tạo tour để xử lý lại không phụ thuộc trang gốc sau này thay đổi/mất.
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    source_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_content: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    room_types: Mapped[list["RoomType"]] = relationship(
        "RoomType", back_populates="tour", cascade="all, delete-orphan"
    )
    owner: Mapped["User | None"] = relationship("User", back_populates="tours")
    source_files: Mapped[list["TourSourceFile"]] = relationship(
        "TourSourceFile",
        back_populates="tour",
        cascade="all, delete-orphan",
        order_by="TourSourceFile.order_index",
    )
