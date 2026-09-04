"""thêm guests.age + guests.travel_group

Revision ID: 0010_guest_age_travel_group
Revises: 0009_tour_cover_image
Create Date: 2026-09-03

Phase 2 nâng cấp xếp phòng thông minh (xem docs/PLAN) — thu thập thêm tuổi
+ nhãn nhóm đi cùng để Phase 3-4 (quản lý loại phòng + thuật toán tự động
gán) có đủ dữ liệu. Xem app/models/guest.py.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_guest_age_travel_group"
down_revision: Union[str, None] = "0009_tour_cover_image"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("guests", sa.Column("age", sa.Integer(), nullable=True))
    op.add_column("guests", sa.Column("travel_group", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("guests", "travel_group")
    op.drop_column("guests", "age")
