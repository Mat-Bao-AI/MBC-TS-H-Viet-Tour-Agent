"""tours.tour_type + tours.summary

Revision ID: 0016_tour_type_summary
Revises: 0015_tour_source_files
Create Date: 2026-09-05

Phase 5 — tổng quát hoá Tour ngoài du lịch thuần tuý (công tác/sự kiện),
xem app/models/tour.py TourType. Mặc định TOURISM cho tour cũ, không đổi
hành vi hiện có.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0016_tour_type_summary"
down_revision: Union[str, None] = "0015_tour_source_files"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tours",
        sa.Column("tour_type", sa.String(length=20), nullable=False, server_default="tourism"),
    )
    op.add_column("tours", sa.Column("summary", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column("tours", "summary")
    op.drop_column("tours", "tour_type")
