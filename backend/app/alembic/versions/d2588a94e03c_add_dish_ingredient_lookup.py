"""add_dish_ingredient_lookup

Revision ID: d2588a94e03c
Revises: 837cbf4a62d4
Create Date: 2026-04-18 12:07:56.950180

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2588a94e03c'
down_revision: Union[str, None] = '837cbf4a62d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "dish_ingredient_lookup",
        sa.Column("lookup_id",    sa.Integer(),                  nullable=False),
        sa.Column("dish_class",   sa.String(),                   nullable=False),
        sa.Column("display_name", sa.String(),                   nullable=False),
        sa.Column("ingredients",  sa.Text(),                     nullable=False),
        sa.Column("created_at",   sa.DateTime(timezone=True),    nullable=False),
        sa.PrimaryKeyConstraint("lookup_id"),
        sa.UniqueConstraint("dish_class", name="uq_dish_ingredient_lookup_dish_class"),
    )
    op.create_index(
        "ix_dish_ingredient_lookup_dish_class",
        "dish_ingredient_lookup",
        ["dish_class"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_dish_ingredient_lookup_dish_class", table_name="dish_ingredient_lookup")
    op.drop_table("dish_ingredient_lookup")
