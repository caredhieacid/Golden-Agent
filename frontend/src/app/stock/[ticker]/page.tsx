"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useData } from "@/lib/data-provider";
import { Trade } from "@/types";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Ticker } from "@/components/business/ticker";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Gavel, TrendingUp, Newspaper, BarChart3, Users, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";

/* ─── 工具函数 ─── */
function safeDate(d: string | null | undefined): string {
    if (!d) return "--";
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return "--";
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    } catch { return "--"; }
}

function formatMoney(val: number | null | undefined): string {
    if (!val) return "--";
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
}

function timeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        const diff = Date.now() - d.getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return "今天";
        if (days === 1) return "昨天";
        if (days < 30) return `${days}天前`;
        if (days < 365) return `${Math.floor(days / 30)}个月前`;
        return `${Math.floor(days / 365)}年前`;
    } catch { return ""; }
}

/* ─── TradingView 图表 ─── */
function TradingViewChart({ ticker }: { ticker: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        // 清空旧内容
        containerRef.current.innerHTML = "";

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = JSON.stringify({
            autosize: true,
            symbol: ticker,
            interval: "D",
            timezone: "Etc/UTC",
            theme: "dark", // We can make this dynamic based on system theme eventually
            style: "1",
            locale: "zh_CN",
            backgroundColor: "rgba(0, 0, 0, 0)", // Transparent background
            gridColor: "rgba(255, 255, 255, 0.04)",
            hide_top_toolbar: false,
            hide_legend: false,
            allow_symbol_change: true,
            save_image: false,
            calendar: false,
            support_host: "https://www.tradingview.com",
        });
        containerRef.current.appendChild(script);
    }, [ticker]);

    return (
        <div className="tradingview-widget-container h-full" ref={containerRef}>
            <div className="tradingview-widget-container__widget h-full"></div>
        </div>
    );
}

/* ─── Tab 类型 ─── */
type TabKey = "overview" | "congress" | "insiders" | "news";

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
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
    const params = useParams();
    const ticker = (params.ticker as string || "").toUpperCase();
    const { congress, insiders, news, ready } = useData();
    const [activeTab, setActiveTab] = useState<TabKey>("overview");

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
        <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30">
            <Header />
            <Ticker />
            <main className="flex-1 container py-8 px-4 md:px-6 relative z-10">
                {/* 装饰背景 */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/5 blur-[100px] -z-10 rounded-full pointer-events-none translate-y-[-50%] transform-gpu" />

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* 股票头部 */}
                    <motion.div variants={itemVariants} className="mb-8">
                        <div className="flex items-center gap-4 mb-2">
                            <Badge className="text-xl font-mono px-4 py-1.5 bg-background shadow-sm border border-border/50 text-foreground ring-1 ring-black/5 dark:ring-white/10">{ticker}</Badge>
                            <h1 className="text-4xl font-bold tracking-tight text-gradient-primary">{companyName}</h1>
                        </div>
                        <p className="text-muted-foreground max-w-2xl text-lg">
                            全方位聚合 {ticker} 的国会山交易、内幕交易与舆情动态。
                        </p>
                    </motion.div>

                    {/* 统计卡片 */}
                    <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-4 mb-8">
                        <Card className="glass glass-hover border-l-4 border-l-blue-500 overflow-hidden relative group">
                            <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Gavel className="w-16 h-16" />
                            </div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">国会交易</CardTitle>
                                <Gavel className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{congressTrades.length}</div>
                                <div className="flex items-center gap-3 text-xs mt-2 font-medium">
                                    <span className="text-green-500 flex items-center bg-green-500/10 px-1.5 py-0.5 rounded"><ArrowUpRight className="h-3 w-3 mr-1" />{purchaseCount}</span>
                                    <span className="text-red-500 flex items-center bg-red-500/10 px-1.5 py-0.5 rounded"><ArrowDownRight className="h-3 w-3 mr-1" />{saleCount}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass glass-hover border-l-4 border-l-emerald-500 overflow-hidden relative group">
                            <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUp className="w-16 h-16" />
                            </div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">内幕交易</CardTitle>
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{insiderTrades.length}</div>
                                <div className="flex items-center gap-3 text-xs mt-2 font-medium">
                                    <span className="text-green-500 flex items-center bg-green-500/10 px-1.5 py-0.5 rounded"><ArrowUpRight className="h-3 w-3 mr-1" />{insiderBuys}</span>
                                    <span className="text-red-500 flex items-center bg-red-500/10 px-1.5 py-0.5 rounded"><ArrowDownRight className="h-3 w-3 mr-1" />{insiderSells}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass glass-hover border-l-4 border-l-orange-500 overflow-hidden relative group">
                            <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Newspaper className="w-16 h-16" />
                            </div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">相关新闻</CardTitle>
                                <Newspaper className="h-4 w-4 text-orange-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{relatedNews.length}</div>
                                <p className="text-xs text-muted-foreground mt-2">过去 30 天相关报道</p>
                            </CardContent>
                        </Card>

                        <Card className="glass glass-hover border-l-4 border-l-purple-500 overflow-hidden relative group">
                            <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Users className="w-16 h-16" />
                            </div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">议员关注</CardTitle>
                                <Users className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {new Set(congressTrades.map(t => t.politician_name)).size}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">位议员进行过交易</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* TradingView 图表 */}
                    <motion.div variants={itemVariants} className="mb-8 p-[1px] rounded-xl bg-gradient-to-b from-white/10 to-transparent shadow-2xl">
                        <div className="rounded-xl overflow-hidden glass h-[500px]">
                            <TradingViewChart ticker={ticker} />
                        </div>
                    </motion.div>

                    {/* Tab 导航 */}
                    <motion.div variants={itemVariants} className="mb-6 sticky top-20 z-30 flex justify-center">
                        <div className="flex gap-1 bg-secondary/80 backdrop-blur-md rounded-full p-1.5 shadow-lg border border-border/50">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={cn(
                                        "relative flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                                        activeTab === tab.key
                                            ? "text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {activeTab === tab.key && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-foreground rounded-full shadow-md"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            style={{ zIndex: -1 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                        {tab.icon}
                                        {tab.label}
                                        {(tab.key === "congress" && congressTrades.length > 0) && <span className="text-[10px] opacity-80 bg-white/20 px-1.5 rounded-full">{congressTrades.length}</span>}
                                        {(tab.key === "insiders" && insiderTrades.length > 0) && <span className="text-[10px] opacity-80 bg-white/20 px-1.5 rounded-full">{insiderTrades.length}</span>}
                                        {(tab.key === "news" && relatedNews.length > 0) && <span className="text-[10px] opacity-80 bg-white/20 px-1.5 rounded-full">{relatedNews.length}</span>}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Tab 内容 - Apply AnimatePresence if switching needs animation, or just motion.div entrance */}
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === "overview" && (
                            <div className="grid gap-6 md:grid-cols-2">
                                {/* 最近国会交易 */}
                                <Card className="glass">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Gavel className="h-4 w-4 text-blue-500" />最近国会交易
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {congressTrades.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-50">
                                                <Gavel className="h-10 w-10 mb-2 stroke-1" />
                                                <p>暂无记录</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {congressTrades.slice(0, 5).map((t, i) => (
                                                    <div key={t.id ?? i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors border border-transparent hover:border-border/50">
                                                        <div>
                                                            <Link href={`/congress/politician/${encodeURIComponent(t.politician_name || "")}`}
                                                                className="text-sm font-bold hover:text-primary transition-colors">
                                                                {t.politician_name}
                                                            </Link>
                                                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[10px] h-4 px-1 rounded-sm border-border/40 font-normal">
                                                                    {t.politician_party}-{t.politician_state}
                                                                </Badge>
                                                                <span>{safeDate(t.disclosure_date)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={cn("text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-1",
                                                                t.transaction_type?.includes("purchase") ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                                                {t.transaction_type?.includes("purchase") ? "买入" : "卖出"}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground font-mono">{formatMoney(t.amount_min)}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {congressTrades.length > 5 && (
                                                    <button onClick={() => setActiveTab("congress")} className="w-full text-center text-xs text-muted-foreground hover:text-primary py-2 transition-colors">
                                                        查看全部 {congressTrades.length} 条 →
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* 最近内幕交易 */}
                                <Card className="glass">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-emerald-500" />最近内幕交易
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {insiderTrades.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-50">
                                                <TrendingUp className="h-10 w-10 mb-2 stroke-1" />
                                                <p>暂无记录</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {insiderTrades.slice(0, 5).map((t: any, i: number) => (
                                                    <div key={t.id ?? i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors border border-transparent hover:border-border/50">
                                                        <div>
                                                            <div className="text-sm font-bold">{t.insider_name}</div>
                                                            <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                                                                {t.insider_title}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={cn("text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-1",
                                                                t.transaction_type === "purchase" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                                                {t.transaction_type === "purchase" ? "买入" : "卖出"}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground font-mono">{formatMoney(t.total_value)}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {insiderTrades.length > 5 && (
                                                    <button onClick={() => setActiveTab("insiders")} className="w-full text-center text-xs text-muted-foreground hover:text-primary py-2 transition-colors">
                                                        查看全部 {insiderTrades.length} 条 →
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {activeTab === "congress" && (
                            <Card className="glass">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">国会交易记录</CardTitle>
                                    <CardDescription>共 {congressTrades.length} 条记录</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent border-dashed">
                                                <TableHead>披露日期</TableHead>
                                                <TableHead>议员</TableHead>
                                                <TableHead>操作</TableHead>
                                                <TableHead className="text-right">金额范围</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {congressTrades.map((t, i) => (
                                                <TableRow key={t.id ?? i} className="hover:bg-muted/40 border-border/40">
                                                    <TableCell className="font-mono text-xs text-muted-foreground">{safeDate(t.disclosure_date)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{t.politician_name}</span>
                                                            <span className="text-[10px] text-muted-foreground">{t.politician_party}-{t.politician_state}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                                                            t.transaction_type?.includes("purchase") ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                                            {t.transaction_type?.includes("purchase") ? "买入" : "卖出"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs">
                                                        {formatMoney(t.amount_min)} - {formatMoney(t.amount_max)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === "insiders" && (
                            <Card className="glass">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">内幕交易记录</CardTitle>
                                    <CardDescription>共 {insiderTrades.length} 条记录</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent border-dashed">
                                                <TableHead>日期</TableHead>
                                                <TableHead>内部人</TableHead>
                                                <TableHead>操作</TableHead>
                                                <TableHead className="text-right">数量</TableHead>
                                                <TableHead className="text-right">价值</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {insiderTrades.map((t: any, i: number) => (
                                                <TableRow key={t.id ?? i} className="hover:bg-muted/40 border-border/40">
                                                    <TableCell className="font-mono text-xs text-muted-foreground">{safeDate(t.filing_date)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{t.insider_name}</span>
                                                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{t.insider_title}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                                                            t.transaction_type === "purchase" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                                            {t.transaction_type === "purchase" ? "买入" : "卖出"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs">{t.shares?.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs font-bold text-foreground/80">
                                                        {formatMoney(t.total_value)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === "news" && (
                            <Card className="glass">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">相关新闻</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {relatedNews.map((n: any, i: number) => (
                                            <motion.div
                                                key={n.id ?? i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-border/30 bg-secondary/10 hover:bg-secondary/30 transition-all hover:scale-[1.01]"
                                            >
                                                <div className="flex-1">
                                                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-base font-semibold hover:text-primary transition-colors line-clamp-2 leading-snug">
                                                        {n.title}
                                                    </a>
                                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                                                        {n.summary || n.content}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground/70 font-medium">
                                                        <span className="bg-secondary px-2 py-0.5 rounded text-foreground">{n.source}</span>
                                                        <span>{safeDate(n.published_at || n.created_at)}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </motion.div>
                </motion.div>
            </main>
            <Footer />
        </div>
    );
}
