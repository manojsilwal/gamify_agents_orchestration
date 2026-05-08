from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Default cpp (cents per point) when no valuation row matches
DEFAULT_CARD_CPP = Decimal("2.0")


async def fetch_portfolio_summary(session: AsyncSession, user_id: UUID) -> dict:
    loyalty = await session.execute(
        text("""
            SELECT la.id::text, la.program_name, la.program_type, la.balance, la.unit,
                   la.sync_status, la.last_synced_at,
                   COALESCE(pv.cpp_default, 1.5) AS cpp_default
            FROM loyalty_accounts la
            LEFT JOIN point_valuations pv ON pv.program_name = la.program_name
            WHERE la.user_id = :uid
            ORDER BY la.program_name
        """),
        {"uid": str(user_id)},
    )
    loyalty_rows = loyalty.mappings().all()

    cards = await session.execute(
        text("""
            SELECT uc.id::text, uc.card_name, uc.issuer, uc.annual_fee, uc.current_points
            FROM user_cards uc
            WHERE uc.user_id = :uid
            ORDER BY uc.card_name
        """),
        {"uid": str(user_id)},
    )
    card_rows = cards.mappings().all()

    loyalty_usd = sum(
        (Decimal(str(r["balance"])) * Decimal(str(r["cpp_default"])) / Decimal("100"))
        for r in loyalty_rows
    )
    cards_usd = sum(
        (Decimal(str(r["current_points"] or 0)) * DEFAULT_CARD_CPP / Decimal("100")) for r in card_rows
    )
    total_usd = float(loyalty_usd + cards_usd)

    total_points_raw = sum(int(r["balance"] or 0) for r in loyalty_rows) + sum(
        int(r["current_points"] or 0) for r in card_rows
    )

    loyalty_list = [
        {
            "id": r["id"],
            "program_name": r["program_name"],
            "program_type": r["program_type"],
            "balance": int(r["balance"] or 0),
            "unit": r["unit"],
            "cpp_default": float(r["cpp_default"]),
            "estimated_value_usd": float(
                Decimal(str(r["balance"] or 0))
                * Decimal(str(r["cpp_default"]))
                / Decimal("100")
            ),
        }
        for r in loyalty_rows
    ]

    card_list = [
        {
            "id": r["id"],
            "card_name": r["card_name"],
            "issuer": r["issuer"],
            "annual_fee": float(r["annual_fee"] or 0),
            "current_points": int(r["current_points"] or 0),
            "estimated_value_usd": float(
                Decimal(str(r["current_points"] or 0)) * DEFAULT_CARD_CPP / Decimal("100")
            ),
        }
        for r in card_rows
    ]

    cpp_vals = [float(r["cpp_default"]) for r in loyalty_rows] + [float(DEFAULT_CARD_CPP)] * max(len(card_list), 1)
    avg_cpp = sum(cpp_vals) / len(cpp_vals) if cpp_vals else 0.0

    stale = list(
        dict.fromkeys(
            r["program_name"]
            for r in loyalty_rows
            if r.get("sync_status") != "synced" or r.get("last_synced_at") is None
        )
    )

    profile = await session.execute(
        text("""
            SELECT monthly_rent, monthly_groceries, monthly_dining, monthly_travel, monthly_gas, monthly_other
            FROM spending_profiles WHERE user_id = :uid LIMIT 1
        """),
        {"uid": str(user_id)},
    )
    pr = profile.mappings().first()
    category_breakdown = []
    monthly_spend_total = 0.0
    parts: list[tuple[str, float]] = []
    if pr:
        parts = [
            ("Travel", float(pr["monthly_travel"] or 0)),
            ("Dining", float(pr["monthly_dining"] or 0)),
            ("Groceries", float(pr["monthly_groceries"] or 0)),
            ("Rent", float(pr["monthly_rent"] or 0)),
            ("Gas", float(pr["monthly_gas"] or 0)),
            ("Other", float(pr["monthly_other"] or 0)),
        ]
        total_spend = sum(p[1] for p in parts) or 1.0
        monthly_spend_total = round(sum(p[1] for p in parts), 2)
        category_breakdown = [{"label": lab, "pct": round(100 * amt / total_spend, 1)} for lab, amt in parts if amt > 0]
        category_breakdown.sort(key=lambda x: -x["pct"])

    return {
        "total_points_equivalent_usd": round(total_usd, 2),
        "total_points_display": total_points_raw,
        "average_cpp": round(avg_cpp, 2),
        "cards_count": len(card_list),
        "loyalty_accounts_count": len(loyalty_list),
        "stale_accounts": stale[:5],
        "monthly_spend_total": monthly_spend_total,
        "next_setup_step": "connect_provider" if not loyalty_list else "optimize",
        "cards": card_list,
        "loyalty_accounts": loyalty_list,
        "category_breakdown": category_breakdown[:6],
    }


async def fetch_recommendations(session: AsyncSession, user_id: UUID) -> list[dict]:
    bonuses = await session.execute(
        text("""
            SELECT id::text, bank_program, transfer_partner, bonus_percentage,
                   start_date, end_date, source
            FROM transfer_bonuses
            WHERE (end_date IS NULL OR end_date >= CURRENT_DATE)
              AND (start_date IS NULL OR start_date <= CURRENT_DATE)
            ORDER BY bonus_percentage DESC NULLS LAST
            LIMIT 10
        """),
    )
    rows = bonuses.mappings().all()
    out = []
    for r in rows:
        out.append(
            {
                "id": r["id"],
                "type": "transfer_bonus",
                "title": f"{r['bank_program']} → {r['transfer_partner']} bonus",
                "summary": f"Up to {r['bonus_percentage'] or 0}% bonus on transfers."
                + (f" (via {r['source']})" if r["source"] else ""),
                "bank_program": r["bank_program"],
                "transfer_partner": r["transfer_partner"],
                "bonus_percentage": float(r["bonus_percentage"] or 0),
                "end_date": r["end_date"].isoformat() if r["end_date"] else None,
            }
        )

    if not out:
        out.append(
            {
                "id": "static-ur-aeroplan",
                "type": "transfer_bonus",
                "title": "Transfer bonus (sample)",
                "summary": "Link accounts and run seed to load live transfer bonuses from the database.",
                "bank_program": "Chase Ultimate Rewards",
                "transfer_partner": "Aeroplan",
                "bonus_percentage": 30.0,
                "end_date": None,
            }
        )
    return out


async def fetch_activity(session: AsyncSession, user_id: UUID, limit: int = 100) -> list[dict]:
    res = await session.execute(
        text("""
            SELECT id::text, occurred_at, event_type, merchant_label, description, category,
                   amount_usd, points_delta, source
            FROM activity_events
            WHERE user_id = :uid
            ORDER BY occurred_at DESC
            LIMIT :lim
        """),
        {"uid": str(user_id), "lim": limit},
    )
    rows = res.mappings().all()
    return [
        {
            "id": r["id"],
            "occurred_at": r["occurred_at"].isoformat() if r["occurred_at"] else None,
            "event_type": r["event_type"],
            "merchant_label": r["merchant_label"],
            "description": r["description"],
            "category": r["category"],
            "amount_usd": float(r["amount_usd"]) if r["amount_usd"] is not None else None,
            "points_delta": int(r["points_delta"]) if r["points_delta"] is not None else None,
            "source": r["source"],
        }
        for r in rows
    ]


async def fetch_activity_stats(session: AsyncSession, user_id: UUID) -> dict:
    res = await session.execute(
        text("""
            SELECT
              COALESCE(SUM(points_delta) FILTER (WHERE points_delta > 0), 0) AS earned,
              COALESCE(ABS(SUM(points_delta) FILTER (WHERE points_delta < 0)), 0) AS redeemed
            FROM activity_events
            WHERE user_id = :uid
        """),
        {"uid": str(user_id)},
    )
    row = res.mappings().first() or {"earned": 0, "redeemed": 0}
    earned = int(row["earned"] or 0)
    redeemed = int(row["redeemed"] or 0)
    return {
        "points_earned": earned,
        "points_redeemed": redeemed,
        "net_points": earned - redeemed,
        "period_label": f"{date.today().strftime('%b %Y')}",
    }


async def fetch_points_by_month(session: AsyncSession, user_id: UUID, months: int = 12) -> list[dict[str, Any]]:
    res = await session.execute(
        text("""
            SELECT date_trunc('month', occurred_at)::date AS m,
                   COALESCE(SUM(points_delta), 0)::bigint AS net_pts
            FROM activity_events
            WHERE user_id = :uid
              AND occurred_at >= date_trunc('month', CURRENT_DATE) - make_interval(months => :months)
            GROUP BY 1
            ORDER BY 1 ASC
        """),
        {"uid": str(user_id), "months": months},
    )
    return [{"month": r["m"].isoformat(), "net_points": int(r["net_pts"] or 0)} for r in res.mappings().all()]


async def persist_crawler_activity(
    session: AsyncSession,
    user_id: UUID,
    title: str,
    url: str,
    excerpt: str | None,
) -> None:
    await session.execute(
        text("""
            INSERT INTO activity_events
              (user_id, event_type, merchant_label, description, category, source)
            VALUES
              (:uid, 'crawl', :title, :body, 'web', 'crawler')
        """),
        {"uid": str(user_id), "title": title[:200], "body": f"{url}\n{excerpt or ''}"[:2000]},
    )
