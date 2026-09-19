"""remove unused Vietmap configuration

Revision ID: 0018_remove_vietmap_config
Revises: 0017_tour_web_source
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0018_remove_vietmap_config"
down_revision: Union[str, None] = "0017_tour_web_source"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Xoá secret Vietmap cũ vì tính năng đã bị loại bỏ, tránh giữ dữ liệu
    # cấu hình không còn được sử dụng trong DB.
    op.execute(sa.text("DELETE FROM ai_provider_configs WHERE provider = 'vietmap'"))


def downgrade() -> None:
    # Không thể khôi phục secret đã được xoá có chủ đích.
    pass
