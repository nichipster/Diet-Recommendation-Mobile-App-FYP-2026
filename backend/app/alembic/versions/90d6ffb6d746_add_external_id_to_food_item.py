"""add external_id to food_item

Revision ID: 90d6ffb6d746
Revises: 624805f17e4d
Create Date: 2026-04-07 21:29:45.810653

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '90d6ffb6d746'
down_revision: Union[str, None] = '624805f17e4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create the foodsource enum type in PostgreSQL before using it.
    # Alembic autogenerate omits this step — it must be done manually.
    foodsource_enum = sa.Enum('product', 'ingredient', 'manual', name='foodsource')
    foodsource_enum.create(op.get_bind(), checkfirst=True)

    # Use IF NOT EXISTS for columns that may already exist on DBs that were
    # previously initialised via SQLModel.metadata.create_all() rather than
    # running migrations from scratch.
    op.execute("ALTER TABLE food_item ADD COLUMN IF NOT EXISTS external_id INTEGER")
    op.execute("ALTER TABLE food_item ADD COLUMN IF NOT EXISTS source foodsource NOT NULL DEFAULT 'manual'")

    # Index creation is also guarded so re-runs don't fail.
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE tablename = 'food_item' AND indexname = 'ix_food_item_external_id'
            ) THEN
                CREATE INDEX ix_food_item_external_id ON food_item (external_id);
            END IF;
        END$$;
    """)

    # user_profile: add dob (may already exist), drop age (may already be gone).
    op.execute("ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS dob DATE")
    op.execute("ALTER TABLE user_profile DROP COLUMN IF EXISTS age")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS age INTEGER")
    op.execute("ALTER TABLE user_profile DROP COLUMN IF EXISTS dob")

    op.execute("DROP INDEX IF EXISTS ix_food_item_external_id")
    op.execute("ALTER TABLE food_item DROP COLUMN IF EXISTS source")
    op.execute("ALTER TABLE food_item DROP COLUMN IF EXISTS external_id")

    # Drop the enum type after removing the column that uses it.
    foodsource_enum = sa.Enum('product', 'ingredient', 'manual', name='foodsource')
    foodsource_enum.drop(op.get_bind(), checkfirst=True)
