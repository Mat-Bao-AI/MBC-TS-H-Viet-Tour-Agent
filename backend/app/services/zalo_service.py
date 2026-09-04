"""Client gọi sang service zalo_bridge (Node.js, bọc zca-js) qua HTTP nội bộ.

Có 2 biến thể: async (dùng trong FastAPI endpoint — app/api/v1/auth.py,
app/api/v1/zalo.py) và sync (dùng trong Celery task — chạy trong context sync,
xem app/tasks/celery_worker.py).
"""

import asyncio
import time

import httpx

from app.core.config import get_settings


class ZaloServiceError(RuntimeError):
    """Bridge trả lỗi (chưa đăng nhập, không tìm thấy user, gửi tin thất bại...)."""


# resolve_user_by_phone/create_group/send_group_message gọi thẳng từ FastAPI
# endpoint (app/api/v1/zalo.py), KHÔNG qua Celery — nên không được bảo vệ bởi
# rate_limit="20/m" của dispatch_guest_message (app/tasks/celery_worker.py).
# Vòng lặp resolve zalo_id cho cả đoàn khách (_resolve_missing_zalo_ids) có
# thể bắn hàng chục request liên tiếp không giới hạn tốc độ lên zalo-bridge/
# zca-js — throttle tối thiểu ở đây để cùng ngưỡng an toàn với Celery (20/m ≈
# 3s/request), giảm rủi ro bị Zalo đánh dấu bất thường/khoá tài khoản.
# Lưu ý: chỉ đúng khi backend chạy 1 process (đúng setup hiện tại, xem
# docker-compose.yml) — nhiều worker process sẽ có throttle riêng từng cái.
_MIN_BRIDGE_CALL_INTERVAL_SECONDS = 3.0
_last_throttled_call_at = 0.0
_throttle_lock = asyncio.Lock()


async def _throttle_bridge_call() -> None:
    global _last_throttled_call_at
    async with _throttle_lock:
        wait = _last_throttled_call_at + _MIN_BRIDGE_CALL_INTERVAL_SECONDS - time.monotonic()
        if wait > 0:
            await asyncio.sleep(wait)
        _last_throttled_call_at = time.monotonic()


def _bridge_url(path: str) -> str:
    settings = get_settings()
    return f"{settings.zalo_bridge_url.rstrip('/')}{path}"


def _bridge_headers() -> dict:
    # zalo_bridge dùng chung API_KEY với backend (xem docker-compose.yml) —
    # 1 secret nội bộ giữa 2 service, không phải key của HDV.
    return {"x-api-key": get_settings().api_key}


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
        response = await client.post(_bridge_url("/login/qr/start"), headers=_bridge_headers())
        _raise_for_bridge_error(response)
        return response.json()


async def get_login_status() -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(_bridge_url("/login/status"), headers=_bridge_headers())
        _raise_for_bridge_error(response)
        return response.json()


async def logout_zalo() -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(_bridge_url("/login/logout"), headers=_bridge_headers())
        _raise_for_bridge_error(response)
        return response.json()


async def send_group_message(group_id: str, text: str) -> None:
    await _throttle_bridge_call()
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            _bridge_url("/messages/send"),
            json={"zaloId": group_id, "text": text, "isGroup": True},
            headers=_bridge_headers(),
        )
        _raise_for_bridge_error(response)


async def create_group(name: str, member_zalo_ids: list[str]) -> dict:
    """Tạo 1 nhóm Zalo thật (zca-js createGroup) — trả về
    {groupId, sucessMembers, errorMembers, ...} nguyên văn từ zca-js."""
    await _throttle_bridge_call()
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            _bridge_url("/groups"),
            json={"name": name, "memberZaloIds": member_zalo_ids},
            headers=_bridge_headers(),
        )
        _raise_for_bridge_error(response)
        return response.json()


async def resolve_user_by_phone(phone_number: str) -> dict | None:
    """Trả về {"zaloId": ..., "displayName": ...} hoặc None nếu không tìm thấy."""
    await _throttle_bridge_call()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            _bridge_url("/users/resolve"), params={"phone": phone_number}, headers=_bridge_headers()
        )
        if response.status_code == 404:
            return None
        _raise_for_bridge_error(response)
        return response.json()


# ---- Sync (dùng trong Celery task) -----------------------------------------


def send_message_sync(zalo_id: str, text: str) -> None:
    with httpx.Client(timeout=20) as client:
        response = client.post(
            _bridge_url("/messages/send"), json={"zaloId": zalo_id, "text": text}, headers=_bridge_headers()
        )
        _raise_for_bridge_error(response)


def resolve_user_by_phone_sync(phone_number: str) -> dict | None:
    with httpx.Client(timeout=15) as client:
        response = client.get(
            _bridge_url("/users/resolve"), params={"phone": phone_number}, headers=_bridge_headers()
        )
        if response.status_code == 404:
            return None
        _raise_for_bridge_error(response)
        return response.json()
