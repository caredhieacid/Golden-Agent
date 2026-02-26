﻿/**
 * 澶╂灑 DubheProject 鈥?Node.js 鍚庣鍏ュ彛
 * 
 * Express + node-cron 鍚庡彴鏁版嵁鍚屾 + SSE 瀹炴椂鎺ㄩ€?
 */
import express from "express";
import cors from "cors";
import cron from "node-cron";

import { prisma } from "./db.js";
import goldRoutes from "./routes/gold.js";
import stockRoutes from "./routes/stocks.js";
import congressRoutes from "./routes/congress.js";
import insiderRoutes from "./routes/insiders.js";
import newsRoutes from "./routes/news.js";
import searchRoutes from "./routes/search.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/payment.js";
import globalRoutes from "./routes/global.js";
import { optionalAuth } from "./middleware/auth.js";

import { syncGoldSnapshot, syncGoldDaily } from "./sync/gold.js";
import { syncStockIndices, syncSectors, syncHotStocks } from "./sync/stocks.js";
import { syncCongressData } from "./sync/congress.js";
import { syncInsiderTrades } from "./sync/insiders.js";
import { syncNewsEvents } from "./sync/news.js";
import { syncGlobalIndices } from "./sync/global.js";
import { broadcaster } from "./sse.js";

const PORT = Number.parseInt(process.env.PORT ?? "8000", 10);
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";
const ENABLE_AI = String(process.env.ENABLE_AI ?? "true").toLowerCase() !== "false";
const ENABLE_CN_MARKET = String(process.env.ENABLE_CN_MARKET ?? "true").toLowerCase() !== "false";
const ENABLE_GLOBAL_MARKET = String(process.env.ENABLE_GLOBAL_MARKET ?? "true").toLowerCase() !== "false";
const app = express();

type AIAgentId = "congress" | "insiders" | "gold" | "astocks";
type AIAgentRunStatus = "idle" | "running" | "error";

type AIAgentStatus = {
    id: AIAgentId;
    name: string;
    status: AIAgentRunStatus;
    last_run_at: string | null;
    updated_at: string;
    signals_today: number;
    last_error: string | null;
};

const AI_EVENT_TYPES = ["ai_insight", "ai_signal"] as const;

const aiStatuses: Record<AIAgentId, AIAgentStatus> = {
    congress: {
        id: "congress",
        name: "国会交易 Agent",
        status: "idle",
        last_run_at: null,
        updated_at: new Date().toISOString(),
        signals_today: 0,
        last_error: null,
    },
    insiders: {
        id: "insiders",
        name: "内幕交易 Agent",
        status: "idle",
        last_run_at: null,
        updated_at: new Date().toISOString(),
        signals_today: 0,
        last_error: null,
    },
    gold: {
        id: "gold",
        name: "黄金套利 Agent",
        status: "idle",
        last_run_at: null,
        updated_at: new Date().toISOString(),
        signals_today: 0,
        last_error: null,
    },
    astocks: {
        id: "astocks",
        name: "A股热点 Agent",
        status: "idle",
        last_run_at: null,
        updated_at: new Date().toISOString(),
        signals_today: 0,
        last_error: null,
    },
};

function normalizeAiText(input: string | null | undefined): string | null | undefined {
    if (typeof input !== "string" || input.length === 0) return input;

    const replacements: Array<[string, string]> = [
        ["鍥戒細浜ゆ槗 Agent", "国会交易 Agent"],
        ["鍐呭箷浜ゆ槗 Agent", "内幕交易 Agent"],
        ["榛勯噾濂楀埄 Agent", "黄金套利 Agent"],
        ["A鑲＄儹鐐?Agent", "A股热点 Agent"],
        ["銆怉鑲°€戞澘鍧楄蛋寮猴細", "【A股】板块走强："],
        ["銆愰粍閲戙€戝浗鍐呭浠峰樊鍋忕", "【黄金】国内外价差偏离"],
    ];

    let out = input;
    for (const [from, to] of replacements) {
        out = out.split(from).join(to);
    }
    out = out.replace(/銆[^\s]{0,8}鑲°€戞澘鍧楄蛋寮猴細/g, "【A股】板块走强：");
    out = out.replace(/銆愰粍閲戙€戝浗鍐呭浠峰樊鍋忕/g, "【黄金】国内外价差偏离");
    return out;
}

function snapshotAiStatuses(): AIAgentStatus[] {
    return Object.values(aiStatuses);
}

function setAiStatus(id: AIAgentId, patch: Partial<AIAgentStatus>) {
    aiStatuses[id] = {
        ...aiStatuses[id],
        ...patch,
        updated_at: new Date().toISOString(),
    };
}

function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

async function fetchAiInsights(limit: number = 50) {
    const rows = await prisma.newsEvent.findMany({
        where: { type: { in: [...AI_EVENT_TYPES] } },
        orderBy: { timestamp: "desc" },
        take: Math.max(1, Math.min(200, limit)),
    });
    return rows.map(n => ({
        id: n.id,
        type: n.type,
        title: normalizeAiText(n.title),
        summary: normalizeAiText(n.summary),
        ticker: n.ticker,
        related_entity: normalizeAiText(n.relatedEntity),
        url: n.url,
        timestamp: n.timestamp?.toISOString(),
    }));
}

async function writeAiEvent(params: {
    type: (typeof AI_EVENT_TYPES)[number];
    title: string;
    summary?: string | null;
    ticker?: string | null;
    relatedEntity?: string | null;
    url?: string | null;
    timestamp?: Date;
    dedupeWindowMs?: number;
}) {
    const dedupeWindowMs = params.dedupeWindowMs ?? 30 * 60 * 1000;
    const since = new Date(Date.now() - dedupeWindowMs);

    const exists = await prisma.newsEvent.findFirst({
        where: {
            type: params.type,
            title: params.title,
            timestamp: { gte: since },
        },
        select: { id: true },
        orderBy: { timestamp: "desc" },
    });
    if (exists) return false;

    await prisma.newsEvent.create({
        data: {
            type: params.type,
            title: params.title,
            summary: params.summary ?? null,
            ticker: params.ticker ?? null,
            relatedEntity: params.relatedEntity ?? null,
            url: params.url ?? null,
            timestamp: params.timestamp ?? new Date(),
        },
    });
    return true;
}

async function runAiAgents(reason: string) {
    if (!ENABLE_AI) {
        return { createdCount: 0, insights: [] };
    }

    const agentIds: AIAgentId[] = ["congress", "insiders", "gold", "astocks"];
    let createdCount = 0;

    for (const id of agentIds) {
        setAiStatus(id, { status: "running", last_error: null });
        try {
            if (id === "congress") {
                const recent = await prisma.congressTrade.findMany({
                    orderBy: { disclosureDate: "desc" },
                    take: 120,
                    select: {
                        ticker: true,
                        companyName: true,
                        politicianName: true,
                        politicianParty: true,
                        disclosureDate: true,
                    },
                });

                const byTicker = new Map<string, { count: number; company: string | null }>();
                for (const t of recent) {
                    if (!t.ticker) continue;
                    const key = t.ticker.toUpperCase();
                    const cur = byTicker.get(key) ?? { count: 0, company: t.companyName ?? null };
                    cur.count += 1;
                    if (!cur.company && t.companyName) cur.company = t.companyName;
                    byTicker.set(key, cur);
                }

                const top = Array.from(byTicker.entries()).sort((a, b) => b[1].count - a[1].count)[0];
                if (top && top[1].count >= 3) {
                    const [ticker, meta] = top;
                    const ok = await writeAiEvent({
                        type: "ai_insight",
                        title: `Congress: ${ticker} disclosure activity increased`,
                        summary: `Recent filings show elevated frequency for ${ticker}${meta.company ? ` (${meta.company})` : ""}, around ${meta.count} times in the latest 120 records.`,
                        ticker,
                        relatedEntity: "Congress",
                    });
                    if (ok) createdCount += 1;
                }
            }

            if (id === "insiders") {
                const recent = await prisma.insiderTrade.findMany({
                    orderBy: { filingDate: "desc" },
                    take: 160,
                    select: {
                        ticker: true,
                        companyName: true,
                        transactionType: true,
                        totalValue: true,
                        insiderName: true,
                        filingDate: true,
                    },
                });

                const byTicker = new Map<string, { buy: number; sell: number; value: number; company: string | null }>();
                for (const t of recent) {
                    if (!t.ticker) continue;
                    const key = t.ticker.toUpperCase();
                    const cur = byTicker.get(key) ?? { buy: 0, sell: 0, value: 0, company: t.companyName ?? null };
                    const isBuy = t.transactionType === "purchase";
                    if (isBuy) cur.buy += 1;
                    else cur.sell += 1;
                    cur.value += t.totalValue ?? 0;
                    if (!cur.company && t.companyName) cur.company = t.companyName;
                    byTicker.set(key, cur);
                }

                const top = Array.from(byTicker.entries()).sort((a, b) => b[1].value - a[1].value)[0];
                if (top && top[1].value >= 2_000_000) {
                    const [ticker, meta] = top;
                    const type: (typeof AI_EVENT_TYPES)[number] = meta.buy >= meta.sell ? "ai_signal" : "ai_insight";
                    const ok = await writeAiEvent({
                        type,
                        title: `Insiders: ${ticker} recent transaction value is elevated`,
                        summary: `${ticker}${meta.company ? ` (${meta.company})` : ""} has elevated Form 4 transaction value recently (about $${(meta.value / 1_000_000).toFixed(2)}M), buy/sell count ${meta.buy}/${meta.sell}.`,
                        ticker,
                        relatedEntity: "SEC Form 4",
                    });
                    if (ok) createdCount += 1;
                }
            }

            if (id === "gold") {
                const snap = await prisma.goldSnapshot.findFirst({ orderBy: { timestamp: "desc" } });
                const spread = snap?.spreadPct ?? null;
                if (spread !== null && Math.abs(spread) >= 1.2) {
                    const type: (typeof AI_EVENT_TYPES)[number] = Math.abs(spread) >= 2.0 ? "ai_signal" : "ai_insight";
                    const ok = await writeAiEvent({
                        type,
                        title: `【黄金】国内外价差偏离 ${spread.toFixed(2)}%`,
                        summary: `Detected deviation in domestic/overseas gold spread (spread_pct=${spread.toFixed(2)}%). Combine with FX and intraday volatility to evaluate short-term arbitrage windows.`,
                        relatedEntity: "Gold",
                    });
                    if (ok) createdCount += 1;
                }
            }

            if (id === "astocks") {
                const topSector = await prisma.sector.findFirst({
                    orderBy: { changePct: "desc" },
                    select: {
                        name: true,
                        changePct: true,
                        leaderStock: true,
                        leaderChangePct: true,
                    },
                });
                if (topSector?.changePct !== null && topSector?.changePct !== undefined && topSector.changePct >= 2.5) {
                    const type: (typeof AI_EVENT_TYPES)[number] = topSector.changePct >= 4.0 ? "ai_signal" : "ai_insight";
                    const ok = await writeAiEvent({
                        type,
                        title: `【A股】板块走强：${topSector.name} +${topSector.changePct.toFixed(2)}%`,
                        summary: `Top sector strength: ${topSector.name} (${topSector.changePct.toFixed(2)}%). Leader: ${topSector.leaderStock ?? "N/A"} (${(topSector.leaderChangePct ?? 0).toFixed(2)}%). Watch continuation and volume confirmation.`,
                        relatedEntity: topSector.name,
                    });
                    if (ok) createdCount += 1;
                }
            }

            setAiStatus(id, { status: "idle", last_run_at: new Date().toISOString() });
        } catch (err: any) {
            setAiStatus(id, {
                status: "error",
                last_run_at: new Date().toISOString(),
                last_error: String(err?.message ?? err ?? "unknown error"),
            });
        }
    }

    const today = startOfToday();
    const signalsToday = await prisma.newsEvent.count({
        where: { type: { in: [...AI_EVENT_TYPES] }, timestamp: { gte: today } },
    });
    for (const id of agentIds) {
        setAiStatus(id, { signals_today: signalsToday });
    }

    const insights = await fetchAiInsights(50);
    broadcaster.broadcast("ai_status_update", snapshotAiStatuses());
    broadcaster.broadcast("ai_insights_update", insights);

    if (createdCount > 0) {
        console.log(`[AI] 鏂板 ${createdCount} 鏉″垎鏋愪簨浠?(${reason})`);
    }

    return { createdCount, insights };
}

// ============= 涓棿浠?=============
app.use(cors({ origin: "*" }));
app.use(express.json());

// 璇锋眰鏃ュ織锛堟帓闄ら珮棰戠殑 SSE 鍜?favicon锛?
app.use((req, _res, next) => {
    if (!req.path.includes("favicon") && !req.path.includes("/sse")) {
        console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
});

// Analytics tracking middleware (optional auth to get user ID)
app.use("/api", optionalAuth, async (req, _res, next) => {
    // Skip analytics for certain paths
    if (req.path.includes("/sse") || req.path.includes("/health") || req.path.includes("/captcha")) {
        return next();
    }

    // Fire and forget analytics
    prisma.analytics.create({
        data: {
            userId: req.user?.id || null,
            path: req.path,
            method: req.method,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers["user-agent"],
            referer: req.headers.referer,
        },
    }).catch(() => {
        // Silently fail analytics
    });

    next();
});

// ============= 璺敱 =============
app.use("/api/gold", goldRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/congress", congressRoutes);
app.use("/api/insiders", insiderRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/global", globalRoutes);

app.get("/api/features", (_req, res) => {
    res.json({
        ai: ENABLE_AI,
        cn_market: ENABLE_CN_MARKET,
        global_market: ENABLE_GLOBAL_MARKET,
        timestamp: new Date().toISOString(),
    });
});

app.use("/api/ai", (_req, res, next) => {
    if (!ENABLE_AI) {
        return res.status(503).json({
            error: "AI features are disabled by configuration",
            feature: "ai",
        });
    }
    next();
});

// ============= SSE 瀹炴椂鎺ㄩ€佺鐐?=============
app.get("/api/sse", (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
    });
    let clientId: string | null = null;
    let heartbeat: NodeJS.Timeout | null = null;
    let cleaned = false;

    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (heartbeat) clearInterval(heartbeat);
        if (clientId) broadcaster.removeClient(clientId);
        try {
            res.end();
        } catch { }
    };

    const safeWrite = (chunk: string) => {
        try {
            res.write(chunk);
            return true;
        } catch {
            cleanup();
            return false;
        }
    };

    safeWrite("data: {\"type\":\"connected\"}\n\n");

    clientId = broadcaster.addClient(res);

    // 蹇冭烦锛岄槻姝㈣繛鎺ヨ秴鏃?
    heartbeat = setInterval(() => {
        safeWrite(":heartbeat\n\n");
    }, 30000);

    req.on("close", cleanup);
    res.on("close", cleanup);
    res.on("error", cleanup);
});

// ============= 鎵归噺鏁版嵁绔偣 (棣栨鍔犺浇鐢? =============
app.get("/api/bulk", async (_req, res) => {
    try {
        const [
            goldSnapshot, goldDaily, allIndices, sectors, hotStocks,
            congressTrades, politicians, insiderTrades, insiderSummary, newsEvents, aiInsights
        ] = await Promise.all([
            prisma.goldSnapshot.findMany({ orderBy: { timestamp: "desc" }, take: 1 }),
            prisma.goldDaily.findMany({ orderBy: { date: "desc" }, take: 365 }),
            prisma.stockIndex.findMany(),
            prisma.sector.findMany({ orderBy: { changePct: "desc" } }),
            prisma.hotStock.findMany({
                orderBy: [
                    { amount: "desc" },
                    { changePct: "desc" },
                ],
                take: 200
            }),
            prisma.congressTrade.findMany({ orderBy: { disclosureDate: "desc" }, take: 300 }),
            prisma.politician.findMany({
                include: { trades: { select: { id: true } } },
                orderBy: { fullName: "asc" }
            }),
            prisma.insiderTrade.findMany({ orderBy: { filingDate: "desc" }, take: 300 }),
            // 鍐呭箷姹囨€伙細鎸?ticker 鑱氬悎
            prisma.insiderTrade.groupBy({
                by: ["ticker"],
                _count: { id: true },
                _sum: { totalValue: true },
                orderBy: { _count: { id: "desc" } },
                take: 50,
            }),
            prisma.newsEvent.findMany({ orderBy: { timestamp: "desc" }, take: 50 }),
            prisma.newsEvent.findMany({
                where: { type: { in: [...AI_EVENT_TYPES] } },
                orderBy: { timestamp: "desc" },
                take: 50,
            }),
        ]);

        // 鍒嗙A鑲″拰鍏ㄧ悆鎸囨暟锛堝吋瀹规棫鏁版嵁锛宮arket瀛楁鍙兘涓嶅瓨鍦級
        const indices = allIndices.filter((i: any) => !i.market || i.market === "cn");
        const globalIndicesRaw = allIndices.filter((i: any) => i.market && i.market !== "cn");

        // 鏍煎紡鍖栭噾浠峰揩鐓?
        const latestGold = goldSnapshot[0];
        const goldPrices = latestGold ? {
            international_usd: latestGold.priceUsd,
            domestic_cny: latestGold.priceCny,
            exchange_rate: latestGold.exchangeRate,
            spread_pct: latestGold.spreadPct,
            updated_at: latestGold.timestamp?.toISOString(),
        } : null;

        // 鏍煎紡鍖栨棩绾?
        const goldHistory = goldDaily.map(d => ({
            date: d.date,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        }));

        // 鏍煎紡鍖栨寚鏁?
        const fmtIndices = indices.map(i => ({
            code: i.code, name: i.name,
            price: i.price, change_pct: i.changePct,
            change_amount: i.changeAmount,
            volume: i.volume, amount: i.amount,
        }));

        // 鏍煎紡鍖栨澘鍧?
        const fmtSectors = sectors.map(s => ({
            name: s.name, change_pct: s.changePct,
            leader_stock: s.leaderStock, leader_change_pct: s.leaderChangePct,
            market_cap: s.marketCap, amount: s.amount,
        }));

        // 鏍煎紡鍖栫儹鑲?
        const fmtHot = hotStocks.map(h => ({
            code: h.code, name: h.name,
            price: h.price, change_pct: h.changePct,
            change_amount: h.changeAmount, volume: h.volume,
            amount: h.amount, high: h.high, low: h.low,
            open: h.open, turnover_rate: h.turnoverRate,
            pe_ratio: h.peRatio,
        }));

        // 鏍煎紡鍖栧浗浼氫氦鏄?
        const fmtTrades = congressTrades.map(t => ({
            id: t.id,
            politician_name: t.politicianName,
            politician_party: t.politicianParty,
            politician_state: t.politicianState,
            chamber: t.sourceChamber,
            ticker: t.ticker,
            company_name: t.companyName,
            transaction_type: t.transactionType,
            amount_min: t.amountMin,
            amount_max: t.amountMax,
            transaction_date: t.transactionDate?.toISOString(),
            disclosure_date: t.disclosureDate?.toISOString(),
        }));

        // 鏍煎紡鍖栬鍛?
        const fmtPols = politicians.map(p => ({
            id: p.id,
            full_name: p.fullName,
            chamber: p.chamber,
            state: p.state,
            party: p.party,
            trade_count: p.trades.length,
        }));

        // 鏍煎紡鍖栧唴骞曚氦鏄?
        const fmtInsiders = insiderTrades.map(t => ({
            id: t.id, ticker: t.ticker,
            company_name: t.companyName, insider_name: t.insiderName,
            insider_title: t.insiderTitle, transaction_type: t.transactionType,
            shares: t.shares, price_per_share: t.pricePerShare,
            total_value: t.totalValue, shares_owned: t.sharesOwned,
            filing_date: t.filingDate?.toISOString(),
            transaction_date: t.transactionDate?.toISOString(),
        }));

        // 鏍煎紡鍖栧唴骞曟眹鎬?
        const fmtInsiderSummary = insiderSummary.map(s => ({
            ticker: s.ticker,
            trade_count: s._count.id,
            total_value: s._sum.totalValue,
        }));

        // 鏍煎紡鍖栨柊闂?
        const fmtNews = newsEvents.map(n => ({
            id: n.id, type: n.type,
            title: n.title, summary: n.summary,
            ticker: n.ticker, related_entity: n.relatedEntity,
            url: n.url, timestamp: n.timestamp?.toISOString(),
        }));

        const fmtAiInsights = aiInsights.map(n => ({
            id: n.id,
            type: n.type,
            title: normalizeAiText(n.title),
            summary: normalizeAiText(n.summary),
            ticker: n.ticker,
            related_entity: normalizeAiText(n.relatedEntity),
            url: n.url,
            timestamp: n.timestamp?.toISOString(),
        }));

        // 鏍煎紡鍖栧叏鐞冩寚鏁帮紙鎸夊競鍦哄垎缁勶級
        const fmtGlobalIndices: Record<string, any[]> = {};
        for (const gi of globalIndicesRaw) {
            const market = gi.market || "other";
            if (!fmtGlobalIndices[market]) {
                fmtGlobalIndices[market] = [];
            }
            fmtGlobalIndices[market].push({
                code: gi.code,
                name: gi.name,
                market: gi.market,
                price: gi.price,
                change_pct: gi.changePct,
                change_amount: gi.changeAmount,
            });
        }

        res.json({
            gold: { prices: goldPrices, history: goldHistory },
            stocks: { indices: fmtIndices, sectors: fmtSectors, hot: fmtHot },
            global: fmtGlobalIndices,
            congress: { trades: fmtTrades, politicians: fmtPols },
            insiders: { trades: fmtInsiders, summary: fmtInsiderSummary },
            news: fmtNews,
            ai: { statuses: snapshotAiStatuses(), insights: fmtAiInsights },
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[bulk] 鏁版嵁鍔犺浇澶辫触:", err);
        res.status(500).json({ error: "Bulk data load failed" });
    }
});

app.get("/api/ai/status", async (_req, res) => {
    res.json({
        agents: snapshotAiStatuses(),
        timestamp: new Date().toISOString(),
    });
});

app.get("/api/ai/insights", async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const insights = await fetchAiInsights(Number.isFinite(limit) ? limit : 50);
    res.json({ insights, timestamp: new Date().toISOString() });
});

app.post("/api/ai/run", async (_req, res) => {
    await runAiAgents("manual");
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ============= AI Recommendation Service Proxy =============
// Proxy routes to Python AI recommendation service

app.get("/api/ai/recommendations", async (req, res) => {
    try {
        const market = req.query.market as string | undefined;
        const limit = req.query.limit as string | undefined;

        const params = new URLSearchParams();
        if (market) params.append("market", market);
        if (limit) params.append("limit", limit);

        const url = `${AI_SERVICE_URL}/recommendations?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            // If Python service is not available, return empty recommendations
            return res.json({
                recommendations: [],
                count: 0,
                market: market || null,
                timestamp: new Date().toISOString(),
                error: "AI service unavailable",
            });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        // Return empty recommendations if service is down
        res.json({
            recommendations: [],
            count: 0,
            timestamp: new Date().toISOString(),
            error: "AI service unavailable",
        });
    }
});

app.get("/api/ai/recommendations/accuracy", async (req, res) => {
    try {
        const market = req.query.market as string | undefined;
        const days = req.query.days as string | undefined;

        const params = new URLSearchParams();
        if (market) params.append("market", market);
        if (days) params.append("days", days);

        const url = `${AI_SERVICE_URL}/accuracy?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            return res.json({
                total: 0,
                hits: 0,
                misses: 0,
                pending: 0,
                accuracy: 0,
                period_days: parseInt(days || "30"),
                error: "AI service unavailable",
            });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.json({
            total: 0,
            hits: 0,
            misses: 0,
            pending: 0,
            accuracy: 0,
            period_days: 30,
            error: "AI service unavailable",
        });
    }
});

app.get("/api/ai/recommendations/status", async (_req, res) => {
    try {
        const response = await fetch(`${AI_SERVICE_URL}/status`);
        if (!response.ok) {
            return res.json({
                us: { status: "unavailable", market: "us" },
                cn: { status: "unavailable", market: "cn" },
            });
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.json({
            us: { status: "unavailable", market: "us" },
            cn: { status: "unavailable", market: "cn" },
        });
    }
});

app.post("/api/ai/recommendations/run", async (req, res) => {
    try {
        const market = (req.query.market as string) || "us";

        // Trigger both markets in parallel
        const [usResponse, cnResponse] = await Promise.all([
            fetch(`${AI_SERVICE_URL}/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ market: "us" }),
            }).catch(() => null),
            fetch(`${AI_SERVICE_URL}/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ market: "cn" }),
            }).catch(() => null),
        ]);

        const results = {
            us: usResponse?.ok ? "started" : "failed",
            cn: cnResponse?.ok ? "started" : "failed",
        };

        res.json({
            ok: true,
            results,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        res.status(500).json({
            ok: false,
            error: error?.message || "Failed to trigger analysis",
        });
    }
});

// 鍋ュ悍妫€鏌?
app.get("/api/health", async (_req, res) => {
    const goldCount = await prisma.goldSnapshot.count();
    const dailyCount = await prisma.goldDaily.count();
    const indexCount = await prisma.stockIndex.count();
    const sectorCount = await prisma.sector.count();
    const hotCount = await prisma.hotStock.count();
    const tradeCount = await prisma.congressTrade.count();
    const insiderCount = await prisma.insiderTrade.count();
    const newsCount = await prisma.newsEvent.count();
    const userCount = await prisma.user.count();
    const sessionCount = await prisma.session.count();
    const paymentCount = await prisma.payment.count();
    const analyticsCount = await prisma.analytics.count();

    res.json({
        status: "healthy",
        runtime: "Node.js",
        database: "SQLite (Prisma)",
        sse_clients: broadcaster.clientCount,
        data: {
            gold_snapshots: goldCount,
            gold_daily: dailyCount,
            stock_indices: indexCount,
            sectors: sectorCount,
            hot_stocks: hotCount,
            congress_trades: tradeCount,
            insider_trades: insiderCount,
            news_events: newsCount,
            users: userCount,
            sessions: sessionCount,
            payments: paymentCount,
            analytics: analyticsCount,
        },
        timestamp: new Date().toISOString(),
    });
});

// ============= 甯﹀箍鎾殑鍚屾鍖呰 =============
async function syncAndBroadcast(
    syncFn: () => Promise<any>,
    eventType: string,
    fetchFn: () => Promise<any>
) {
    await syncFn();
    try {
        const data = await fetchFn();
        broadcaster.broadcast(eventType, data);
    } catch (err) {
        console.error(`[broadcast] ${eventType} 澶辫触:`, err);
    }
}

// ============= 棣栬疆鏁版嵁鍚屾 =============
async function initialSync() {
    console.log("\n馃殌 棣栬疆鏁版嵁鍚屾寮€濮?..\n");

    await Promise.allSettled([
        syncGoldSnapshot(),
        syncGoldDaily(),
        syncStockIndices(),
        syncSectors(),
        syncHotStocks(),
        syncCongressData(),
        syncInsiderTrades(),
        syncGlobalIndices(),
    ]);

    // 鏂伴椈浜嬩欢渚濊禆鍏朵粬鏁版嵁锛岄渶瑕佸悗鎵ц
    await syncNewsEvents();

    await runAiAgents("initial_sync");

    console.log("\n鉁?棣栬疆鏁版嵁鍚屾瀹屾垚!\n");
}

// ============= 鏁版嵁鑾峰彇杈呭姪鍑芥暟锛堢敤浜?SSE 骞挎挱锛?=============
async function fetchGoldForSSE() {
    const snap = await prisma.goldSnapshot.findFirst({ orderBy: { timestamp: "desc" } });
    return snap ? {
        international_usd: snap.priceUsd,
        domestic_cny: snap.priceCny,
        exchange_rate: snap.exchangeRate,
        spread_pct: snap.spreadPct,
        updated_at: snap.timestamp?.toISOString(),
    } : null;
}

async function fetchIndicesForSSE() {
    const data = await prisma.stockIndex.findMany();
    return data.map(i => ({
        code: i.code, name: i.name,
        price: i.price, change_pct: i.changePct,
        change_amount: i.changeAmount,
        volume: i.volume, amount: i.amount,
    }));
}

async function fetchSectorsForSSE() {
    const data = await prisma.sector.findMany({ orderBy: { changePct: "desc" } });
    return data.map(s => ({
        name: s.name, change_pct: s.changePct,
        leader_stock: s.leaderStock, leader_change_pct: s.leaderChangePct,
        market_cap: s.marketCap, amount: s.amount,
    }));
}

async function fetchHotStocksForSSE() {
    const data = await prisma.hotStock.findMany({
        orderBy: [
            { amount: "desc" },
            { changePct: "desc" },
        ],
        take: 200
    });
    return data.map(h => ({
        code: h.code, name: h.name,
        price: h.price, change_pct: h.changePct,
        change_amount: h.changeAmount, volume: h.volume,
        amount: h.amount, high: h.high, low: h.low,
        open: h.open, turnover_rate: h.turnoverRate,
        pe_ratio: h.peRatio,
    }));
}

async function fetchCongressForSSE() {
    const [trades, politicians] = await Promise.all([
        prisma.congressTrade.findMany({ orderBy: { disclosureDate: "desc" }, take: 200 }),
        prisma.politician.findMany({
            include: { trades: { select: { id: true } } },
            orderBy: { fullName: "asc" }
        }),
    ]);

    return {
        trades: trades.map(t => ({
            id: t.id,
            politician_name: t.politicianName,
            politician_party: t.politicianParty,
            politician_state: t.politicianState,
            chamber: t.sourceChamber,
            ticker: t.ticker,
            company_name: t.companyName,
            transaction_type: t.transactionType,
            amount_min: t.amountMin,
            amount_max: t.amountMax,
            transaction_date: t.transactionDate?.toISOString(),
            disclosure_date: t.disclosureDate?.toISOString(),
        })),
        politicians: politicians.map(p => ({
            id: p.id,
            full_name: p.fullName,
            chamber: p.chamber,
            state: p.state,
            party: p.party,
            trade_count: p.trades.length,
        })),
    };
}

async function fetchInsidersForSSE() {
    const [trades, summary] = await Promise.all([
        prisma.insiderTrade.findMany({ orderBy: { filingDate: "desc" }, take: 200 }),
        prisma.insiderTrade.groupBy({
            by: ["ticker"],
            _count: { id: true },
            _sum: { totalValue: true },
            orderBy: { _count: { id: "desc" } },
            take: 50,
        }),
    ]);

    return {
        trades: trades.map(t => ({
            id: t.id,
            ticker: t.ticker,
            company_name: t.companyName,
            insider_name: t.insiderName,
            insider_title: t.insiderTitle,
            transaction_type: t.transactionType,
            shares: t.shares,
            price_per_share: t.pricePerShare,
            total_value: t.totalValue,
            shares_owned: t.sharesOwned,
            filing_date: t.filingDate?.toISOString(),
            transaction_date: t.transactionDate?.toISOString(),
        })),
        summary: summary.map(s => ({
            ticker: s.ticker,
            trade_count: s._count.id,
            total_value: s._sum.totalValue,
        })),
    };
}

// ============= Cron 璋冨害锛堝甫 SSE 骞挎挱锛?============
function startCronJobs() {
    // 姣?60 绉? 閲戜环蹇収 + 鎸囨暟
    cron.schedule("* * * * *", async () => {
        console.log("[cron] 姣忓垎閽熷悓姝? 閲戜环 + 鎸囨暟 + 鍥戒細 + 鍐呭箷");
        const jobs: Promise<void>[] = [
            syncAndBroadcast(syncGoldSnapshot, "gold_update", fetchGoldForSSE),
            syncAndBroadcast(syncCongressData, "congress_trades_update", fetchCongressForSSE),
            syncAndBroadcast(syncInsiderTrades, "insiders_trades_update", fetchInsidersForSSE),
        ];
        if (ENABLE_CN_MARKET) {
            jobs.push(syncAndBroadcast(syncStockIndices, "indices_update", fetchIndicesForSSE));
        }
        await Promise.allSettled(jobs);

        await runAiAgents("cron_1min");
    });

    // 姣?5 鍒嗛挓: 鏉垮潡 + 鐑偂 + 鍏ㄧ悆鎸囨暟
    cron.schedule("*/5 * * * *", async () => {
        console.log("[cron] 姣?5 鍒嗛挓鍚屾: 鏉垮潡 + 鐑偂 + 鍏ㄧ悆鎸囨暟");
        const jobs: Promise<void>[] = [];
        if (ENABLE_CN_MARKET) {
            jobs.push(syncAndBroadcast(syncSectors, "sectors_update", fetchSectorsForSSE));
            jobs.push(syncAndBroadcast(syncHotStocks, "hot_stocks_update", fetchHotStocksForSSE));
        }
        if (ENABLE_GLOBAL_MARKET) {
            jobs.push(syncGlobalIndices());
        }
        await Promise.allSettled(jobs);
    });

    // 姣忓ぉ 18:00: 鏃ョ嚎鏁版嵁
    cron.schedule("0 18 * * *", async () => {
        console.log("[cron] 姣忔棩鍚屾: 閲戜环鏃ョ嚎");
        await syncGoldDaily();
        broadcaster.broadcast("gold_daily_update", { message: "gold daily updated" });
    });

    // 姣忓皬鏃舵暣鐐? AI 鎺ㄨ崘鍒嗘瀽
    cron.schedule("0 * * * *", async () => {
        console.log("[cron] 姣忓皬鏃?AI 鎺ㄨ崘");
        try {
            // 骞惰瑙﹀彂 A 鑲″拰缇庤偂鍒嗘瀽
            const [usRes, cnRes] = await Promise.allSettled([
                fetch(`${AI_SERVICE_URL}/analyze`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ market: "us" }),
                }),
                fetch(`${AI_SERVICE_URL}/analyze`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ market: "cn" }),
                }),
            ]);

            // 绛夊緟涓€灏忔鏃堕棿鍚庤幏鍙栫粨鏋?
            await new Promise(resolve => setTimeout(resolve, 5000));

            // 鑾峰彇缁撴灉骞跺箍鎾?
            try {
                const [usRecs, cnRecs] = await Promise.all([
                    fetch(`${AI_SERVICE_URL}/recommendations?market=us&limit=10`).then(r => r.ok ? r.json() : { recommendations: [] }),
                    fetch(`${AI_SERVICE_URL}/recommendations?market=cn&limit=10`).then(r => r.ok ? r.json() : { recommendations: [] }),
                ]);

                broadcaster.broadcast("ai_recommendations_update", {
                    us: usRecs,
                    cn: cnRecs,
                    timestamp: new Date().toISOString(),
                });

                console.log(`[AI Service] 鎺ㄨ崘宸叉洿鏂? US=${usRecs.recommendations?.length || 0}, CN=${cnRecs.recommendations?.length || 0}`);
            } catch (fetchErr) {
                console.error("[AI Service] 鑾峰彇鎺ㄨ崘缁撴灉澶辫触:", fetchErr);
            }
        } catch (err) {
            console.error("[AI Service] 鍒嗘瀽澶辫触:", err);
        }
    });

    console.log("鈴?Cron 宸插惎鍔? 閲戜环/鎸囨暟/鍥戒細/鍐呭箷(1min) | 鏉垮潡/鐑偂(5min) | 鏃ョ嚎(18:00) | AI鎺ㄨ崘(姣忓皬鏃?");
    console.log("馃摗 SSE 瀹炴椂鎺ㄩ€佸凡鍚敤");
}

// ============= 鍚姩 =============
async function main() {
    console.log("========================================");
    console.log("  澶╂灑 DubheProject 路 Node.js 鍚庣");
    console.log("  Runtime: Node.js + Express + Prisma + SQLite + SSE");
    console.log("========================================\\n");

    // 棣栬疆鍚屾
    // Start HTTP first to avoid blocking /api and /api/sse during long initial sync

    const server = app.listen(PORT, () => {
        console.log(`\n🌐 API 服务已启动: http://localhost:${PORT}`);
        console.log(`   健康检查: http://localhost:${PORT}/api/health`);
        console.log(`   批量数据: http://localhost:${PORT}/api/bulk`);
        console.log(`   SSE 推送: http://localhost:${PORT}/api/sse\n`);

        // Run initial sync in background, then start cron jobs
        void (async () => {
            try {
                await initialSync();
            } catch (err) {
                console.error("[startup] initial sync failed:", err);
            } finally {
                startCronJobs();
            }
        })();
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
            console.error(`[startup] Port ${PORT} is already in use. Stop the existing process or set PORT to a different value.`);
            process.exit(1);
            return;
        }

        console.error("[startup] failed to bind HTTP server:", err);
        process.exit(1);
    });
}

main().catch((err) => {
    console.error("鉂?鍚姩澶辫触:", err);
    process.exit(1);
});
