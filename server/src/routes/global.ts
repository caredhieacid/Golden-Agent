/**
 * 全球指数 API 路由
 */
import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

/** GET /api/global/indices — 获取所有全球指数 */
router.get("/indices", async (_req, res) => {
    // 获取所有指数，然后在内存中过滤（兼容旧Prisma client）
    const allRows = await prisma.stockIndex.findMany();

    // 过滤出非A股指数
    const rows = allRows.filter((r: any) => r.market && r.market !== "cn");

    // 按市场分组
    const grouped: Record<string, any[]> = {};
    for (const row of rows) {
        const market = row.market || "other";
        if (!grouped[market]) {
            grouped[market] = [];
        }
        grouped[market].push({
            code: row.code,
            name: row.name,
            market: row.market,
            price: row.price,
            change_pct: row.changePct,
            change_amount: row.changeAmount,
            updated_at: row.updatedAt,
        });
    }

    res.json(grouped);
});

/** GET /api/global/indices/:market — 获取特定市场的指数 */
router.get("/indices/:market", async (req, res) => {
    const market = req.params.market;

    // 获取所有指数，然后在内存中过滤
    const allRows = await prisma.stockIndex.findMany();
    const rows = allRows.filter((r: any) => r.market === market);

    res.json(
        rows.map((r: any) => ({
            code: r.code,
            name: r.name,
            market: r.market,
            price: r.price,
            change_pct: r.changePct,
            change_amount: r.changeAmount,
            updated_at: r.updatedAt,
        }))
    );
});

export default router;
