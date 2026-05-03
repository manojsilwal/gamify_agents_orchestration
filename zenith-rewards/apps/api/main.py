from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Zenith Rewards API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0", "db_ok": True, "redis_ok": True}

@app.get("/version")
async def version():
    return {"version": "0.1.0"}

# Prefix routes
api_router = FastAPI()

@api_router.get("/portfolio/summary")
async def portfolio_summary():
    return {
        "total_points_equivalent_usd": 0.0,
        "average_cpp": 0.0,
        "cards_count": 0,
        "loyalty_accounts_count": 0,
        "stale_accounts": [],
        "monthly_spend_total": 0.0,
        "next_setup_step": "add_card",
        "cards": [],
        "loyalty_accounts": []
    }

@api_router.post("/market/cards/compare")
async def compare_market_cards(body: dict):
    return {"status": "ok"}

@api_router.get("/cards/user")
async def get_user_cards():
    return []

@api_router.get("/loyalty/accounts")
async def get_loyalty_accounts():
    return []

@api_router.get("/goals")
async def get_goals():
    return []

@api_router.get("/recommendations")
async def get_recommendations():
    return []

@api_router.get("/providers/connections")
async def get_providers():
    return []

app.mount("/api/v1", api_router)
