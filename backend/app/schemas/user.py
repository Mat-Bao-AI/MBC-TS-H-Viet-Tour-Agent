"""Schema request/response cho tài khoản đăng nhập app (app/api/v1/account.py)."""

from pydantic import BaseModel, ConfigDict

from app.models.user import UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    phone_number: str | None
    role: UserRole
    facebook_url: str | None
    zalo_link: str | None
    is_active: bool
    has_avatar: bool = False


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserSelfUpdateRequest(BaseModel):
    """HDV tự sửa hồ sơ CHÍNH MÌNH — cố tình KHÔNG có role/is_active (đó là
    quyền Admin, xem app/schemas/admin_user.py UserAdminUpdateRequest)."""

    full_name: str | None = None
    phone_number: str | None = None
    facebook_url: str | None = None
    zalo_link: str | None = None
