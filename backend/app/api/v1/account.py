"""account.py — đăng nhập/tài khoản người dùng CHÍNH APP. Khác
app/api/v1/auth.py (đó là đăng nhập Zalo CÁ NHÂN dùng để GỬI tin, không phải
đăng nhập app).

2 router trong file này:
- `login_router` — KHÔNG yêu cầu token (chicken-and-egg — chưa đăng nhập thì
  chưa có token), mount TRỰC TIẾP ở app/main.py như public_router, đứng
  ngoài api_router.
- `me_router` — yêu cầu token thật, mount qua api_router (đã có blanket
  Depends(get_current_user), xem app/api/v1/__init__.py) nên không cần khai
  báo dependency lại ở đây.

Không có endpoint đăng ký công khai — Admin tạo tài khoản HDV qua UI quản lý
user (Phase 3), tài khoản Admin đầu tiên tạo tự động lúc khởi động (xem
app/core/seed.py)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, verify_password
from app.models.user import User
from app.schemas.user import LoginRequest, LoginResponse, UserOut

login_router = APIRouter(prefix="/auth", tags=["account"])
me_router = APIRouter(prefix="/auth", tags=["account"])


@login_router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    email = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    # Cùng 1 thông báo dù sai email hay sai mật khẩu — tránh lộ email nào đã
    # có tài khoản trong hệ thống (user enumeration).
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng.")

    token = create_access_token(user.id)
    return LoginResponse(access_token=token, user=UserOut.model_validate(user))


@me_router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)
