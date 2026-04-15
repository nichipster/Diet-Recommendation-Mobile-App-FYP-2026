"""merge spoonacular_id and other changes

Revision ID: 664df83e1519
Revises: 7b82de7d6b20, dd776a90249e
Create Date: 2026-04-15 09:33:04.369924

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '664df83e1519'
down_revision: Union[str, None] = ('7b82de7d6b20', 'dd776a90249e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
