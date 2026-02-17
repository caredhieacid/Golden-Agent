"use client";

import Link from "next/link";
import { useData } from "@/lib/data-provider";
import { Trade, Politician } from "@/types";
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
import { Search, RefreshCw } from "lucide-react";
import { useState } from "react";

function safeDate(d: string | null | undefined, fmt = "MM/dd"): string {
    if (!d) return "--";
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return "--";
        const m = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        if (fmt === "yyyy-MM-dd") return `${date.getFullYear()}-${m}-${day}`;
        return `${m}/${day}`;
    } catch { return "--"; }
}

export default function CongressPage() {
    const { congress, ready } = useData();
    const trades = congress.trades as Trade[];
    const politicians = congress.politicians as Politician[];
    const [searchTerm, setSearchTerm] = useState("");

    const filteredTrades = trades.filter(t =>
        (t.politician_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.ticker ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isPurchase = (type: string | null | undefined) =>
        type ? type.toLowerCase().includes("purchase") : false;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <Ticker />
            <main className="flex-1 container py-8 px-4 md:px-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">国会山交易监控</h1>
                        <p className="text-muted-foreground mt-1">
                            实时追踪众议院和参议院议员的股票交易披露
                        </p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="搜索议员或股票代码..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline">导出数据</Button>
                    </div>
                </div>

                {/* 统计卡片 */}
                <div className="grid gap-4 md:grid-cols-3 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">近90天交易总数</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{trades.length}</div>
                            <p className="text-xs text-muted-foreground">来自众议院和参议院的披露</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">活跃议员数</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{politicians.length}</div>
                            <p className="text-xs text-muted-foreground">参与交易的议员人数</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">最新披露日期</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {trades.length > 0
                                    ? safeDate(trades[0].disclosure_date ?? trades[0].transaction_date)
                                    : "-"}
                            </div>
                            <p className="text-xs text-muted-foreground">数据源更新时间</p>
                        </CardContent>
                    </Card>
                </div>

                {/* 交易列表 */}
                <Card>
                    <CardHeader>
                        <CardTitle>交易明细</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>披露日期</TableHead>
                                    <TableHead>议员</TableHead>
                                    <TableHead>党派/州</TableHead>
                                    <TableHead>标的</TableHead>
                                    <TableHead>操作</TableHead>
                                    <TableHead>金额范围</TableHead>
                                    <TableHead className="text-right">交易日期</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!ready ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />加载数据中...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTrades.length > 0 ? (
                                    filteredTrades.map((trade, idx) => (
                                        <TableRow key={trade.id ?? idx}>
                                            <TableCell className="font-medium text-muted-foreground">
                                                {safeDate(trade.disclosure_date)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <Link href={`/congress/politician/${encodeURIComponent(trade.politician_name || "")}`}
                                                    className="text-primary hover:underline">
                                                    {trade.politician_name || "未知"}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {trade.politician_party ?? "-"} - {trade.politician_state ?? "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/stock/${trade.ticker}`}>
                                                    <Badge variant="outline" className="font-mono hover:bg-primary/10 cursor-pointer">{trade.ticker || "--"}</Badge>
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <span className={isPurchase(trade.transaction_type) ? "text-green-500" : "text-red-500"}>
                                                    {isPurchase(trade.transaction_type) ? "买入" : "卖出"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {trade.amount_min != null || trade.amount_max != null
                                                    ? `$${(trade.amount_min ?? 0).toLocaleString()} - $${(trade.amount_max ?? 0).toLocaleString()}`
                                                    : "未披露"}
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {safeDate(trade.transaction_date, "yyyy-MM-dd")}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">暂无符合条件的记录</TableCell>
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
