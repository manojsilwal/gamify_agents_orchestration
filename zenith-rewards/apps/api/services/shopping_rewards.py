"""
Educational reward-stack hints for retail purchases (portals, pay-with-points caveats).
Not live earn rates—users must verify current issuer terms and portal pages.
"""

from __future__ import annotations

from typing import Any


def _issuer_norm(issuer: str) -> str:
    return (issuer or "").strip().lower()


def _detect_wallet_issuers(cards: list[dict]) -> set[str]:
    out: set[str] = set()
    for c in cards:
        iss = _issuer_norm(str(c.get("issuer") or ""))
        if "chase" in iss:
            out.add("chase")
        if "american express" in iss or iss == "amex" or "am ex" in iss:
            out.add("amex")
        if "citi" in iss:
            out.add("citi")
        if "capital one" in iss or iss == "capital one":
            out.add("capital_one")
        if "bank of america" in iss or "bofa" in iss:
            out.add("bofa")
        if "wells fargo" in iss:
            out.add("wells_fargo")
        if "discover" in iss:
            out.add("discover")
    return out


def _unique_preserve(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for raw in items:
        k = raw.strip()
        if not k:
            continue
        key = k.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(k)
    return out


def _unique_cards(cards: list[dict]) -> list[dict]:
    seen: set[tuple[str, str]] = set()
    out: list[dict] = []
    for c in cards:
        name = str(c.get("card_name") or "").strip()
        issuer = str(c.get("issuer") or "").strip()
        key = (name.lower(), issuer.lower())
        if key in seen or (not name and not issuer):
            continue
        seen.add(key)
        out.append({"card_name": name, "issuer": issuer})
    return out


RETAILER_REWARD_HINTS: dict[str, dict[str, Any]] = {
    "amazon": {
        "portal_angle": (
            "Chase Ultimate Rewards® and other bank shopping portals periodically list Amazon with bonus multipliers—"
            "check your issuer’s portal before checkout. Amex and Chase sometimes run targeted Amazon offers."
        ),
        "pay_with_points": (
            "‘Pay with Points’ at Amazon (Amex Membership Rewards®, Chase Pay with Points, etc.) often values points "
            "below what you’d get from travel transfers—compare cpp before burning points."
        ),
        "category_angle": (
            "Some cards code Amazon as online shopping or wholesale (Costco vs Amazon Business varies); "
            "use the card whose category bonus matches how the charge actually posts."
        ),
    },
    "bestbuy": {
        "portal_angle": (
            "Best Buy frequently appears in Chase UR, airline, and cash-back portals. Start at your issuer’s "
            "shopping mall, then apply any Best Buy member deals or student offers in-cart."
        ),
        "pay_with_points": "In-store vs online can post differently; portal clicks usually require starting from the portal session.",
        "category_angle": "Many issuers treat big-box electronics as general merchandise unless you have a dedicated electronics bonus.",
    },
    "walmart": {
        "portal_angle": (
            "Walmart.com vs Walmart stores differ for portals and category bonuses. UR and other malls sometimes "
            "exclude grocery pickup—read the fine print for your item path."
        ),
        "pay_with_points": "Marketplace items on Walmart may code as third-party; rewards and return policies can differ.",
        "category_angle": "If you use Walmart+ or fuel perks, stack those with the card that wins on online Walmart spend.",
    },
    "ebay": {
        "portal_angle": (
            "eBay is often in shopping portals but may exclude certain categories or PayPal paths. "
            "Confirm the checkout method still tracks the portal."
        ),
        "pay_with_points": "Auctions and used gear rarely qualify for purchase protection the same way as retail—factor that into ‘effective’ price.",
        "category_angle": "Many cards do not give a strong category bonus on eBay; a portal or flat-rate card can win.",
    },
    "target": {
        "portal_angle": (
            "Target.com may appear in bank portals; Circle offers and RedCard™ discounts change the net price—"
            "compare RedCard 5% vs points you’d earn through a premium travel card + portal."
        ),
        "pay_with_points": "Gift-card promos at Target can indirectly boost value if your issuer treats them as eligible spend.",
        "category_angle": "Target runs in-store vs online; category coding (grocery vs discount store) varies by MCC.",
    },
}


def _personalized_lines(issuers: set[str], loyalty_names: list[str]) -> list[str]:
    lines: list[str] = []
    if "chase" in issuers:
        lines.append(
            "You have Chase in your portfolio: open Chase Ultimate Rewards (Earn Bonus Points / Shop Through Chase) "
            "and search the retailer before you pay—portal bonuses stack on top of base card earn when eligible."
        )
    if "amex" in issuers:
        lines.append(
            "You have American Express: check Amex Offers for the merchant, and consider whether Rakuten "
            "Membership Rewards linkage beats your default card category for that purchase."
        )
    if "citi" in issuers:
        lines.append(
            "You have Citi: review ThankYou Points shopping and bonus offers; compare portal vs direct card category."
        )
    if "capital_one" in issuers:
        lines.append(
            "You have Capital One: see Capital One Offers and shopping links in the app—rates change by merchant."
        )
    if "discover" in issuers:
        lines.append(
            "You have Discover: check Discover Deals and your current 5% quarterly categories before a big purchase."
        )
    if "wells_fargo" in issuers:
        lines.append(
            "You have Wells Fargo: review Wells Fargo Rewards® shopping or limited-time merchant offers in the app."
        )
    if not lines and not loyalty_names:
        lines.append(
            "Add your cards in Portfolio to get issuer-specific portal reminders (Chase UR, Amex Offers, etc.)."
        )
    if loyalty_names:
        lines.append(
            f"You track {' / '.join(loyalty_names[:4])}: retail spend rarely earns those miles directly—"
            "focus on card + portal value unless a co-brand store link applies."
        )
    return lines


def build_shopping_rewards_enrichment(
    retailer_rows: list[dict],
    cards: list[dict],
    loyalty_accounts: list[dict],
) -> dict[str, Any]:
    issuers = _detect_wallet_issuers(cards)
    loyalty_names = _unique_preserve(
        [str(a.get("program_name") or "") for a in loyalty_accounts if a.get("program_name")]
    )
    cards_summary = _unique_cards(cards)

    by_retailer: list[dict] = []
    for row in retailer_rows:
        rid = str(row.get("retailer_id") or "")
        hints = RETAILER_REWARD_HINTS.get(rid, {})
        by_retailer.append(
            {
                "retailer_id": rid,
                "label": row.get("label"),
                "portal_angle": hints.get("portal_angle"),
                "pay_with_points": hints.get("pay_with_points"),
                "category_angle": hints.get("category_angle"),
                "issuer_hooks": _issuer_hooks_for_retailer(rid, issuers),
            }
        )

    issuer_highlights: list[dict] = []
    if "chase" in issuers:
        issuer_highlights.append(
            {
                "issuer": "Chase",
                "program": "Ultimate Rewards®",
                "action": "Log into Ultimate Rewards → Shop Through Chase / Earn Bonus Points for this retailer before checkout.",
            }
        )
    if "amex" in issuers:
        issuer_highlights.append(
            {
                "issuer": "American Express",
                "program": "Membership Rewards® + Amex Offers",
                "action": "Add relevant Amex Offers to your card, then pay with that enrolled card on the merchant site.",
            }
        )
    if "citi" in issuers:
        issuer_highlights.append(
            {
                "issuer": "Citi",
                "program": "ThankYou® Rewards",
                "action": "Check Citi’s bonus offers and shopping portals for elevated earn on eligible merchants.",
            }
        )
    if "discover" in issuers:
        issuer_highlights.append(
            {
                "issuer": "Discover",
                "program": "Cashback Bonus + Discover Deals",
                "action": "Activate quarterly categories if needed, then start from Discover Deals when a merchant is listed.",
            }
        )
    if "wells_fargo" in issuers:
        issuer_highlights.append(
            {
                "issuer": "Wells Fargo",
                "program": "Wells Fargo Rewards®",
                "action": "Check the mobile app for Earn More Mall or targeted merchant promos before checkout.",
            }
        )

    return {
        "rewards_by_retailer": by_retailer,
        "user_rewards_context": {
            "cards_summary": cards_summary,
            "detected_issuers": sorted(issuers),
            "personalized_tips": _personalized_lines(issuers, loyalty_names),
            "issuer_highlights": issuer_highlights,
        },
        "rewards_disclaimer": (
            "Portal bonuses and pay-with-points values change by issuer, card product, and date. "
            "Confirm on the official Chase, Amex, Citi, or other reward site before purchasing."
        ),
    }


def _issuer_hooks_for_retailer(retailer_id: str, issuers: set[str]) -> list[str]:
    """Short lines tying detected wallet to this merchant."""
    hooks: list[str] = []
    if "chase" in issuers:
        if retailer_id == "amazon":
            hooks.append("Chase: check UR portal + any targeted Amazon Chase Offers before using points at checkout.")
        elif retailer_id == "bestbuy":
            hooks.append("Chase: Best Buy often surfaces in Shop Through Chase—compare to any Best Buy member pricing.")
        else:
            hooks.append("Chase: search this store in the Ultimate Rewards shopping portal before paying.")
    if "amex" in issuers:
        hooks.append("Amex: load merchant-specific Amex Offers; avoid low-value Amazon ‘Use Points’ unless you’ve compared cpp.")
    if "citi" in issuers:
        hooks.append("Citi: scan ThankYou offers for this merchant category.")
    if "discover" in issuers:
        hooks.append("Discover: see if the merchant is in Discover Deals or your active 5% category this quarter.")
    if "wells_fargo" in issuers:
        hooks.append("Wells Fargo: check Earn More Mall / promo list for this retailer before you pay.")
    return hooks
