"""xoá kênh Telegram — guests.telegram_chat_id, guests.notification_channel, users.telegram_username

Revision ID: 0008_drop_telegram
Revises: 0007_dynamic_config
Create Date: 2026-09-03

Quyết định bỏ hẳn Telegram (xem docs/PLAN): trải nghiệm kết nối bắt buộc
khách tự bấm link mời + Start với bot trước khi nhận được tin — cản trở so
với Zalo (tự resolve theo SĐT). App tập trung lại 2 kênh: xem lịch trình qua
URL công khai (đã có, app/api/v1/public.py) và gửi qua Zalo (kênh chính).

guests.notification_channel bị drop luôn (không chỉ telegram_chat_id) vì chỉ
còn 1 kênh (Zalo) thì cột này không còn ý nghĩa lựa chọn — mọi khách ngầm
định gửi qua Zalo, xem app/services/notification/zalo_sender.py.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_drop_telegram"
down_revision: Union[str, None] = "0007_dynamic_config"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("guests", "notification_channel")
    op.drop_column("guests", "telegram_chat_id")
    op.drop_column("users", "telegram_username")
    op.execute("DELETE FROM app_settings WHERE `key` IN ('telegram_bot_token', 'telegram_webhook_secret')")


def downgrade() -> None:
    op.add_column("users", sa.Column("telegram_username", sa.String(length=100), nullable=True))
    op.add_column("guests", sa.Column("telegram_chat_id", sa.String(length=64), nullable=True))
    op.add_column(
        "guests",
        sa.Column(
            "notification_channel",
            sa.Enum("zalo", "telegram", name="notificationchannel", native_enum=False, length=20),
            nullable=False,
            server_default="ZALO",
        ),
    )
