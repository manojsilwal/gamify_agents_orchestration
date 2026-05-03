from fastapi import FastAPI
import asyncio

app = FastAPI(title="Zenith Worker API", version="0.1.0")

@app.get("/health")
async def health():
    return {"status": "ok"}
