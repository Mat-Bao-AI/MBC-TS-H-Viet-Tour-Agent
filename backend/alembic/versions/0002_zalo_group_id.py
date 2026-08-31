"""thêm tours.zalo_group_id — Zalo Group send (Phase 2)

Revision ID: 0002_zalo_group_id
Revises: 0001_initial
Create Date: 2026-08-31

Viết tay khớp app/models/tour.py, cùng convention với 0001_initial (chưa
autogenerate vì deps chưa cài ở máy dev).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_zalo_group_id"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tours", sa.Column("zalo_group_id", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("tours", "zalo_group_id")
