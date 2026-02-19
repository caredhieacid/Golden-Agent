/**
 * A 股数据同步服务
 * 
 * 数据源:
 * - 指数: 新浪财经 hq.sinajs.cn
 * - 板块: 东方财富 push2 API
 * - 热门个股: 东方财富 push2 API
 */
import { prisma } from "../db.js";
import iconv from "iconv-lite";

const SINA_REFERER = "https://finance.sina.com.cn";

// 关注的指数
const INDEX_CODES = [
    { sina: "sh000001", code: "000001", name: "上证指数" },
    { sina: "sz399001", code: "399001", name: "深证成指" },
    { sina: "sz399006", code: "399006", name: "创业板指" },
    { sina: "sh000300", code: "000300", name: "沪深300" },
    { sina: "sh000905", code: "000905", name: "中证500" },
    { sina: "sh000688", code: "000688", name: "科创50" },
];

function safeFloat(v: string | undefined): number | null {
    if (!v || v.trim() === "") return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
}

/** 从新浪接口拿 GBK 编码的行情数据 */
async function fetchSina(list: string): Promise<string> {
    const res = await fetch(`https://hq.sinajs.cn/list=${list}`, {
        headers: { Referer: SINA_REFERER },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    return iconv.decode(buf, "gbk");
}

// ============= A 股指数同步 =============

export async function syncStockIndices(): Promise<void> {
    try {
        const listStr = INDEX_CODES.map(i => i.sina).join(",");
        const raw = await fetchSina(listStr);

        for (const idx of INDEX_CODES) {
            const match = raw.match(new RegExp(`var hq_str_${idx.sina}="(.*)"`));
            if (!match) continue;

            const fields = match[1].split(",");
            // 新浪指数格式: 0=名称 1=今开 2=昨收 3=当前价 4=最高 5=最低
            // 6=买价 7=卖价 8=成交量(手) 9=成交额(元)
            const price = safeFloat(fields[3]);
            const prevClose = safeFloat(fields[2]);
            const changeAmount = (price !== null && prevClose !== null) ? parseFloat((price - prevClose).toFixed(2)) : null;
            const changePct = (price !== null && prevClose !== null && prevClose !== 0)
                ? parseFloat(((price - prevClose) / prevClose * 100).toFixed(2))
                : null;

            await prisma.stockIndex.upsert({
                where: { code: idx.code },
                create: {
                    code: idx.code,
                    name: idx.name,
                    price,
                    changePct,
                    changeAmount,
                    volume: safeFloat(fields[8]),
                    amount: safeFloat(fields[9]),
                },
                update: {
                    price,
                    changePct,
                    changeAmount,
                    volume: safeFloat(fields[8]),
                    amount: safeFloat(fields[9]),
                    updatedAt: new Date(),
                },
            });
        }

        console.log("[指数同步] ✅ 完成");
    } catch (err) {
        console.error("[指数同步] ❌ 失败:", err);
    }
}

// ============= 板块同步 (东方财富) =============

export async function syncSectors(): Promise<void> {
    try {
        const fields = "f14,f3,f128,f140,f136";
        const base = "https://push2.eastmoney.com/api/qt/clist/get?";
        const gainersUrl = base +
            "pn=1&pz=25&po=1&np=1&fltt=2&invt=2&fid=f3" +
            "&fs=m:90+t:3" +
            `&fields=${fields}`;
        const losersUrl = base +
            "pn=1&pz=25&po=0&np=1&fltt=2&invt=2&fid=f3" +
            "&fs=m:90+t:3" +
            `&fields=${fields}`;

        const [gainersJson, losersJson] = await Promise.all([
            fetch(gainersUrl).then(r => r.json() as any),
            fetch(losersUrl).then(r => r.json() as any),
        ]);

        const gainers: any[] = gainersJson?.data?.diff ?? [];
        const losers: any[] = losersJson?.data?.diff ?? [];
        const list = [...gainers, ...losers];

        // 先清空旧数据再插入
        await prisma.sector.deleteMany();

        const seen = new Set<string>();
        const rows = list
            .map((item: any) => ({
            name: String(item.f14 ?? ""),
            changePct: typeof item.f3 === "number" ? item.f3 : null,
            leaderStock: item.f128 ? String(item.f128) : null,
            leaderChangePct: typeof item.f140 === "number" ? item.f140 : null,
            }))
            .filter(r => {
                const key = r.name.trim();
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });

        if (rows.length > 0) {
            await prisma.sector.createMany({ data: rows });
        }

        console.log(`[板块同步] ✅ ${rows.length} 个板块`);
    } catch (err) {
        console.error("[板块同步] ❌ 失败:", err);
    }
}

// ============= 热门个股同步 (东方财富) =============

export async function syncHotStocks(): Promise<void> {
    try {
        // 东方财富个股涨幅排行 (A 股全部，取前 20 只)
        const url = "https://push2.eastmoney.com/api/qt/clist/get?" +
            "pn=1&pz=50&po=1&np=1&fltt=2&invt=2&fid=f3" +
            "&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048" +
            "&fields=f12,f14,f2,f3,f4,f5,f6,f15,f16,f17,f8,f9";
        // f12=代码 f14=名称 f2=最新价 f3=涨跌幅 f4=涨跌额
        // f5=成交量 f6=成交额 f15=最高 f16=最低 f17=今开 f8=换手率 f9=市盈率

        const res = await fetch(url);
        const json = await res.json() as any;
        const list: any[] = json?.data?.diff ?? [];

        // 清空旧数据再插入
        await prisma.hotStock.deleteMany();

        const rows = list.slice(0, 50).map((item: any) => ({
            code: String(item.f12 ?? ""),
            name: String(item.f14 ?? ""),
            price: typeof item.f2 === "number" ? item.f2 : null,
            changePct: typeof item.f3 === "number" ? item.f3 : null,
            changeAmount: typeof item.f4 === "number" ? item.f4 : null,
            volume: typeof item.f5 === "number" ? item.f5 : null,
            amount: typeof item.f6 === "number" ? item.f6 : null,
            high: typeof item.f15 === "number" ? item.f15 : null,
            low: typeof item.f16 === "number" ? item.f16 : null,
            open: typeof item.f17 === "number" ? item.f17 : null,
            turnoverRate: typeof item.f8 === "number" ? item.f8 : null,
            peRatio: typeof item.f9 === "number" ? item.f9 : null,
        }));

        if (rows.length > 0) {
            await prisma.hotStock.createMany({ data: rows });
        }

        console.log(`[热股同步] ✅ ${rows.length} 只`);
    } catch (err) {
        console.error("[热股同步] ❌ 失败:", err);
    }
}
