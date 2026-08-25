"""Cấu hình ứng dụng — đọc từ biến môi trường (.env).

Dùng pydantic-settings để validate sớm: thiếu biến bắt buộc sẽ fail ngay khi
app khởi động thay vì lỗi mơ hồ giữa chừng lúc gọi Gemini/MySQL/Zalo.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    secret_key: str = "dev-secret-key-change-me"

    # Database
    database_url: str = (
        "mysql+aiomysql://tourguide:tourguide_pass@localhost:3306/tourguide_db?charset=utf8mb4"
    )

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"

    # AI provider
    gemini_api_key: str = ""

    # Zalo (Phase 1: unofficial Personal Client via zlapi, QR login)
    zalo_session_dir: str = "./storage/zalo_session"

    # Ports (chỉ dùng khi chạy ngoài docker compose)
    backend_port: int = 8000
    frontend_port: int = 3000

    # Zalo bridge (Node.js service bọc zca-js — xem app/services/zalo_service.py)
    zalo_bridge_url: str = "http://zalo_bridge:4000"

    # Thư mục lưu file tài liệu tour đã upload (Phase 1: local storage)
    upload_dir: str = "./storage/uploads"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def sync_database_url(self) -> str:
        """Biến thể sync (driver pymysql) của DATABASE_URL — dùng trong Celery
        worker để tránh phải quản lý event loop trong context sync của Celery."""
        return self.database_url.replace("mysql+aiomysql://", "mysql+pymysql://")


@lru_cache
def get_settings() -> Settings:
    """Cache Settings — đọc .env 1 lần, tái sử dụng qua Depends(get_settings)."""
    return Settings()
