# Zenith Rewards

Zenith Rewards is a full-stack credit card and loyalty points optimization app built with React, FastAPI, Postgres, Redis, and Gemini AI.

## Requirements
- Docker and Docker Compose
- Node.js (for local UI development)
- Python 3.12 (for local backend development)

## Quick Start

The easiest way to run the entire application stack is using Docker Compose.

1. **Navigate to the app directory**:
```bash
cd zenith-rewards
```

2. **Create your environment variables**:
```bash
cp .env.example .env
```
*(Open `.env` and add your `GEMINI_API_KEY` to enable the AI agents).*

3. **Start the application stack**:
```bash
docker compose up --build -d
```
*(The initial build might take a few minutes as it downloads dependencies for the API, Worker, and Web frontend).*

4. **Seed the database with demo data**:
```bash
docker compose exec api python scripts/seed.py
```

### Accessing the application:
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Demo Login**: `demo@zenith.test` / `Demo1234!`

---

## Stopping the App

To stop the background Docker containers:
```bash
docker compose down
```

## Architecture Overview
- **Frontend** (`apps/web`): React + Vite + TypeScript (running on port 5173)
- **Backend API** (`apps/api`): FastAPI (running on port 8000)
- **Worker API** (`apps/worker`): FastAPI for agent task triggers (running on port 8001)
- **Worker Process** (`apps/worker`): ARQ queue running via Redis
