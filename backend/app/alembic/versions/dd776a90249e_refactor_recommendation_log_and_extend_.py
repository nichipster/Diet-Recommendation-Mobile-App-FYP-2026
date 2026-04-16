"""refactor_recommendation_log_and_extend_recipe

Revision ID: dd776a90249e
Revises: 22bcecf42264
Create Date: 2026-04-13 13:29:07.339915

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'dd776a90249e'
down_revision: Union[str, None] = '22bcecf42264'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("recipe",
        sa.Column("spoonacular_id", sa.Integer(), nullable=True))
    op.create_unique_constraint(
        "uq_recipe_spoonacular_id", "recipe", ["spoonacular_id"])
    op.create_index(
        "ix_recipe_spoonacular_id", "recipe", ["spoonacular_id"])

    op.add_column("recipe",
        sa.Column("cuisine_type", sa.String(), nullable=True))

    op.add_column("recipe",
        sa.Column("is_vegetarian", sa.Boolean(), nullable=False,
                  server_default=sa.false()))
    op.add_column("recipe",
        sa.Column("is_vegan", sa.Boolean(), nullable=False,
                  server_default=sa.false()))
    op.add_column("recipe",
        sa.Column("is_halal", sa.Boolean(), nullable=False,
                  server_default=sa.false()))
    op.add_column("recipe",
        sa.Column("is_gluten_free", sa.Boolean(), nullable=False,
                  server_default=sa.false()))

    op.alter_column("recipe", "description", nullable=True)
    op.alter_column("recipe", "instructions", nullable=True)

    # Create recommendation_log first so the existing refactor steps below can run
    op.create_table(
        "recommendation_log",
        sa.Column("log_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("food_id", sa.Integer(), nullable=False),
        sa.Column("meal_type", postgresql.ENUM("breakfast", "lunch", "dinner", name="mealtype", create_type=False), nullable=False),
        sa.Column("recommended_at", sa.DateTime(), nullable=False),
        sa.Column("was_accepted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(["user_id"], ["user.user_id"]),
        sa.ForeignKeyConstraint(["food_id"], ["food_item.food_id"], name="recommendation_log_food_id_fkey"),
        sa.PrimaryKeyConstraint("log_id")
    )

    op.create_index(
        "ix_recommendation_log_user_id",
        "recommendation_log",
        ["user_id"]
    )
    op.create_index(
        "ix_recommendation_log_food_id",
        "recommendation_log",
        ["food_id"]
    )

    op.drop_constraint(
        "recommendation_log_food_id_fkey",
        "recommendation_log", type_="foreignkey")
    op.drop_index("ix_recommendation_log_food_id",
                  table_name="recommendation_log")
    op.drop_column("recommendation_log", "food_id")

    # Add the new FK pointing at recipe
    op.add_column("recommendation_log",
        sa.Column("recipe_id", sa.Integer(), nullable=False))
    op.create_foreign_key(
        "fk_recommendation_log_recipe_id",
        "recommendation_log", "recipe",
        ["recipe_id"], ["recipe_id"])
    op.create_index(
        "ix_recommendation_log_recipe_id",
        "recommendation_log", ["recipe_id"])

    # Add the optional rating column
    op.add_column("recommendation_log",
        sa.Column("rating", sa.Integer(), nullable=True))
    

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("recommendation_log", "rating")
    op.drop_constraint(
        "fk_recommendation_log_recipe_id",
        "recommendation_log", type_="foreignkey")
    op.drop_index(
        "ix_recommendation_log_recipe_id",
        table_name="recommendation_log")
    op.drop_column("recommendation_log", "recipe_id")

    op.add_column("recommendation_log",
        sa.Column("food_id", sa.Integer(), nullable=False))
    op.create_foreign_key(
        "recommendation_log_food_id_fkey",
        "recommendation_log", "food_item",
        ["food_id"], ["food_id"])
    op.create_index(
        "ix_recommendation_log_food_id",
        "recommendation_log", ["food_id"])

    op.alter_column("recipe", "description", nullable=False)
    op.alter_column("recipe", "instructions", nullable=False)
    op.drop_column("recipe", "is_gluten_free")
    op.drop_column("recipe", "is_halal")
    op.drop_column("recipe", "is_vegan")
    op.drop_column("recipe", "is_vegetarian")
    op.drop_column("recipe", "cuisine_type")
    op.drop_index("ix_recipe_spoonacular_id", table_name="recipe")
    op.drop_constraint("uq_recipe_spoonacular_id", "recipe", type_="unique")
    op.drop_column("recipe", "spoonacular_id")
