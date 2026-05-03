from typing import Dict, List, Optional
from datetime import datetime

class MarketCard:
    def __init__(self, id, card_name, annual_fee, welcome_bonus_points, welcome_bonus_cash, spend_requirement, spend_window_months, verification_status):
        self.id = id
        self.card_name = card_name
        self.annual_fee = annual_fee
        self.welcome_bonus_points = welcome_bonus_points
        self.welcome_bonus_cash = welcome_bonus_cash
        self.spend_requirement = spend_requirement
        self.spend_window_months = spend_window_months
        self.verification_status = verification_status

class UserCard:
    pass

class PointValuation:
    def __init__(self, cpp_default):
        self.cpp_default = cpp_default

class SpendingProfile:
    def __init__(self, monthly_total):
        self.monthly_total = monthly_total

class Goal:
    pass

class RecommendationScore:
    def __init__(self, total_value):
        self.total_value = total_value

class RedemptionScore:
    def __init__(self, score):
        self.score = score

class Recommendation:
    def __init__(self, rec_type, title, estimated_value_usd, warnings):
        self.rec_type = rec_type
        self.title = title
        self.estimated_value_usd = estimated_value_usd
        self.warnings = warnings

REQUIRED_CARD_WARNINGS = [
    "Annual fee: ${annual_fee}/year.",
    "Welcome bonus requires ${spend_requirement} spend in {spend_window_months} months.",
    "APR range: verify current rates on the issuer site before applying.",
    "Approval is not guaranteed. Do not carry a balance solely to earn rewards.",
    "Offer terms may change. Verify on issuer site before applying.",
    "Data verified: {verified_at_str}."
]

def score_new_card(card: MarketCard, spending: SpendingProfile, existing_cards: List[UserCard], valuations: Dict[str, PointValuation]) -> RecommendationScore:
    val = (card.welcome_bonus_cash or 0)
    if card.welcome_bonus_points:
        val += card.welcome_bonus_points * 0.02 # stub
    val -= card.annual_fee
    return RecommendationScore(val)

def score_redemption(points_balance: int, program: str, cash_equivalent: float, taxes_and_fees: float, valuation: PointValuation, award_availability_confirmed: bool) -> RedemptionScore:
    score = cash_equivalent - taxes_and_fees
    if not award_availability_confirmed:
        score -= 0.2 * cash_equivalent
    return RedemptionScore(score)

def estimate_annual_earning(card: MarketCard, spending: SpendingProfile, valuation: PointValuation) -> float:
    return spending.monthly_total * 12 * 0.02 # stub

def build_recommendation(rec_type: str, title: str, score: float, card: Optional[MarketCard], goal: Goal, assumptions: List[str], warnings: List[str], sources: List[dict], verification_status: str) -> Recommendation:
    if rec_type == "new_card" and card:
        for w in REQUIRED_CARD_WARNINGS:
            warnings.append(w.format(
                annual_fee=card.annual_fee,
                spend_requirement=card.spend_requirement,
                spend_window_months=card.spend_window_months,
                verified_at_str="estimate only — not issuer-verified"
            ))
    return Recommendation(rec_type, title, score, warnings)
