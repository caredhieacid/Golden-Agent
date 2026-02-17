/**
 * 内幕交易 API 路由
 */
import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

/** GET /api/insiders — 内幕交易列表 */
router.get("/", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const ticker = req.query.ticker as string | undefined;
    const type = req.query.type as string | undefined; // purchase / sale

    const where: any = {};
    if (ticker) where.ticker = ticker;
    if (type) where.transactionType = type;

    const rows = await prisma.insiderTrade.findMany({
        where,
        orderBy: { filingDate: "desc" },
        take: limit,
    });

    res.json(
        rows.map(r => ({
            id: r.id,
            ticker: r.ticker,
            company_name: r.companyName,
            insider_name: r.insiderName,
            insider_title: r.insiderTitle,
            transaction_type: r.transactionType,
            shares: r.shares,
            price_per_share: r.pricePerShare,
            total_value: r.totalValue,
            shares_owned: r.sharesOwned,
            filing_date: r.filingDate?.toISOString().slice(0, 10) ?? null,
            transaction_date: r.transactionDate?.toISOString().slice(0, 10) ?? null,
        }))
    );
});

/** GET /api/insiders/summary — 按股票统计内幕交易 */
router.get("/summary", async (_req, res) => {
    const purchases = await prisma.insiderTrade.groupBy({
        by: ["ticker"],
        where: { transactionType: "purchase" },
        _count: { id: true },
        _sum: { totalValue: true },
    });

    const sales = await prisma.insiderTrade.groupBy({
        by: ["ticker"],
        where: { transactionType: "sale" },
        _count: { id: true },
        _sum: { totalValue: true },
    });

    // 合并数据
    const map = new Map<string, any>();
    for (const p of purchases) {
        map.set(p.ticker, {
            ticker: p.ticker,
            buy_count: p._count.id,
            buy_value: p._sum.totalValue,
            sell_count: 0,
            sell_value: 0,
        });
    }
    for (const s of sales) {
        const entry = map.get(s.ticker) || {
            ticker: s.ticker, buy_count: 0, buy_value: 0, sell_count: 0, sell_value: 0,
        };
        entry.sell_count = s._count.id;
        entry.sell_value = s._sum.totalValue;
        map.set(s.ticker, entry);
    }

    const result = Array.from(map.values()).sort((a, b) =>
        (b.buy_count + b.sell_count) - (a.buy_count + a.sell_count)
    );

    res.json(result);
});

export default router;
