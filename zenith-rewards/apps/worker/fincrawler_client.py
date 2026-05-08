"""
Optional FinCrawler integration: the **general-URL extension** of the Yahoo Finance / TradeTalk
crawler you run on Render (same idea as issuer or quote pages—bounded fetch + structured snapshot).

Contract matches this repo’s Zenith worker `POST /crawl` (see `main.py` » `CrawlRequest`):

  Request JSON:  {"url": "https://...", "max_bytes": 350000}

  Response JSON (typical for crawl + Finance-style services—often **no** raw ``html``):
    {"url", "status_code", "title", "excerpt", optional "content_type", ...}

When the snapshot has only ``title`` / ``excerpt``, we synthesize a tiny HTML document so
shopping price heuristics still see metadata (full-page HTML is optional).

If the service returns a page body, we also accept:
  { "html" | "raw_html" | "page_html" | "snapshot" | "body" | "content": "..." }
plus raw ``text/html`` responses.
"""

from __future__ import annotations

import os
from typing import Any

import httpx


def fincrawler_is_configured() -> bool:
    return bool(os.environ.get("FINCRAWLER_BASE_URL", "").strip())


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


async def fincrawler_scrape_page(url: str, max_bytes: int = 350_000) -> dict[str, Any]:
    if not fincrawler_is_configured():
        return {"ok": False, "error": "fincrawler_not_configured"}

    base = os.environ["FINCRAWLER_BASE_URL"].strip().rstrip("/")
    path = os.environ.get("FINCRAWLER_CRAWL_PATH", "/crawl").strip() or "/crawl"
    if not path.startswith("/"):
        path = "/" + path
    api_key = os.environ.get("FINCRAWLER_API_KEY", "").strip()
    timeout_sec = float(os.environ.get("FINCRAWLER_TIMEOUT_SECONDS", "90"))

    headers: dict[str, str] = {"Accept": "application/json, text/html;q=0.9,*/*;q=0.8"}
    if api_key:
        headers["X-API-Key"] = api_key
        headers["Authorization"] = f"Bearer {api_key}"

    body = {"url": url, "max_bytes": min(max(max_bytes, 10_000), 2_000_000)}

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(timeout_sec),
    ) as client:
        try:
            r = await client.post(
                f"{base}{path}",
                json=body,
                headers={**headers, "Content-Type": "application/json"},
            )
        except httpx.RequestError as e:
            return {"ok": False, "error": f"fincrawler_fetch_failed: {e!s}"}

    ct = (r.headers.get("content-type") or "").lower()
    if r.status_code >= 400:
        return {
            "ok": False,
            "error": f"fincrawler_http_{r.status_code}",
            "detail": r.text[:400],
        }

    html: str | None = None
    meta: dict[str, Any] = {"http_status": r.status_code}

    if "application/json" in ct:
        try:
            payload = r.json()
        except Exception:
            payload = None
        if isinstance(payload, dict):
            meta["final_url"] = payload.get("url") or payload.get("final_url")
            meta["page_status"] = payload.get("status_code")
            html = _coerce_html(payload)
            if html is None:
                html = _minimal_html_from_crawl_shape(payload)
    if html is None and r.text and len(r.text.strip()) > 80:
        html = r.text

    if not html:
        return {"ok": False, "error": "fincrawler_no_html", "detail": r.text[:400]}

    return {
        "ok": True,
        "html": html[:max_bytes],
        "meta": meta,
    }


async def fincrawler_extract_data(url: str, prompt: str) -> dict[str, Any]:
    """
    Call the new FinCrawler /extract endpoint with a natural language prompt.
    Returns structured JSON data directly from the DeepSeek AI model.
    """
    if not fincrawler_is_configured():
        return {"ok": False, "error": "fincrawler_not_configured"}

    base = os.environ["FINCRAWLER_BASE_URL"].strip().rstrip("/")
    path = "/extract"
    api_key = os.environ.get("FINCRAWLER_API_KEY", "").strip()
    timeout_sec = float(os.environ.get("FINCRAWLER_TIMEOUT_SECONDS", "120"))

    headers: dict[str, str] = {"Accept": "application/json"}
    if api_key:
        headers["X-API-Key"] = api_key
        headers["Authorization"] = f"Bearer {api_key}"

    body = {
        "url": url,
        "prompt": prompt,
        "force_refresh": True,
        "extra_context": "Zenith Rewards Point Valuation Request"
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(timeout_sec)) as client:
        try:
            r = await client.post(
                f"{base}{path}",
                json=body,
                headers={**headers, "Content-Type": "application/json"},
            )
        except httpx.RequestError as e:
            return {"ok": False, "error": f"fincrawler_extract_failed: {e!s}"}

    if r.status_code >= 400:
        return {
            "ok": False,
            "error": f"fincrawler_http_{r.status_code}",
            "detail": r.text[:400],
        }

    try:
        payload = r.json()
        if payload.get("status") == "ok" and "data" in payload:
            return {
                "ok": True,
                "data": payload["data"],
                "cache_hit": payload.get("cache_hit", False)
            }
        else:
            return {
                "ok": False,
                "error": "extraction_failed",
                "detail": payload.get("error", str(payload))
            }
    except Exception as e:
        return {"ok": False, "error": "json_parse_error", "detail": str(e)}

