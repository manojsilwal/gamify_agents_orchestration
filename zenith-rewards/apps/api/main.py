import os

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from deps import resolve_demo_user_id
from services.data import (
    fetch_activity,
    fetch_activity_stats,
    fetch_points_by_month,
    fetch_portfolio_summary,
    fetch_recommendations,
    persist_crawler_activity,
)
from services.shopping_rewards import build_shopping_rewards_enrichment

# Treat unset or blank WORKER_URL as local dev default (Docker Compose must set http://worker-api:8001).
_raw_worker = (os.environ.get("WORKER_URL") or "").strip()
WORKER_URL = (_raw_worker or "http://127.0.0.1:8001").rstrip("/")

app = FastAPI(title="Zenith Rewards API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": app.title,
        "version": "0.1.0",
        "docs": "/docs",
        "openapi": "/openapi.json",
        "health": "/health",
        "api_v1": "/api/v1",
    }


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0", "db_ok": True, "redis_ok": True}


@app.get("/version")
async def version():
    return {"version": "0.1.0"}


api_router = FastAPI()


@api_router.get("/portfolio/summary")
async def portfolio_summary(session: AsyncSession = Depends(get_db)):
    user_id = await resolve_demo_user_id(session)
    return await fetch_portfolio_summary(session, user_id)


@api_router.get("/cards/user")
async def get_user_cards(session: AsyncSession = Depends(get_db)):
    user_id = await resolve_demo_user_id(session)
    data = await fetch_portfolio_summary(session, user_id)
    return data["cards"]


@api_router.get("/loyalty/accounts")
async def get_loyalty_accounts(session: AsyncSession = Depends(get_db)):
    user_id = await resolve_demo_user_id(session)
    data = await fetch_portfolio_summary(session, user_id)
    return data["loyalty_accounts"]


@api_router.get("/goals")
async def get_goals():
    return []


@api_router.get("/recommendations")
async def get_recommendations(session: AsyncSession = Depends(get_db)):
    user_id = await resolve_demo_user_id(session)
    return await fetch_recommendations(session, user_id)


@api_router.get("/providers/connections")
async def get_providers():
    return []


@api_router.get("/activity")
async def list_activity(limit: int = 100, session: AsyncSession = Depends(get_db)):
    user_id = await resolve_demo_user_id(session)
    return await fetch_activity(session, user_id, min(limit, 500))


@api_router.get("/activity/stats")
async def activity_stats(session: AsyncSession = Depends(get_db)):
    user_id = await resolve_demo_user_id(session)
    return await fetch_activity_stats(session, user_id)


@api_router.get("/insights/points-by-month")
async def points_by_month(months: int = 12, session: AsyncSession = Depends(get_db)):
    user_id = await resolve_demo_user_id(session)
    return await fetch_points_by_month(session, user_id, min(max(months, 1), 36))


class CrawlSnapshotIn(BaseModel):
    url: str = Field(..., min_length=4, max_length=2048)
    title: str = Field("", max_length=500)
    excerpt: str | None = Field(None, max_length=4000)


@api_router.post("/integrations/crawl-snapshot")
async def ingest_crawl_snapshot(body: CrawlSnapshotIn, session: AsyncSession = Depends(get_db)):
    """Persist a worker/web crawl result as an activity row (audit + history)."""
    user_id = await resolve_demo_user_id(session)
    label = body.title.strip() or body.url[:120]
    await persist_crawler_activity(session, user_id, label, body.url, body.excerpt)
    return {"status": "ok", "recorded": True}


@api_router.post("/market/cards/compare")
async def compare_market_cards(body: dict):
    return {"status": "ok", "body_keys": list(body.keys())}


class ShoppingCompareIn(BaseModel):
    query: str = Field(..., min_length=2, max_length=200)


@api_router.post("/shopping/compare")
async def shopping_compare(body: ShoppingCompareIn, session: AsyncSession = Depends(get_db)):
    """
    Product purchase intelligence: proxy to worker for live multi-retailer search snapshots
    (Amazon, Best Buy, Walmart, eBay, Target) plus stacking tips and wallet-aware reward guidance.
    """
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            r = await client.post(
                f"{WORKER_URL}/shopping/compare",
                json={"query": body.query.strip(), "max_bytes": 350_000},
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Worker unreachable: {e!s}") from e

    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=r.text or f"worker_http_{r.status_code}")

    data = r.json()
    data["stacking_notes"] = [
        "Use the card that earns the highest category rate for that merchant (online vs warehouse).",
        "Some portals exclude marketplaces or auction checkouts—read the offer terms before relying on them.",
    ]

    user_id = await resolve_demo_user_id(session)
    portfolio = await fetch_portfolio_summary(session, user_id)
    rewards = build_shopping_rewards_enrichment(
        data.get("retailers") or [],
        portfolio.get("cards") or [],
        portfolio.get("loyalty_accounts") or [],
    )
    data.update(rewards)
    return data


app.mount("/api/v1", api_router)
