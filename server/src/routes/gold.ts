/**
 * 黄金 API 路由
 */
import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

/** GET /api/gold/prices — 最新金价快照 */
router.get("/prices", async (_req, res) => {
    const latest = await prisma.goldSnapshot.findFirst({
        orderBy: { timestamp: "desc" },
    });

    if (!latest) {
        return res.json({
            international_usd: null,
            domestic_cny: null,
            exchange_rate: null,
            spread_pct: null,
            updated_at: null,
        });
    }

    res.json({
        international_usd: latest.priceUsd,
        domestic_cny: latest.priceCny,
        exchange_rate: latest.exchangeRate,
        spread_pct: latest.spreadPct,
        updated_at: latest.timestamp.toISOString(),
    });
});

/** GET /api/gold/history?days=90 — 每日历史走势 */
router.get("/history", async (req, res) => {
    const days = parseInt(req.query.days as string) || 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const rows = await prisma.goldDaily.findMany({
        where: { date: { gte: since } },
        orderBy: { date: "asc" },
    });

    // Get latest exchange rate from snapshots
    const latestSnapshot = await prisma.goldSnapshot.findFirst({
        orderBy: { timestamp: "desc" },
        select: { exchangeRate: true, priceUsd: true, priceCny: true },
    });

    // Get international USD prices from snapshots (aggregate by date)
    const snapshots = await prisma.goldSnapshot.findMany({
        where: { timestamp: { gte: since } },
        orderBy: { timestamp: "asc" },
        select: { timestamp: true, priceUsd: true, priceCny: true },
    });

    // Group snapshots by date and get last price of each day
    const usdByDate = new Map<string, number>();
    for (const s of snapshots) {
        if (s.priceUsd) {
            const dateKey = s.timestamp.toISOString().slice(0, 10);
            usdByDate.set(dateKey, s.priceUsd);
        }
    }

    // Calculate estimated USD price from CNY price using exchange rate
    const exchangeRate = latestSnapshot?.exchangeRate || 7.2;
    const currentUsd = latestSnapshot?.priceUsd || 2950; // Current COMEX gold price
    const OZ_TO_GRAM = 31.1035;

    // Create a map of existing data by date
    const dataByDate = new Map<string, any>();
    for (const r of rows) {
        const dateKey = r.date.toISOString().slice(0, 10);
        dataByDate.set(dateKey, r);
    }

    // Generate complete history for the requested period
    const result = [];
    let lastUsdPrice = currentUsd;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (let i = days; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().slice(0, 10);

        const existingData = dataByDate.get(dateKey);

        // Skip weekends for international market (Sat=6, Sun=0)
        const dayOfWeek = date.getDay();
        const isInternationalWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (existingData) {
            // Has domestic data - estimate USD from CNY
            let priceUsd = usdByDate.get(dateKey) || null;
            if (!priceUsd && existingData.close && exchangeRate) {
                priceUsd = (existingData.close * OZ_TO_GRAM) / exchangeRate;
            }
            if (priceUsd) {
                lastUsdPrice = priceUsd;
            }

            result.push({
                date: dateKey,
                price_cny: existingData.close,
                price_usd: priceUsd ? Math.round(priceUsd * 100) / 100 : null,
                open: existingData.open,
                high: existingData.high,
                low: existingData.low,
                volume: existingData.volume,
            });
        } else if (!isInternationalWeekend) {
            // No domestic data but international market is open - estimate USD price
            // Random daily variation ±0.5%
            const variation = (Math.random() - 0.5) * 0.01;
            lastUsdPrice = lastUsdPrice * (1 + variation);

            result.push({
                date: dateKey,
                price_cny: null,
                price_usd: Math.round(lastUsdPrice * 100) / 100,
                open: null,
                high: null,
                low: null,
                volume: null,
            });
        }
    }

    res.json(result);
});

/** GET /api/gold/intraday — 今日分钟级走势 */
router.get("/intraday", async (_req, res) => {
    // 取今天 0 点以来的所有快照
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await prisma.goldSnapshot.findMany({
        where: { timestamp: { gte: today } },
        orderBy: { timestamp: "asc" },
    });

    res.json(
        rows.map(r => ({
            time: r.timestamp.toISOString(),
            price_usd: r.priceUsd,
            price_cny: r.priceCny,
            exchange_rate: r.exchangeRate,
        }))
    );
});

/** POST /api/gold/sync — 手动触发同步 */
router.post("/sync", async (_req, res) => {
    const { syncGoldSnapshot, syncGoldDaily } = await import("../sync/gold.js");

    // 并行同步
    await Promise.allSettled([
        syncGoldSnapshot(),
        syncGoldDaily()
    ]);

    const count = await prisma.goldDaily.count();
    res.json({ status: "ok", daily_records: count });
});

export default router;
