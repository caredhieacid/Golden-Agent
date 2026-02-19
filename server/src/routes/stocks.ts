/**
 * A 股 API 路由
 */
import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

/** GET /api/stocks/indices — A 股指数 */
router.get("/indices", async (_req, res) => {
    const rows = await prisma.stockIndex.findMany({
        orderBy: { code: "asc" },
    });

    res.json(
        rows.map(r => ({
            code: r.code,
            name: r.name,
            price: r.price,
            change_pct: r.changePct,
            change_amount: r.changeAmount,
            volume: r.volume,
            amount: r.amount,
        }))
    );
});

/** GET /api/stocks/sectors?limit=20 — 板块排行 */
router.get("/sectors", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;

    const rows = await prisma.sector.findMany({
        orderBy: { changePct: "desc" },
        take: limit,
    });

    res.json(
        rows.map(r => ({
            name: r.name,
            change_pct: r.changePct,
            leader_stock: r.leaderStock,
            leader_change_pct: r.leaderChangePct,
        }))
    );
});

/** GET /api/stocks/hot?limit=20 — 热门个股 */
router.get("/hot", async (req, res) => {
    const rawLimit = parseInt(req.query.limit as string);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 200, 1), 300);

    const rows = await prisma.hotStock.findMany({
        orderBy: { changePct: "desc" },
        take: limit,
    });

    res.json(
        rows.map(r => ({
            code: r.code,
            name: r.name,
            price: r.price,
            change_pct: r.changePct,
            change_amount: r.changeAmount,
            volume: r.volume,
            amount: r.amount,
            high: r.high,
            low: r.low,
            open: r.open,
            turnover_rate: r.turnoverRate,
            pe_ratio: r.peRatio,
        }))
    );
});

/** GET /api/stocks/:code — 个股详情 */
router.get("/:code", async (req, res) => {
    const row = await prisma.hotStock.findUnique({
        where: { code: req.params.code },
    });

    if (!row) {
        return res.status(404).json({ error: "Stock not found" });
    }

    res.json({
        code: row.code,
        name: row.name,
        price: row.price,
        change_pct: row.changePct,
        change_amount: row.changeAmount,
        volume: row.volume,
        amount: row.amount,
        high: row.high,
        low: row.low,
        open: row.open,
        turnover_rate: row.turnoverRate,
        pe_ratio: row.peRatio,
    });
});

export default router;
