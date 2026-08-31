"""Auth thật cho chính app — JWT, thay thế hoàn toàn cơ chế X-API-Key cũ (đã
xoá) vốn chỉ chặn truy cập ngẫu nhiên, không phân biệt được ai đang gọi.
Token cấp lúc đăng nhập (POST /auth/login, app/api/v1/account.py), FE gửi lại
qua header `Authorization: Bearer <token>` cho mọi request /api/v1/*.

⚠️ Không nhầm với settings.api_key — đó là secret NỘI BỘ riêng giữa backend
và service zalo-bridge (app/services/zalo_service.py), không liên quan gì
tới auth người dùng ở đây.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User, UserRole

_ALGORITHM = "HS256"
# Công cụ vận hành nội bộ (không phải SaaS công khai) — ưu tiên ít phải đăng
# nhập lại hơn là session ngắn hạn kiểu ngân hàng.
_ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # password_hash hỏng/không đúng định dạng bcrypt — coi như sai mật khẩu,
        # không phải lỗi 500.
        return False


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(hours=_ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key, algorithm=_ALGORITHM)


def _decode_user_id(token: str) -> str | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[_ALGORITHM])
    except jwt.PyJWTError:
        return None
    return payload.get("sub")


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Thiếu header Authorization: Bearer <token>.")

    user_id = _decode_user_id(authorization[len("bearer ") :].strip())
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn — đăng nhập lại.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại hoặc đã bị khoá.")
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền thực hiện thao tác này.")
    return current_user
