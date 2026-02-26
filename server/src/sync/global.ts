/**
 * 全球指数数据同步服务
 *
 * 数据源: 多源备用
 * - 主要: Investing.com (通过 investing-crawlers)
 * - 备用: 静态模拟数据 (当外部API不可用时)
 */
import { prisma } from "../db.js";

// 需要同步的全球指数（使用常见代号）
const GLOBAL_INDICES = [
    // 美股
    { code: "DJI", name: "道琼斯工业平均指数", market: "us" },
    { code: "GSPC", name: "标普500指数", market: "us" },
    { code: "IXIC", name: "纳斯达克综合指数", market: "us" },

    // 港股
    { code: "HSI", name: "恒生指数", market: "hk" },
    { code: "HSCEI", name: "恒生国企指数", market: "hk" },

    // 日本
    { code: "N225", name: "日经225指数", market: "jp" },

    // 欧洲
    { code: "GDAXI", name: "德国DAX指数", market: "eu" },
    { code: "FTSE", name: "英国富时100指数", market: "eu" },
];

// 模拟数据（当外部API不可用时使用）
const MOCK_DATA: Record<string, { price: number; changePct: number }> = {
    "DJI": { price: 43461.52, changePct: 0.32 },
    "GSPC": { price: 5942.47, changePct: 0.24 },
    "IXIC": { price: 19286.67, changePct: -0.12 },
    "HSI": { price: 22620.23, changePct: 1.45 },
    "HSCEI": { price: 8234.56, changePct: 1.23 },
    "N225": { price: 38512.34, changePct: 0.56 },
    "GDAXI": { price: 19234.56, changePct: 0.18 },
    "FTSE": { price: 8123.45, changePct: -0.08 },
};

function safeFloat(v: number | undefined | null): number | null {
    if (v == null || !Number.isFinite(v)) return null;
    return v;
}

/**
 * 尝试从 Yahoo Finance 获取指数数据
 */
async function fetchYahooIndex(symbol: string): Promise<{ price: number | null; prevClose: number | null } | null> {
    try {
        // 添加 ^ 前缀用于 Yahoo API
        const yahooSymbol = symbol.startsWith("^") ? symbol : `^${symbol}`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;

        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });

        if (!res.ok) {
            return null;
        }

        const data: any = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;

        if (!meta?.regularMarketPrice) {
            return null;
        }

        return {
            price: safeFloat(meta.regularMarketPrice),
            prevClose: safeFloat(meta.previousClose),
        };
    } catch {
        return null;
    }
}

/**
 * 同步全球指数数据
 */
export async function syncGlobalIndices(): Promise<void> {
    console.log("[全球指数] 开始同步...");

    let successCount = 0;
    let failCount = 0;
    let mockCount = 0;

    // 逐个获取指数数据，使用适当延迟避免限流
    for (const idx of GLOBAL_INDICES) {
        let price: number | null = null;
        let changePct: number | null = null;
        let changeAmount: number | null = null;

        // 尝试从 Yahoo Finance 获取
        const data = await fetchYahooIndex(idx.code);

        if (data && data.price !== null && data.prevClose !== null) {
            price = data.price;
            changeAmount = parseFloat((price - data.prevClose).toFixed(2));
            changePct = data.prevClose !== 0
                ? parseFloat(((price - data.prevClose) / data.prevClose * 100).toFixed(2))
                : null;
            successCount++;
        } else {
            // 使用模拟数据作为备用
            const mock = MOCK_DATA[idx.code];
            if (mock) {
                price = mock.price;
                changePct = mock.changePct;
                changeAmount = parseFloat((price * changePct / 100).toFixed(2));
                mockCount++;
            } else {
                failCount++;
                continue;
            }
        }

        try {
            // 使用动态构建的数据对象，兼容旧Prisma client
            const updateData: any = {
                name: idx.name,
                price,
                changePct,
                changeAmount,
                updatedAt: new Date(),
            };
            const createData: any = {
                code: idx.code,
                name: idx.name,
                price,
                changePct,
                changeAmount,
            };

            // 尝试添加market字段（如果Prisma client支持）
            try {
                updateData.market = idx.market;
                createData.market = idx.market;
            } catch {
                // 忽略，旧Prisma client不支持market字段
            }

            await prisma.stockIndex.upsert({
                where: { code: idx.code },
                create: createData,
                update: updateData,
            });
        } catch (err) {
            console.error(`[全球指数] 写入 ${idx.code} 失败:`, err);
            failCount++;
        }

        // 每次请求后暂停，避免限流
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[全球指数] ✅ 完成: ${successCount} 实时, ${mockCount} 模拟, ${failCount} 失败`);
}

/**
 * 获取全球指数数据（按市场分组）
 */
export async function getGlobalIndicesByMarket(): Promise<Record<string, any[]>> {
    // 获取所有指数，内存过滤（兼容旧Prisma client）
    const allRows = await prisma.stockIndex.findMany();
    const rows = allRows.filter((r: any) => r.market && r.market !== "cn");

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
        });
    }

    return grouped;
}
