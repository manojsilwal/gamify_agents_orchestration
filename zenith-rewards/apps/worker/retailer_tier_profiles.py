"""
Per-retailer tier defaults for FinCrawler crawl requests.

Maps retailer keys to starting tier, session warming, and CrawlOptions used by
fincrawler_client and shopping_agents.
"""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass, field
from typing import Any

TIER_NAMES: dict[int, str] = {
    1: "static_api",
    2: "js_rendered",
    3: "advanced_antibot",
    4: "bank_grade",
}

TIER_NAME_TO_NUM: dict[str, int] = {v: k for k, v in TIER_NAMES.items()}

_RETAILER_PROFILES: dict[str, dict[str, Any]] = {
    "amazon": {"tier": 3, "warm_session": True},
    "walmart": {"tier": 3, "warm_session": True},
    "target": {"tier": 3, "warm_session": True},
    "bestbuy": {"tier": 2, "warm_session": True},
    "ebay": {"tier": 2, "warm_session": False},
    "google_shopping": {"tier": 3, "warm_session": True},
}

_DEFAULT_PROFILE: dict[str, Any] = {"tier": 2, "warm_session": True}


@dataclass
class CrawlOptions:
    tier: int = 2
    max_tier: int = 4
    auto_escalate: bool = True
    session_id: str = ""
    warm_session: bool = True
    retailer_key: str = ""
    fingerprint_profile: str = "chrome_mac_us"
    behavior: dict[str, Any] = field(default_factory=dict)
    proxy: dict[str, Any] | None = None

    @property
    def tier_name(self) -> str:
        return TIER_NAMES.get(self.tier, "js_rendered")

    def to_request_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "tier": self.tier,
            "tier_name": self.tier_name,
            "max_tier": self.max_tier,
            "auto_escalate": self.auto_escalate,
            "warm_session": self.warm_session,
            "fingerprint_profile": self.fingerprint_profile,
        }
        if self.session_id:
            out["session_id"] = self.session_id
        if self.retailer_key:
            out["retailer_key"] = self.retailer_key
        if self.behavior:
            out["behavior"] = self.behavior
        if self.proxy:
            out["proxy"] = self.proxy
        return out

    def with_tier(self, tier: int) -> CrawlOptions:
        return CrawlOptions(
            tier=tier,
            max_tier=self.max_tier,
            auto_escalate=self.auto_escalate,
            session_id=self.session_id,
            warm_session=self.warm_session,
            retailer_key=self.retailer_key,
            fingerprint_profile=self.fingerprint_profile,
            behavior=self.behavior,
            proxy=self.proxy,
        )


def _env_bool(key: str, default: bool) -> bool:
    raw = os.environ.get(key, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")


def _env_int(key: str, default: int) -> int:
    raw = os.environ.get(key, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _default_behavior() -> dict[str, Any]:
    if not _env_bool("FINCRAWLER_BEHAVIOR_SIM", True):
        return {}
    return {
        "mouse": True,
        "scroll": True,
        "dwell_ms": 1200,
        "resource_completeness": True,
    }


def _default_proxy() -> dict[str, Any] | None:
    url = os.environ.get("FINCRAWLER_PROXY_URL", "").strip()
    if not url:
        return None
    return {"url": url, "sticky": True, "geo": "us"}


def _session_id_for(retailer_key: str) -> str:
    return f"{retailer_key}-{uuid.uuid4().hex[:12]}"


def get_shop_search_options() -> CrawlOptions:
    """Options for multi-retailer /shop/search; server applies per-retailer profiles."""
    return CrawlOptions(
        tier=2,
        max_tier=_env_int("FINCRAWLER_DEFAULT_MAX_TIER", 4),
        auto_escalate=_env_bool("FINCRAWLER_AUTO_ESCALATE", True),
        session_id=f"shop-search-{uuid.uuid4().hex[:12]}",
        warm_session=_env_bool("FINCRAWLER_SESSION_WARM", True),
        retailer_key="",
        behavior=_default_behavior(),
        proxy=_default_proxy(),
    )


def get_crawl_options(retailer_key: str) -> CrawlOptions:
    """Build CrawlOptions for a retailer using profile defaults and env overrides."""
    profile = _RETAILER_PROFILES.get(retailer_key, _DEFAULT_PROFILE)
    warm_default = _env_bool("FINCRAWLER_SESSION_WARM", True)
    warm = profile.get("warm_session", True) if warm_default else False

    return CrawlOptions(
        tier=int(profile.get("tier", 2)),
        max_tier=_env_int("FINCRAWLER_DEFAULT_MAX_TIER", 4),
        auto_escalate=_env_bool("FINCRAWLER_AUTO_ESCALATE", True),
        session_id=_session_id_for(retailer_key),
        warm_session=warm,
        retailer_key=retailer_key,
        behavior=_default_behavior(),
        proxy=_default_proxy(),
    )


def get_retailer_default_tier(retailer_key: str) -> int:
    profile = _RETAILER_PROFILES.get(retailer_key, _DEFAULT_PROFILE)
    return int(profile.get("tier", 2))
