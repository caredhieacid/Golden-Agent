"use client";

import { useData } from "@/lib/data-provider";
import { StockIndex, StockItem, Sector } from "@/types";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Ticker } from "@/components/business/ticker";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(v: number | null | undefined, decimals = 2): string {
    if (v == null) return "--";
    return v.toFixed(decimals);
}

function amountYi(v: number | null | undefined): string {
    if (v == null) return "--";
    return (v / 100000000).toFixed(1);
}

export default function ChinaMarketPage() {
    const { stocks, ready, sseConnected } = useData();
    const indices = stocks.indices as StockIndex[];
    const hotStocks = stocks.hot as StockItem[];
    const sectors = stocks.sectors as Sector[];

    const changePctClass = (v: number | null | undefined) =>
        (v ?? 0) > 0 ? "text-red-500" : (v ?? 0) < 0 ? "text-green-500" : "";

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <Ticker />
            <main className="flex-1 container py-8 px-4 md:px-6">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">A股市场概览</h1>
                        <p className="text-muted-foreground mt-1">
                            通过 AKShare 获取实时行情数据 · SSE 实时推送
                        </p>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${sseConnected ? "bg-green-500" : "bg-yellow-500"} opacity-75`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${sseConnected ? "bg-green-500" : "bg-yellow-500"}`}></span>
                        </span>
                        {sseConnected ? "SSE 实时推送中" : "正在连接..."}
                    </div>
                </div>

                {/* 指数展示 */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {!ready ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />加载指数数据...
                        </div>
                    ) : indices.length > 0 ? (
                        indices.slice(0, 4).map((index) => (
                            <Card key={index.code}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{index.name}</CardTitle>
                                    <Badge variant={(index.change_pct ?? 0) > 0 ? "default" : (index.change_pct ?? 0) < 0 ? "destructive" : "secondary"}>
                                        {(index.change_pct ?? 0) > 0 ? "+" : ""}{fmt(index.change_pct)}%
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className={cn("text-2xl font-bold", changePctClass(index.change_pct))}>
                                        {fmt(index.price)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        成交额: {amountYi(index.amount)}亿
                                    </p>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-8 text-muted-foreground">暂无指数数据</div>
                    )}
                </div>

                <div className="grid gap-6 md:grid-cols-7">
                    {/* 热门板块 */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>板块涨幅榜</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {sectors.length > 0 ? (
                                        sectors.slice(0, 10).map((sector) => (
                                            <div key={sector.name} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                                <div>
                                                    <div className="font-medium">{sector.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        领涨: {sector.leader_stock ?? "--"}
                                                    </div>
                                                </div>
                                                <div className={cn("font-bold", changePctClass(sector.change_pct))}>
                                                    {(sector.change_pct ?? 0) > 0 ? "+" : ""}{fmt(sector.change_pct)}%
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-muted-foreground text-sm">暂无板块数据</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 个股排行 */}
                    <div className="md:col-span-5">
                        <Card>
                            <CardHeader>
                                <CardTitle>个股涨跌幅排行</CardTitle>
                                <CardDescription>SSE 实时推送更新</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>代码</TableHead>
                                            <TableHead>名称</TableHead>
                                            <TableHead className="text-right">最新价</TableHead>
                                            <TableHead className="text-right">涨跌幅</TableHead>
                                            <TableHead className="text-right">涨跌额</TableHead>
                                            <TableHead className="text-right">成交额(亿)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {hotStocks.length > 0 ? (
                                            hotStocks.map((stock) => (
                                                <TableRow key={stock.code}>
                                                    <TableCell className="font-mono text-muted-foreground">{stock.code}</TableCell>
                                                    <TableCell className="font-medium">{stock.name}</TableCell>
                                                    <TableCell className="text-right">{fmt(stock.price)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={changePctClass(stock.change_pct)}>
                                                            {(stock.change_pct ?? 0) > 0 ? "+" : ""}{fmt(stock.change_pct)}%
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {(stock.change_amount ?? 0) > 0 ? "+" : ""}{fmt(stock.change_amount)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {amountYi(stock.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">暂无数据</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
