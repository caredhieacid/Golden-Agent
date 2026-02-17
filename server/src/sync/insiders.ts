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
        if (existing > 0) {
            console.log(`[内幕同步] ⏭️ 已有 ${existing} 条数据，跳过`);
            return;
        }

        const trades: any[] = [];

        // 生成 CEO 交易（大额、重要）
        for (const insider of INSIDERS) {
            const numTrades = 2 + Math.floor(Math.random() * 4);
            for (let i = 0; i < numTrades; i++) {
                const isSale = Math.random() > 0.3; // 70% 卖出（高管套现常见）
                const shares = Math.round((1000 + Math.random() * 50000) / 100) * 100;
                const price = PRICES[insider.ticker] * (0.9 + Math.random() * 0.2);
                const txDate = randomDate(90);
                const fileDate = new Date(txDate);
                fileDate.setDate(fileDate.getDate() + Math.floor(Math.random() * 3) + 1);

                trades.push({
                    ticker: insider.ticker,
                    companyName: insider.company,
                    insiderName: insider.name,
                    insiderTitle: insider.title,
                    transactionType: isSale ? "sale" : "purchase",
                    shares,
                    pricePerShare: parseFloat(price.toFixed(2)),
                    totalValue: parseFloat((shares * price).toFixed(2)),
                    sharesOwned: Math.round(50000 + Math.random() * 500000),
                    transactionDate: txDate,
                    filingDate: fileDate,
                });
            }
        }

        // 生成 Director 交易
        for (let i = 0; i < 30; i++) {
            const insider = INSIDERS[Math.floor(Math.random() * INSIDERS.length)];
            const director = DIRECTOR_NAMES[Math.floor(Math.random() * DIRECTOR_NAMES.length)];
            const isSale = Math.random() > 0.5;
            const shares = Math.round((500 + Math.random() * 10000) / 100) * 100;
            const price = PRICES[insider.ticker] * (0.9 + Math.random() * 0.2);
            const txDate = randomDate(60);
            const fileDate = new Date(txDate);
            fileDate.setDate(fileDate.getDate() + Math.floor(Math.random() * 3) + 1);

            trades.push({
                ticker: insider.ticker,
                companyName: insider.company,
                insiderName: director,
                insiderTitle: "Director",
                transactionType: isSale ? "sale" : "purchase",
                shares,
                pricePerShare: parseFloat(price.toFixed(2)),
                totalValue: parseFloat((shares * price).toFixed(2)),
                sharesOwned: Math.round(5000 + Math.random() * 50000),
                transactionDate: txDate,
                filingDate: fileDate,
            });
        }

        await prisma.insiderTrade.createMany({ data: trades });
        console.log(`[内幕同步] ✅ 初始化 ${trades.length} 条内幕交易`);
    } catch (err) {
        console.error("[内幕同步] ❌ 失败:", err);
    }
}
