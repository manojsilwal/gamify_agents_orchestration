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
import random
from collections.abc import AsyncIterator
from typing import Any

import httpx

from fincrawler_client import fincrawler_is_configured, fincrawler_scrape_page, fincrawler_search_shopping
from shopping import (
    BROWSER_UA,
    RETAILERS,
    _tips_for_query,
    fetch_retailer_search,
    merge_better_retailer_row,
    new_retailer_row,
    populate_row_from_html,
)

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

    fc = await fincrawler_scrape_page, fincrawler_search_shopping(search_url, max_bytes=max_bytes)
    base["fincrawler_attempted"] = True
    if not fc.get("ok") or not fc.get("html"):
        base["fetch_source"] = "http"
        base["fincrawler_error"] = str(fc.get("error") or "fincrawler_failed")
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
    if merged is base:
        merged["fetch_source"] = "http"
        return merged
    http_had_signal = base.get("ok") and not base.get("likely_blocked") and base.get("indicative_low_usd") is not None
    merged["fetch_source"] = "http+fincrawler" if http_had_signal else "fincrawler"
    return merged


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

    # --- ADVANCED INTELLIGENCE LAYER (FinCrawler v2) ---
    if fincrawler_is_configured():
        fc_res = await fincrawler_search_shopping(q)
        if fc_res.get("ok"):
            results = fc_res["results"]
            # Map FinCrawler results back to the format expected by Zenith UI
            # FinCrawler returns a list of results.
            rows = []
            for r in results:
                # Identify which Zenith retailer this matches
                rid = r.get("retailer_key") or r.get("retailer", "").lower().replace(" ", "")
                # Create a row compatible with Zenith UI
                row = new_retailer_row(rid, r.get("retailer", rid), r.get("url", ""))
                row["status_code"] = r.get("http_status")
                row["ok"] = r.get("status") == "ok"
                row["title"] = r.get("data", {}).get("product_name") or r.get("title") or row["label"]
                row["excerpt"] = r.get("excerpt") or ""
                
                # Extract prices from LLM data
                data = r.get("data") or {}
                price = data.get("price")
                if price:
                    row["price_candidates_usd"] = [price]
                    row["indicative_low_usd"] = price
                    row["indicative_high_usd"] = price
                
                row["likely_blocked"] = r.get("status") == "blocked"
                row["fetch_source"] = "fincrawler_v2"
                rows.append(row)
            
            ordered = _order_rows(rows)
            return {
                "query": q,
                "retailers": ordered,
                "ranked_by_lowest_indicative": _rank(ordered),
                "tips": _tips_for_query(q),
                "disclaimer": _SHOPPING_DISCLAIMER,
            }
    # ---------------------------------------------------

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
            _retailer_agent_run(client, rid, lab, url_fn(q), max_bytes)
            for rid, lab, url_fn in RETAILERS
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
            asyncio.create_task(_retailer_agent_run(client, rid, lab, url_fn(q), max_bytes))
            for rid, lab, url_fn in RETAILERS
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
