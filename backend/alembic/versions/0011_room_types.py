"""thêm bảng room_types

Revision ID: 0011_room_types
Revises: 0010_guest_age_travel_group
Create Date: 2026-09-03

Phase 3 nâng cấp xếp phòng thông minh (xem docs/PLAN) — tồn kho loại phòng
HDV khai báo cho tour, nền tảng cho thuật toán tự động gán ở Phase 4. Xem
app/models/room_type.py.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_room_types"
down_revision: Union[str, None] = "0010_guest_age_travel_group"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "room_types",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "tour_id",
            sa.String(length=36),
            sa.ForeignKey("tours.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_table("room_types")
