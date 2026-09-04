"""thêm bảng changelog_entries

Revision ID: 0013_changelog_entries
Revises: 0012_guest_room_type
Create Date: 2026-09-04

Phase 4 trang "Về ứng dụng" — Admin tự nhập lịch sử cập nhật qua UI, xem
app/models/changelog_entry.py.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013_changelog_entries"
down_revision: Union[str, None] = "0012_guest_room_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "changelog_entries",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_table("changelog_entries")
