/**
 * 金策智显 — Node.js 后端入口
 * 
 * Express + node-cron 后台数据同步 + SSE 实时推送
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

import { syncGoldSnapshot, syncGoldDaily } from "./sync/gold.js";
import { syncStockIndices, syncSectors, syncHotStocks } from "./sync/stocks.js";
import { syncCongressData } from "./sync/congress.js";
import { syncInsiderTrades } from "./sync/insiders.js";
import { syncNewsEvents } from "./sync/news.js";
import { broadcaster } from "./sse.js";

const PORT = 8000;
const app = express();

// ============= 中间件 =============
app.use(cors({ origin: "*" }));
app.use(express.json());

// 请求日志（排除高频的 SSE 和 favicon）
app.use((req, _res, next) => {
    if (!req.path.includes("favicon") && !req.path.includes("/sse")) {
        console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
});

// ============= 路由 =============
app.use("/api/gold", goldRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/congress", congressRoutes);
app.use("/api/insiders", insiderRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/search", searchRoutes);

// ============= SSE 实时推送端点 =============
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

    // 心跳，防止连接超时
    heartbeat = setInterval(() => {
        safeWrite(":heartbeat\n\n");
    }, 30000);

    req.on("close", cleanup);
    res.on("close", cleanup);
    res.on("error", cleanup);
});

// ============= 批量数据端点 (首次加载用) =============
app.get("/api/bulk", async (_req, res) => {
    try {
        const [
            goldSnapshot, goldDaily, indices, sectors, hotStocks,
            congressTrades, politicians, insiderTrades, insiderSummary, newsEvents
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
            prisma.congressTrade.findMany({ orderBy: { disclosureDate: "desc" }, take: 100 }),
            prisma.politician.findMany({
                include: { trades: { select: { id: true } } },
                orderBy: { fullName: "asc" }
            }),
            prisma.insiderTrade.findMany({ orderBy: { filingDate: "desc" }, take: 100 }),
            // 内幕汇总：按 ticker 聚合
            prisma.insiderTrade.groupBy({
                by: ["ticker"],
                _count: { id: true },
                _sum: { totalValue: true },
                orderBy: { _count: { id: "desc" } },
                take: 30,
            }),
            prisma.newsEvent.findMany({ orderBy: { timestamp: "desc" }, take: 50 }),
        ]);

        // 格式化金价快照
        const latestGold = goldSnapshot[0];
        const goldPrices = latestGold ? {
            international_usd: latestGold.priceUsd,
            domestic_cny: latestGold.priceCny,
            exchange_rate: latestGold.exchangeRate,
            spread_pct: latestGold.spreadPct,
            updated_at: latestGold.timestamp?.toISOString(),
        } : null;

        // 格式化日线
        const goldHistory = goldDaily.map(d => ({
            date: d.date,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        }));

        // 格式化指数
        const fmtIndices = indices.map(i => ({
            code: i.code, name: i.name,
            price: i.price, change_pct: i.changePct,
            change_amount: i.changeAmount,
            volume: i.volume, amount: i.amount,
        }));

        // 格式化板块
        const fmtSectors = sectors.map(s => ({
            name: s.name, change_pct: s.changePct,
            leader_stock: s.leaderStock, leader_change_pct: s.leaderChangePct,
            market_cap: s.marketCap, amount: s.amount,
        }));

        // 格式化热股
        const fmtHot = hotStocks.map(h => ({
            code: h.code, name: h.name,
            price: h.price, change_pct: h.changePct,
            change_amount: h.changeAmount, volume: h.volume,
            amount: h.amount, high: h.high, low: h.low,
            open: h.open, turnover_rate: h.turnoverRate,
            pe_ratio: h.peRatio,
        }));

        // 格式化国会交易
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

        // 格式化议员
        const fmtPols = politicians.map(p => ({
            id: p.id,
            full_name: p.fullName,
            chamber: p.chamber,
            state: p.state,
            party: p.party,
            trade_count: p.trades.length,
        }));

        // 格式化内幕交易
        const fmtInsiders = insiderTrades.map(t => ({
            id: t.id, ticker: t.ticker,
            company_name: t.companyName, insider_name: t.insiderName,
            insider_title: t.insiderTitle, transaction_type: t.transactionType,
            shares: t.shares, price_per_share: t.pricePerShare,
            total_value: t.totalValue, shares_owned: t.sharesOwned,
            filing_date: t.filingDate?.toISOString(),
            transaction_date: t.transactionDate?.toISOString(),
        }));

        // 格式化内幕汇总
        const fmtInsiderSummary = insiderSummary.map(s => ({
            ticker: s.ticker,
            trade_count: s._count.id,
            total_value: s._sum.totalValue,
        }));

        // 格式化新闻
        const fmtNews = newsEvents.map(n => ({
            id: n.id, type: n.type,
            title: n.title, summary: n.summary,
            ticker: n.ticker, related_entity: n.relatedEntity,
            url: n.url, timestamp: n.timestamp?.toISOString(),
        }));

        res.json({
            gold: { prices: goldPrices, history: goldHistory },
            stocks: { indices: fmtIndices, sectors: fmtSectors, hot: fmtHot },
            congress: { trades: fmtTrades, politicians: fmtPols },
            insiders: { trades: fmtInsiders, summary: fmtInsiderSummary },
            news: fmtNews,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[bulk] 数据加载失败:", err);
        res.status(500).json({ error: "Bulk data load failed" });
    }
});

// 健康检查
app.get("/api/health", async (_req, res) => {
    const goldCount = await prisma.goldSnapshot.count();
    const dailyCount = await prisma.goldDaily.count();
    const indexCount = await prisma.stockIndex.count();
    const sectorCount = await prisma.sector.count();
    const hotCount = await prisma.hotStock.count();
    const tradeCount = await prisma.congressTrade.count();
    const insiderCount = await prisma.insiderTrade.count();
    const newsCount = await prisma.newsEvent.count();

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
        },
        timestamp: new Date().toISOString(),
    });
});

// ============= 带广播的同步包装 =============
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
        console.error(`[broadcast] ${eventType} 失败:`, err);
    }
}

// ============= 首轮数据同步 =============
async function initialSync() {
    console.log("\n🚀 首轮数据同步开始...\n");

    await Promise.allSettled([
        syncGoldSnapshot(),
        syncGoldDaily(),
        syncStockIndices(),
        syncSectors(),
        syncHotStocks(),
        syncCongressData(),
        syncInsiderTrades(),
    ]);

    // 新闻事件依赖其他数据，需要后执行
    await syncNewsEvents();

    console.log("\n✅ 首轮数据同步完成!\n");
}

// ============= 数据获取辅助函数（用于 SSE 广播） =============
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

// ============= Cron 调度（带 SSE 广播）=============
function startCronJobs() {
    // 每 60 秒: 金价快照 + 指数
    cron.schedule("* * * * *", async () => {
        console.log("[cron] 每分钟同步: 金价 + 指数");
        await Promise.allSettled([
            syncAndBroadcast(syncGoldSnapshot, "gold_update", fetchGoldForSSE),
            syncAndBroadcast(syncStockIndices, "indices_update", fetchIndicesForSSE),
        ]);
    });

    // 每 5 分钟: 板块 + 热股
    cron.schedule("*/5 * * * *", async () => {
        console.log("[cron] 每 5 分钟同步: 板块 + 热股");
        await Promise.allSettled([
            syncAndBroadcast(syncSectors, "sectors_update", fetchSectorsForSSE),
            syncAndBroadcast(syncHotStocks, "hot_stocks_update", fetchHotStocksForSSE),
        ]);
    });

    // 每天 18:00: 日线数据
    cron.schedule("0 18 * * *", async () => {
        console.log("[cron] 每日同步: 金价日线");
        await syncGoldDaily();
        broadcaster.broadcast("gold_daily_update", { message: "日线已更新" });
    });

    // 每天 08:00: 国会数据
    cron.schedule("0 8 * * *", async () => {
        console.log("[cron] 每日同步: 国会数据");
        await syncCongressData();
        broadcaster.broadcast("congress_update", { message: "国会数据已更新" });
    });

    console.log("⏰ Cron 已启动: 金价(1min) | 板块(5min) | 日线(18:00) | 国会(08:00)");
    console.log("📡 SSE 实时推送已启用");
}

// ============= 启动 =============
async function main() {
    console.log("═══════════════════════════════════════");
    console.log("  金策智显 · Node.js 后端");
    console.log("  Runtime: Node.js + Express + Prisma + SQLite + SSE");
    console.log("═══════════════════════════════════════\n");

    // 首轮同步
    await initialSync();

    // 启动定时任务
    startCronJobs();

    // 启动 HTTP 服务
    app.listen(PORT, () => {
        console.log(`\n🌐 API 服务已启动: http://localhost:${PORT}`);
        console.log(`   健康检查: http://localhost:${PORT}/api/health`);
        console.log(`   批量数据: http://localhost:${PORT}/api/bulk`);
        console.log(`   SSE 推送: http://localhost:${PORT}/api/sse\n`);
    });
}

main().catch((err) => {
    console.error("❌ 启动失败:", err);
    process.exit(1);
});
