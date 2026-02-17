"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useData } from "@/lib/data-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Ticker } from "@/components/business/ticker";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
    Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Line, LineChart,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function safeDate(str: any): string {
    if (!str) return "--";
    try {
        const d = new Date(String(str));
        if (isNaN(d.getTime())) return String(str);
        const m = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");
        return `${m}-${day}`;
    } catch { return String(str); }
}

function safeDateFull(str: any): string {
    if (!str) return "--";
    try {
        const d = new Date(String(str));
        if (isNaN(d.getTime())) return String(str);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    } catch { return String(str); }
}

function safeTime(str: any): string {
    if (!str) return "--";
    try {
        const d = new Date(String(str));
        if (isNaN(d.getTime())) return String(str);
        return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    } catch { return String(str); }
}

type ChartTab = "intraday" | "history";

export default function GoldPage() {
    // 金价和历史从全局 Context 获取（SSE 实时推送）
    const { gold, ready } = useData();
    const price = gold.prices;
    const history = gold.history;

    // 日内走势仍然独立获取（需要高频数据点）
    const [intraday, setIntraday] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<ChartTab>("intraday");

    const fetchIntraday = useCallback(async () => {
        try {
            const data = await api.gold.getIntraday();
            setIntraday(data);
        } catch (e) { console.error("获取日内走势失败:", e); }
    }, []);

    useEffect(() => {
        fetchIntraday();
        const timer = setInterval(fetchIntraday, 60_000);
        return () => clearInterval(timer);
    }, [fetchIntraday]);

    const intlUsd = price?.international_usd;
    const domCny = price?.domestic_cny;
    const exchRate = price?.exchange_rate;
    const spread = price?.spread_pct;
    const intlCnyPerGram = (intlUsd != null && exchRate != null)
        ? ((intlUsd * exchRate) / 31.1035).toFixed(2)
        : "--";

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <Ticker />
            <main className="flex-1 container py-8 px-4 md:px-6">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">黄金市场情报</h1>
                        <p className="text-muted-foreground mt-1">
                            实时监控国际金价、国内金价及内外盘价差 · SSE 实时推送
                        </p>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        SSE 实时推送中
                    </div>
                </div>

                {/* 金价卡片 */}
                <div className="grid gap-6 md:grid-cols-3 mb-8">
                    {!ready && (
                        <div className="col-span-full text-center py-4 text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />加载金价数据...
                        </div>
                    )}
                    <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-yellow-600 dark:text-yellow-400">国际金价 (美元/盎司)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-foreground">
                                ${intlUsd != null ? intlUsd.toFixed(2) : "--"}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">COMEX 实时报价</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-500/10 to-pink-500/5 border-red-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">国内金价 (人民币/克)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-foreground">
                                ¥{domCny != null ? domCny.toFixed(2) : "--"}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">Au9999 基准价</span>
                                {spread != null && spread > 0 && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-medium">
                                        溢价 {spread.toFixed(2)}%
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">汇率 &amp; 换算</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                1 USD = {exchRate != null ? exchRate.toFixed(4) : "--"} CNY
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                国际金价折算: ¥{intlCnyPerGram} / 克
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* 图表区 */}
                <Card className="min-h-[500px]">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>
                                    {activeTab === "intraday" ? "📈 今日分钟走势" : "📊 历史日线走势 (90天)"}
                                </CardTitle>
                                <CardDescription>
                                    {activeTab === "intraday"
                                        ? `Au9999 · 共 ${intraday.length} 个数据点`
                                        : "Au9999 · 人民币/克"}
                                </CardDescription>
                            </div>
                            <div className="flex gap-1 bg-muted rounded-lg p-1">
                                <button onClick={() => setActiveTab("intraday")}
                                    className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                        activeTab === "intraday" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                                    日内走势
                                </button>
                                <button onClick={() => setActiveTab("history")}
                                    className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                        activeTab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                                    历史走势
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        {activeTab === "intraday" ? (
                            intraday.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={intraday}>
                                        <XAxis dataKey="time" tickFormatter={safeTime} minTickGap={40}
                                            tick={{ fontSize: 11, fill: "#888888" }} />
                                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: "#888888" }} />
                                        <Tooltip contentStyle={{ backgroundColor: "#0d1117", borderColor: "rgba(255,255,255,0.1)" }}
                                            formatter={(value: any) => [`¥${value}`, "Au9999"] as [string, string]}
                                            labelFormatter={(label: any) => safeTime(label)} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                                        <Line type="monotone" dataKey="price_cny" stroke="#EAB308" strokeWidth={2}
                                            dot={false} activeDot={{ r: 4, fill: "#EAB308" }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                                    <RefreshCw className="h-5 w-5 animate-spin" />
                                    <span>等待日内数据积累中...</span>
                                    <span className="text-xs">后台每分钟采集一次金价快照</span>
                                </div>
                            )
                        ) : (
                            history.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={history}>
                                        <defs>
                                            <linearGradient id="goldGradientPage" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" tickFormatter={safeDate} minTickGap={30}
                                            tick={{ fontSize: 12, fill: "#888888" }} />
                                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: "#888888" }} />
                                        <Tooltip contentStyle={{ backgroundColor: "#0d1117", borderColor: "rgba(255,255,255,0.1)" }}
                                            formatter={(value: any) => [`¥${value}`, "价格"] as [string, string]}
                                            labelFormatter={(label: any) => safeDateFull(label)} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                                        <Area type="monotone" dataKey="price_cny" stroke="#EAB308" strokeWidth={2}
                                            fillOpacity={1} fill="url(#goldGradientPage)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground">
                                    暂无历史数据
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
