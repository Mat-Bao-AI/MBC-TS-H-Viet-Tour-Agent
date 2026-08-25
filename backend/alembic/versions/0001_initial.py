"""initial schema — tours, guests, timelines

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-25

Viết tay khớp với app/models/ (chưa autogenerate vì deps chưa cài ở máy dev —
sẽ chạy `alembic upgrade head` thật bên trong container backend, xem README).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tours",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("source_filename", sa.String(length=255), nullable=True),
        sa.Column("source_path", sa.String(length=500), nullable=True),
        sa.Column("guest_list_filename", sa.String(length=255), nullable=True),
        sa.Column("guest_list_path", sa.String(length=500), nullable=True),
        sa.Column("process_error", sa.String(length=1000), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "draft", "parsing", "review", "dispatched", "failed",
                name="tourstatus", native_enum=False, length=20,
            ),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    op.create_table(
        "guests",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "tour_id",
            sa.String(length=36),
            sa.ForeignKey("tours.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("phone_number", sa.String(length=20), nullable=True),
        sa.Column("zalo_id", sa.String(length=64), nullable=True),
        sa.Column("seat_number", sa.String(length=20), nullable=True),
        sa.Column("room_number", sa.String(length=20), nullable=True),
        sa.Column("dietary_note", sa.Text(), nullable=True),
        sa.Column(
            "dispatch_status",
            sa.Enum(
                "pending", "sent", "read", "confirmed", "failed",
                name="dispatchstatus", native_enum=False, length=20,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("last_dispatched_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("ix_guests_tour_id", "guests", ["tour_id"])

    op.create_table(
        "timelines",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "tour_id",
            sa.String(length=36),
            sa.ForeignKey("tours.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("events", sa.JSON(), nullable=False),
        sa.Column("extra_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )


def downgrade() -> None:
    op.drop_table("timelines")
    op.drop_index("ix_guests_tour_id", table_name="guests")
    op.drop_table("guests")
    op.drop_table("tours")
