"""Kiểm tra quyền sở hữu tour — dùng chung cho tours.py + zalo.py. Multi-tenant
theo HDV: mỗi User chỉ thao tác được tour do CHÍNH mình tạo (Tour.owner_id),
Admin thao tác được mọi tour. Tour không tồn tại HOẶC không thuộc quyền đều
trả 404 giống nhau — không lộ cho User biết tour của HDV khác có tồn tại hay
không (403 sẽ lộ thông tin đó, 404 thì không)."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tour import Tour
from app.models.user import User, UserRole


async def get_owned_tour(
    tour_id: str,
    db: AsyncSession,
    current_user: User,
    *,
    with_relations: bool = False,
) -> Tour:
    query = select(Tour).where(Tour.id == tour_id)
    if with_relations:
        query = query.options(selectinload(Tour.guests), selectinload(Tour.timeline))

    result = await db.execute(query)
    tour = result.scalar_one_or_none()
    if tour is None or (current_user.role != UserRole.ADMIN and tour.owner_id != current_user.id):
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tour {tour_id}")
    return tour
