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
    telegram_username: str | None
    is_active: bool


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
