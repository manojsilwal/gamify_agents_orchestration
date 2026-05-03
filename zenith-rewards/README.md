# Zenith Rewards

Zenith Rewards is a full-stack credit card and loyalty points optimization app built with React, FastAPI, Postgres, Redis, and Gemini AI.

## Quick Start

1. Create your environment variables:
```bash
cp .env.example .env
```
2. Edit `.env` and add your `GEMINI_API_KEY`.
3. Start the application stack:
```bash
docker compose up -d
```
4. Seed the database with demo data:
```bash
docker compose exec api python scripts/seed.py
```

### Accessing the application:
- App: http://localhost:5173
- API docs: http://localhost:8000/docs
- Login: `demo@zenith.test` / `Demo1234!`

## Architecture
- Frontend: React + Vite + TypeScript (running on port 5173)
- Backend: FastAPI (running on port 8000)
- Worker: FastAPI for tasks (running on port 8001) and ARQ (Redis queue)
