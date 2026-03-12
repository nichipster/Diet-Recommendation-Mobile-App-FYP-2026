"""Update User user_id default to None instead of 1

Revision ID: de6ee1874cbe
Revises: 6eb12d98aca4
Create Date: 2026-03-11 11:51:55.478885

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'de6ee1874cbe'
down_revision: Union[str, None] = '6eb12d98aca4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
