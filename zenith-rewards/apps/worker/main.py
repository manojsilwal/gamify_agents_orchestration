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
