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

    const rows = await prisma.goldDaily.findMany({
        where: { date: { gte: since } },
        orderBy: { date: "asc" },
    });

    res.json(
        rows.map(r => ({
            date: r.date.toISOString().slice(0, 10),
            price_cny: r.close,
            open: r.open,
            high: r.high,
            low: r.low,
            volume: r.volume,
        }))
    );
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

export default router;
