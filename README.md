# Golden Agent

Golden Agent is a multi-service investment intelligence workspace focused on:

- US congress and insider transaction tracking
- China A-share market data aggregation
- Gold market snapshots and spread monitoring
- AI-generated research signals and recommendation feed

## Highlights

- Real-time updates via SSE (`/api/sse`)
- Unified bulk API for fast first-screen rendering (`/api/bulk`)
- Global search API with ranking and market filter (`/api/search`)
- AI recommendation service bridge (`/api/ai/*`)
- Feature flags for safe open-source deployments

## Monorepo Structure

- `server/`: Node.js + TypeScript API, scheduler, Prisma (SQLite)
- `frontend_vite/`: main React + Vite user frontend
- `admin/`: React + Vite admin console
- `backend/`: FastAPI data service
- `ai-trader-service/`: FastAPI AI recommendation service

## Quick Start (Local)

### 1. Start server

```bash
cd server
npm install
cp .env.example .env
npm run build
npm run dev
```

### 2. Start frontend

```bash
cd frontend_vite
npm install
cp .env.example .env
npm run dev
```

### 3. (Optional) Start AI recommendation service

```bash
cd ai-trader-service
pip install -r requirements.txt
python main.py
```

## API Keys and Secrets

Fill your own API keys in local `.env` files. Do not hardcode keys in source files.

- `ai-trader-service/.env`
- `server/.env`
- `frontend_vite/.env`

Common key locations:

- `ai-trader-service/.env`: `OPENAI_API_KEY`, `OPENAI_API_BASE`, `DEFAULT_MODEL`
- `server/.env`: `AI_SERVICE_URL`, `JWT_SECRET`, `SMTP_USER`, `SMTP_PASS`
- `frontend_vite/.env`: only public `VITE_*` variables (never put private keys here)

Safety notes:

- `.env` is ignored by git in this repo, so local keys should not be uploaded.
- `ai-trader-service/.env.example`, `server/.env.example`, `frontend_vite/.env.example` are templates only.
- Before pushing, run `git status` and confirm no secrets appear in tracked files.

## Feature Flags

Server (`server/.env`):

- `ENABLE_AI=true|false`
- `ENABLE_CN_MARKET=true|false`
- `ENABLE_GLOBAL_MARKET=true|false`

Frontend (`frontend_vite/.env`):

- `VITE_ENABLE_AI=true|false`
- `VITE_API_BASE_URL=http://localhost:8000/api`

Runtime feature status endpoint:

- `GET /api/features`

## Core APIs

- `GET /api/health`
- `GET /api/bulk`
- `GET /api/search?q=keyword&limit=6&market=all|cn|us&include_news=true`
- `GET /api/ai/status`
- `GET /api/ai/recommendations`

## Compliance and Risk Notice

This project is an information and research tool.

- It does **not** provide investment advice.
- It does **not** execute trades.
- AI outputs may be incorrect, delayed, or biased.
- Use at your own risk.

Before public deployment, make sure local laws and platform policies are satisfied in your jurisdiction.

## Open-Source Roadmap

- Improve quantitative strategy framework and backtesting
- Add explainable AI signal cards and evidence chains
- Add tests for search ranking and signal quality
- Optimize frontend bundle splitting

## Contributing

Issues and PRs are welcome. Keep PRs scoped and include:

- affected modules
- local verification steps
- screenshots for UI changes

