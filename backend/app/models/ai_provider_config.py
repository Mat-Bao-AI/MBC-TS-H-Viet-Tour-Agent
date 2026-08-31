"""AIProviderConfig — cấu hình AI provider Admin nhập qua UI. Khác
AppSetting (key-value phẳng): 1 provider có NHIỀU field liên quan nhau (vd
Azure OpenAI cần endpoint+key+deployment+model+api_version cùng lúc mới
dùng được, không phải 1 giá trị đơn) — gộp thành 1 JSON, mã hoá CẢ KHỐI
(Fernet, xem app/core/crypto.py) thay vì mã hoá từng field riêng lẻ, đơn
giản hơn nhiều mà không có nhược điểm thực tế (field không nhạy cảm như
"model" mã hoá dư cũng không sao).

`provider` là string tự do ("gemini", "azure_openai", ...) — KHÔNG dùng
Enum cứng, để thêm provider mới sau này không cần migration DB, chỉ cần
thêm builder tương ứng trong app/core/llm.py.

Đọc/ghi qua app/core/dynamic_config.py, KHÔNG query bảng này trực tiếp ở
nơi khác."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AIProviderConfig(Base):
    __tablename__ = "ai_provider_configs"

    provider: Mapped[str] = mapped_column(String(50), primary_key=True)
    config_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
