"""
Optional FinCrawler integration: the **general-URL extension** of the Yahoo Finance / TradeTalk
crawler you run on Render (same idea as issuer or quote pages—bounded fetch + structured snapshot).

Contract matches this repo's Zenith worker `POST /crawl` (see `main.py` » `CrawlRequest`) and
the tiered envelope in `docs/fincrawler-contract.md`.

  Request JSON:  {"url": "https://...", "max_bytes": 350000, ...tier hints...}

  Response JSON (typical for crawl + Finance-style services—often **no** raw ``html``):
    {"url", "status_code", "title", "excerpt", optional "content_type", ...}

When the snapshot has only ``title`` / ``excerpt``, we synthesize a tiny HTML document so
shopping price heuristics still see metadata (full-page HTML is optional).

If the service returns a page body, we also accept:
  { "html" | "raw_html" | "page_html" | "snapshot" | "body" | "content": "..." }
plus raw ``text/html`` responses.
"""

from __future__ import annotations

import asyncio
import os
import random
from typing import Any

import httpx

from retailer_tier_profiles import CrawlOptions, get_crawl_options

__all__ = [
    "CrawlOptions",
    "fincrawler_extract_data",
    "fincrawler_google_shopping",
    "fincrawler_is_configured",
    "fincrawler_scrape_page",
    "fincrawler_scrape_with_escalation",
    "fincrawler_search_shopping",
    "get_crawl_options",
]


def fincrawler_is_configured() -> bool:
    return bool(os.environ.get("FINCRAWLER_BASE_URL", "").strip())


def _env_int(key: str, default: int) -> int:
    raw = os.environ.get(key, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _fincrawler_base() -> str:
    return os.environ["FINCRAWLER_BASE_URL"].strip().rstrip("/")


def _fincrawler_headers(*, accept: str = "application/json") -> dict[str, str]:
    headers: dict[str, str] = {"Accept": accept}
    api_key = os.environ.get("FINCRAWLER_API_KEY", "").strip()
    if api_key:
        headers["X-API-Key"] = api_key
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def _is_transient_error(result: dict[str, Any]) -> bool:
    err = str(result.get("error") or "")
    if err.startswith("fincrawler_fetch_failed"):
        return True
    if err.startswith("fincrawler_http_"):
        try:
            code = int(err.split("_")[-1])
            return code in (502, 503, 429)
        except ValueError:
            pass
    return False


async def _fincrawler_post(
    path: str,
    body: dict[str, Any] | None = None,
    *,
    timeout_sec: float,
    accept: str = "application/json",
) -> dict[str, Any]:
    if not fincrawler_is_configured():
        return {"ok": False, "error": "fincrawler_not_configured"}

    base = _fincrawler_base()
    if not path.startswith("/"):
        path = "/" + path
    url = f"{base}{path}"
    headers = {**_fincrawler_headers(accept=accept), "Content-Type": "application/json"}

    retry_attempts = _env_int("FINCRAWLER_RETRY_ATTEMPTS", 2)
    last: dict[str, Any] = {"ok": False, "error": "fincrawler_fetch_failed: unknown"}

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(timeout_sec),
    ) as client:
        for attempt in range(max(1, retry_attempts)):
            try:
                r = await client.post(url, json=body or {}, headers=headers)
            except httpx.RequestError as e:
                last = {"ok": False, "error": f"fincrawler_fetch_failed: {e!s}"}
            else:
                if r.status_code >= 400:
                    last = {
                        "ok": False,
                        "error": f"fincrawler_http_{r.status_code}",
                        "detail": r.text[:400],
                        "http_status": r.status_code,
                    }
                else:
                    return {"ok": True, "response": r}
            if not _is_transient_error(last) or attempt >= retry_attempts - 1:
                break
            await asyncio.sleep(0.35 * (attempt + 1) + random.random() * 0.25)

    return last


def _coerce_html(payload: dict[str, Any]) -> str | None:
    for key in ("html", "raw_html", "page_html", "snapshot", "body", "content"):
        v = payload.get(key)
        if isinstance(v, str) and len(v.strip()) > 80:
            return v
    nested = payload.get("data")
    if isinstance(nested, dict):
        return _coerce_html(nested)
    nested = payload.get("result")
    if isinstance(nested, dict):
        return _coerce_html(nested)
    return None


def _minimal_html_from_crawl_shape(payload: dict[str, Any]) -> str | None:
    title = str(payload.get("title") or "")
    excerpt = str(payload.get("excerpt") or "")
    if not title and not excerpt:
        return None
    esc_t = title.replace("<", "")
    esc_e = excerpt.replace("<", "")
    return f"<title>{esc_t}</title><meta name=\"description\" content=\"{esc_e[:500]}\"/><body>{esc_e}</body>"


def _extract_crawl_meta(payload: dict[str, Any]) -> dict[str, Any]:
    meta: dict[str, Any] = {
        "final_url": payload.get("url") or payload.get("final_url"),
        "page_status": payload.get("status_code") or payload.get("http_status"),
        "status": payload.get("status"),
        "tier_used": payload.get("tier_used"),
        "tier_name": payload.get("tier_name"),
        "detection_hits": payload.get("detection_hits"),
        "block_reason": payload.get("block_reason"),
        "session_id": payload.get("session_id"),
    }
    return {k: v for k, v in meta.items() if v is not None}


def _parse_scrape_response(r: httpx.Response, max_bytes: int) -> dict[str, Any]:
    ct = (r.headers.get("content-type") or "").lower()
    html: str | None = None
    meta: dict[str, Any] = {"http_status": r.status_code}
    payload: dict[str, Any] | None = None

    if "application/json" in ct:
        try:
            raw = r.json()
            if isinstance(raw, dict):
                payload = raw
        except Exception:
            payload = None
        if payload:
            meta.update(_extract_crawl_meta(payload))
            html = _coerce_html(payload)
            if html is None:
                html = _minimal_html_from_crawl_shape(payload)

    if html is None and r.text and len(r.text.strip()) > 80:
        html = r.text

    if not html:
        return {"ok": False, "error": "fincrawler_no_html", "detail": r.text[:400], "meta": meta}

    return {"ok": True, "html": html[:max_bytes], "meta": meta, "payload": payload}


def _merge_crawl_options(body: dict[str, Any], crawl_options: CrawlOptions | None) -> dict[str, Any]:
    if crawl_options is None:
        return body
    merged = {**body, **crawl_options.to_request_dict()}
    return merged


async def fincrawler_scrape_page(
    url: str,
    max_bytes: int = 350_000,
    crawl_options: CrawlOptions | None = None,
) -> dict[str, Any]:
    if not fincrawler_is_configured():
        return {"ok": False, "error": "fincrawler_not_configured"}

    path = os.environ.get("FINCRAWLER_CRAWL_PATH", "/crawl").strip() or "/crawl"
    if not path.startswith("/"):
        path = "/" + path
    timeout_sec = float(os.environ.get("FINCRAWLER_TIMEOUT_SECONDS", "90"))

    body = _merge_crawl_options(
        {"url": url, "max_bytes": min(max(max_bytes, 10_000), 2_000_000)},
        crawl_options,
    )

    post_result = await _fincrawler_post(
        path,
        body,
        timeout_sec=timeout_sec,
        accept="application/json, text/html;q=0.9,*/*;q=0.8",
    )
    if not post_result.get("ok"):
        return post_result

    r: httpx.Response = post_result["response"]
    return _parse_scrape_response(r, max_bytes)


def _is_blocked_payload(payload: dict[str, Any] | None) -> bool:
    if not payload:
        return False
    return str(payload.get("status") or "") == "blocked"


async def fincrawler_scrape_with_escalation(
    url: str,
    retailer_key: str,
    max_bytes: int = 350_000,
) -> dict[str, Any]:
    """
    Scrape with per-retailer tier profile; client-side escalation when blocked.
    Reuses session_id across retries for session warming.
    """
    opts = get_crawl_options(retailer_key)
    max_escalations = _env_int("FINCRAWLER_CLIENT_MAX_ESCALATIONS", 2)
    tier = opts.tier
    last: dict[str, Any] = {"ok": False, "error": "fincrawler_not_attempted"}

    for escalation in range(max_escalations + 1):
        attempt_opts = opts.with_tier(tier)
        result = await fincrawler_scrape_page(url, max_bytes=max_bytes, crawl_options=attempt_opts)
        last = result
        if not result.get("ok"):
            if _is_transient_error(result) and escalation < max_escalations:
                tier = min(tier + 1, opts.max_tier)
                continue
            return result

        payload = result.get("payload")
        if not _is_blocked_payload(payload if isinstance(payload, dict) else None):
            return result

        tier_used = (payload or {}).get("tier_used") if isinstance(payload, dict) else None
        current = int(tier_used) if isinstance(tier_used, int) else tier
        if current >= opts.max_tier or escalation >= max_escalations:
            return result
        tier = min(current + 1, opts.max_tier)

    return last


async def fincrawler_extract_data(url: str, prompt: str) -> dict[str, Any]:
    """
    Call the new FinCrawler /extract endpoint with a natural language prompt.
    Returns structured JSON data directly from the DeepSeek AI model.
    """
    if not fincrawler_is_configured():
        return {"ok": False, "error": "fincrawler_not_configured"}

    timeout_sec = float(os.environ.get("FINCRAWLER_TIMEOUT_SECONDS", "120"))
    body = {
        "url": url,
        "prompt": prompt,
        "force_refresh": True,
        "extra_context": "Zenith Rewards Point Valuation Request",
    }

    post_result = await _fincrawler_post("/extract", body, timeout_sec=timeout_sec)
    if not post_result.get("ok"):
        return post_result

    r: httpx.Response = post_result["response"]
    try:
        payload = r.json()
        if payload.get("status") == "ok" and "data" in payload:
            return {
                "ok": True,
                "data": payload["data"],
                "cache_hit": payload.get("cache_hit", False),
            }
        return {
            "ok": False,
            "error": "extraction_failed",
            "detail": payload.get("error", str(payload)),
        }
    except Exception as e:
        return {"ok": False, "error": "json_parse_error", "detail": str(e)}


async def fincrawler_google_shopping(
    query: str,
    crawl_options: CrawlOptions | None = None,
) -> dict[str, Any]:
    """
    Direct Google Shopping scrape via FinCrawler — one call, all retailers on the results page.
    """
    if not fincrawler_is_configured():
        return {"ok": False, "error": "fincrawler_not_configured"}

    from urllib.parse import quote_plus

    timeout_sec = float(os.environ.get("FINCRAWLER_TIMEOUT_SECONDS", "180"))
    opts = crawl_options or get_crawl_options("google_shopping")
    q = quote_plus(query.strip())
    body = _merge_crawl_options({}, opts)

    post_result = await _fincrawler_post(
        f"/shop/google?query={q}",
        body if body else None,
        timeout_sec=timeout_sec,
    )
    if not post_result.get("ok"):
        return post_result

    r: httpx.Response = post_result["response"]
    try:
        data = r.json()
        return {"ok": True, "results": data}
    except Exception as e:
        return {"ok": False, "error": "json_parse_error", "detail": str(e)}


async def fincrawler_search_shopping(
    query: str,
    crawl_options: CrawlOptions | None = None,
) -> dict[str, Any]:
    """
    Call the advanced multi-retailer search endpoint in FinCrawler.
    Leverages tiered fetchers, LLM extraction, and Google fallback.
    """
    if not fincrawler_is_configured():
        return {"ok": False, "error": "fincrawler_not_configured"}

    timeout_sec = float(os.environ.get("FINCRAWLER_TIMEOUT_SECONDS", "180"))
    body = _merge_crawl_options({"query": query, "google_fallback": True}, crawl_options)

    post_result = await _fincrawler_post("/shop/search", body, timeout_sec=timeout_sec)
    if not post_result.get("ok"):
        return post_result

    r: httpx.Response = post_result["response"]
    try:
        data = r.json()
        return {"ok": True, "results": data}
    except Exception as e:
        return {"ok": False, "error": "json_parse_error", "detail": str(e)}
