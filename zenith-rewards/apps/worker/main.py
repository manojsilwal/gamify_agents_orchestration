import re
from urllib.parse import urlparse

import json

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from shopping import compare_across_retailers
from shopping_agents import orchestrate_parallel_compare_stream
from fincrawler_client import fincrawler_is_configured, fincrawler_news, fincrawler_quote_full

app = FastAPI(title="Zenith Worker API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "worker"}


class CrawlRequest(BaseModel):
    url: str = Field(..., min_length=4, max_length=2048)
    max_bytes: int = Field(500_000, ge=10_000, le=2_000_000)


@app.post("/crawl")
async def crawl(req: CrawlRequest):
    """
    Lightweight HTTP fetch + title extraction (no browser).
    For JS-heavy pages, results may be incomplete; use for issuer T&Cs, blogs, etc.
    """
    raw = req.url.strip()
    if not raw.startswith(("http://", "https://")):
        raw = "https://" + raw
    parsed = urlparse(raw)
    if not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid URL")

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(25.0),
            headers={"User-Agent": "ZenithRewardsCrawler/1.0 (+https://zenith.local)"},
        ) as client:
            r = await client.get(raw)
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Fetch failed: {e!s}") from e

    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=f"HTTP {r.status_code} from origin")

    text = r.text[: req.max_bytes]
    title_m = re.search(r"<title[^>]*>([^<]{1,500})</title>", text, re.IGNORECASE | re.DOTALL)
    title = ""
    if title_m:
        title = re.sub(r"\s+", " ", title_m.group(1)).strip()
    desc_m = re.search(
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\'<]{1,500})',
        text,
        re.IGNORECASE,
    )
    excerpt = desc_m.group(1).strip() if desc_m else None
    if not excerpt:
        excerpt = re.sub(r"<[^>]+>", " ", text)[:400].strip()

    return {
        "url": str(r.url),
        "status_code": r.status_code,
        "title": title or parsed.netloc,
        "excerpt": excerpt,
        "content_type": r.headers.get("content-type"),
    }


class ShoppingCompareRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=200)
    max_bytes: int = Field(350_000, ge=50_000, le=1_000_000)


@app.post("/shopping/compare")
async def shopping_compare(req: ShoppingCompareRequest):
    """
    Fetch each major retailer’s **search results page** for the query (real HTTP).
    Heuristic USD amounts are extracted for side-by-side hints—not a substitute for in-cart pricing.
    """
    return await compare_across_retailers(req.query.strip(), req.max_bytes)


@app.post("/shopping/compare/stream")
async def shopping_compare_stream(req: ShoppingCompareRequest):
    """
    Same work as `/shopping/compare`, but streams **NDJSON** as each retailer agent finishes
    (`{"type":"retailer",...}`) then a final `{"type":"summary",...}` — better real-time UX.
    """

    async def ndjson():
        async for event in orchestrate_parallel_compare_stream(req.query.strip(), req.max_bytes):
            yield json.dumps(event, ensure_ascii=False) + "\n"

    return StreamingResponse(ndjson(), media_type="application/x-ndjson; charset=utf-8")


@app.get("/stocks/{ticker}/quote")
async def stock_quote(ticker: str, force_refresh: bool = False):
    """Structured Yahoo quote via FinCrawler GET /quote/full (300s timeout)."""
    if not fincrawler_is_configured():
        raise HTTPException(status_code=503, detail="fincrawler_not_configured")
    sym = ticker.upper().strip()
    if not sym or len(sym) > 12:
        raise HTTPException(status_code=400, detail="invalid_ticker")
    result = await fincrawler_quote_full(sym, force_refresh=force_refresh)
    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=result.get("error", "quote_fetch_failed"))
    return result


@app.get("/stocks/{ticker}/scorecard")
async def stock_scorecard(ticker: str, force_refresh: bool = False):
    """Business quality scorecard tiles mapped from FinCrawler quote data."""
    if not fincrawler_is_configured():
        raise HTTPException(status_code=503, detail="fincrawler_not_configured")
    sym = ticker.upper().strip()
    if not sym or len(sym) > 12:
        raise HTTPException(status_code=400, detail="invalid_ticker")
    result = await fincrawler_quote_full(sym, force_refresh=force_refresh)
    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=result.get("error", "quote_fetch_failed"))
    return {
        "ticker": sym,
        "scorecard": result.get("scorecard") or {},
        "field_count": result.get("field_count", 0),
        "source": result.get("source"),
        "cache_hit": result.get("cache_hit", False),
    }


@app.get("/stocks/{ticker}/news")
async def stock_news(ticker: str, limit: int = 8, force_refresh: bool = False):
    """News headlines via FinCrawler GET /news (parallel-safe with quote)."""
    if not fincrawler_is_configured():
        raise HTTPException(status_code=503, detail="fincrawler_not_configured")
    sym = ticker.upper().strip()
    if not sym or len(sym) > 12:
        raise HTTPException(status_code=400, detail="invalid_ticker")
    limit = max(1, min(limit, 25))
    result = await fincrawler_news(sym, limit=limit, force_refresh=force_refresh)
    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=result.get("error", "news_fetch_failed"))
    return result
