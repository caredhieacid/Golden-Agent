# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Golden Agent (金策智显)** is a global investment intelligence platform tracking:
- US Congress trading disclosures (STOCK Act)
- Chinese A-share market real-time quotes and capital flows
- Gold markets (domestic/international price arbitrage)

**Tech Stack:**
- **Frontend**: Vite + React 19 + React Router + Radix UI + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Database**: SQLite (development) with Prisma ORM
- **Real-time**: Server-Sent Events (SSE) for live updates
- **Charts**: Lightweight Charts, Recharts

## Development Commands

### Starting the Project

**Windows (recommended)**: Run `start.bat` in the project root. This will:
- Install dependencies if needed
- Initialize Prisma database (`npm run db:push`)
- Start both frontend (port 3000) and backend (port 8000)
- Open browser to http://localhost:3000

**Manual start**:
```bash
# Terminal 1: Backend (port 8000)
cd server && npm run dev

# Terminal 2: Frontend (port 3000)
cd frontend_vite && npm run dev
```

### Backend Commands (server/)
```bash
npm run dev          # Start with hot reload (tsx watch)
npm run build        # Compile TypeScript
npm run start        # Run compiled output
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio (database GUI)
```

### Frontend Commands (frontend_vite/)
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### After Schema Changes
Whenever you modify `server/prisma/schema.prisma`:
1. Run `npm run db:generate` in `server/` to regenerate Prisma client
2. Run `npm run db:push` to apply schema changes to database
3. If changing significantly, consider `npm run db:studio` to inspect the database

## Architecture

### Backend Structure (`server/src/`)

```
server/src/
├── index.ts          # Express server entry, cron jobs, SSE endpoint
├── db.ts             # Prisma client singleton
├── sse.ts            # SSE broadcaster for real-time updates
├── routes/           # API endpoints by domain
│   ├── gold.ts       # Gold prices, history
│   ├── stocks.ts     # A-share indices, sectors, hot stocks
│   ├── congress.ts   # Congress trades, politicians
│   ├── insiders.ts   # SEC Form 4 insider trading
│   ├── news.ts       # News/events stream
│   └── search.ts     # Global search
└── sync/             # Data fetching/scheduling
    ├── gold.ts       # Gold price sync (domestic/international)
    ├── stocks.ts     # A-share market data sync
    ├── congress.ts   # House financial disclosures parsing
    ├── insiders.ts   # SEC Form 4 insider trading sync
    └── news.ts       # News events generation
```

### Frontend Structure (`frontend_vite/src/`)

```
src/
├── main.tsx              # App entry, wraps with DataProvider
├── App.tsx               # React Router configuration
├── layouts/
│   └── RootLayout.tsx    # Main layout with header/footer
├── pages/                # Route components
│   ├── Home.tsx          # Landing page
│   ├── Congress.tsx      # Congress trades listing
│   ├── PoliticianDetail.tsx  # Individual politician
│   ├── Insider.tsx       # Insider trading page
│   ├── Market.tsx        # A-share market overview
│   ├── Gold.tsx          # Gold prices page
│   ├── News.tsx          # News feed
│   └── StockDetail.tsx   # Stock detail with charts
├── components/
│   ├── ui/               # Radix UI components (shadcn-style)
│   ├── landing/          # Home page sections
│   ├── business/         # Domain-specific components (Ticker, etc.)
│   └── layout/           # Header, Footer
├── lib/
│   ├── api.ts            # REST API helpers
│   ├── data-provider.tsx # React Context + SSE for global state
│   └── utils.ts          # Utility functions (cn, etc.)
└── types/
    └── index.ts          # TypeScript types
```

### Data Flow

**Initial Load**: Frontend calls `GET /api/bulk` to fetch all data at once (faster than multiple requests).

**Real-time Updates**: SSE (Server-Sent Events) push incremental updates:
- `gold_update` - Latest gold prices
- `indices_update` - A-share index changes
- `sectors_update` - Sector performance
- `hot_stocks_update` - Hot stocks ranking
- `congress_update` - New congress trades (triggers bulk reload)
- `gold_daily_update` - Daily OHLC updated (triggers bulk reload)

### Database Models (Prisma)

Key models in `server/prisma/schema.prisma`:
- `GoldSnapshot` - Minute-level gold prices (USD/CNY)
- `GoldDaily` - Daily OHLC for charts
- `StockIndex` - A-share indices (上证/深证/创业板)
- `Sector` - Industry sector performance
- `HotStock` - Top stocks by volume/change
- `Politician` - US Congress members
- `CongressTrade` - Stock trades by politicians
- `InsiderTrade` - SEC Form 4 insider trades
- `NewsEvent` - News/events feed

### Cron Schedule (server/src/index.ts)

- `* * * * *` (every minute) - Gold snapshot + indices
- `*/5 * * * *` (every 5 min) - Sectors + hot stocks
- `0 18 * * *` (6 PM daily) - Gold daily OHLC
- `0 8 * * *` (8 AM daily) - Congress data sync

## Frontend Patterns

### Using Global Data

Use the `useData()` hook from `lib/data-provider.tsx`:

```tsx
import { useData } from "@/lib/data-provider";

function MyComponent() {
  const { gold, stocks, congress, ready, sseConnected } = useData();
  // gold.prices, stocks.indices, congress.trades, etc.
}
```

The `DataProvider` in `main.tsx` handles:
- Initial bulk load via `GET /api/bulk`
- SSE connection and auto-reconnect
- Incremental updates via SSE events

### API Proxy

Frontend proxies `/api` requests to backend via `vite.config.ts`:
```ts
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  }
}
```

Use `API_BASE` from `lib/api.ts` for consistency.

### UI Components

Use Radix UI components from `@/components/ui/` (shadcn-style). All support dark mode via `next-themes` in `RootLayout`.

### Styling

- Tailwind CSS with `@tailwindcss/postcss` plugin
- Use `cn()` utility from `lib/utils.ts` for conditional classes
- Dark mode: check `RootLayout.tsx` for theme provider setup

## Backend Patterns

### Adding a New API Endpoint

1. Create route file in `server/src/routes/`
2. Export Express router
3. Import and mount in `server/src/index.ts`:
   ```ts
   import newRoutes from "./routes/new.js";
   app.use("/api/new", newRoutes);
   ```

### Adding Scheduled Data Sync

1. Create sync function in `server/src/sync/`
2. Call it via cron in `startCronJobs()` in `index.ts`:
   ```ts
   cron.schedule("*/10 * * * *", async () => {
     await syncAndBroadcast(syncMyData, "my_data_update", fetchMyDataForSSE);
   });
   ```

### SSE Broadcasting

Use the global `broadcaster` from `sse.ts`:
```ts
import { broadcaster } from "./sse.js";
broadcaster.broadcast("event_type", { data: "payload" });
```

Frontend will receive via EventSource if listener is registered in `data-provider.tsx`.

## Port Configuration

- Frontend: `3000` (Vite dev server)
- Backend: `8000` (Express API)
- SSE endpoint: `http://localhost:8000/api/sse`

## Key Files

- `server/prisma/schema.prisma` - Database schema
- `server/src/index.ts` - Backend entry point, all initialization
- `frontend_vite/src/lib/data-provider.tsx` - Global state + SSE
- `frontend_vite/src/App.tsx` - Route definitions
- `start.bat` - One-command startup (Windows)
