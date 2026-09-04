"""admin_users.py — Admin quản lý tài khoản HDV/Admin khác (tạo, sửa
role/khoá, reset mật khẩu). Toàn bộ route CHỈ Admin (require_admin ở router,
giống admin_settings.py) — khác app/api/v1/account.py (đăng nhập + tự xem hồ
sơ CHÍNH MÌNH, mọi user đăng nhập đều gọi được)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password, require_admin
from app.models.tour import Tour
from app.models.user import User, UserRole
from app.schemas.admin_user import UserAdminUpdateRequest, UserCreateRequest, UserResetPasswordRequest
from app.schemas.user import UserOut

router = APIRouter(prefix="/admin/users", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.asc()))
    return list(result.scalars().all())


@router.post("", response_model=UserOut, status_code=201)
async def create_user(payload: UserCreateRequest, db: AsyncSession = Depends(get_db)) -> User:
    email = payload.email.strip().lower()
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail=f"Email {email} đã có tài khoản.")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        role=payload.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _get_user_or_404(user_id: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy user {user_id}")
    return user


async def _count_active_admins(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.ADMIN, User.is_active.is_(True))
    )
    return result.scalar_one()


@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    payload: UserAdminUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> User:
    user = await _get_user_or_404(user_id, db)
    update_data = payload.model_dump(exclude_unset=True)

    # Chặn tự hạ quyền/tự khoá CHÍNH MÌNH nếu là Admin active DUY NHẤT còn
    # lại — tránh khoá cả hệ thống khỏi mọi quyền Admin (bug thật dễ gặp nếu
    # không chặn: Admin lỡ tay đổi role mình -> user, không ai còn vào được
    # /settings/users để sửa lại).
    demoting_self = user.id == current_user.id and (
        update_data.get("role") not in (None, UserRole.ADMIN)
        or update_data.get("is_active") is False
    )
    if demoting_self and await _count_active_admins(db) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Không thể tự hạ quyền/khoá chính mình khi đang là Admin duy nhất còn hoạt động.",
        )

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user


@router.put("/{user_id}/password", status_code=204)
async def reset_user_password(
    user_id: str, payload: UserResetPasswordRequest, db: AsyncSession = Depends(get_db)
) -> None:
    user = await _get_user_or_404(user_id, db)
    user.password_hash = hash_password(payload.new_password)
    await db.commit()


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> None:
    user = await _get_user_or_404(user_id, db)

    # Tự xoá chính mình qua đây là thao tác nguy hiểm (mất quyền truy cập
    # ngay lập tức) — bắt buộc phải nhờ 1 Admin khác xoá thay, giống tinh
    # thần chặn tự-hạ-quyền ở update_user.
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể tự xoá chính mình — nhờ một Admin khác xoá thay.")

    if user.role == UserRole.ADMIN and user.is_active and await _count_active_admins(db) <= 1:
        raise HTTPException(status_code=400, detail="Không thể xoá Admin duy nhất còn hoạt động.")

    # tours.owner_id không có ON DELETE CASCADE/SET NULL (xem
    # alembic/versions/0006_tour_owner.py) — xoá thẳng sẽ vỡ ràng buộc khoá
    # ngoại ở DB (lỗi 500 khó hiểu). Chặn sớm với thông báo rõ nghĩa.
    tour_count = (
        await db.execute(select(func.count()).select_from(Tour).where(Tour.owner_id == user_id))
    ).scalar_one()
    if tour_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"User này đang sở hữu {tour_count} tour — chuyển hoặc xoá các tour đó trước khi xoá tài khoản.",
        )

    await db.delete(user)
    await db.commit()
