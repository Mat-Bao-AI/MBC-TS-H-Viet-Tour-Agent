"""account.py — đăng nhập/tài khoản người dùng CHÍNH APP. Khác
app/api/v1/auth.py (đó là đăng nhập Zalo CÁ NHÂN dùng để GỬI tin, không phải
đăng nhập app).

3 router trong file này:
- `login_router` — KHÔNG yêu cầu token (chicken-and-egg — chưa đăng nhập thì
  chưa có token), mount TRỰC TIẾP ở app/main.py như public_router, đứng
  ngoài api_router.
- `me_router` — yêu cầu token thật, mount qua api_router (đã có blanket
  Depends(get_current_user), xem app/api/v1/__init__.py) nên không cần khai
  báo dependency lại ở đây. HDV tự sửa hồ sơ CHÍNH MÌNH — đổi role/khoá tài
  khoản là việc của Admin (app/api/v1/admin_users.py), KHÔNG có ở đây.
- `users_router` — GET avatar của BẤT KỲ user nào (mọi User đăng nhập xem
  được, không chỉ Admin) — ảnh đại diện đồng nghiệp không phải thông tin
  nhạy cảm trong 1 công cụ nội bộ.

Không có endpoint đăng ký công khai — Admin tạo tài khoản HDV qua UI quản lý
user (app/api/v1/admin_users.py), tài khoản Admin đầu tiên tạo tự động lúc
khởi động (xem app/core/seed.py)."""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, verify_password
from app.models.user import User
from app.schemas.user import LoginRequest, LoginResponse, UserOut, UserSelfUpdateRequest

login_router = APIRouter(prefix="/auth", tags=["account"])
me_router = APIRouter(prefix="/auth", tags=["account"])
users_router = APIRouter(prefix="/users", tags=["account"])

_ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
_CHUNK_SIZE = 1024 * 1024  # 1MB


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


@me_router.put("/me", response_model=UserOut)
async def update_me(
    payload: UserSelfUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@me_router.put("/me/avatar", status_code=204)
async def set_my_avatar(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if file.content_type not in _ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=400, detail="Chỉ nhận ảnh JPEG/PNG/WebP.")

    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "").suffix
    saved_path = upload_dir / f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    total = 0
    try:
        with saved_path.open("wb") as out:
            while chunk := file.file.read(_CHUNK_SIZE):
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(
                        status_code=413, detail=f"File vượt quá giới hạn {settings.max_upload_size_mb}MB."
                    )
                out.write(chunk)
    except HTTPException:
        saved_path.unlink(missing_ok=True)
        raise

    old_path = current_user.avatar_path
    current_user.avatar_path = str(saved_path)
    await db.commit()
    if old_path:
        Path(old_path).unlink(missing_ok=True)


@me_router.delete("/me/avatar", status_code=204)
async def clear_my_avatar(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)) -> None:
    old_path = current_user.avatar_path
    current_user.avatar_path = None
    await db.commit()
    if old_path:
        Path(old_path).unlink(missing_ok=True)


@users_router.get("/{user_id}/avatar")
async def get_user_avatar(user_id: str, db: AsyncSession = Depends(get_db)) -> FileResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.avatar_path or not Path(user.avatar_path).exists():
        raise HTTPException(status_code=404, detail="Chưa có ảnh đại diện.")
    return FileResponse(user.avatar_path)
