import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

type MarketFilter = "all" | "cn" | "us";

function containsCI(target: string | null | undefined, keywordLower: string) {
  if (!target) return false;
  return target.toLowerCase().includes(keywordLower);
}

function tickerScore(ticker: string, qUpper: string) {
  if (ticker === qUpper) return 100;
  if (ticker.startsWith(qUpper)) return 85;
  if (ticker.includes(qUpper)) return 70;
  return 0;
}

function isCnTicker(ticker: string | null | undefined) {
  if (!ticker) return false;
  return /^\d{6}$/.test(String(ticker).trim());
}

function marketMatch(ticker: string | null | undefined, market: MarketFilter) {
  if (market === "all") return true;
  if (market === "cn") return isCnTicker(ticker);
  return !isCnTicker(ticker);
}

function highlightText(text: string | null | undefined, keyword: string) {
  if (!text) return text ?? null;
  if (!keyword) return text;
  const index = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (index < 0) return text;
  const end = index + keyword.length;
  return `${text.slice(0, index)}【${text.slice(index, end)}】${text.slice(end)}`;
}

router.get("/", async (req, res) => {
  const startedAt = Date.now();
  const q = String(req.query.q ?? "").trim();
  const limitRaw = Number(req.query.limit ?? 6);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 20) : 6;
  const marketParam = String(req.query.market ?? "all").toLowerCase();
  const market: MarketFilter = marketParam === "cn" || marketParam === "us" ? marketParam : "all";
  const includeNews = String(req.query.include_news ?? "true").toLowerCase() !== "false";

  if (!q) {
    return res.json({
      query: "",
      market,
      politicians: [],
      stocks: [],
      insider_stocks: [],
      news: [],
      meta: {
        limit,
        include_news: includeNews,
        totals: {
          politicians: 0,
          stocks: 0,
          insider_stocks: 0,
          news: 0,
        },
      },
      took_ms: Date.now() - startedAt,
    });
  }

  const qUpper = q.toUpperCase();
  const qLower = q.toLowerCase();
  const dbTake = Math.max(limit * 3, 12);

  const [politicians, cnStocks, insiderRows, newsRows] = await Promise.all([
    prisma.politician.findMany({
      where: {
        OR: [
          { fullName: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { state: { contains: qUpper } },
          { party: { contains: qUpper } },
        ],
      },
      take: dbTake,
    }),
    prisma.hotStock.findMany({
      where: {
        OR: [{ code: { contains: qUpper } }, { name: { contains: q } }],
      },
      orderBy: [{ amount: "desc" }, { changePct: "desc" }],
      take: dbTake,
    }),
    prisma.insiderTrade.findMany({
      where: {
        OR: [
          { ticker: { contains: qUpper } },
          { companyName: { contains: q } },
          { insiderName: { contains: q } },
        ],
      },
      orderBy: { filingDate: "desc" },
      take: dbTake,
    }),
    includeNews
      ? prisma.newsEvent.findMany({
          where: {
            OR: [
              { title: { contains: q } },
              { summary: { contains: q } },
              { ticker: { contains: qUpper } },
              { relatedEntity: { contains: q } },
            ],
          },
          orderBy: { timestamp: "desc" },
          take: dbTake,
        })
      : Promise.resolve([]),
  ]);

  const politicianScored = politicians
    .map((p) => {
      let score = 0;
      if (containsCI(p.fullName, qLower)) score += 80;
      if (containsCI(`${p.firstName ?? ""} ${p.lastName ?? ""}`, qLower)) score += 60;
      if (containsCI(p.state, qLower)) score += 25;
      if (containsCI(p.party, qLower)) score += 10;
      return {
        id: p.id,
        name: p.fullName,
        name_highlight: highlightText(p.fullName, q),
        party: p.party,
        state: p.state,
        chamber: p.chamber,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
  const politicianResults = politicianScored.slice(0, limit);

  const cnStockResults = cnStocks
    .map((s) => {
      let score = tickerScore(s.code.toUpperCase(), qUpper);
      if (containsCI(s.name, qLower)) score += 40;
      return {
        code: s.code,
        name: s.name,
        name_highlight: highlightText(s.name, q),
        price: s.price,
        change_pct: s.changePct,
        market: "cn",
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const usMap = new Map<string, { ticker: string; company_name: string | null; score: number }>();
  const cnFromInsiderMap = new Map<string, { code: string; name: string | null; score: number }>();
  for (const row of insiderRows) {
    const ticker = (row.ticker ?? "").toUpperCase();
    if (!ticker) continue;
    const score = tickerScore(ticker, qUpper) + (containsCI(row.companyName, qLower) ? 35 : 0);

    if (isCnTicker(ticker)) {
      const prevCn = cnFromInsiderMap.get(ticker);
      if (!prevCn || score > prevCn.score) {
        cnFromInsiderMap.set(ticker, { code: ticker, name: row.companyName, score });
      }
      continue;
    }

    const prevUs = usMap.get(ticker);
    if (!prevUs || score > prevUs.score) {
      usMap.set(ticker, {
        ticker,
        company_name: row.companyName,
        score,
      });
    }
  }

  const cnFromInsiderResults = Array.from(cnFromInsiderMap.values()).map((x) => ({
    code: x.code,
    name: x.name,
    name_highlight: highlightText(x.name ?? x.code, q),
    price: null,
    change_pct: null,
    market: "cn",
    score: x.score,
  }));

  const stockScored = (market === "us" ? [] : [...cnStockResults, ...cnFromInsiderResults]).sort(
    (a, b) => b.score - a.score
  );
  const stockResults = stockScored.slice(0, limit);

  const insiderScored = Array.from(usMap.values())
    .filter((x) => marketMatch(x.ticker, market))
    .map((x) => ({
      ticker: x.ticker,
      company_name: x.company_name,
      company_name_highlight: highlightText(x.company_name ?? x.ticker, q),
      market: "us",
      score: x.score,
    }))
    .sort((a, b) => b.score - a.score);
  const insiderResults = insiderScored.slice(0, limit);

  const newsScored = newsRows
    .filter((n) => marketMatch(n.ticker, market))
    .map((n) => {
      let score = 0;
      if (containsCI(n.title, qLower)) score += 70;
      if (containsCI(n.summary, qLower)) score += 30;
      if (containsCI(n.ticker, qLower)) score += 30;
      if (containsCI(n.relatedEntity, qLower)) score += 25;
      if (n.timestamp) {
        const ageHours = (Date.now() - n.timestamp.getTime()) / 3_600_000;
        if (ageHours <= 24) score += 15;
        else if (ageHours <= 72) score += 8;
      }
      return {
        id: n.id,
        type: n.type,
        title: n.title,
        title_highlight: highlightText(n.title, q),
        summary: n.summary,
        summary_highlight: highlightText(n.summary ?? "", q),
        ticker: n.ticker,
        related_entity: n.relatedEntity,
        market: isCnTicker(n.ticker) ? "cn" : "us",
        timestamp: n.timestamp?.toISOString(),
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
  const newsResults = newsScored.slice(0, limit);

  res.json({
    query: q,
    market,
    politicians: politicianResults,
    stocks: stockResults,
    insider_stocks: insiderResults,
    news: newsResults,
    meta: {
      limit,
      include_news: includeNews,
      totals: {
        politicians: politicianScored.length,
        stocks: stockScored.length,
        insider_stocks: insiderScored.length,
        news: newsScored.length,
      },
    },
    took_ms: Date.now() - startedAt,
  });
});

export default router;
