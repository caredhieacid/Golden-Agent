/**
 * 新闻动态 API 路由
 */
import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

/** GET /api/news — 新闻动态流 */
router.get("/", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string | undefined;
    const ticker = req.query.ticker as string | undefined;

    const where: any = {};
    if (type) where.type = type;
    if (ticker) where.ticker = ticker;

    const rows = await prisma.newsEvent.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
    });

    res.json(
        rows.map(r => ({
            id: r.id,
            type: r.type,
            title: r.title,
            summary: r.summary,
            ticker: r.ticker,
            related_entity: r.relatedEntity,
            url: r.url,
            timestamp: r.timestamp.toISOString(),
        }))
    );
});

export default router;
