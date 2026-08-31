"""thêm guests.dispatch_error — lưu lý do thật khi gửi Zalo thất bại

Revision ID: 0003_guest_dispatch_error
Revises: 0002_zalo_group_id
Create Date: 2026-08-31

Bug thật phát hiện lúc user test: dispatch_status chuyển FAILED nhưng
không lưu lý do ở đâu -> HDV không biết vì sao khách không nhận được tin dù
hệ thống báo "đã xếp hàng gửi". Viết tay khớp app/models/guest.py.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_guest_dispatch_error"
down_revision: Union[str, None] = "0002_zalo_group_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("guests", sa.Column("dispatch_error", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("guests", "dispatch_error")
