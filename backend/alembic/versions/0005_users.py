"""users — tài khoản đăng nhập app (Admin/HDV)

Revision ID: 0005_users
Revises: 0004_notification_channel
Create Date: 2026-08-31

Viết tay khớp app/models/user.py (xem ghi chú 0001_initial về lý do không
autogenerate). LƯU Ý enum: SQLAlchemy Enum(PythonEnumClass, native_enum=False)
lưu theo TÊN member viết HOA ("ADMIN"/"USER"), không phải .value — bug đã gặp
thật ở migration 0004 (server_default lowercase khiến LookupError), nên
server_default ở đây dùng đúng "USER" viết hoa.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_users"
down_revision: Union[str, None] = "0004_notification_channel"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("phone_number", sa.String(length=20), nullable=True),
        sa.Column(
            "role",
            sa.Enum("ADMIN", "USER", name="userrole", native_enum=False, length=20),
            nullable=False,
            server_default="USER",
        ),
        sa.Column("facebook_url", sa.String(length=500), nullable=True),
        sa.Column("zalo_link", sa.String(length=500), nullable=True),
        sa.Column("telegram_username", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )


def downgrade() -> None:
    op.drop_table("users")
