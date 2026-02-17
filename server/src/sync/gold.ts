/**
 * 黄金数据同步服务
 * 
 * 数据源:
 * - 国际金价 (COMEX): 新浪财经 hq.sinajs.cn/list=hf_GC
 * - 国内金价 (Au9999): 东方财富 分钟级 K 线 API
 * - 汇率 (USD/CNY): 新浪财经 hq.sinajs.cn/list=fx_susdcny
 * - 历史日线: 东方财富 日线 K 线 API
 */
import { prisma } from "../db.js";
import iconv from "iconv-lite";

const SINA_REFERER = "https://finance.sina.com.cn";
const OZ_TO_GRAM = 31.1035;

// ============= 工具函数 =============

/** 从新浪接口拿 GBK 编码的行情数据 */
async function fetchSina(list: string): Promise<string> {
    const res = await fetch(`https://hq.sinajs.cn/list=${list}`, {
        headers: { Referer: SINA_REFERER },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    return iconv.decode(buf, "gbk");
}

/** 解析新浪行情字符串 */
function parseSinaVar(raw: string, varName: string): string[] {
    const match = raw.match(new RegExp(`var ${varName}="(.*)"`));
    if (!match) return [];
    return match[1].split(",");
}

function safeFloat(v: string | undefined): number | null {
    if (!v || v.trim() === "") return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
}

// ============= 同步函数 =============

/** 同步 COMEX 国际金价 + 汇率 + Au9999 → 存入 GoldSnapshot */
export async function syncGoldSnapshot(): Promise<void> {
    try {
        // 1. COMEX 黄金 (新浪)
        const goldRaw = await fetchSina("hf_GC");
        const goldFields = parseSinaVar(goldRaw, "hq_str_hf_GC");
        // 字段: 0=开盘 1=最高 2=最低 3=昨收 4=买价 5=卖价 6=最新价 7=结算价 ...
        const priceUsd = safeFloat(goldFields[0]); // 当前价

        // 2. 汇率 USD/CNY (新浪)
        const fxRaw = await fetchSina("fx_susdcny");
        const fxFields = parseSinaVar(fxRaw, "hq_str_fx_susdcny");
        // 字段较多，当前价在 index 1
        const exchangeRate = safeFloat(fxFields[1]);

        // 3. Au9999 国内金价 (东方财富分钟 K 线: 取最后一条)
        let priceCny: number | null = null;
        try {
            const emRes = await fetch(
                "https://push2his.eastmoney.com/api/qt/stock/kline/get?" +
                "secid=118.Au9999&fields1=f1,f3&fields2=f51,f52,f53,f54,f55,f56" +
                "&klt=1&fqt=0&end=20500101&lmt=1"
            );
            const emData = await emRes.json() as any;
            const klines: string[] = emData?.data?.klines ?? [];
            if (klines.length > 0) {
                // 格式: "2026-02-13 15:30,1106.89,1108.92,1109.00,1106.80,24280"
                const parts = klines[klines.length - 1].split(",");
                priceCny = safeFloat(parts[2]); // 收盘价
            }
        } catch (e) {
            console.warn("[金价同步] Au9999 K线获取失败:", e);
        }

        // 4. 计算价差
        let spreadPct: number | null = null;
        if (priceUsd && priceCny && exchangeRate) {
            const intlCnyPerGram = (priceUsd * exchangeRate) / OZ_TO_GRAM;
            spreadPct = parseFloat((((priceCny - intlCnyPerGram) / intlCnyPerGram) * 100).toFixed(2));
        }

        // 5. 写入数据库
        await prisma.goldSnapshot.create({
            data: {
                priceUsd,
                priceCny,
                exchangeRate,
                spreadPct,
            },
        });

        console.log(`[金价同步] ✅ USD=${priceUsd}, CNY=${priceCny}, FX=${exchangeRate}, 价差=${spreadPct}%`);
    } catch (err) {
        console.error("[金价同步] ❌ 失败:", err);
    }
}

/** 同步 Au9999 每日收盘价 → GoldDaily（首次同步最近 365 天） */
export async function syncGoldDaily(): Promise<void> {
    try {
        // 查看数据库中已有多少天数据
        const existingCount = await prisma.goldDaily.count();
        const limit = existingCount === 0 ? 365 : 5; // 首次拉 365 天，后续只拉 5 天

        const res = await fetch(
            "https://push2his.eastmoney.com/api/qt/stock/kline/get?" +
            `secid=118.Au9999&fields1=f1,f3&fields2=f51,f52,f53,f54,f55,f56` +
            `&klt=101&fqt=0&end=20500101&lmt=${limit}`
        );
        const data = await res.json() as any;
        const klines: string[] = data?.data?.klines ?? [];

        let upserted = 0;
        for (const line of klines) {
            // 格式: "2026-02-13,1100.00,1125.00,1090.00,1108.92,24280"
            const [dateStr, openS, closeS, highS, lowS, volS] = line.split(",");
            const date = new Date(dateStr + "T00:00:00Z");
            const close = safeFloat(closeS);
            if (!close) continue;

            await prisma.goldDaily.upsert({
                where: { date },
                create: {
                    date,
                    open: safeFloat(openS),
                    high: safeFloat(highS),
                    low: safeFloat(lowS),
                    close,
                    volume: safeFloat(volS),
                },
                update: {
                    open: safeFloat(openS),
                    high: safeFloat(highS),
                    low: safeFloat(lowS),
                    close,
                    volume: safeFloat(volS),
                },
            });
            upserted++;
        }

        console.log(`[日线同步] ✅ Au9999 upserted ${upserted} 天`);
    } catch (err) {
        console.error("[日线同步] ❌ 失败:", err);
    }
}
