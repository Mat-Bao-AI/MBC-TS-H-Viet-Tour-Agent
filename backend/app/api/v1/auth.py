"""auth.py — đăng nhập Zalo Personal Client (unofficial, QR) qua zalo_bridge.

Không phải auth cho chính app này (chưa có multi-user login ở Phase 1, 1
workspace = 1 HDV) — đây là "đăng nhập" tài khoản Zalo dùng để gửi tin.
"""

from fastapi import APIRouter, HTTPException

from app.schemas.zalo import ZaloLoginStatus
from app.services.zalo_service import ZaloServiceError, get_login_status, start_qr_login

router = APIRouter(prefix="/auth/zalo", tags=["auth"])


@router.post("/login/start", response_model=ZaloLoginStatus)
async def start_login() -> ZaloLoginStatus:
    try:
        data = await start_qr_login()
    except ZaloServiceError as exc:
        raise HTTPException(status_code=502, detail=f"zalo_bridge lỗi: {exc}") from exc
    return ZaloLoginStatus(
        status=data.get("status", "error"),
        qr_data_url=data.get("qrDataUrl"),
        display_name=data.get("displayName"),
        error=data.get("error"),
    )


@router.get("/login/status", response_model=ZaloLoginStatus)
async def login_status() -> ZaloLoginStatus:
    try:
        data = await get_login_status()
    except ZaloServiceError as exc:
        raise HTTPException(status_code=502, detail=f"zalo_bridge lỗi: {exc}") from exc
    return ZaloLoginStatus(
        status=data.get("status", "error"),
        qr_data_url=data.get("qrDataUrl"),
        display_name=data.get("displayName"),
        error=data.get("error"),
    )
