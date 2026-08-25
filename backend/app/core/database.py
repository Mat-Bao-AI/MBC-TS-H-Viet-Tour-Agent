"""Kết nối MySQL bất đồng bộ qua SQLAlchemy Async + aiomysql.

Cung cấp:
- `Base` — declarative base cho toàn bộ models trong app/models/
- `engine` — async engine dùng chung
- `get_db` — FastAPI dependency, yield 1 AsyncSession theo từng request
"""

from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=not settings.is_production,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Engine đồng bộ riêng cho Celery worker (app/tasks/celery_worker.py) — Celery
# task chạy trong context sync, dùng driver pymysql thay vì aiomysql để khỏi
# phải bọc asyncio.run() quanh mỗi task.
sync_engine = create_engine(settings.sync_database_url, pool_pre_ping=True)
SyncSessionLocal = sessionmaker(bind=sync_engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base class cho tất cả SQLAlchemy models (Tour, Guest, TimelineEvent, ...)."""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: `db: AsyncSession = Depends(get_db)`."""
    async with AsyncSessionLocal() as session:
        yield session
