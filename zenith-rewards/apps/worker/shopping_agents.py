"""
Parallel specialist “agents” for retail price discovery (direct HTTP + optional FinCrawler).

Follows the **parallel multi-agent** pattern from Google ADK / Azure guides: independent
subtasks (one per retailer) run concurrently; an orchestrator merges results. Each
specialist does a bounded HTTP fetch with retries. When `FINCRAWLER_BASE_URL` is set
(e.g. FinCrawler on Render—the general-URL extension of the Yahoo Finance / TradeTalk crawler),
weak rows are re-fetched via FinCrawler and merged if that yields clearer prices—not a paid product API.

Streaming (`orchestrate_parallel_compare_stream`) yields rows as they finish, then a summary.
"""

from __future__ import annotations

import asyncio
import logging
import random
import re
from collections.abc import AsyncIterator
from typing import Any

import httpx

from fincrawler_client import (
    fincrawler_is_configured,
    fincrawler_scrape_with_escalation,
    fincrawler_search_shopping,
    get_crawl_options,
)
from retailer_tier_profiles import get_shop_search_options

logger = logging.getLogger(__name__)

_INTER_RETAILER_PACE_SEC = (0.4, 1.2)
from shopping import (
    BROWSER_UA,
    RETAILERS,
    _tips_for_query,
    fetch_retailer_search,
    merge_better_retailer_row,
    new_retailer_row,
    populate_row_from_html,
)

_KNOWN_RETAILER_IDS = frozenset({"amazon", "bestbuy", "walmart", "ebay", "target"})

_RETAILER_ID_ALIASES: dict[str, str] = {
    "amazon": "amazon",
    "amazoncom": "amazon",
    "bestbuy": "bestbuy",
    "best buy": "bestbuy",
    "walmart": "walmart",
    "ebay": "ebay",
    "target": "target",
}


def _normalize_retailer_id(raw: str) -> str:
    key = raw.lower().strip().replace(".com", "")
    compact = key.replace(" ", "")
    return _RETAILER_ID_ALIASES.get(key, _RETAILER_ID_ALIASES.get(compact, compact))


def _coerce_usd_price(val: object) -> float | None:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        n = float(val)
        return n if 4.0 <= n <= 45_000.0 else None
    if isinstance(val, str):
        m = re.search(r"(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)", val.replace("$", "").strip())
        if m:
            try:
                n = float(m.group(1).replace(",", ""))
                return n if 4.0 <= n <= 45_000.0 else None
            except ValueError:
                return None
    return None


def _retailer_meta(retailer_id: str, query: str) -> tuple[str, str]:
    for rid, label, url_fn in RETAILERS:
        if rid == retailer_id:
            return label, url_fn(query)
    return retailer_id.title(), ""


def _row_score(row: dict[str, Any]) -> int:
    score = 0
    if row.get("indicative_low_usd") is not None:
        score += 4
    if row.get("ok"):
        score += 3
    if row.get("status_code") is not None and row["status_code"] < 400:
        score += 1
    return score


def _merge_retailer_row(existing: dict[str, Any] | None, candidate: dict[str, Any]) -> dict[str, Any]:
    if existing is None:
        return candidate
    if _row_score(candidate) > _row_score(existing):
        return candidate
    if (
        candidate.get("indicative_low_usd") is not None
        and existing.get("indicative_low_usd") is not None
        and candidate["indicative_low_usd"] < existing["indicative_low_usd"]
    ):
        return candidate
    return existing


def _apply_tier_observability(row: dict[str, Any], source: dict[str, Any]) -> None:
    tier_used = source.get("tier_used")
    if tier_used is not None:
        row["fetch_tier"] = int(tier_used) if isinstance(tier_used, (int, float)) else tier_used
    tier_name = source.get("tier_name")
    if tier_name:
        row["tier_name"] = str(tier_name)
    hits = source.get("detection_hits")
    if isinstance(hits, list) and hits:
        row["detection_hits"] = [str(h) for h in hits]
    session_id = source.get("session_id")
    if session_id:
        row["session_id"] = str(session_id)


def _log_row_tier(row: dict[str, Any]) -> None:
    logger.info(
        "retailer=%s source=%s tier=%s hits=%s ok=%s",
        row.get("retailer_id"),
        row.get("fetch_source"),
        row.get("fetch_tier"),
        row.get("detection_hits"),
        row.get("ok"),
    )


def _apply_price_to_row(row: dict[str, Any], price: float | None, title: str | None = None) -> None:
    if price is None:
        return
    row["price_candidates_usd"] = [price]
    row["indicative_low_usd"] = price
    row["indicative_high_usd"] = price
    row["ok"] = True
    row["error"] = None
    if title:
        row["title"] = title


def _google_listing_to_row(listing: dict[str, Any], query: str) -> dict[str, Any] | None:
    merchant = (
        listing.get("retailer")
        or listing.get("merchant")
        or listing.get("store")
        or listing.get("seller")
        or listing.get("source")
        or ""
    )
    rid = _normalize_retailer_id(str(merchant))
    if rid not in _KNOWN_RETAILER_IDS:
        return None

    label, search_url = _retailer_meta(rid, query)
    row = new_retailer_row(rid, label, search_url)
    row["fetched_url"] = listing.get("url") or listing.get("link") or listing.get("product_url")
    row["title"] = listing.get("title") or listing.get("product_name") or listing.get("name") or label
    row["excerpt"] = listing.get("snippet") or listing.get("description") or ""
    price = _coerce_usd_price(
        listing.get("price") or listing.get("price_usd") or listing.get("amount"),
    )
    _apply_price_to_row(row, price, row["title"])
    if price is None:
        row["ok"] = False
        row["error"] = "no_price_in_google_listing"
    row["fetch_source"] = "google_shopping"
    return row


def _rows_from_google_payload(payload: dict[str, Any], query: str) -> dict[str, dict[str, Any]]:
    listings = payload.get("listings") or []
    by_id: dict[str, dict[str, Any]] = {}
    for listing in listings:
        if not isinstance(listing, dict):
            continue
        row = _google_listing_to_row(listing, query)
        if row is None:
            continue
        rid = row["retailer_id"]
        by_id[rid] = _merge_retailer_row(by_id.get(rid), row)
    return by_id


def _fincrawler_result_to_row(result: dict[str, Any], query: str) -> dict[str, Any] | None:
    rid = _normalize_retailer_id(str(result.get("retailer_key") or result.get("retailer") or ""))
    if rid not in _KNOWN_RETAILER_IDS:
        return None

    label, search_url = _retailer_meta(rid, query)
    row = new_retailer_row(rid, label or str(result.get("retailer") or rid), search_url)
    row["fetched_url"] = result.get("url")
    row["status_code"] = result.get("http_status")

    data = result.get("data") or {}
    if not isinstance(data, dict):
        data = {}

    row["title"] = data.get("product_name") or result.get("title") or row["label"]
    row["excerpt"] = result.get("excerpt") or ""

    price = _coerce_usd_price(data.get("price"))
    if price is None:
        price = _coerce_usd_price(result.get("price"))
    _apply_price_to_row(row, price, row["title"])

    status = str(result.get("status") or "")
    row["likely_blocked"] = status == "blocked"
    if status == "blocked":
        row["ok"] = False
        row["error"] = str(result.get("block_reason") or "blocked")
    elif status == "error":
        row["ok"] = False
        row["error"] = str(result.get("error") or "fetch_error")
    elif status in ("ok", "ok_via_google"):
        if data.get("_error"):
            row["ok"] = False
            row["error"] = str(data.get("_error"))
        elif price is None:
            row["ok"] = False
            row["error"] = "no_price"
    else:
        row["ok"] = False
        row["error"] = str(result.get("error") or status or "no_price")

    row["fetch_source"] = "fincrawler_v2"
    _apply_tier_observability(row, result)
    return row


def _rows_from_search_payload(payload: dict[str, Any], query: str) -> dict[str, dict[str, Any]]:
    results = payload.get("results") or []
    by_id: dict[str, dict[str, Any]] = {}
    for item in results:
        if not isinstance(item, dict):
            continue
        retailer_key = str(item.get("retailer_key") or "")
        if retailer_key == "google_shopping":
            google_bucket = item.get("data") if isinstance(item.get("data"), dict) else item
            for rid, row in _rows_from_google_payload(google_bucket or {}, query).items():
                by_id[rid] = _merge_retailer_row(by_id.get(rid), row)
            continue
        row = _fincrawler_result_to_row(item, query)
        if row is None:
            continue
        rid = row["retailer_id"]
        by_id[rid] = _merge_retailer_row(by_id.get(rid), row)
    return by_id


def _finalize_retailer_rows(by_id: dict[str, dict[str, Any]], query: str) -> list[dict[str, Any]]:
    ordered: list[dict[str, Any]] = []
    for rid, label, url_fn in RETAILERS:
        if rid in by_id:
            ordered.append(by_id[rid])
            continue
        placeholder = new_retailer_row(rid, label, url_fn(query))
        placeholder["fetch_source"] = "fincrawler_v2"
        placeholder["error"] = "not_found_in_shop_search"
        ordered.append(placeholder)
    return ordered


async def _try_fincrawler_compare(query: str) -> list[dict[str, Any]] | None:
    if not fincrawler_is_configured():
        return None

    search_res = await fincrawler_search_shopping(query, get_shop_search_options())
    if not search_res.get("ok"):
        return None
    payload = search_res.get("results")
    if not isinstance(payload, dict):
        return None
    by_id = _rows_from_search_payload(payload, query)
    if not by_id:
        return None
    return _finalize_retailer_rows(by_id, query)


def _merge_fincrawler_responses(
    google_res: dict[str, Any],
    search_res: dict[str, Any],
    query: str,
) -> dict[str, dict[str, Any]] | None:
    by_id: dict[str, dict[str, Any]] = {}

    if google_res.get("ok"):
        payload = google_res.get("results")
        if isinstance(payload, dict):
            for rid, row in _rows_from_google_payload(payload, query).items():
                by_id[rid] = _merge_retailer_row(by_id.get(rid), row)

    if search_res.get("ok"):
        payload = search_res.get("results")
        if isinstance(payload, dict):
            for rid, row in _rows_from_search_payload(payload, query).items():
                by_id[rid] = _merge_retailer_row(by_id.get(rid), row)

    if not by_id and not google_res.get("ok") and not search_res.get("ok"):
        return None
    if not by_id:
        return None
    return by_id


def _row_needs_http_fallback(row: dict[str, Any]) -> bool:
    if row.get("indicative_low_usd") is not None and row.get("ok") and not row.get("likely_blocked"):
        return False
    # Weak rows—including those blocked after max-tier FinCrawler escalation—get httpx last-resort.
    return True


async def _http_fallback_weak_retailers(
    query: str,
    rows: list[dict[str, Any]],
    max_bytes: int,
) -> AsyncIterator[dict[str, Any]]:
    """Parallel direct HTTP for retailers FinCrawler did not fill; yields updated rows."""
    weak_by_id = {
        row["retailer_id"]: idx
        for idx, row in enumerate(rows)
        if _row_needs_http_fallback(row)
    }
    if not weak_by_id:
        return

    retailer_meta = {rid: (lab, url_fn(query)) for rid, lab, url_fn in RETAILERS}
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(40.0),
        headers={
            "User-Agent": BROWSER_UA,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    ) as client:
        async def fetch_weak(idx: int, rid: str, stagger: float) -> tuple[int, dict[str, Any]]:
            if stagger > 0:
                await asyncio.sleep(stagger)
            label, search_url = retailer_meta[rid]
            row = await _retailer_agent_run(client, rid, label, search_url, max_bytes)
            _log_row_tier(row)
            return idx, row

        tasks = [
            asyncio.create_task(
                fetch_weak(
                    idx,
                    rid,
                    random.uniform(*_INTER_RETAILER_PACE_SEC) * i,
                )
            )
            for i, (rid, idx) in enumerate(weak_by_id.items())
        ]
        for finished in asyncio.as_completed(tasks):
            idx, updated = await finished
            rows[idx] = updated
            yield updated


_SHOPPING_DISCLAIMER = (
    "Indicative prices are parsed from public search pages and may be incomplete or wrong. "
    "Retailers often challenge automated clients—open the search link to verify live pricing."
)

# Transient cases where a quick retry can help (avoid retrying 503 from bot walls—it usually adds latency only).
_RETRYABLE_STATUS = frozenset({429, 502})


def _row_needs_fincrawler(row: dict[str, Any]) -> bool:
    if not fincrawler_is_configured():
        return False
    if not row.get("ok"):
        return True
    if row.get("likely_blocked"):
        return True
    if row.get("indicative_low_usd") is None:
        return True
    code = row.get("status_code")
    if code in (403, 503):
        return True
    return False


async def _maybe_enrich_with_fincrawler(
    base: dict[str, Any],
    retailer_id: str,
    label: str,
    search_url: str,
    max_bytes: int,
) -> dict[str, Any]:
    if not _row_needs_fincrawler(base):
        base["fetch_source"] = "http"
        base["fincrawler_attempted"] = False
        return base

    fc = await fincrawler_scrape_with_escalation(search_url, retailer_id, max_bytes=max_bytes)
    base["fincrawler_attempted"] = True
    if not fc.get("ok") or not fc.get("html"):
        base["fetch_source"] = "http"
        base["fincrawler_error"] = str(fc.get("error") or "fincrawler_failed")
        meta = fc.get("meta") or {}
        _apply_tier_observability(base, meta)
        return base

    meta = fc.get("meta") or {}
    fc_row = new_retailer_row(retailer_id, label, search_url)
    page_status = meta.get("page_status")
    if isinstance(page_status, int):
        status_code = page_status
    elif isinstance(page_status, str) and page_status.strip().isdigit():
        status_code = int(page_status.strip())
    else:
        status_code = 200
    populate_row_from_html(
        fc_row,
        fc["html"],
        max_bytes=max_bytes,
        fetched_url=str(meta.get("final_url") or search_url),
        status_code=status_code,
    )
    merged = merge_better_retailer_row(base, fc_row)
    merged["fincrawler_attempted"] = True
    merged.pop("fincrawler_error", None)
    _apply_tier_observability(merged, meta)
    if str(meta.get("status") or "") == "blocked":
        merged["likely_blocked"] = True
        merged["ok"] = False
        merged["error"] = str(meta.get("block_reason") or "blocked")
    if merged is base:
        merged["fetch_source"] = "http"
        _log_row_tier(merged)
        return merged
    http_had_signal = base.get("ok") and not base.get("likely_blocked") and base.get("indicative_low_usd") is not None
    merged["fetch_source"] = "http+fincrawler" if http_had_signal else "fincrawler"
    _log_row_tier(merged)
    return merged


async def _run_retailer_with_pace(
    client: httpx.AsyncClient,
    retailer_id: str,
    label: str,
    search_url: str,
    max_bytes: int,
    stagger_index: int,
) -> dict[str, Any]:
    if stagger_index > 0:
        await asyncio.sleep(random.uniform(*_INTER_RETAILER_PACE_SEC) * stagger_index)
    row = await _retailer_agent_run(client, retailer_id, label, search_url, max_bytes)
    _log_row_tier(row)
    return row


async def _retailer_agent_run(
    client: httpx.AsyncClient,
    retailer_id: str,
    label: str,
    search_url: str,
    max_bytes: int,
    *,
    attempts: int = 2,
) -> dict[str, Any]:
    """
    One retailer specialist: fetch search HTML + parse hints, with bounded retries.
    """
    last: dict[str, Any] | None = None
    for attempt in range(max(1, attempts)):
        last = await fetch_retailer_search(client, retailer_id, label, search_url, max_bytes)
        err = str(last.get("error") or "")
        code = last.get("status_code")
        transient = err.startswith("fetch_failed") or code in _RETRYABLE_STATUS
        if not transient or attempt >= attempts - 1:
            break
        await asyncio.sleep(0.35 * (attempt + 1) + random.random() * 0.25)
    assert last is not None
    return await _maybe_enrich_with_fincrawler(last, retailer_id, label, search_url, max_bytes)


def _order_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {r["retailer_id"]: r for r in rows}
    return [by_id[rid] for rid, _, _ in RETAILERS if rid in by_id]


def _rank(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked: list[tuple[float, str, str]] = []
    for row in rows:
        low = row.get("indicative_low_usd")
        if low is not None and row.get("ok") and not row.get("likely_blocked"):
            ranked.append((low, row["retailer_id"], row["label"]))
    ranked.sort(key=lambda x: x[0])
    return [
        {"retailer_id": rid, "label": lab, "indicative_low_usd": low}
        for low, rid, lab in ranked
    ]



async def orchestrate_parallel_compare(query: str, max_bytes: int = 350_000) -> dict[str, Any]:
    """Batch mode: wait for all retailers, return stable ordering + rankings."""
    q = " ".join(query.split())
    if len(q) < 2:
        return {"query": query, "retailers": [], "error": "query_too_short"}

    fc_rows = await _try_fincrawler_compare(q)
    if fc_rows is not None:
        return {
            "query": q,
            "retailers": fc_rows,
            "ranked_by_lowest_indicative": _rank(fc_rows),
            "tips": _tips_for_query(q),
            "disclaimer": (
                "Indicative prices come from Google Shopping via FinCrawler and may differ from in-cart totals. "
                "Open each store link to verify live pricing before you buy."
            ),
        }

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(40.0),
        headers={
            "User-Agent": BROWSER_UA,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    ) as client:
        tasks = [
            asyncio.create_task(
                _run_retailer_with_pace(client, rid, lab, url_fn(q), max_bytes, i)
            )
            for i, (rid, lab, url_fn) in enumerate(RETAILERS)
        ]
        rows = await asyncio.gather(*tasks)

    ordered = _order_rows(list(rows))
    return {
        "query": q,
        "retailers": ordered,
        "ranked_by_lowest_indicative": _rank(ordered),
        "tips": _tips_for_query(q),
        "disclaimer": _SHOPPING_DISCLAIMER,
    }


async def orchestrate_parallel_compare_stream(
    query: str,
    max_bytes: int = 350_000,
) -> AsyncIterator[dict[str, Any]]:
    """
    Stream mode: emit each retailer row when its agent finishes, then a summary envelope.

    Events:
      {"type": "retailer", "data": <row dict>}
      {"type": "summary", "data": <same shape as orchestrate_parallel_compare result>}
    """
    q = " ".join(query.split())
    if len(q) < 2:
        yield {"type": "error", "data": {"error": "query_too_short", "query": query}}
        return

    rows: list[dict[str, Any]] = []
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(40.0),
        headers={
            "User-Agent": BROWSER_UA,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    ) as client:
        task_objs = [
            asyncio.create_task(_run_retailer_with_pace(client, rid, lab, url_fn(q), max_bytes, i))
            for i, (rid, lab, url_fn) in enumerate(RETAILERS)
        ]
        for finished in asyncio.as_completed(task_objs):
            row = await finished
            rows.append(row)
            yield {"type": "retailer", "data": row}

    ordered = _order_rows(rows)
    yield {
        "type": "summary",
        "data": {
            "query": q,
            "retailers": ordered,
            "ranked_by_lowest_indicative": _rank(ordered),
            "tips": _tips_for_query(q),
            "disclaimer": _SHOPPING_DISCLAIMER,
        },
    }
