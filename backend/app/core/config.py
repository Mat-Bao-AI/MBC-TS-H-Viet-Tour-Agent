"""Cấu hình ứng dụng — đọc từ biến môi trường (.env).

Dùng pydantic-settings để validate sớm: thiếu biến bắt buộc sẽ fail ngay khi
app khởi động thay vì lỗi mơ hồ giữa chừng lúc gọi Gemini/MySQL/Zalo.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    # Ký JWT đăng nhập app (xem app/core/security.py) — BẮT BUỘC đổi giá trị
    # thật khi deploy (openssl rand -hex 32), giữ nguyên giá trị = ai cũng tự
    # ký được token giả.
    secret_key: str = "dev-secret-key-change-me"

    # Database
    database_url: str = (
        "mysql+aiomysql://tourguide:tourguide_pass@localhost:3306/tourguide_db?charset=utf8mb4"
    )

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"

    # AI provider — Gemini
    gemini_api_key: str = ""

    # AI provider — Azure OpenAI (thay thế/song song với Gemini). Nếu cả 2 đều
    # được cấu hình thật (không phải placeholder) cùng lúc, hệ thống tự cảnh
    # báo + dùng cơ chế fallback giữa 2 provider — xem app/core/llm.py.
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_deployment: str = ""
    azure_openai_model: str = ""
    azure_openai_api_version: str = "2024-12-01-preview"

    # Provider thử trước khi có ≥2 provider cùng cấu hình ("gemini" | "azure_openai")
    llm_primary_provider: str = "gemini"

    # Ports (chỉ dùng khi chạy ngoài docker compose)
    backend_port: int = 8000
    frontend_port: int = 3000

    # Zalo bridge (Node.js service bọc zca-js — xem app/services/zalo_service.py)
    zalo_bridge_url: str = "http://zalo_bridge:4000"

    # Telegram Bot API — kênh gửi thứ 2 (Phase 3), gọi thẳng httpx từ Python,
    # KHÔNG cần service bridge riêng như Zalo (API chính thức, có tài liệu rõ
    # ràng). Tạo bot qua @BotFather để lấy token.
    telegram_bot_token: str = ""
    # Secret tự đặt (vd openssl rand -hex 32) — dùng để xác thực webhook thật
    # sự đến từ Telegram (header X-Telegram-Bot-Api-Secret-Token phải khớp),
    # tránh ai đó giả mạo request để tự gán telegram_chat_id cho khách người
    # khác. Xem app/api/v1/telegram_webhook.py.
    telegram_webhook_secret: str = ""

    # Thư mục lưu file tài liệu tour đã upload (Phase 1: local storage)
    upload_dir: str = "./storage/uploads"
    max_upload_size_mb: int = 20

    # Secret NỘI BỘ giữa backend <-> zalo-bridge (service Node.js riêng, xem
    # zalo-bridge/src/server.js + app/services/zalo_service.py) — KHÔNG còn
    # liên quan gì tới frontend/trình duyệt nữa (đã thay bằng JWT thật, xem
    # app/core/security.py). Chỉ 2 service backend nội bộ biết giá trị này.
    api_key: str = ""

    # Tài khoản Admin đầu tiên — tạo TỰ ĐỘNG lúc backend khởi động nếu 2 biến
    # này được set VÀ chưa có user nào dùng email đó (idempotent, an toàn chạy
    # lại mỗi lần container start). Không có form tự đăng ký công khai (xem
    # app/api/v1/account.py) nên đây là cách DUY NHẤT có tài khoản đầu tiên.
    # Để trống = không tự tạo gì (vd sau khi đã có Admin thật, có thể xoá 2
    # biến này khỏi .env cho gọn).
    seed_admin_email: str = ""
    seed_admin_password: str = ""

    # Domain frontend thật được phép gọi API khi ENVIRONMENT=production (CORS).
    # Để trống ở production nghĩa là KHÔNG origin nào gọi được — phải set khi deploy.
    allowed_origin: str = ""

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @staticmethod
    def _is_configured(value: str) -> bool:
        """Coi là "đã cấu hình thật" nếu khác rỗng và không phải placeholder
        kiểu your_..._here còn sót lại từ .env.example (rất dễ quên điền)."""
        v = value.strip()
        return bool(v) and not v.lower().startswith("your_")

    @property
    def gemini_configured(self) -> bool:
        return self._is_configured(self.gemini_api_key)

    @property
    def telegram_configured(self) -> bool:
        return self._is_configured(self.telegram_bot_token) and self._is_configured(self.telegram_webhook_secret)

    @property
    def azure_openai_configured(self) -> bool:
        return all(
            self._is_configured(v)
            for v in (
                self.azure_openai_endpoint,
                self.azure_openai_api_key,
                self.azure_openai_deployment,
            )
        )

    @property
    def configured_llm_providers(self) -> list[str]:
        providers = []
        if self.gemini_configured:
            providers.append("gemini")
        if self.azure_openai_configured:
            providers.append("azure_openai")
        return providers

    @property
    def effective_primary_llm_provider(self) -> str | None:
        """Provider THỰC SỰ được dùng đầu tiên — khác `llm_primary_provider`
        (chỉ là preference) khi provider đó chưa thật sự được cấu hình. Vd:
        LLM_PRIMARY_PROVIDER=gemini nhưng chỉ Azure OpenAI có key thật -> trả
        về "azure_openai", không phải "gemini". Dùng chung cho get_structured_llm
        (app/core/llm.py) và /health (app/main.py) để tránh lệch nhau."""
        providers = self.configured_llm_providers
        if not providers:
            return None
        if self.llm_primary_provider in providers:
            return self.llm_primary_provider
        return providers[0]

    @property
    def sync_database_url(self) -> str:
        """Biến thể sync (driver pymysql) của DATABASE_URL — dùng trong Celery
        worker để tránh phải quản lý event loop trong context sync của Celery."""
        return self.database_url.replace("mysql+aiomysql://", "mysql+pymysql://")


@lru_cache
def get_settings() -> Settings:
    """Cache Settings — đọc .env 1 lần, tái sử dụng qua Depends(get_settings)."""
    return Settings()
