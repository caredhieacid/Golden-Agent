/**
 * 国会交易 API 路由
 */
import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

/** GET /api/congress/trades?limit=10 */
router.get("/trades", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const rows = await prisma.congressTrade.findMany({
        orderBy: { disclosureDate: "desc" },
        take: limit,
    });

    res.json(
        rows.map(r => ({
            id: r.id,
            politician_name: r.politicianName,
            politician_party: r.politicianParty,
            politician_state: r.politicianState,
            chamber: r.sourceChamber,
            ticker: r.ticker,
            company_name: r.companyName,
            transaction_type: r.transactionType,
            amount_min: r.amountMin,
            amount_max: r.amountMax,
            transaction_date: r.transactionDate?.toISOString().slice(0, 10) ?? null,
            disclosure_date: r.disclosureDate?.toISOString().slice(0, 10) ?? null,
        }))
    );
});

/** GET /api/congress/politicians */
router.get("/politicians", async (_req, res) => {
    const pols = await prisma.politician.findMany({
        include: {
            trades: {
                select: { id: true, disclosureDate: true },
                orderBy: { disclosureDate: "desc" },
            },
        },
        orderBy: { fullName: "asc" },
    });

    res.json(
        pols.map(p => ({
            id: p.id,
            full_name: p.fullName,
            chamber: p.chamber,
            state: p.state,
            party: p.party,
            trade_count: p.trades.length,
            last_trade_date: p.trades[0]?.disclosureDate?.toISOString().slice(0, 10) ?? null,
        }))
    );
});

/** GET /api/congress/hot-stocks */
router.get("/hot-stocks", async (_req, res) => {
    // 统计交易次数最多的股票
    const trades = await prisma.congressTrade.groupBy({
        by: ["ticker"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
    });

    res.json(
        trades.map(t => ({
            ticker: t.ticker,
            trade_count: t._count.id,
        }))
    );
});

/** GET /api/congress/politician/:name — 议员详情 */
router.get("/politician/:name", async (req, res) => {
    const name = decodeURIComponent(req.params.name);

    const pol = await prisma.politician.findFirst({
        where: { fullName: { contains: name } },
        include: {
            trades: {
                orderBy: { disclosureDate: "desc" },
            },
        },
    });

    if (!pol) {
        return res.status(404).json({ error: "Politician not found" });
    }

    // 按股票统计交易
    const stockCounts = new Map<string, { count: number; totalMin: number; totalMax: number }>();
    for (const t of pol.trades) {
        const entry = stockCounts.get(t.ticker) || { count: 0, totalMin: 0, totalMax: 0 };
        entry.count++;
        entry.totalMin += t.amountMin || 0;
        entry.totalMax += t.amountMax || 0;
        stockCounts.set(t.ticker, entry);
    }

    res.json({
        id: pol.id,
        full_name: pol.fullName,
        first_name: pol.firstName,
        last_name: pol.lastName,
        chamber: pol.chamber,
        state: pol.state,
        party: pol.party,
        district: pol.district,
        trade_count: pol.trades.length,
        trades: pol.trades.map(t => ({
            id: t.id,
            ticker: t.ticker,
            company_name: t.companyName,
            transaction_type: t.transactionType,
            amount_min: t.amountMin,
            amount_max: t.amountMax,
            transaction_date: t.transactionDate?.toISOString().slice(0, 10) ?? null,
            disclosure_date: t.disclosureDate?.toISOString().slice(0, 10) ?? null,
        })),
        top_stocks: Array.from(stockCounts.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([ticker, data]) => ({
                ticker,
                trade_count: data.count,
                total_amount_min: data.totalMin,
                total_amount_max: data.totalMax,
            })),
    });
});

/** GET /api/congress/by-stock/:ticker — 按股票查找国会交易 */
router.get("/by-stock/:ticker", async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();

    const trades = await prisma.congressTrade.findMany({
        where: { ticker },
        orderBy: { disclosureDate: "desc" },
        take: 50,
    });

    res.json(
        trades.map(t => ({
            id: t.id,
            politician_name: t.politicianName,
            politician_party: t.politicianParty,
            politician_state: t.politicianState,
            transaction_type: t.transactionType,
            amount_min: t.amountMin,
            amount_max: t.amountMax,
            transaction_date: t.transactionDate?.toISOString().slice(0, 10) ?? null,
            disclosure_date: t.disclosureDate?.toISOString().slice(0, 10) ?? null,
        }))
    );
});

/** POST /api/congress/sync — 手动触发数据同步 */
router.post("/sync", async (_req, res) => {
    const { syncCongressData } = await import("../sync/congress.js");
    await syncCongressData();
    const count = await prisma.congressTrade.count();
    res.json({ status: "ok", total_trades: count });
});

export default router;
