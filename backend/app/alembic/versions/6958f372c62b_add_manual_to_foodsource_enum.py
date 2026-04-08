"""add manual to foodsource enum

Revision ID: 6958f372c62b
Revises: af0a46a77905
Create Date: 2026-04-08 16:24:43.081597

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6958f372c62b'
down_revision: Union[str, None] = 'af0a46a77905'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE foodsource ADD VALUE IF NOT EXISTS 'manual';")


def downgrade() -> None:
    """Downgrade schema."""
    pass
