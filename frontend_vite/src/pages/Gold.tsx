
import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useData } from "@/lib/data-provider";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
    Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Line, LineChart
} from "recharts";
import { RefreshCw, Calculator, ArrowRightLeft, Globe, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
type MarketTab = "domestic" | "international";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 100, damping: 15 } as any
    }
};

export default function Gold() {
    const { gold, ready, sseConnected } = useData();
    const price = gold.prices;

    const [intraday, setIntraday] = useState<any[]>([]);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<ChartTab>("intraday");
    const [marketTab, setMarketTab] = useState<MarketTab>("domestic");

    // Calculator State
    const [calcWeight, setCalcWeight] = useState<number>(10); // default 10g
    const [calcUnit, setCalcUnit] = useState<"g" | "oz">("g");

    const fetchIntraday = useCallback(async () => {
        try {
            const data = await api.gold.getIntraday();
            setIntraday(data);
        } catch (e) {
            // console.error("获取日内走势失败:", e);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const data = await api.gold.getHistory(90);
            setHistoryData(data);
        } catch (e) {
            // console.error("获取历史走势失败:", e);
        }
    }, []);

    useEffect(() => {
        fetchIntraday();
        fetchHistory();
        const timer = setInterval(fetchIntraday, 60_000);
        return () => clearInterval(timer);
    }, [fetchIntraday, fetchHistory]);

    const intlUsd = price?.international_usd;
    const domCny = price?.domestic_cny;
    const exchRate = price?.exchange_rate;
    const spread = price?.spread_pct;
    const intlCnyPerGram = (intlUsd != null && exchRate != null)
        ? ((intlUsd * exchRate) / 31.1035)
        : null;

    // Calculation Logic
    const calcResult = useMemo(() => {
        if (domCny == null || intlUsd == null) return { cny: 0, usd: 0 };
        let grams = calcWeight;
        if (calcUnit === "oz") {
            grams = calcWeight * 31.1035;
        }
        return {
            cny: grams * domCny,
            usd: (grams / 31.1035) * intlUsd
        };
    }, [calcWeight, calcUnit, domCny, intlUsd]);

    // Chart data based on market tab
    const intradayData = useMemo(() => {
        if (marketTab === "domestic") {
            return intraday.map(d => ({ ...d, value: d.price_cny }));
        } else {
            return intraday.map(d => ({ ...d, value: d.price_usd }));
        }
    }, [intraday, marketTab]);

    const historyChartData = useMemo(() => {
        if (marketTab === "domestic") {
            return historyData.map(d => ({ ...d, value: d.price_cny }));
        } else {
            return historyData.map(d => ({ ...d, value: d.price_usd }));
        }
    }, [historyData, marketTab]);

    const chartColor = marketTab === "domestic" ? "#ef4444" : "#EAB308";
    const chartUnit = marketTab === "domestic" ? "¥" : "$";
    const chartLabel = marketTab === "domestic" ? "Au9999 CNY/g" : "COMEX USD/oz";

    return (
        <div className="container py-8 px-4 md:px-6 relative z-10 max-w-7xl mx-auto">
            <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-yellow-600/10 blur-[150px] -z-10 rounded-full pointer-events-none" />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-8"
            >
                {/* Header */}
                <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
                            黄金 <span className="text-yellow-500">情报</span>
                        </h1>
                        <p className="text-muted-foreground">
                            全球与国内金价监控及 SSE 实时更新。
                        </p>
                    </div>
                    <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 bg-black/20 border-white/5">
                        <span className="relative flex h-2 w-2">
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", sseConnected ? "bg-green-500" : "bg-yellow-500")}></span>
                            <span className={cn("relative inline-flex rounded-full h-2 w-2", sseConnected ? "bg-green-500" : "bg-yellow-500")}></span>
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">{sseConnected ? "实时推送" : "连接中..."}</span>
                    </div>
                </motion.div>

                {/* Price Cards */}
                <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-3">
                    {!ready && (
                        <div className="col-span-full text-center py-4 text-muted-foreground bg-white/5 rounded-xl border border-white/5">
                            <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />加载价格数据中...
                        </div>
                    )}
                    <div className="glass-card rounded-2xl p-6 relative overflow-hidden group border-white/10 bg-gradient-to-br from-yellow-500/10 to-transparent">
                        <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Globe className="w-24 h-24 -mr-4 -mt-4 transform rotate-12 text-yellow-500" />
                        </div>
                        <h3 className="text-sm font-medium text-yellow-500 mb-2">国际金价 (USD/oz)</h3>
                        <div className="text-4xl font-bold text-white mb-1 tracking-tight">
                            ${intlUsd != null ? intlUsd.toFixed(2) : "--"}
                        </div>
                        <p className="text-xs text-muted-foreground">COMEX 实时报价</p>
                    </div>

                    <div className="glass-card rounded-2xl p-6 relative overflow-hidden group border-white/10 bg-gradient-to-br from-red-500/10 to-transparent">
                        <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Flag className="w-24 h-24 -mr-4 -mt-4 transform rotate-12 text-red-500" />
                        </div>
                        <h3 className="text-sm font-medium text-red-500 mb-2">国内金价 (CNY/g)</h3>
                        <div className="text-4xl font-bold text-white mb-1 tracking-tight">
                            ¥{domCny != null ? domCny.toFixed(2) : "--"}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">Au9999 基准价</span>
                            {spread != null && spread > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/10">
                                    价差 {spread.toFixed(2)}%
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-6 relative overflow-hidden group border-white/10 bg-black/20">
                        <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ArrowRightLeft className="w-24 h-24 -mr-4 -mt-4 transform rotate-12 text-blue-500" />
                        </div>
                        <h3 className="text-sm font-medium text-blue-400 mb-2">汇率与平价</h3>
                        <div className="text-2xl font-bold text-white mb-2 tracking-tight">
                            1 USD ≈ {exchRate != null ? exchRate.toFixed(4) : "--"} CNY
                        </div>
                        <p className="text-xs text-muted-foreground">
                            隐含国际价: <span className="text-white font-mono">¥{intlCnyPerGram?.toFixed(2) ?? "--"}</span> / g
                        </p>
                    </div>
                </motion.div>

                <div className="grid gap-6 md:grid-cols-7 h-[500px]">
                    {/* Charts */}
                    <motion.div variants={itemVariants} className="md:col-span-5 flex flex-col h-full">
                        <Card className="glass-card border-none bg-black/20 flex-1 flex flex-col h-full">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        {activeTab === "intraday" ? "日内走势 (分时)" : "历史走势 (日线)"}
                                    </CardTitle>
                                    <CardDescription>
                                        {marketTab === "domestic" ? "国内 Au9999" : "国际 COMEX"} ·
                                        {activeTab === "intraday" ? ` ${intraday.length} 个数据点` : " 90天"}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    {/* Market Toggle */}
                                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                                        <button onClick={() => setMarketTab("domestic")}
                                            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1",
                                                marketTab === "domestic" ? "bg-red-500/20 text-red-400" : "text-muted-foreground hover:text-white hover:bg-white/5")}>
                                            <Flag className="h-3 w-3" />
                                            国内
                                        </button>
                                        <button onClick={() => setMarketTab("international")}
                                            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1",
                                                marketTab === "international" ? "bg-yellow-500/20 text-yellow-500" : "text-muted-foreground hover:text-white hover:bg-white/5")}>
                                            <Globe className="h-3 w-3" />
                                            国际
                                        </button>
                                    </div>
                                    {/* Time Toggle */}
                                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                                        <button onClick={() => setActiveTab("intraday")}
                                            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                                activeTab === "intraday" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white hover:bg-white/5")}>
                                            日内
                                        </button>
                                        <button onClick={() => setActiveTab("history")}
                                            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                                activeTab === "history" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white hover:bg-white/5")}>
                                            历史
                                        </button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 p-2 min-h-0">
                                {activeTab === "intraday" ? (
                                    intradayData.length > 0 && intradayData.some(d => d.value != null) ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={intradayData}>
                                                <defs>
                                                    <linearGradient id="goldGradientLine" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="time" tickFormatter={safeTime} minTickGap={40}
                                                    tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} />
                                                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} width={50}
                                                    tickFormatter={(v) => marketTab === "domestic" ? v.toFixed(0) : v.toFixed(0)} />
                                                <Tooltip contentStyle={{ backgroundColor: "rgba(9,9,11,0.9)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}
                                                    itemStyle={{ color: chartColor }}
                                                    formatter={(value: any) => [`${chartUnit}${value?.toFixed(2) ?? "--"}`, chartLabel] as [string, string]}
                                                    labelFormatter={(label: any) => safeTime(label)} />
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                <Line type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2}
                                                    dot={false} activeDot={{ r: 6, fill: chartColor, strokeWidth: 0 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                                            <RefreshCw className="h-5 w-5 animate-spin" />
                                            <span>等待{marketTab === "domestic" ? "国内" : "国际"}日内数据...</span>
                                        </div>
                                    )
                                ) : (
                                    historyChartData.length > 0 && historyChartData.some(d => d.value != null) ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={historyChartData}>
                                                <defs>
                                                    <linearGradient id="goldGradientArea" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="date" tickFormatter={safeDate} minTickGap={30}
                                                    tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} />
                                                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} width={50}
                                                    tickFormatter={(v) => marketTab === "domestic" ? v.toFixed(0) : v.toFixed(0)} />
                                                <Tooltip contentStyle={{ backgroundColor: "rgba(9,9,11,0.9)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                                                    itemStyle={{ color: chartColor }}
                                                    formatter={(value: any) => [`${chartUnit}${value?.toFixed(2) ?? "--"}`, chartLabel] as [string, string]}
                                                    labelFormatter={(label: any) => safeDateFull(label)} />
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2}
                                                    fillOpacity={1} fill="url(#goldGradientArea)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-muted-foreground">
                                            暂无{marketTab === "domestic" ? "国内" : "国际"}历史数据
                                        </div>
                                    )
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Calculator */}
                    <motion.div variants={itemVariants} className="md:col-span-2 flex flex-col h-full">
                        <Card className="glass-card border-none bg-black/20 flex-1 border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calculator className="h-5 w-5 text-green-400" /> 价值计算器
                                </CardTitle>
                                <CardDescription>基于当前价格快速换算</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">重量 ({calcUnit})</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={calcWeight}
                                            onChange={(e) => setCalcWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                                            className="bg-white/5 border-white/10 focus:border-yellow-500/50 text-lg font-mono"
                                        />
                                        <div className="flex bg-white/5 rounded-md border border-white/10 overflow-hidden shrink-0">
                                            <button
                                                className={cn("px-3 py-1 text-xs font-medium transition-colors", calcUnit === "g" ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5")}
                                                onClick={() => setCalcUnit("g")}
                                            >g</button>
                                            <div className="w-px bg-white/10 my-1" />
                                            <button
                                                className={cn("px-3 py-1 text-xs font-medium transition-colors", calcUnit === "oz" ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5")}
                                                onClick={() => setCalcUnit("oz")}
                                            >oz</button>
                                        </div>
                                    </div>
                                    <Slider
                                        value={[calcWeight]}
                                        min={0}
                                        max={100}
                                        step={1}
                                        onValueChange={(v: number[]) => setCalcWeight(v[0])}
                                        className="py-4"
                                    />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">人民币价值</span>
                                        <span className="text-xl font-bold text-red-400 font-mono">¥{calcResult.cny.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">美元价值</span>
                                        <span className="text-xl font-bold text-yellow-500 font-mono">${calcResult.usd.toFixed(2)}</span>
                                    </div>
                                </div>

                                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                                    onClick={() => setCalcWeight(0)}>
                                    重置
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
