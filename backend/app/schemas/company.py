"""Schema cho thương hiệu công ty du lịch (app/api/v1/company.py) — tên +
logo hiện trên UI (sidebar, đăng nhập, trang lịch trình công khai) VÀ dùng
làm chữ ký cuối tin nhắn Zalo gửi khách (Phase 3, app/agents/zalo_format_agent.py)."""

from pydantic import BaseModel


class CompanyInfo(BaseModel):
    name: str
    logo_url: str | None = None


class CompanyInfoUpdateRequest(BaseModel):
    name: str
