"""tours.owner_id — multi-tenant theo HDV

Revision ID: 0006_tour_owner
Revises: 0005_users
Create Date: 2026-08-31

Nullable: tour tạo trước khi có auth không có chủ sẵn — app/core/seed.py
backfill về Admin đầu tiên lúc khởi động (nếu SEED_ADMIN_EMAIL được cấu
hình), không xoá/ẩn dữ liệu tour thật đã tạo trước đó.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_tour_owner"
down_revision: Union[str, None] = "0005_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tours", sa.Column("owner_id", sa.String(length=36), nullable=True))
    op.create_index("ix_tours_owner_id", "tours", ["owner_id"])
    op.create_foreign_key("fk_tours_owner_id_users", "tours", "users", ["owner_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_tours_owner_id_users", "tours", type_="foreignkey")
    op.drop_index("ix_tours_owner_id", table_name="tours")
    op.drop_column("tours", "owner_id")
