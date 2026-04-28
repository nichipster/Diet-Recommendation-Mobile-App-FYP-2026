"""add_audit_log_table

Revision ID: e6a29c615263
Revises: 5efbdf245c58
Create Date: 2026-04-20 15:13:16.545840

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6a29c615263'
down_revision: Union[str, None] = '5efbdf245c58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_log",
        sa.Column("id",          sa.Integer(),                nullable=False),
        sa.Column("action",      sa.String(),                 nullable=False),
        sa.Column("detail",      sa.String(),                 nullable=False),
        sa.Column("type",        sa.String(),                 nullable=False),
        sa.Column("admin_email", sa.String(),                 nullable=False),
        sa.Column("timestamp",   sa.DateTime(timezone=True),  nullable=False),
        sa.Column("ip_address",  sa.String(),                 nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_log_action",      "audit_log", ["action"],      unique=False)
    op.create_index("ix_audit_log_type",        "audit_log", ["type"],        unique=False)
    op.create_index("ix_audit_log_admin_email", "audit_log", ["admin_email"], unique=False)
    op.create_index("ix_audit_log_timestamp",   "audit_log", ["timestamp"],   unique=False)


def downgrade() -> None:
    op.drop_index("ix_audit_log_timestamp",   table_name="audit_log")
    op.drop_index("ix_audit_log_admin_email", table_name="audit_log")
    op.drop_index("ix_audit_log_type",        table_name="audit_log")
    op.drop_index("ix_audit_log_action",      table_name="audit_log")
    op.drop_table("audit_log")