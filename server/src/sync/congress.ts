/**
 * 国会交易数据同步服务
 * 
 * 使用样例数据填充（与原 Python 后端保持一致）
 * 未来可接入 House.gov 真实数据
 */
import { prisma } from "../db.js";

// ============= 样例数据 =============

const SAMPLE_POLITICIANS = [
    { firstName: "Nancy", lastName: "Pelosi", fullName: "Nancy Pelosi", chamber: "house", state: "CA", party: "D", district: 12 },
    { firstName: "Dan", lastName: "Crenshaw", fullName: "Dan Crenshaw", chamber: "house", state: "TX", party: "R", district: 2 },
    { firstName: "Josh", lastName: "Gottheimer", fullName: "Josh Gottheimer", chamber: "house", state: "NJ", party: "D", district: 5 },
    { firstName: "Marjorie", lastName: "Greene", fullName: "Marjorie Taylor Greene", chamber: "house", state: "GA", party: "R", district: 14 },
    { firstName: "Ro", lastName: "Khanna", fullName: "Ro Khanna", chamber: "house", state: "CA", party: "D", district: 17 },
    { firstName: "Michael", lastName: "McCaul", fullName: "Michael McCaul", chamber: "house", state: "TX", party: "R", district: 10 },
    { firstName: "Earl", lastName: "Carl", fullName: "Jerry Carl", chamber: "house", state: "AL", party: "R", district: 1 },
    { firstName: "Mark", lastName: "Green", fullName: "Mark Green", chamber: "house", state: "TN", party: "R", district: 7 },
    { firstName: "Kevin", lastName: "Hern", fullName: "Kevin Hern", chamber: "house", state: "OK", party: "R", district: 1 },
    { firstName: "French", lastName: "Hill", fullName: "French Hill", chamber: "house", state: "AR", party: "R", district: 2 },
];

function randomDate(daysAgo: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
    return d;
}

function randomAmount(): { min: number; max: number } {
    const ranges = [
        { min: 1001, max: 15000 },
        { min: 15001, max: 50000 },
        { min: 50001, max: 100000 },
        { min: 100001, max: 250000 },
        { min: 250001, max: 500000 },
        { min: 500001, max: 1000000 },
    ];
    return ranges[Math.floor(Math.random() * ranges.length)];
}

const TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM", "V", "UNH",
    "XOM", "JNJ", "PG", "MA", "HD", "BAC", "ABBV", "KO", "PFE", "AVGO"];
const COMPANIES: Record<string, string> = {
    AAPL: "Apple Inc.", MSFT: "Microsoft Corp", NVDA: "NVIDIA Corp", GOOGL: "Alphabet Inc.",
    AMZN: "Amazon.com Inc.", META: "Meta Platforms", TSLA: "Tesla Inc.", JPM: "JPMorgan Chase",
    V: "Visa Inc.", UNH: "UnitedHealth Group", XOM: "Exxon Mobil", JNJ: "Johnson & Johnson",
    PG: "Procter & Gamble", MA: "Mastercard", HD: "Home Depot", BAC: "Bank of America",
    ABBV: "AbbVie Inc.", KO: "Coca-Cola Co", PFE: "Pfizer Inc.", AVGO: "Broadcom Inc.",
};

/** 初始化样例数据（仅当数据库为空时） */
export async function syncCongressData(): Promise<void> {
    try {
        const existing = await prisma.congressTrade.count();
        if (existing > 0) {
            console.log(`[国会同步] ⏭️ 已有 ${existing} 条数据，跳过`);
            return;
        }

        // 插入议员
        for (const pol of SAMPLE_POLITICIANS) {
            await prisma.politician.upsert({
                where: { fullName: pol.fullName },
                create: pol,
                update: {},
            });
        }

        // 查询议员 ID
        const politicians = await prisma.politician.findMany();

        // 生成 100 条交易记录
        const trades: any[] = [];
        for (let i = 0; i < 100; i++) {
            const pol = politicians[Math.floor(Math.random() * politicians.length)];
            const ticker = TICKERS[Math.floor(Math.random() * TICKERS.length)];
            const txType = Math.random() > 0.5 ? "purchase" : "sale";
            const amount = randomAmount();
            const txDate = randomDate(90);
            const discDate = new Date(txDate);
            discDate.setDate(discDate.getDate() + Math.floor(Math.random() * 30) + 1);

            trades.push({
                politicianId: pol.id,
                ticker,
                companyName: COMPANIES[ticker] || ticker,
                transactionType: txType,
                amountMin: amount.min,
                amountMax: amount.max,
                transactionDate: txDate,
                disclosureDate: discDate,
                politicianName: pol.fullName,
                politicianParty: pol.party,
                politicianState: pol.state,
            });
        }

        await prisma.congressTrade.createMany({ data: trades });
        console.log(`[国会同步] ✅ 初始化 ${SAMPLE_POLITICIANS.length} 位议员, ${trades.length} 条交易`);
    } catch (err) {
        console.error("[国会同步] ❌ 失败:", err);
    }
}
