"""changelog.py — lịch sử cập nhật app (trang "Về ứng dụng"). GET mở cho MỌI
User đăng nhập (đã bắt buộc qua api_router, xem app/api/v1/__init__.py) —
POST/PUT/DELETE CHỈ Admin (require_admin thêm riêng từng route, không đặt ở
router như admin_settings.py vì GET ở đây không phải riêng Admin)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin
from app.models.changelog_entry import ChangelogEntry
from app.schemas.changelog import ChangelogEntryCreateRequest, ChangelogEntryOut, ChangelogEntryUpdateRequest

router = APIRouter(prefix="/changelog", tags=["changelog"])


@router.get("", response_model=list[ChangelogEntryOut])
async def list_changelog(db: AsyncSession = Depends(get_db)) -> list[ChangelogEntry]:
    result = await db.execute(select(ChangelogEntry).order_by(ChangelogEntry.created_at.desc()))
    return list(result.scalars().all())


@router.post("", response_model=ChangelogEntryOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_changelog_entry(
    payload: ChangelogEntryCreateRequest, db: AsyncSession = Depends(get_db)
) -> ChangelogEntry:
    entry = ChangelogEntry(**payload.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def _get_entry_or_404(entry_id: str, db: AsyncSession) -> ChangelogEntry:
    result = await db.execute(select(ChangelogEntry).where(ChangelogEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy mục changelog {entry_id}")
    return entry


@router.put("/{entry_id}", response_model=ChangelogEntryOut, dependencies=[Depends(require_admin)])
async def update_changelog_entry(
    entry_id: str, payload: ChangelogEntryUpdateRequest, db: AsyncSession = Depends(get_db)
) -> ChangelogEntry:
    entry = await _get_entry_or_404(entry_id, db)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_changelog_entry(entry_id: str, db: AsyncSession = Depends(get_db)) -> None:
    entry = await _get_entry_or_404(entry_id, db)
    await db.delete(entry)
    await db.commit()
