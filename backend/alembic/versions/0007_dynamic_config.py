"""app_settings + ai_provider_configs — cấu hình Admin nhập qua UI

Revision ID: 0007_dynamic_config
Revises: 0006_tour_owner
Create Date: 2026-08-31

Viết tay khớp app/models/app_setting.py + app/models/ai_provider_config.py.
Giá trị lưu MÃ HOÁ (Fernet) — xem app/core/crypto.py, không có gì cần
backfill vì đây là bảng mới hoàn toàn, HDV/Admin nhập qua UI sau khi migrate.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_dynamic_config"
down_revision: Union[str, None] = "0006_tour_owner"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(length=100), primary_key=True),
        sa.Column("value_encrypted", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    op.create_table(
        "ai_provider_configs",
        sa.Column("provider", sa.String(length=50), primary_key=True),
        sa.Column("config_encrypted", sa.Text(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )


def downgrade() -> None:
    op.drop_table("ai_provider_configs")
    op.drop_table("app_settings")
