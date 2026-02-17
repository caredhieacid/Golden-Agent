const API_BASE_URL = "http://localhost:8000/api";

export async function fetcher<T>(url: string, timeoutMs = 60000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${API_BASE_URL}${url}`, {
            signal: controller.signal,
            cache: "no-store",
        });
        if (!res.ok) {
            throw new Error(`API Error: ${res.statusText}`);
        }
        return res.json();
    } finally {
        clearTimeout(timer);
    }
}

export const api = {
    congress: {
        getTrades: (limit = 10) => fetcher<any[]>(`/congress/trades?limit=${limit}`),
        getPoliticians: () => fetcher<any[]>(`/congress/politicians`),
        getHotStocks: () => fetcher<any[]>(`/congress/hot-stocks`),
        getPoliticianDetail: (name: string) => fetcher<any>(`/congress/politician/${encodeURIComponent(name)}`),
        getByStock: (ticker: string) => fetcher<any[]>(`/congress/by-stock/${ticker}`),
    },
    stocks: {
        getIndices: () => fetcher<any[]>(`/stocks/indices`),
        getHot: () => fetcher<any[]>(`/stocks/hot`, 90000),
        getSectors: () => fetcher<any[]>(`/stocks/sectors`),
        getStockDetail: (code: string) => fetcher<any>(`/stocks/${code}`),
    },
    gold: {
        getPrices: () => fetcher<any>(`/gold/prices`),
        getHistory: (days = 30) => fetcher<any[]>(`/gold/history?days=${days}`),
        getIntraday: () => fetcher<any[]>(`/gold/intraday`),
    },
    insiders: {
        getAll: (limit = 50) => fetcher<any[]>(`/insiders?limit=${limit}`),
        getByTicker: (ticker: string) => fetcher<any[]>(`/insiders?ticker=${ticker}`),
        getSummary: () => fetcher<any[]>(`/insiders/summary`),
    },
    news: {
        getAll: (limit = 20) => fetcher<any[]>(`/news?limit=${limit}`),
        getByType: (type: string, limit = 20) => fetcher<any[]>(`/news?type=${type}&limit=${limit}`),
        getByTicker: (ticker: string) => fetcher<any[]>(`/news?ticker=${ticker}`),
    },
    search: {
        query: (q: string) => fetcher<any>(`/search?q=${encodeURIComponent(q)}`),
    },
};
