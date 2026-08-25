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

    # Ports (chỉ dùng khi chạy ngoài docker compose)
    backend_port: int = 8000
    frontend_port: int = 3000

    # Zalo bridge (Node.js service bọc zca-js — xem app/services/zalo_service.py)
    zalo_bridge_url: str = "http://zalo_bridge:4000"

    # Thư mục lưu file tài liệu tour đã upload (Phase 1: local storage)
    upload_dir: str = "./storage/uploads"
    max_upload_size_mb: int = 20

    # API key tối thiểu bảo vệ toàn bộ /api/v1/* (xem app/core/security.py).
    # ⚠️ KHÔNG phải auth đầy đủ (chưa có user/role) — chỉ đủ chặn truy cập ngẫu
    # nhiên từ mạng ngoài. Frontend gửi key này qua NEXT_PUBLIC_API_KEY (biến
    # NEXT_PUBLIC_* bị inline vào bundle trình duyệt — bất kỳ ai mở DevTools
    # trên trang đều đọc được key). Phù hợp scope MVP 1 HDV/1 workspace; KHÔNG
    # đủ an toàn nếu đây là hệ thống nhiều người dùng không tin tưởng lẫn nhau.
    api_key: str = ""

    # Domain frontend thật được phép gọi API khi ENVIRONMENT=production (CORS).
    # Để trống ở production nghĩa là KHÔNG origin nào gọi được — phải set khi deploy.
    allowed_origin: str = ""

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
