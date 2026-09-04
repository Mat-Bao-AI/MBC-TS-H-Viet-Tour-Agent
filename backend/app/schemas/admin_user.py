"""Schema cho Admin quản lý tài khoản HDV/Admin khác (app/api/v1/admin_users.py)
— khác app/schemas/user.py (đó là login + tự xem hồ sơ CHÍNH MÌNH)."""

from pydantic import BaseModel, Field

from app.models.user import UserRole


class UserCreateRequest(BaseModel):
    # str thường (không EmailStr) — khớp convention LoginRequest.email hiện
    # có (app/schemas/user.py), tránh thêm dependency email-validator mới.
    email: str
    password: str = Field(min_length=8, description="Mật khẩu tạm — Admin tự đặt, gửi cho HDV qua kênh khác.")
    full_name: str
    phone_number: str | None = None
    role: UserRole = UserRole.USER


class UserAdminUpdateRequest(BaseModel):
    """Admin sửa thông tin/quyền của 1 user khác — KHÔNG dùng để user tự sửa
    hồ sơ mình (đó là PUT /auth/me, Phase 3 — user tự sửa không đổi được
    role/is_active của chính mình qua đường đó)."""

    full_name: str | None = None
    phone_number: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class UserResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8)
