"""activity_events for transaction history and crawler audit

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-05

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
CREATE TABLE activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  merchant_label TEXT NOT NULL,
  description TEXT,
  category TEXT,
  amount_usd NUMERIC(12,2),
  points_delta BIGINT,
  source TEXT NOT NULL DEFAULT 'api'
);
""")
    op.execute(
        "CREATE INDEX ix_activity_events_user_occurred ON activity_events (user_id, occurred_at DESC);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_activity_events_user_occurred;")
    op.execute("DROP TABLE IF EXISTS activity_events;")
