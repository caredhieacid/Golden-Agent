"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

const API_BASE = "http://localhost:8000/api";

// ============= 数据类型 =============
interface DataStore {
    gold: { prices: any; history: any[]; };
    stocks: { indices: any[]; sectors: any[]; hot: any[]; };
    congress: { trades: any[]; politicians: any[]; };
    insiders: { trades: any[]; summary: any[]; };
    news: any[];
    ready: boolean;          // 首次加载完成
    lastUpdate: string;      // 最后更新时间
    sseConnected: boolean;   // SSE 连接状态
}

const defaultStore: DataStore = {
    gold: { prices: null, history: [] },
    stocks: { indices: [], sectors: [], hot: [] },
    congress: { trades: [], politicians: [] },
    insiders: { trades: [], summary: [] },
    news: [],
    ready: false,
    lastUpdate: "",
    sseConnected: false,
};

const DataContext = createContext<DataStore>(defaultStore);

export function useData() {
    return useContext(DataContext);
}

// ============= DataProvider 组件 =============
export function DataProvider({ children }: { children: React.ReactNode }) {
    const [store, setStore] = useState<DataStore>(defaultStore);
    const sseRef = useRef<EventSource | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    // 批量加载全部数据
    const loadBulkData = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/bulk`, { cache: "no-store" });
            if (!res.ok) throw new Error("Bulk load failed");
            const data = await res.json();

            setStore(prev => ({
                ...prev,
                gold: data.gold || prev.gold,
                stocks: data.stocks || prev.stocks,
                congress: data.congress || prev.congress,
                insiders: data.insiders || prev.insiders,
                news: data.news || prev.news,
                ready: true,
                lastUpdate: data.timestamp || new Date().toISOString(),
            }));

            console.log("[DataProvider] ✅ 批量数据加载完成");
        } catch (err) {
            console.error("[DataProvider] ❌ 批量数据加载失败:", err);
            // 即使失败也标记 ready，避免永远 loading
            setStore(prev => ({ ...prev, ready: true }));
        }
    }, []);

    // SSE 连接
    const connectSSE = useCallback(() => {
        if (sseRef.current) {
            sseRef.current.close();
        }

        const es = new EventSource(`${API_BASE}/sse`);
        sseRef.current = es;

        es.onopen = () => {
            console.log("[SSE] 🟢 已连接");
            setStore(prev => ({ ...prev, sseConnected: true }));
        };

        es.onerror = () => {
            console.log("[SSE] 🔴 连接断开，3秒后重连...");
            setStore(prev => ({ ...prev, sseConnected: false }));
            es.close();
            sseRef.current = null;
            // 自动重连
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            reconnectTimer.current = setTimeout(connectSSE, 3000);
        };

        // 金价更新
        es.addEventListener("gold_update", (e) => {
            try {
                const { data } = JSON.parse(e.data);
                setStore(prev => ({
                    ...prev,
                    gold: { ...prev.gold, prices: data },
                    lastUpdate: new Date().toISOString(),
                }));
            } catch { }
        });

        // 指数更新
        es.addEventListener("indices_update", (e) => {
            try {
                const { data } = JSON.parse(e.data);
                setStore(prev => ({
                    ...prev,
                    stocks: { ...prev.stocks, indices: data },
                    lastUpdate: new Date().toISOString(),
                }));
            } catch { }
        });

        // 板块更新
        es.addEventListener("sectors_update", (e) => {
            try {
                const { data } = JSON.parse(e.data);
                setStore(prev => ({
                    ...prev,
                    stocks: { ...prev.stocks, sectors: data },
                    lastUpdate: new Date().toISOString(),
                }));
            } catch { }
        });

        // 热股更新
        es.addEventListener("hot_stocks_update", (e) => {
            try {
                const { data } = JSON.parse(e.data);
                setStore(prev => ({
                    ...prev,
                    stocks: { ...prev.stocks, hot: data },
                    lastUpdate: new Date().toISOString(),
                }));
            } catch { }
        });

        // 国会数据更新 → 重新拉取
        es.addEventListener("congress_update", () => {
            loadBulkData();
        });

        // 金价日线更新 → 重新拉取
        es.addEventListener("gold_daily_update", () => {
            loadBulkData();
        });
    }, [loadBulkData]);

    // 首次挂载：加载数据 + 连接 SSE
    useEffect(() => {
        loadBulkData();
        connectSSE();

        return () => {
            if (sseRef.current) sseRef.current.close();
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        };
    }, [loadBulkData, connectSSE]);

    return (
        <DataContext.Provider value={store}>
            {children}
        </DataContext.Provider>
    );
}
