"""thêm guests.room_type_id

Revision ID: 0012_guest_room_type
Revises: 0011_room_types
Create Date: 2026-09-04

Phase 4 xếp phòng thông minh — lưu loại phòng GỢI Ý do thuật toán tự động
gán (app/services/room_assignment.py), tách biệt hoàn toàn với
guests.room_number (số phòng THẬT, HDV tự điền tay). ON DELETE SET NULL —
xoá loại phòng chỉ bỏ gán, không xoá khách.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0012_guest_room_type"
down_revision: Union[str, None] = "0011_room_types"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("guests", sa.Column("room_type_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_guests_room_type_id",
        "guests",
        "room_types",
        ["room_type_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_guests_room_type_id", "guests", type_="foreignkey")
    op.drop_column("guests", "room_type_id")
