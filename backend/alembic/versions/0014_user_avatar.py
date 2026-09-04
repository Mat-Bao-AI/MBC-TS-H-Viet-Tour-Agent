"""thêm users.avatar_path

Revision ID: 0014_user_avatar
Revises: 0013_changelog_entries
Create Date: 2026-09-04

Phase 3 hồ sơ HDV — ảnh đại diện tự upload, xem app/models/user.py.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014_user_avatar"
down_revision: Union[str, None] = "0013_changelog_entries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_path", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_path")
