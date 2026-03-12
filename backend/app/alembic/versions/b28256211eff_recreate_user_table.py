"""recreate user table

Revision ID: b28256211eff
Revises: cced55872ea7
Create Date: 2026-03-11 11:58:35.778990

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b28256211eff'
down_revision: Union[str, None] = 'cced55872ea7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table("user")

    op.create_table(
        "user",
        sa.Column("user_id", sa.Integer, primary_key=True),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("premium_start", sa.DateTime(), nullable=True),
        sa.Column("premium_end", sa.DateTime(), nullable=True),
        sa.Column("suspended", sa.Boolean(), nullable=False),
    )

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("user")
