"""tour web source snapshot

Revision ID: 0017_tour_web_source
Revises: 0016_tour_type_summary
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0017_tour_web_source"
down_revision: Union[str, None] = "0016_tour_type_summary"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tours", sa.Column("source_url", sa.String(length=2048), nullable=True))
    op.add_column("tours", sa.Column("source_title", sa.String(length=500), nullable=True))
    op.add_column("tours", sa.Column("source_content", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tours", "source_content")
    op.drop_column("tours", "source_title")
    op.drop_column("tours", "source_url")
