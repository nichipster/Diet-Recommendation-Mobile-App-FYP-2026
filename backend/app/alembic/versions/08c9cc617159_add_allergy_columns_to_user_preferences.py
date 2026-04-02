"""add_allergy_columns_to_user_preferences

Revision ID: 08c9cc617159
Revises: 
Create Date: 2026-04-01 15:17:04.644128

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '08c9cc617159'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('user', 'role',
               existing_type=sa.VARCHAR(),
               type_=sa.Enum('admin', 'freemium', 'premium', name='userrole'),
               existing_nullable=False,
               postgresql_using='role::userrole')

    # ← use IF EXISTS so fresh databases without phone_number don't fail
    op.execute('ALTER TABLE "user" DROP COLUMN IF EXISTS phone_number')

    op.add_column('user_preferences', sa.Column('has_peanut_allergy', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('user_preferences', sa.Column('has_tree_nut_allergy', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('user_preferences', sa.Column('has_milk_allergy', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('user_preferences', sa.Column('has_egg_allergy', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('user_preferences', sa.Column('has_fish_allergy', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('user_preferences', sa.Column('has_shellfish_allergy', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('user_preferences', sa.Column('has_soy_allergy', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('user_preferences', sa.Column('has_wheat_allergy', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('user_preferences', sa.Column('has_sesame_allergy', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('user_preferences', sa.Column('has_sulfite_allergy', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('user_preferences', sa.Column('allergy_notes', sa.String(), nullable=True))
    op.drop_column('user_preferences', 'allergies')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('user_preferences', sa.Column('allergies', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.drop_column('user_preferences', 'allergy_notes')
    op.drop_column('user_preferences', 'has_sulfite_allergy')
    op.drop_column('user_preferences', 'has_sesame_allergy')
    op.drop_column('user_preferences', 'has_wheat_allergy')
    op.drop_column('user_preferences', 'has_soy_allergy')
    op.drop_column('user_preferences', 'has_shellfish_allergy')
    op.drop_column('user_preferences', 'has_fish_allergy')
    op.drop_column('user_preferences', 'has_egg_allergy')
    op.drop_column('user_preferences', 'has_milk_allergy')
    op.drop_column('user_preferences', 'has_tree_nut_allergy')
    op.drop_column('user_preferences', 'has_peanut_allergy')

    # ← use IF NOT EXISTS so downgrade is also safe on fresh databases
    op.execute('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone_number VARCHAR')

    op.alter_column('user', 'role',
               existing_type=sa.Enum('admin', 'freemium', 'premium', name='userrole'),
               type_=sa.VARCHAR(),
               existing_nullable=False)