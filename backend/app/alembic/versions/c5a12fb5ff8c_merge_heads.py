"""merge heads

Revision ID: c5a12fb5ff8c
Revises: 4e7cc07d55a1, e6a29c615263
Create Date: 2026-04-29 12:43:21.107622

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5a12fb5ff8c'
down_revision: Union[str, None] = ('4e7cc07d55a1', 'e6a29c615263')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
