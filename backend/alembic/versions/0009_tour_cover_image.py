"""thêm tours.cover_image_path

Revision ID: 0009_tour_cover_image
Revises: 0008_drop_telegram
Create Date: 2026-09-03

Ảnh bìa tour (tuỳ chọn) — dùng cho Open Graph preview trang lịch trình công
khai /t/<id> khi dán link vào Zalo/Messenger, và hiển thị trên chính trang
đó. Xem app/models/tour.py, app/api/v1/tours.py (upload), app/api/v1/public.py
(phục vụ ảnh công khai).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_tour_cover_image"
down_revision: Union[str, None] = "0008_drop_telegram"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tours", sa.Column("cover_image_path", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("tours", "cover_image_path")
