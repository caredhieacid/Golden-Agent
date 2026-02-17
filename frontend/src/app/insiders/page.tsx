"use client";

import { useData } from "@/lib/data-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Ticker } from "@/components/business/ticker";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { useState } from "react";

function formatMoney(val: number | null): string {
    if (!val) return "--";
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
}

function safeDate(d: string | null | undefined): string {
    if (!d) return "--";
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return "--";
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    } catch { return "--"; }
}

export default function InsidersPage() {
    const { insiders, ready } = useData();
    const trades = insiders.trades;
    const summary = insiders.summary;
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "purchase" | "sale">("all");

    const filtered = trades.filter(t => {
        const matchSearch = !search ||
            t.ticker?.toLowerCase().includes(search.toLowerCase()) ||
            t.insider_name?.toLowerCase().includes(search.toLowerCase()) ||
            t.company_name?.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" || t.transaction_type === filter;
        return matchSearch && matchFilter;
    });

    const totalBuyValue = trades.filter(t => t.transaction_type === "purchase")
        .reduce((sum: number, t: any) => sum + (t.total_value || 0), 0);
    const totalSellValue = trades.filter(t => t.transaction_type === "sale")
        .reduce((sum: number, t: any) => sum + (t.total_value || 0), 0);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <Ticker />
            <main className="flex-1 container py-8 px-4 md:px-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">内幕交易追踪</h1>
                        <p className="text-muted-foreground mt-1">
                            追踪上市公司高管和董事的股票买卖动态（SEC Form 4）
                        </p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="search" placeholder="搜索股票/高管..." className="pl-8"
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* 统计卡片 */}
                <div className="grid gap-4 md:grid-cols-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">总交易数</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{trades.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">买入总额</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">{formatMoney(totalBuyValue)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">卖出总额</CardTitle>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">{formatMoney(totalSellValue)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">涉及股票数</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.length}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* 过滤按钮 */}
                <div className="flex gap-2 mb-4">
                    <Button variant={filter === "all" ? "default" : "outline"} size="sm"
                        onClick={() => setFilter("all")}>全部</Button>
                    <Button variant={filter === "purchase" ? "default" : "outline"} size="sm"
                        onClick={() => setFilter("purchase")} className={filter === "purchase" ? "bg-green-600 hover:bg-green-700" : ""}>
                        仅买入
                    </Button>
                    <Button variant={filter === "sale" ? "default" : "outline"} size="sm"
                        onClick={() => setFilter("sale")} className={filter === "sale" ? "bg-red-600 hover:bg-red-700" : ""}>
                        仅卖出
                    </Button>
                </div>

                {/* 交易列表 */}
                <Card>
                    <CardHeader><CardTitle>交易明细</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>申报日期</TableHead>
                                    <TableHead>内部人</TableHead>
                                    <TableHead>职位</TableHead>
                                    <TableHead>股票</TableHead>
                                    <TableHead>操作</TableHead>
                                    <TableHead>数量</TableHead>
                                    <TableHead>单价</TableHead>
                                    <TableHead className="text-right">总价值</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!ready ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />加载中...
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length > 0 ? (
                                    filtered.map((t: any, i: number) => (
                                        <TableRow key={t.id ?? i}>
                                            <TableCell className="text-muted-foreground">{safeDate(t.filing_date)}</TableCell>
                                            <TableCell className="font-medium">{t.insider_name}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{t.insider_title}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono">{t.ticker}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className={t.transaction_type === "purchase" ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                                                    {t.transaction_type === "purchase" ? "买入" : "卖出"}
                                                </span>
                                            </TableCell>
                                            <TableCell>{t.shares?.toLocaleString() || "--"}</TableCell>
                                            <TableCell>${t.price_per_share?.toFixed(2) || "--"}</TableCell>
                                            <TableCell className="text-right font-medium">{formatMoney(t.total_value)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">暂无符合条件的记录</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
