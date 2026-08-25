"""API key tối thiểu cho toàn bộ /api/v1/* — xem ghi chú giới hạn trong
app/core/config.py (Settings.api_key). Không phải hệ thống auth đầy đủ.
"""

from fastapi import Header, HTTPException

from app.core.config import get_settings


async def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    settings = get_settings()

    if not settings.api_key:
        # Chưa cấu hình API_KEY trong .env — chặn cứng thay vì âm thầm mở cửa,
        # để lỗi hiện rõ ngay từ lúc setup thay vì phát hiện ra khi đã bị lộ.
        raise HTTPException(
            status_code=500,
            detail="API_KEY chưa được cấu hình trong .env — xem .env.example.",
        )

    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Thiếu hoặc sai X-API-Key.")
