"""Client gọi sang service zalo_bridge (Node.js, bọc zca-js) qua HTTP nội bộ.

Có 2 biến thể: async (dùng trong FastAPI endpoint — app/api/v1/auth.py,
app/api/v1/zalo.py) và sync (dùng trong Celery task — chạy trong context sync,
xem app/tasks/celery_worker.py).
"""

import httpx

from app.core.config import get_settings


class ZaloServiceError(RuntimeError):
    """Bridge trả lỗi (chưa đăng nhập, không tìm thấy user, gửi tin thất bại...)."""


def _bridge_url(path: str) -> str:
    settings = get_settings()
    return f"{settings.zalo_bridge_url.rstrip('/')}{path}"


def _raise_for_bridge_error(response: httpx.Response) -> None:
    if response.status_code >= 400:
        try:
            detail = response.json().get("error", response.text)
        except Exception:
            detail = response.text
        raise ZaloServiceError(detail)


# ---- Async (dùng trong FastAPI endpoints) ----------------------------------


async def start_qr_login() -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(_bridge_url("/login/qr/start"))
        _raise_for_bridge_error(response)
        return response.json()


async def get_login_status() -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(_bridge_url("/login/status"))
        _raise_for_bridge_error(response)
        return response.json()


async def resolve_user_by_phone(phone_number: str) -> dict | None:
    """Trả về {"zaloId": ..., "displayName": ...} hoặc None nếu không tìm thấy."""
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(_bridge_url("/users/resolve"), params={"phone": phone_number})
        if response.status_code == 404:
            return None
        _raise_for_bridge_error(response)
        return response.json()


# ---- Sync (dùng trong Celery task) -----------------------------------------


def send_message_sync(zalo_id: str, text: str) -> None:
    with httpx.Client(timeout=20) as client:
        response = client.post(_bridge_url("/messages/send"), json={"zaloId": zalo_id, "text": text})
        _raise_for_bridge_error(response)


def resolve_user_by_phone_sync(phone_number: str) -> dict | None:
    with httpx.Client(timeout=15) as client:
        response = client.get(_bridge_url("/users/resolve"), params={"phone": phone_number})
        if response.status_code == 404:
            return None
        _raise_for_bridge_error(response)
        return response.json()
