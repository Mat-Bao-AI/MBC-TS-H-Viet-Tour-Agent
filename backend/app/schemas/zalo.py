"""Schema cho API v1/zalo.py và service Zalo bridge."""

from pydantic import BaseModel


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


class MessagePreview(BaseModel):
    guest_id: str
    guest_name: str
    message_text: str
