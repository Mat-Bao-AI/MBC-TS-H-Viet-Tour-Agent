"""tours.source_path -> bảng tour_source_files (upload đa file)

Revision ID: 0015_tour_source_files
Revises: 0014_user_avatar
Create Date: 2026-09-05

Cho phép HDV upload tối đa 5 tài liệu nguồn cho 1 tour (vé máy bay, khách
sạn, giấy mời, agenda...) thay vì đúng 1 file — xem app/api/v1/tours.py
create_tour(). Backfill dữ liệu cũ (1 file/tour) thành order=1 trước khi bỏ
cột cũ, không mất dữ liệu.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015_tour_source_files"
down_revision: Union[str, None] = "0014_user_avatar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tour_source_files",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tour_id", sa.String(length=36), sa.ForeignKey("tours.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("path", sa.String(length=500), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    conn = op.get_bind()
    import uuid

    existing = conn.execute(
        sa.text("SELECT id, source_path, source_filename FROM tours WHERE source_path IS NOT NULL")
    ).fetchall()
    for tour_id, source_path, source_filename in existing:
        conn.execute(
            sa.text(
                "INSERT INTO tour_source_files (id, tour_id, path, filename, order_index) "
                "VALUES (:id, :tour_id, :path, :filename, 1)"
            ),
            {
                "id": str(uuid.uuid4()),
                "tour_id": tour_id,
                "path": source_path,
                "filename": source_filename or source_path,
            },
        )

    op.drop_column("tours", "source_path")
    op.drop_column("tours", "source_filename")


def downgrade() -> None:
    op.add_column("tours", sa.Column("source_filename", sa.String(length=255), nullable=True))
    op.add_column("tours", sa.Column("source_path", sa.String(length=500), nullable=True))

    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT tour_id, path, filename FROM tour_source_files WHERE order_index = 1"
        )
    ).fetchall()
    for tour_id, path, filename in rows:
        conn.execute(
            sa.text("UPDATE tours SET source_path = :path, source_filename = :filename WHERE id = :tour_id"),
            {"path": path, "filename": filename, "tour_id": tour_id},
        )

    op.drop_table("tour_source_files")
