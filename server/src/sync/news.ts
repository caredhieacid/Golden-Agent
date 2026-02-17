/**
 * 新闻/事件动态生成服务
 * 
 * 根据已有交易数据自动生成新闻动态
 */
import { prisma } from "../db.js";

export async function syncNewsEvents(): Promise<void> {
    try {
        const existing = await prisma.newsEvent.count();
        if (existing > 0) {
            console.log(`[新闻同步] ⏭️ 已有 ${existing} 条数据，跳过`);
            return;
        }

        const events: any[] = [];

        // 从国会交易生成新闻
        const congressTrades = await prisma.congressTrade.findMany({
            orderBy: { disclosureDate: "desc" },
            take: 30,
        });

        for (const trade of congressTrades) {
            const action = trade.transactionType === "purchase" ? "买入" : "卖出";
            const actionEn = trade.transactionType === "purchase" ? "Purchased" : "Sold";
            const amount = trade.amountMax
                ? `$${(trade.amountMin! / 1000).toFixed(0)}K-$${(trade.amountMax / 1000).toFixed(0)}K`
                : "金额未知";

            events.push({
                type: "congress_trade",
                title: `Congress Trade: ${trade.politicianName} ${actionEn} ${trade.ticker}`,
                summary: `${trade.politicianName}（${trade.politicianParty}）${action}了 ${trade.companyName}（${trade.ticker}）股票，金额 ${amount}`,
                ticker: trade.ticker,
                relatedEntity: trade.politicianName,
                timestamp: trade.disclosureDate || new Date(),
            });
        }

        // 从内幕交易生成新闻
        const insiderTrades = await prisma.insiderTrade.findMany({
            orderBy: { filingDate: "desc" },
            take: 30,
        });

        for (const trade of insiderTrades) {
            const action = trade.transactionType === "purchase" ? "Buy" : "Sale";
            const shares = trade.shares ? trade.shares.toLocaleString() : "N/A";
            const value = trade.totalValue
                ? `$${(trade.totalValue / 1000000).toFixed(2)}M`
                : "";

            events.push({
                type: "insider_trade",
                title: `Insider ${action}: ${trade.insiderTitle} of $${trade.ticker} ${action === "Buy" ? "Buys" : "Sells"} ${shares} Shares`,
                summary: `${trade.insiderName}（${trade.insiderTitle}）${action === "Buy" ? "买入" : "卖出"} ${trade.companyName}（${trade.ticker}）${shares} 股，价值 ${value}`,
                ticker: trade.ticker,
                relatedEntity: trade.insiderName,
                timestamp: trade.filingDate || new Date(),
            });
        }

        // 基金更新动态（模拟）
        const funds = [
            { name: "ARK Investment Management LLC", tickers: ["TSLA", "NVDA", "AMZN"] },
            { name: "RENAISSANCE TECHNOLOGIES LLC", tickers: ["AAPL", "MSFT", "GOOGL"] },
            { name: "BERKSHIRE HATHAWAY INC", tickers: ["AAPL", "BAC", "JPM"] },
            { name: "BRIDGEWATER ASSOCIATES LP", tickers: ["V", "PFE", "META"] },
        ];

        for (const fund of funds) {
            const d = new Date();
            d.setDate(d.getDate() - Math.floor(Math.random() * 30));
            events.push({
                type: "fund_update",
                title: `Fund Update: ${fund.name} Just Disclosed New Holdings`,
                summary: `${fund.name} 披露了最新持仓变动，涉及 ${fund.tickers.join(", ")} 等股票`,
                ticker: fund.tickers[0],
                relatedEntity: fund.name,
                timestamp: d,
            });
        }

        // 游说动态（模拟）
        const lobbyists = [
            { company: "APPLE INC", amount: 2840000, ticker: "AAPL" },
            { company: "AMAZON.COM INC", amount: 5480000, ticker: "AMZN" },
            { company: "META PLATFORMS INC", amount: 4230000, ticker: "META" },
            { company: "GOOGLE LLC", amount: 3150000, ticker: "GOOGL" },
            { company: "MICROSOFT CORP", amount: 2960000, ticker: "MSFT" },
        ];

        for (const lob of lobbyists) {
            const d = new Date();
            d.setDate(d.getDate() - Math.floor(Math.random() * 15));
            const amountStr = `$${(lob.amount / 1000000).toFixed(2)}M`;
            events.push({
                type: "lobbying",
                title: `Lobbying Update: ${amountStr} of ${lob.company} lobbying was just disclosed`,
                summary: `${lob.company}（${lob.ticker}）披露了 ${amountStr} 的游说支出`,
                ticker: lob.ticker,
                relatedEntity: lob.company,
                timestamp: d,
            });
        }

        await prisma.newsEvent.createMany({ data: events });
        console.log(`[新闻同步] ✅ 初始化 ${events.length} 条新闻事件`);
    } catch (err) {
        console.error("[新闻同步] ❌ 失败:", err);
    }
}
