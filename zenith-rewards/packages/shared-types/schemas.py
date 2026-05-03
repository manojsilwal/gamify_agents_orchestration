from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import date, datetime

class Provider(str, Enum):
    plaid = "plaid"
    awardwallet = "awardwallet"
    mx = "mx"
    yodlee = "yodlee"

class SyncStatus(str, Enum):
    not_synced = "not_synced"
    syncing = "syncing"
    synced = "synced"
    error = "error"

class VerificationStatus(str, Enum):
    unverified = "unverified"
    admin_seeded = "admin_seeded"
    single_source_verified = "single_source_verified"
    issuer_verified = "issuer_verified"
    conflict_detected = "conflict_detected"
    needs_human_review = "needs_human_review"
    blocked = "blocked"

class JobType(str, Enum):
    card_discovery = "card_discovery"
    issuer_verify = "issuer_verify"
    rewards_parse = "rewards_parse"
    sync_loyalty = "sync_loyalty"
    sync_spending = "sync_spending"
    optimize = "optimize"
    ui_improvement = "ui_improvement"

class RecommendationType(str, Enum):
    new_card = "new_card"
    redemption = "redemption"

class MarketCardResponse(BaseModel):
    id: str
    card_name: str
    issuer: str
    annual_fee: float
    welcome_bonus_points: Optional[int]
    welcome_bonus_cash: Optional[float]
    spend_requirement: float
    verification_status: VerificationStatus
    confidence: float
