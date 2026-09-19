"""VIETMAP integration helpers.

API key luôn chỉ được backend gọi/kiểm tra. Frontend không nhận lại secret.
"""

import httpx

from app.core import dynamic_config

_GEOCODE_ENDPOINT = "https://maps.vietmap.vn/api/search/v3"


async def test_vietmap_connection(api_key: str | None = None) -> tuple[bool, str]:
    key = api_key or await dynamic_config.get_vietmap_api_key()
    if not key.strip():
        return False, "Chưa cấu hình VIETMAP API key."
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(
                _GEOCODE_ENDPOINT,
                params={"apikey": key, "text": "Hồ Chí Minh"},
                headers={"Accept": "application/json"},
            )
        if response.status_code in (401, 403):
            return False, "VIETMAP từ chối API key. Vui lòng kiểm tra lại key hoặc gói dịch vụ."
        response.raise_for_status()
        return True, "Kết nối VIETMAP thành công."
    except httpx.TimeoutException:
        return False, "VIETMAP không phản hồi kịp thời. Vui lòng thử lại."
    except httpx.HTTPStatusError as exc:
        return False, f"VIETMAP trả HTTP {exc.response.status_code}."
    except Exception:
        return False, "Không thể kết nối VIETMAP. Vui lòng kiểm tra mạng hoặc API key."
