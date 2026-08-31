"""weather_service — tích hợp Open-Meteo (miễn phí, không cần API key) để lấy
dự báo thời tiết theo địa điểm trong timeline, hiển thị inline trên trang
duyệt lịch trình (Smart Itinerary Detailer).

2 bước: geocode tên địa danh (tiếng Việt, tự do) -> toạ độ, rồi lấy dự báo
theo ngày cho toạ độ đó. Open-Meteo forecast API chỉ có dữ liệu cho khoảng
~16 ngày tới (không phải ngày quá khứ xa/tương lai xa) — trả None nếu không
có dữ liệu, KHÔNG bịa số liệu thời tiết giả.
"""

import httpx

_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# WMO Weather interpretation codes (chuẩn Open-Meteo) — rút gọn các mã phổ
# biến ở Việt Nam, đủ dùng cho hiển thị gợi ý trang phục.
_WEATHER_CODE_VI: dict[int, tuple[str, str]] = {
    0: ("Trời quang, nắng đẹp", "☀️"),
    1: ("Ít mây", "🌤️"),
    2: ("Có mây", "⛅"),
    3: ("Nhiều mây, âm u", "☁️"),
    45: ("Sương mù", "🌫️"),
    48: ("Sương mù đóng băng", "🌫️"),
    51: ("Mưa phùn nhẹ", "🌦️"),
    53: ("Mưa phùn", "🌦️"),
    55: ("Mưa phùn dày", "🌧️"),
    61: ("Mưa nhẹ", "🌧️"),
    63: ("Mưa vừa", "🌧️"),
    65: ("Mưa to", "🌧️"),
    80: ("Mưa rào nhẹ", "🌦️"),
    81: ("Mưa rào", "🌧️"),
    82: ("Mưa rào lớn", "⛈️"),
    95: ("Dông", "⛈️"),
    96: ("Dông kèm mưa đá", "⛈️"),
    99: ("Dông kèm mưa đá lớn", "⛈️"),
}


async def geocode(location_name: str) -> tuple[float, float] | None:
    """Tên địa danh tự do (vd "Vịnh Hạ Long") -> (latitude, longitude), hoặc
    None nếu Open-Meteo không tìm thấy / lỗi mạng — KHÔNG raise, cùng hợp
    đồng "graceful degrade" với get_forecast() (1 địa điểm lỗi không được
    kéo sập toàn bộ danh sách weather của trang)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                _GEOCODE_URL, params={"name": location_name, "count": 1, "language": "vi"}
            )
            response.raise_for_status()
            results = response.json().get("results") or []
    except httpx.HTTPError:
        return None

    if not results:
        return None
    return results[0]["latitude"], results[0]["longitude"]


async def get_forecast(latitude: float, longitude: float, date: str) -> dict | None:
    """Dự báo nhiệt độ min/max + tình trạng thời tiết cho 1 toạ độ, 1 ngày
    (YYYY-MM-DD). Trả None nếu ngoài phạm vi dự báo của Open-Meteo (quá xa
    quá khứ/tương lai) hoặc lỗi mạng — KHÔNG raise để 1 event lỗi không kéo
    sập cả trang timeline."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                _FORECAST_URL,
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "daily": "temperature_2m_max,temperature_2m_min,weathercode",
                    "timezone": "Asia/Ho_Chi_Minh",
                    "start_date": date,
                    "end_date": date,
                },
            )
            response.raise_for_status()
            daily = response.json().get("daily")
    except httpx.HTTPError:
        return None

    if not daily or not daily.get("time"):
        return None

    code = daily["weathercode"][0]
    description, icon = _WEATHER_CODE_VI.get(code, ("Không xác định", "🌡️"))
    return {
        "temp_min": daily["temperature_2m_min"][0],
        "temp_max": daily["temperature_2m_max"][0],
        "description": description,
        "icon": icon,
    }
