/**
 * 内幕交易数据同步服务
 * 
 * 使用样例数据填充（模拟 SEC Form 4 数据）
 */
import { prisma } from "../db.js";

const INSIDERS = [
    { name: "Tim Cook", title: "CEO", ticker: "AAPL", company: "Apple Inc." },
    { name: "Satya Nadella", title: "CEO", ticker: "MSFT", company: "Microsoft Corp" },
    { name: "Jensen Huang", title: "CEO", ticker: "NVDA", company: "NVIDIA Corp" },
    { name: "Mark Zuckerberg", title: "CEO", ticker: "META", company: "Meta Platforms" },
    { name: "Andy Jassy", title: "CEO", ticker: "AMZN", company: "Amazon.com Inc." },
    { name: "Elon Musk", title: "CEO", ticker: "TSLA", company: "Tesla Inc." },
    { name: "Jamie Dimon", title: "CEO", ticker: "JPM", company: "JPMorgan Chase" },
    { name: "Sundar Pichai", title: "CEO", ticker: "GOOGL", company: "Alphabet Inc." },
    { name: "Lisa Su", title: "CEO", ticker: "AMD", company: "Advanced Micro Devices" },
    { name: "Pat Gelsinger", title: "Former CEO", ticker: "INTC", company: "Intel Corp" },
    { name: "Brian Moynihan", title: "CEO", ticker: "BAC", company: "Bank of America" },
    { name: "David Solomon", title: "CEO", ticker: "GS", company: "Goldman Sachs" },
    { name: "Jane Fraser", title: "CEO", ticker: "C", company: "Citigroup Inc." },
    { name: "Ryan McInerney", title: "CEO", ticker: "V", company: "Visa Inc." },
    { name: "Arvind Krishna", title: "CEO", ticker: "IBM", company: "IBM Corp" },
    { name: "Chuck Robbins", title: "CEO", ticker: "CSCO", company: "Cisco Systems" },
    { name: "Mary Barra", title: "CEO", ticker: "GM", company: "General Motors" },
    { name: "Albert Bourla", title: "CEO", ticker: "PFE", company: "Pfizer Inc." },
    { name: "Robert Davis", title: "CEO", ticker: "MRK", company: "Merck & Co." },
    { name: "Brian Niccol", title: "CEO", ticker: "SBUX", company: "Starbucks Corp" },
];

const DIRECTOR_NAMES = [
    "John Smith", "Sarah Johnson", "Michael Chen", "Emily Davis",
    "Robert Wilson", "Jennifer Brown", "William Jones", "Jessica Miller",
    "James Taylor", "Amanda White", "David Lee", "Laura Martinez",
];

const PRICES: Record<string, number> = {
    AAPL: 242, MSFT: 415, NVDA: 138, META: 705, AMZN: 228,
    TSLA: 355, JPM: 268, GOOGL: 185, AMD: 120, INTC: 24,
    BAC: 47, GS: 620, C: 81, V: 340, IBM: 262, CSCO: 63,
    GM: 55, PFE: 26, MRK: 98, SBUX: 110,
};

function randomDate(daysAgo: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
    return d;
}

export async function syncInsiderTrades(): Promise<void> {
    try {
        const existing = await prisma.insiderTrade.count();
        const SEED_COUNT = 700;
        const APPEND_COUNT = 14;
        const MAX_ROWS = 5000;

        const createCount = existing === 0 ? SEED_COUNT : APPEND_COUNT;
        const trades: any[] = [];

        const now = new Date();
        for (let i = 0; i < createCount; i++) {
            const insider = INSIDERS[Math.floor(Math.random() * INSIDERS.length)];
            const isDirector = existing === 0 ? Math.random() > 0.7 : Math.random() > 0.5;
            const isSale = Math.random() > (isDirector ? 0.5 : 0.3);

            const sharesBase = isDirector ? 15000 : 60000;
            const shares = Math.round((500 + Math.random() * sharesBase) / 100) * 100;
            const basePrice = PRICES[insider.ticker] ?? 100;
            const price = basePrice * (0.9 + Math.random() * 0.2);

            let filingDate: Date;
            let transactionDate: Date;
            if (existing === 0) {
                transactionDate = randomDate(120);
                filingDate = new Date(transactionDate);
                filingDate.setDate(filingDate.getDate() + Math.floor(Math.random() * 3) + 1);
            } else {
                filingDate = new Date(now);
                filingDate.setMinutes(filingDate.getMinutes() - Math.floor(Math.random() * 55));
                filingDate.setDate(filingDate.getDate() - Math.floor(Math.random() * 2));
                transactionDate = new Date(filingDate);
                transactionDate.setDate(transactionDate.getDate() - (1 + Math.floor(Math.random() * 10)));
            }

            const insiderName = isDirector
                ? DIRECTOR_NAMES[Math.floor(Math.random() * DIRECTOR_NAMES.length)]
                : insider.name;
            const insiderTitle = isDirector ? "Director" : insider.title;

            trades.push({
                ticker: insider.ticker,
                companyName: insider.company,
                insiderName,
                insiderTitle,
                transactionType: isSale ? "sale" : "purchase",
                shares,
                pricePerShare: parseFloat(price.toFixed(2)),
                totalValue: parseFloat((shares * price).toFixed(2)),
                sharesOwned: Math.round((isDirector ? 5000 : 50000) + Math.random() * (isDirector ? 50000 : 500000)),
                transactionDate,
                filingDate,
            });
        }

        await prisma.insiderTrade.createMany({ data: trades });

        const afterCount = existing + createCount;
        if (afterCount > MAX_ROWS) {
            const overflow = afterCount - MAX_ROWS;
            const old = await prisma.insiderTrade.findMany({
                select: { id: true },
                orderBy: { filingDate: "asc" },
                take: overflow,
            });
            if (old.length > 0) {
                await prisma.insiderTrade.deleteMany({ where: { id: { in: old.map(o => o.id) } } });
            }
        }

        console.log(`[内幕同步] ✅ 新增 ${createCount} 条交易 (总计约 ${Math.min(afterCount, MAX_ROWS)})`);
    } catch (err) {
        console.error("[内幕同步] ❌ 失败:", err);
    }
}
