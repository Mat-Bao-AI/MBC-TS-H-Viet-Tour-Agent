"""thêm guests.telegram_chat_id + guests.notification_channel

Revision ID: 0004_notification_channel
Revises: 0003_guest_dispatch_error
Create Date: 2026-08-31

Phase 1 của việc đa dạng hoá kênh gửi tin (Zalo không còn là kênh duy nhất) —
mỗi khách chọn 1 kênh (mặc định zalo, không phá dữ liệu cũ). Viết tay khớp
app/models/guest.py, cùng convention 0001-0003.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_notification_channel"
down_revision: Union[str, None] = "0003_guest_dispatch_error"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("guests", sa.Column("telegram_chat_id", sa.String(length=64), nullable=True))
    op.add_column(
        "guests",
        sa.Column(
            "notification_channel",
            sa.Enum("zalo", "telegram", name="notificationchannel", native_enum=False, length=20),
            nullable=False,
            # QUAN TRỌNG: SQLAlchemy Enum(PythonEnumClass) mặc định lưu THEO
            # TÊN member ("ZALO") chứ không phải .value ("zalo") — đúng ngay
            # convention DispatchStatus/TourStatus đã dùng từ 0001 (DB đang
            # lưu "REVIEW"/"FAILED" viết hoa, dù JSON API trả "review"/"failed"
            # do Pydantic serialize .value). Ban đầu viết nhầm "zalo" thường —
            # gây LookupError thật khi đọc lại hàng đã backfill. server_default
            # PHẢI khớp tên member viết hoa.
            server_default="ZALO",
        ),
    )


def downgrade() -> None:
    op.drop_column("guests", "notification_channel")
    op.drop_column("guests", "telegram_chat_id")
