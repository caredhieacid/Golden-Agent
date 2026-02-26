
import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useData } from "@/lib/data-provider";
import type { Trade } from "@/types";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Gavel, TrendingUp, Newspaper, BarChart3, Users, ArrowUpRight, ArrowDownRight, Share2, Star } from "lucide-react";
import { cn, formatChamber, formatParty, formatPoliticianDisplayName } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

type TradingViewGlobal = {
    widget: new (options: Record<string, unknown>) => unknown;
};

declare global {
    interface Window {
        TradingView?: TradingViewGlobal;
    }
}

let tradingViewScriptPromise: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
    if (window.TradingView) return Promise.resolve();
    if (!tradingViewScriptPromise) {
        tradingViewScriptPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>('script[data-tv-script="true"]');
            if (existing) {
                existing.addEventListener("load", () => resolve(), { once: true });
                existing.addEventListener("error", () => reject(new Error("Failed to load TradingView script")), { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = "https://s3.tradingview.com/tv.js";
            script.async = true;
            script.dataset.tvScript = "true";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load TradingView script"));
            document.head.appendChild(script);
        });
    }
    return tradingViewScriptPromise;
}

function safeDate(d: string | null | undefined): string {
    if (!d) return "--";
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return "--";
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    } catch {
        return "--";
    }
}

function formatMoney(val: number | null | undefined): string {
    if (!val) return "--";
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
}

/* TradingView Chart */
function TradingViewChart({ ticker }: { ticker: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !ticker) return;

        let cancelled = false;
        const chartId = `tv-chart-${ticker.replace(/[^a-zA-Z0-9_]/g, "_")}-${Date.now()}`;
        container.innerHTML = `<div id="${chartId}" class="h-full w-full"></div>`;

        loadTradingViewScript()
            .then(() => {
                if (cancelled || !window.TradingView) return;
                new window.TradingView.widget({
                    autosize: true,
                    symbol: ticker,
                    interval: "D",
                    timezone: "Etc/UTC",
                    theme: "dark",
                    style: "1",
                    locale: "zh_CN",
                    backgroundColor: "rgba(0,0,0,0)",
                    gridColor: "rgba(255,255,255,0.04)",
                    hide_top_toolbar: false,
                    hide_legend: false,
                    allow_symbol_change: true,
                    save_image: false,
                    calendar: false,
                    container_id: chartId,
                });
            })
            .catch(() => {
                // keep page usable if third-party script fails
            });

        return () => {
            cancelled = true;
            container.innerHTML = "";
        };
    }, [ticker]);

    return (
        <div className="tradingview-widget-container h-full" ref={containerRef}>
            <div className="tradingview-widget-container__widget h-full"></div>
        </div>
    );
}

/* ─── Tab 类型 ─── */
type TabKey = "overview" | "congress" | "insiders" | "news";

const tabs: { key: TabKey; label: string; icon: ReactNode }[] = [
    { key: "overview", label: "概览", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "congress", label: "国会交易", icon: <Gavel className="h-4 w-4" /> },
    { key: "insiders", label: "内幕交易", icon: <TrendingUp className="h-4 w-4" /> },
    { key: "news", label: "相关新闻", icon: <Newspaper className="h-4 w-4" /> },
];

/* ─── 动画变量 ─── */
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
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

/* ─── 主页面 ─── */
export default function StockDetailPage() {
    const { ticker: tickerParam } = useParams();
    const ticker = (tickerParam as string || "").toUpperCase();
    const { congress, insiders, news } = useData();
    const [activeTab, setActiveTab] = useState<TabKey>("overview");
    const [isFavorite, setIsFavorite] = useState(false);

    // 从全局数据中按 ticker 筛选
    const congressTrades = useMemo(() =>
        (congress.trades as Trade[]).filter(t => t.ticker?.toUpperCase() === ticker),
        [congress.trades, ticker]
    );

    const insiderTrades = useMemo(() =>
        insiders.trades.filter((t: any) => t.ticker?.toUpperCase() === ticker),
        [insiders.trades, ticker]
    );

    const relatedNews = useMemo(() =>
        news.filter((n: any) => {
            const title = (n.title || "").toUpperCase();
            const content = (n.content || n.summary || "").toUpperCase();
            return title.includes(ticker) || content.includes(ticker);
        }),
        [news, ticker]
    );

    const companyName = insiderTrades[0]?.company_name || congressTrades[0]?.company_name || ticker;

    // 统计概要
    const purchaseCount = congressTrades.filter(t => t.transaction_type?.toLowerCase().includes("purchase")).length;
    const saleCount = congressTrades.length - purchaseCount;
    const insiderBuys = insiderTrades.filter((t: any) => t.transaction_type === "purchase").length;
    const insiderSells = insiderTrades.length - insiderBuys;

    return (
        <div className="container py-8 px-4 md:px-6 relative z-10 max-w-7xl mx-auto">
            {/* 装饰背景 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[500px] bg-indigo-600/10 blur-[120px] -z-10 rounded-full pointer-events-none" />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-8"
            >
                {/* 股票头部 */}
                <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-sm">
                                <span className="text-2xl font-bold text-white tracking-tighter">{ticker}</span>
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">{companyName}</h1>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <Badge variant="outline" className="border-white/10 bg-white/5 text-xs font-normal">美股</Badge>
                                    <span>•</span>
                                    <span>科技</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "rounded-full border-white/10 bg-white/5 hover:bg-white/10 transition-all",
                                isFavorite ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" : "text-muted-foreground"
                            )}
                            onClick={() => setIsFavorite(!isFavorite)}
                        >
                            <Star className={cn("h-4 w-4 mr-2", isFavorite && "fill-yellow-400")} />
                            {isFavorite ? "已关注" : "关注"}
                        </Button>
                        <Button variant="outline" size="icon" className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground">
                            <Share2 className="h-4 w-4" />
                        </Button>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
                    {[
                        {
                            title: "国会交易",
                            icon: Gavel,
                            count: congressTrades.length,
                            color: "text-blue-400",
                            bg: "bg-blue-500/10",
                            border: "border-blue-500/20",
                            type: "trade",
                            buy: purchaseCount,
                            sell: saleCount
                        },
                        {
                            title: "内幕交易",
                            icon: TrendingUp,
                            count: insiderTrades.length,
                            color: "text-emerald-400",
                            bg: "bg-emerald-500/10",
                            border: "border-emerald-500/20",
                            type: "trade",
                            buy: insiderBuys,
                            sell: insiderSells
                        },
                        {
                            title: "相关新闻",
                            icon: Newspaper,
                            count: relatedNews.length,
                            color: "text-orange-400",
                            bg: "bg-orange-500/10",
                            border: "border-orange-500/20",
                            type: "text",
                            text: "近 30 天报道"
                        },
                        {
                            title: "关注议员",
                            icon: Users,
                            count: new Set(congressTrades.map(t => t.politician_name)).size,
                            color: "text-purple-400",
                            bg: "bg-purple-500/10",
                            border: "border-purple-500/20",
                            type: "text",
                            text: "位议员曾交易"
                        }
                    ].map((stat, i) => (
                        <div key={i} className={cn("glass-card rounded-2xl p-5 border relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300", stat.border)}>
                            <div className={cn("absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity", stat.color)}>
                                <stat.icon className="w-20 h-20 transform rotate-12" />
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={cn("p-2 rounded-lg", stat.bg)}>
                                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                            </div>
                            <div className="relative z-10">
                                <div className="text-3xl font-bold text-white mb-1">{stat.count}</div>
                                <div className="text-xs text-muted-foreground/80 font-medium">
                                    {stat.type === "trade" ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-400 flex items-center"><ArrowUpRight className="h-3 w-3 mr-0.5" />{stat.buy} 买</span>
                                            <span className="text-muted-foreground/50">/</span>
                                            <span className="text-red-400 flex items-center"><ArrowDownRight className="h-3 w-3 mr-0.5" />{stat.sell} 卖</span>
                                        </div>
                                    ) : (
                                        stat.text
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* TradingView 图表 */}
                <motion.div variants={itemVariants} className="rounded-3xl border border-white/10 bg-[#09090b]/40 backdrop-blur-sm overflow-hidden shadow-2xl h-[500px]">
                    {/* Add a subtle overlay so scroll doesn't get hijacked immediately if desired, but TV usually handles it well */}
                    <TradingViewChart ticker={ticker} />
                </motion.div>

                {/* Tab 导航 */}
                <motion.div variants={itemVariants} className="flex flex-col gap-6">
                    <div className="flex justify-center sticky top-20 z-30">
                        <div className="inline-flex items-center p-1.5 rounded-full bg-[#09090b]/80 backdrop-blur-xl border border-white/10 shadow-xl">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={cn(
                                        "relative flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-full transition-all duration-300",
                                        activeTab === tab.key ? "text-white" : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    {activeTab === tab.key && (
                                        <motion.div
                                            layoutId="activeTabStock"
                                            className="absolute inset-0 bg-white/10 rounded-full border border-white/5"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                        {tab.icon}
                                        {tab.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab 内容 */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === "overview" && (
                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* Copying reduced Logic from previous impl but styled better */}
                                    <Card className="glass-card border-none bg-black/20">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Gavel className="h-5 w-5 text-blue-500" /> 近期国会交易
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {congressTrades.length === 0 ? (
                                                <div className="py-12 text-center text-muted-foreground">暂无记录</div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {congressTrades.slice(0, 5).map((t, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-sm text-gray-200">{formatPoliticianDisplayName(t.politician_name)}</span>
                                                                <span className="text-xs text-muted-foreground">{safeDate(t.disclosure_date)}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <Badge variant="outline" className={cn("mb-1 border-0 h-5", t.transaction_type?.includes("purchase") ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                                                                    {t.transaction_type?.includes("purchase") ? "买入" : "卖出"}
                                                                </Badge>
                                                                <div className="text-xs font-mono">{formatMoney(t.amount_min)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card className="glass-card border-none bg-black/20">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <TrendingUp className="h-5 w-5 text-emerald-500" /> 近期内幕交易
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {insiderTrades.length === 0 ? (
                                                <div className="py-12 text-center text-muted-foreground">暂无记录</div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {insiderTrades.slice(0, 5).map((t: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-sm text-gray-200">{t.insider_name}</span>
                                                                <span className="text-xs text-muted-foreground truncate max-w-[120px]">{t.insider_title}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <Badge variant="outline" className={cn("mb-1 border-0 h-5", t.transaction_type === "purchase" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                                                                    {t.transaction_type === "purchase" ? "买入" : "卖出"}
                                                                </Badge>
                                                                <div className="text-xs font-mono">{formatMoney(t.total_value)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Detailed Tables for Congress/Insiders/News would be here (Simplified for brevity as per existing logic) */}
                            {activeTab === "congress" && (
                                <Card className="glass-card border-none bg-black/20">
                                    <CardContent className="pt-6">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-white/10 hover:bg-transparent">
                                                    <TableHead>披露日期</TableHead>
                                                    <TableHead>议员</TableHead>
                                                    <TableHead>类型</TableHead>
                                                    <TableHead className="text-right">金额</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {congressTrades.map((t, i) => (
                                                    <TableRow key={i} className="border-white/5 hover:bg-white/5">
                                                        <TableCell className="font-mono text-xs text-muted-foreground">{safeDate(t.disclosure_date)}</TableCell>
                                                        <TableCell>
                                                            <div className="font-medium text-sm">{formatPoliticianDisplayName(t.politician_name)}</div>
                                                            <div className="text-xs text-muted-foreground">{formatParty(t.politician_party)} • {formatChamber(t.chamber)}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={cn("text-xs font-bold", t.transaction_type?.includes("purchase") ? "text-green-400" : "text-red-400")}>
                                                                {t.transaction_type?.includes("purchase") ? "买入" : "卖出"}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs">
                                                            {formatMoney(t.amount_min)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}

                            {activeTab === "news" && (
                                <div className="grid gap-4">
                                    {relatedNews.map((n: any, i: number) => (
                                        <div key={i} className="glass-card p-5 rounded-xl border-white/5 hover:bg-white/5 transition-all">
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-100 hover:text-primary transition-colors cursor-pointer">{n.title}</h3>
                                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{n.summary || n.content}</p>
                                                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground/60">
                                                        <span className="bg-white/10 px-2 py-0.5 rounded text-gray-300">{n.source}</span>
                                                        <span>{safeDate(n.published_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </div>
    );
}
