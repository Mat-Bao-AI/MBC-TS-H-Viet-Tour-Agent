"""weather_service — tích hợp Open-Meteo API để lấy dự báo thời tiết theo
điểm đến, phục vụ Smart Itinerary Detailer (gợi ý trang phục/vật dụng).

Chưa triển khai ở Phase 1 (MVP lõi chỉ có timeline text, chưa cần toạ độ điểm
đến). Giữ file này đúng vị trí theo cấu trúc thư mục trong tài liệu sản phẩm,
implement ở Phase 2 khi có bước geocode địa danh -> lat/lon.
"""


async def get_forecast(latitude: float, longitude: float, date: str) -> dict:
    """TODO (Phase 2): gọi Open-Meteo API, trả dự báo thời tiết cho 1 ngày cụ
    thể tại toạ độ cho trước, dùng làm input cho timeline_agent sinh notes."""
    raise NotImplementedError("weather_service chưa triển khai — dự kiến Phase 2")
