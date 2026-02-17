/**
 * 全局搜索 API 路由
 */
import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

/** GET /api/search?q=xxx — 全局搜索 */
router.get("/", async (req, res) => {
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 1) {
        return res.json({ politicians: [], stocks: [], insider_names: [] });
    }

    const qUpper = q.toUpperCase();
    const qLower = q.toLowerCase();

    // 并行搜索
    const [politicians, stocks, insiderNames] = await Promise.all([
        // 搜议员
        prisma.politician.findMany({
            where: {
                OR: [
                    { fullName: { contains: q } },
                    { firstName: { contains: q } },
                    { lastName: { contains: q } },
                    { state: { contains: qUpper } },
                ],
            },
            take: 5,
        }),

        // 搜股票（代码 或 公司名）
        prisma.hotStock.findMany({
            where: {
                OR: [
                    { code: { contains: qUpper } },
                    { name: { contains: q } },
                ],
            },
            take: 5,
        }),

        // 搜内幕人（CEO 名字）
        prisma.insiderTrade.findMany({
            where: {
                OR: [
                    { insiderName: { contains: q } },
                    { ticker: { contains: qUpper } },
                    { companyName: { contains: q } },
                ],
            },
            distinct: ["ticker"],
            take: 5,
        }),
    ]);

    res.json({
        politicians: politicians.map(p => ({
            id: p.id,
            name: p.fullName,
            party: p.party,
            state: p.state,
            chamber: p.chamber,
        })),
        stocks: stocks.map(s => ({
            code: s.code,
            name: s.name,
            price: s.price,
            change_pct: s.changePct,
        })),
        insider_stocks: insiderNames.map(i => ({
            ticker: i.ticker,
            company_name: i.companyName,
        })),
    });
});

export default router;
