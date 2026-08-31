"""Tạo tài khoản Admin đầu tiên lúc khởi động, nếu SEED_ADMIN_EMAIL/
SEED_ADMIN_PASSWORD được cấu hình VÀ chưa có user nào dùng email đó —
idempotent, an toàn chạy lại mỗi lần container start (xem
app/core/config.py:Settings.seed_admin_email). Không có cách nào khác để có
tài khoản đầu tiên vì không có form tự đăng ký công khai (xem
app/api/v1/account.py).

Sau khi tạo Admin, backfill tour cũ chưa có chủ (owner_id NULL — tạo trước
khi hệ thống có auth) về Admin này, tránh dữ liệu thật đã tạo trước đó biến
mất khỏi tầm nhìn (list_tours lọc theo owner_id, xem app/api/v1/tours.py).
"""

import logging

from sqlalchemy import select, update

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.tour import Tour
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


async def seed_admin_if_configured() -> None:
    settings = get_settings()
    if not settings.seed_admin_email or not settings.seed_admin_password:
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == settings.seed_admin_email))
        if result.scalar_one_or_none() is not None:
            return  # đã có — không tạo lại, không reset mật khẩu (tránh ghi đè âm thầm)

        admin = User(
            email=settings.seed_admin_email,
            password_hash=hash_password(settings.seed_admin_password),
            full_name="Admin",
            role=UserRole.ADMIN,
        )
        db.add(admin)
        await db.flush()  # có admin.id trước khi backfill

        await db.execute(update(Tour).where(Tour.owner_id.is_(None)).values(owner_id=admin.id))
        await db.commit()
        logger.info("Đã tạo tài khoản Admin đầu tiên: %s", settings.seed_admin_email)
