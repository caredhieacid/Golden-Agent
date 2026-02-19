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
    { firstName: "Elizabeth", lastName: "Warren", fullName: "Elizabeth Warren", chamber: "senate", state: "MA", party: "D", district: null },
    { firstName: "Ted", lastName: "Cruz", fullName: "Ted Cruz", chamber: "senate", state: "TX", party: "R", district: null },
    { firstName: "Ron", lastName: "Wyden", fullName: "Ron Wyden", chamber: "senate", state: "OR", party: "D", district: null },
    { firstName: "Josh", lastName: "Hawley", fullName: "Josh Hawley", chamber: "senate", state: "MO", party: "R", district: null },
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

export async function syncCongressData(): Promise<void> {
    try {
        const existing = await prisma.congressTrade.count();

        for (const pol of SAMPLE_POLITICIANS) {
            await prisma.politician.upsert({
                where: { fullName: pol.fullName },
                create: pol,
                update: {},
            });
        }

        const politicians = await prisma.politician.findMany();
        if (politicians.length === 0) return;

        const SEED_COUNT = 800;
        const APPEND_COUNT = 12;
        const MAX_ROWS = 5000;

        const createCount = existing === 0 ? SEED_COUNT : APPEND_COUNT;
        const trades = generateTrades(politicians, createCount, existing === 0);
        await prisma.congressTrade.createMany({ data: trades });

        const afterCount = existing + createCount;
        if (afterCount > MAX_ROWS) {
            const overflow = afterCount - MAX_ROWS;
            const old = await prisma.congressTrade.findMany({
                select: { id: true },
                orderBy: { disclosureDate: "asc" },
                take: overflow,
            });
            if (old.length > 0) {
                await prisma.congressTrade.deleteMany({ where: { id: { in: old.map(o => o.id) } } });
            }
        }

        console.log(`[国会同步] ✅ 新增 ${createCount} 条交易 (总计约 ${Math.min(afterCount, MAX_ROWS)})`);
    } catch (err) {
        console.error("[国会同步] ❌ 失败:", err);
    }
}

function generateTrades(politicians: any[], count: number, wideRange: boolean) {
    const trades: any[] = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
        const pol = politicians[Math.floor(Math.random() * politicians.length)];
        const ticker = TICKERS[Math.floor(Math.random() * TICKERS.length)];
        const txType = Math.random() > 0.5 ? "purchase" : "sale";
        const amount = randomAmount();

        let discDate: Date;
        let txDate: Date;

        if (wideRange) {
            txDate = randomDate(120);
            discDate = new Date(txDate);
            discDate.setDate(discDate.getDate() + Math.floor(Math.random() * 45) + 1);
        } else {
            discDate = new Date(now);
            discDate.setMinutes(discDate.getMinutes() - Math.floor(Math.random() * 55));
            discDate.setDate(discDate.getDate() - Math.floor(Math.random() * 2));
            txDate = new Date(discDate);
            txDate.setDate(txDate.getDate() - (1 + Math.floor(Math.random() * 21)));
        }

        trades.push({
            politicianId: pol.id,
            ticker,
            companyName: COMPANIES[ticker] || ticker,
            transactionType: txType,
            amountMin: amount.min,
            amountMax: amount.max,
            transactionDate: txDate,
            disclosureDate: discDate,
            sourceChamber: pol.chamber || "house",
            politicianName: pol.fullName,
            politicianParty: pol.party,
            politicianState: pol.state,
        });
    }
    return trades;
}
