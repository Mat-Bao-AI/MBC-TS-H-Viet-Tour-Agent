"""AppSetting — cấu hình đơn giản dạng key-value Admin nhập qua UI (Telegram
bot token/webhook secret, provider AI ưu tiên...), thay cho việc phải sửa
.env + restart container. Giá trị LUÔN lưu mã hoá (Fernet, xem
app/core/crypto.py) kể cả khi bản thân giá trị không hẳn là bí mật (vd tên
provider ưu tiên) — đơn giản hơn phải phân loại field nào cần mã hoá field
nào không, không có nhược điểm thực tế nào khi mã hoá dư.

Đọc/ghi qua app/core/dynamic_config.py, KHÔNG query bảng này trực tiếp ở nơi
khác — dynamic_config còn lo phần fallback về .env khi Admin chưa cấu hình
qua UI."""

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
