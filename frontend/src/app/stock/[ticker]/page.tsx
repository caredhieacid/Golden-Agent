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
            theme: "dark",
            style: "1",
            locale: "zh_CN",
            backgroundColor: "rgba(13, 17, 23, 1)",
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
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <Ticker />
            <main className="flex-1 container py-8 px-4 md:px-6">
                {/* 股票头部 */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Badge className="text-lg font-mono px-3 py-1 bg-primary/10 text-primary border-primary/30">{ticker}</Badge>
                        <h1 className="text-3xl font-bold tracking-tight">{companyName}</h1>
                    </div>
                    <p className="text-muted-foreground">
                        一站式聚合 {ticker} 的国会交易、内幕交易和相关新闻 · 数据通过 SSE 实时推送
                    </p>
                </div>

                {/* 统计卡片 */}
                <div className="grid gap-4 md:grid-cols-4 mb-6">
                    <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/0 border-blue-500/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground">国会交易</CardTitle>
                            <Gavel className="h-4 w-4 text-blue-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{congressTrades.length}</div>
                            <div className="flex items-center gap-2 text-[10px] mt-1">
                                <span className="text-green-500 flex items-center"><ArrowUpRight className="h-3 w-3" />{purchaseCount} 买</span>
                                <span className="text-red-500 flex items-center"><ArrowDownRight className="h-3 w-3" />{saleCount} 卖</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/0 border-emerald-500/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground">内幕交易</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{insiderTrades.length}</div>
                            <div className="flex items-center gap-2 text-[10px] mt-1">
                                <span className="text-green-500 flex items-center"><ArrowUpRight className="h-3 w-3" />{insiderBuys} 买</span>
                                <span className="text-red-500 flex items-center"><ArrowDownRight className="h-3 w-3" />{insiderSells} 卖</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/0 border-orange-500/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground">相关新闻</CardTitle>
                            <Newspaper className="h-4 w-4 text-orange-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{relatedNews.length}</div>
                            <p className="text-[10px] text-muted-foreground mt-1">涉及 {ticker} 的新闻</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/0 border-purple-500/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground">议员关注度</CardTitle>
                            <Users className="h-4 w-4 text-purple-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {new Set(congressTrades.map(t => t.politician_name)).size}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">位议员涉及此股</p>
                        </CardContent>
                    </Card>
                </div>

                {/* TradingView 图表 */}
                <Card className="mb-6 overflow-hidden">
                    <CardContent className="p-0 h-[480px]">
                        <TradingViewChart ticker={ticker} />
                    </CardContent>
                </Card>

                {/* Tab 导航 */}
                <div className="flex gap-1 bg-muted/30 rounded-lg p-1 mb-6 w-fit">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all",
                                activeTab === tab.key
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.key === "congress" && congressTrades.length > 0 && (
                                <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{congressTrades.length}</Badge>
                            )}
                            {tab.key === "insiders" && insiderTrades.length > 0 && (
                                <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{insiderTrades.length}</Badge>
                            )}
                            {tab.key === "news" && relatedNews.length > 0 && (
                                <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{relatedNews.length}</Badge>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab 内容 */}
                {activeTab === "overview" && (
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* 最近国会交易 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Gavel className="h-4 w-4 text-blue-400" />最近国会交易
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {congressTrades.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4 text-sm">暂无国会交易记录</p>
                                ) : (
                                    <div className="space-y-3">
                                        {congressTrades.slice(0, 5).map((t, i) => (
                                            <div key={t.id ?? i} className="flex items-center justify-between p-3 rounded-lg border border-border/20 hover:bg-muted/10 transition-colors">
                                                <div>
                                                    <Link href={`/congress/politician/${encodeURIComponent(t.politician_name || "")}`}
                                                        className="text-sm font-medium hover:text-primary transition-colors">
                                                        {t.politician_name}
                                                    </Link>
                                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                                        {t.politician_party}-{t.politician_state} · {safeDate(t.disclosure_date)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant={t.transaction_type?.includes("purchase") ? "default" : "destructive"} className="text-[10px]">
                                                        {t.transaction_type?.includes("purchase") ? "买入" : "卖出"}
                                                    </Badge>
                                                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{formatMoney(t.amount_min)}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {congressTrades.length > 5 && (
                                            <button onClick={() => setActiveTab("congress")} className="w-full text-center text-xs text-primary hover:underline py-2">
                                                查看全部 {congressTrades.length} 条 →
                                            </button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 最近内幕交易 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-400" />最近内幕交易
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {insiderTrades.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4 text-sm">暂无内幕交易记录</p>
                                ) : (
                                    <div className="space-y-3">
                                        {insiderTrades.slice(0, 5).map((t: any, i: number) => (
                                            <div key={t.id ?? i} className="flex items-center justify-between p-3 rounded-lg border border-border/20 hover:bg-muted/10 transition-colors">
                                                <div>
                                                    <div className="text-sm font-medium">{t.insider_name}</div>
                                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                                        {t.insider_title} · {safeDate(t.filing_date)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant={t.transaction_type === "purchase" ? "default" : "destructive"} className="text-[10px]">
                                                        {t.transaction_type === "purchase" ? "买入" : "卖出"}
                                                    </Badge>
                                                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{formatMoney(t.total_value)}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {insiderTrades.length > 5 && (
                                            <button onClick={() => setActiveTab("insiders")} className="w-full text-center text-xs text-primary hover:underline py-2">
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
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Gavel className="h-5 w-5 text-blue-400" />国会交易记录</CardTitle>
                            <CardDescription>{congressTrades.length} 条涉及 {ticker} 的交易</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {congressTrades.length === 0 ? (
                                <p className="text-center text-muted-foreground py-12">暂无国会交易记录</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>披露日期</TableHead>
                                            <TableHead>议员</TableHead>
                                            <TableHead>党派/州</TableHead>
                                            <TableHead>操作</TableHead>
                                            <TableHead className="text-right">金额范围</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {congressTrades.map((t, i) => (
                                            <TableRow key={t.id ?? i} className="hover:bg-muted/5">
                                                <TableCell className="text-muted-foreground font-mono text-xs">{safeDate(t.disclosure_date)}</TableCell>
                                                <TableCell>
                                                    <Link href={`/congress/politician/${encodeURIComponent(t.politician_name || "")}`}
                                                        className="text-primary hover:underline font-medium">
                                                        {t.politician_name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {t.politician_party}-{t.politician_state}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={t.transaction_type?.includes("purchase") ? "default" : "destructive"} className="text-xs">
                                                        {t.transaction_type?.includes("purchase") ? "买入" : "卖出"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {formatMoney(t.amount_min)} — {formatMoney(t.amount_max)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === "insiders" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-400" />内幕交易记录</CardTitle>
                            <CardDescription>{insiderTrades.length} 条涉及 {ticker} 的高管交易</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {insiderTrades.length === 0 ? (
                                <p className="text-center text-muted-foreground py-12">暂无内幕交易记录</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>申报日期</TableHead>
                                            <TableHead>内部人</TableHead>
                                            <TableHead>职位</TableHead>
                                            <TableHead>操作</TableHead>
                                            <TableHead className="text-right">数量</TableHead>
                                            <TableHead className="text-right">总价值</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {insiderTrades.map((t: any, i: number) => (
                                            <TableRow key={t.id ?? i} className="hover:bg-muted/5">
                                                <TableCell className="text-muted-foreground font-mono text-xs">{safeDate(t.filing_date)}</TableCell>
                                                <TableCell className="font-medium">{t.insider_name}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{t.insider_title}</TableCell>
                                                <TableCell>
                                                    <Badge variant={t.transaction_type === "purchase" ? "default" : "destructive"} className="text-xs">
                                                        {t.transaction_type === "purchase" ? "买入" : "卖出"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">{t.shares?.toLocaleString() || "--"}</TableCell>
                                                <TableCell className="text-right font-mono text-xs font-medium">{formatMoney(t.total_value)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === "news" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Newspaper className="h-5 w-5 text-orange-400" />相关新闻</CardTitle>
                            <CardDescription>涉及 {ticker} 的新闻动态</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {relatedNews.length === 0 ? (
                                <p className="text-center text-muted-foreground py-12">暂无相关新闻</p>
                            ) : (
                                <div className="space-y-4">
                                    {relatedNews.map((n: any, i: number) => (
                                        <div key={n.id ?? i} className="flex items-start gap-4 p-4 rounded-lg border border-border/20 hover:bg-muted/10 transition-colors group">
                                            <div className="p-2 rounded bg-orange-500/10 shrink-0">
                                                <Newspaper className="h-4 w-4 text-orange-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                                                    {n.url ? (
                                                        <a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{n.title}</a>
                                                    ) : n.title}
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.summary || n.content}</p>
                                                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                                                    <span>{n.source}</span>
                                                    <span>{safeDate(n.published_at || n.created_at)}</span>
                                                    <span>{timeAgo(n.published_at || n.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </main>
            <Footer />
        </div>
    );
}
