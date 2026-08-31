"""Schema cho API v1/zalo.py và service Zalo bridge."""

from pydantic import BaseModel, Field


class ZaloLoginStatus(BaseModel):
    status: str  # "idle" | "qr_pending" | "success" | "error"
    qr_data_url: str | None = None
    display_name: str | None = None
    error: str | None = None


class DispatchRequest(BaseModel):
    guest_ids: list[str] | None = None  # None = gửi cho toàn bộ khách của tour


class DispatchResponse(BaseModel):
    queued: int
    skipped: list[str] = []  # guest_id không gửi được (thiếu SĐT, không resolve được zalo_id...)


class QuickUpdateRequest(BaseModel):
    """Gửi 1 tin nhắn tự do, tức thời — dùng cho FAB "Cập nhật nhanh" (tin tự
    soạn) lẫn nút "Gửi Zalo" trên từng mốc timeline (tin ghép sẵn từ 1 event).
    Khác dispatch(): không dùng template lịch trình đầy đủ."""

    message: str = Field(min_length=1, max_length=2000)
    guest_ids: list[str] | None = None  # None = gửi cho toàn bộ khách của tour


class MessagePreview(BaseModel):
    guest_id: str
    guest_name: str
    message_text: str
