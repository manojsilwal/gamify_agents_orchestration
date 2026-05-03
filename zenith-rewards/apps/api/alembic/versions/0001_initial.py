"""initial schema

Revision ID: 0001
Revises:
Create Date: 2024-05-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    op.execute("""
-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  full_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- market_cards (credit card offer database)
CREATE TABLE market_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  annual_fee NUMERIC(10,2),
  welcome_bonus_points BIGINT,
  welcome_bonus_cash NUMERIC(10,2),
  spend_requirement NUMERIC(10,2),
  spend_window_months INTEGER,
  apr_min NUMERIC(5,2),
  apr_max NUMERIC(5,2),
  reward_rules JSONB DEFAULT '[]',
  benefits JSONB DEFAULT '[]',
  offer_url TEXT,
  verification_status TEXT DEFAULT 'unverified',
  confidence NUMERIC(4,3) DEFAULT 0,
  verified_at TIMESTAMPTZ,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_cards (manually added or provider-synced)
CREATE TABLE user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  market_card_id UUID REFERENCES market_cards(id) ON DELETE SET NULL,
  card_name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  annual_fee NUMERIC(10,2),
  current_points BIGINT DEFAULT 0,
  current_cash_back NUMERIC(10,2),
  opened_date DATE,
  source TEXT NOT NULL DEFAULT 'manual',
  sync_status TEXT DEFAULT 'not_synced',
  last_synced_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- loyalty_accounts
CREATE TABLE loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  program_type TEXT NOT NULL,
  program_name TEXT NOT NULL,
  balance BIGINT DEFAULT 0,
  unit TEXT DEFAULT 'points',
  expiration_date DATE,
  manual_cpp NUMERIC(6,4),
  source TEXT NOT NULL DEFAULT 'manual',
  sync_status TEXT DEFAULT 'not_synced',
  last_synced_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- spending_profiles
CREATE TABLE spending_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  monthly_rent NUMERIC(10,2) DEFAULT 0,
  monthly_groceries NUMERIC(10,2) DEFAULT 0,
  monthly_dining NUMERIC(10,2) DEFAULT 0,
  monthly_travel NUMERIC(10,2) DEFAULT 0,
  monthly_gas NUMERIC(10,2) DEFAULT 0,
  monthly_utilities NUMERIC(10,2) DEFAULT 0,
  monthly_other NUMERIC(10,2) DEFAULT 0,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- point_valuations (admin-maintained program CPP table)
CREATE TABLE point_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name TEXT UNIQUE NOT NULL,
  program_type TEXT NOT NULL,
  cpp_low NUMERIC(6,4) NOT NULL,
  cpp_default NUMERIC(6,4) NOT NULL,
  cpp_high NUMERIC(6,4) NOT NULL,
  source TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  staleness_status TEXT DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- goals
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  parameters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- recommendations
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  estimated_value_usd NUMERIC(10,2),
  points_required BIGINT,
  cash_required_usd NUMERIC(10,2),
  annual_fee_impact NUMERIC(10,2),
  cpp NUMERIC(6,4),
  confidence NUMERIC(4,3),
  verification_status TEXT DEFAULT 'unverified',
  warnings JSONB DEFAULT '[]',
  assumptions JSONB DEFAULT '[]',
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- agent_jobs
CREATE TABLE agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payload JSONB DEFAULT '{}',
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- source_evidence
CREATE TABLE source_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_job_id UUID REFERENCES agent_jobs(id) ON DELETE CASCADE,
  market_card_id UUID REFERENCES market_cards(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_url TEXT,
  screenshot_path TEXT,
  html_snapshot_path TEXT,
  content_hash TEXT,
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- provider_connections
CREATE TABLE provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  token_reference TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- transfer_bonuses
CREATE TABLE transfer_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_program TEXT NOT NULL,
  transfer_partner TEXT NOT NULL,
  transfer_ratio NUMERIC(6,4) DEFAULT 1.0,
  bonus_percentage NUMERIC(6,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  source TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
    """)

def downgrade() -> None:
    op.execute("""
DROP TABLE transfer_bonuses;
DROP TABLE provider_connections;
DROP TABLE source_evidence;
DROP TABLE agent_jobs;
DROP TABLE recommendations;
DROP TABLE goals;
DROP TABLE point_valuations;
DROP TABLE spending_profiles;
DROP TABLE loyalty_accounts;
DROP TABLE user_cards;
DROP TABLE market_cards;
DROP TABLE users;
    """)
