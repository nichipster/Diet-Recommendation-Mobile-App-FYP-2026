"""merge migration branches

Revision ID: bd6268717a20
Revises: 5efbdf245c58, d2588a94e03c
Create Date: 2026-04-19 14:01:26.639920

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bd6268717a20'
down_revision: Union[str, None] = ('5efbdf245c58', 'd2588a94e03c')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
