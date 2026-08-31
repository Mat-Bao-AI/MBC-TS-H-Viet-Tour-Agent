"""weather_service — tích hợp Open-Meteo (miễn phí, không cần API key) để lấy
dự báo thời tiết theo địa điểm trong timeline, hiển thị inline trên trang
duyệt lịch trình (Smart Itinerary Detailer) và trang lịch trình công khai.

2 bước: geocode tên địa danh (tiếng Việt, tự do) -> toạ độ, rồi lấy dự báo
theo ngày cho toạ độ đó. Open-Meteo forecast API chỉ có dữ liệu cho khoảng
~16 ngày tới (giới hạn khoa học khí tượng thật, không phải giới hạn kỹ thuật
— dự báo số trị không đáng tin cậy xa hơn) — trả None nếu không có dữ liệu,
KHÔNG bịa số liệu thời tiết giả.

Với tour xa ngày hơn phạm vi dự báo, `get_climate_average()` cung cấp
"nhiệt độ trung bình nhiều năm" — dữ liệu khí hậu THỰC ĐO trong quá khứ
(Open-Meteo Archive), không phải dự báo — luôn có thể tính được cho bất kỳ
ngày nào trong năm, dùng làm thông tin THAM KHẢO khi chưa có dự báo chính
xác. Caller (app/api/v1/tours.py:compute_tour_weather) chịu trách nhiệm gắn
cờ is_forecast để FE phân biệt rõ 2 loại, không để lẫn lộn.
"""

import asyncio
from collections import Counter
from datetime import date as date_cls, timedelta

import httpx

_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

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


def _describe_weather_code(code: int | None) -> tuple[str, str]:
    if code is None:
        return ("Không xác định", "🌡️")
    return _WEATHER_CODE_VI.get(code, ("Không xác định", "🌡️"))


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

    description, icon = _describe_weather_code(daily["weathercode"][0])
    return {
        "temp_min": daily["temperature_2m_min"][0],
        "temp_max": daily["temperature_2m_max"][0],
        "description": description,
        "icon": icon,
    }


async def get_climate_average(latitude: float, longitude: float, month: int, day: int) -> dict | None:
    """Nhiệt độ trung bình NHIỀU NĂM cho 1 (tháng, ngày) bất kỳ trong năm —
    dữ liệu khí hậu THỰC ĐO quá khứ (Open-Meteo Archive), không phải dự báo.
    Lấy 3 năm gần nhất, mỗi năm gộp khoảng ±3 ngày quanh (month, day) để có
    đủ mẫu tính trung bình (thay vì chỉ 1 điểm dữ liệu/năm dễ lệch do thời
    tiết bất thường 1 ngày cụ thể). Trả None nếu Archive không có dữ liệu
    (network lỗi, toạ độ không hợp lệ...) — KHÔNG bịa số."""
    today = date_cls.today()
    years = [today.year - 1, today.year - 2, today.year - 3]

    async def _fetch_year(year: int) -> dict | None:
        try:
            center = date_cls(year, month, day)
        except ValueError:
            center = date_cls(year, month, min(day, 28))  # 29/02 năm không nhuận
        start = center - timedelta(days=3)
        end = center + timedelta(days=3)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    _ARCHIVE_URL,
                    params={
                        "latitude": latitude,
                        "longitude": longitude,
                        "daily": "temperature_2m_max,temperature_2m_min,weathercode",
                        "timezone": "Asia/Ho_Chi_Minh",
                        "start_date": start.isoformat(),
                        "end_date": end.isoformat(),
                    },
                )
                response.raise_for_status()
                return response.json().get("daily")
        except httpx.HTTPError:
            return None

    yearly_results = await asyncio.gather(*(_fetch_year(y) for y in years))

    all_max: list[float] = []
    all_min: list[float] = []
    all_codes: list[int] = []
    for daily in yearly_results:
        if not daily or not daily.get("time"):
            continue
        all_max += [t for t in daily.get("temperature_2m_max", []) if t is not None]
        all_min += [t for t in daily.get("temperature_2m_min", []) if t is not None]
        all_codes += [c for c in daily.get("weathercode", []) if c is not None]

    if not all_max or not all_min:
        return None

    most_common_code = Counter(all_codes).most_common(1)[0][0] if all_codes else None
    description, icon = _describe_weather_code(most_common_code)
    return {
        "temp_min": sum(all_min) / len(all_min),
        "temp_max": sum(all_max) / len(all_max),
        "description": description,
        "icon": icon,
    }
