"use client";

import { useData } from "@/lib/data-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Ticker } from "@/components/business/ticker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Gavel, TrendingUp, Building2, Landmark, Newspaper } from "lucide-react";
import { useState, useMemo } from "react";

const TYPE_MAP: Record<string, { label: string; color: string; icon: any }> = {
    congress_trade: { label: "国会交易", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: Gavel },
    insider_trade: { label: "内幕交易", color: "bg-green-500/10 text-green-400 border-green-500/30", icon: TrendingUp },
    fund_update: { label: "基金持仓", color: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: Building2 },
    lobbying: { label: "企业游说", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Landmark },
};

function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    return `${Math.floor(days / 30)} 个月前`;
}

export default function NewsPage() {
    const { news, ready } = useData();
    const [activeType, setActiveType] = useState<string>("all");

    const events = useMemo(() => {
        if (activeType === "all") return news;
        return news.filter((e: any) => e.type === activeType);
    }, [news, activeType]);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <Ticker />
            <main className="flex-1 container py-8 px-4 md:px-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Newspaper className="h-8 w-8 text-primary" />
                        实时动态
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        国会交易、内幕买卖、基金持仓、企业游说 — 一站式信息流
                    </p>
                </div>

                {/* 类型过滤 */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    <Button variant={activeType === "all" ? "default" : "outline"} size="sm"
                        onClick={() => setActiveType("all")}>
                        全部
                    </Button>
                    {Object.entries(TYPE_MAP).map(([key, val]) => (
                        <Button key={key} variant={activeType === key ? "default" : "outline"} size="sm"
                            onClick={() => setActiveType(key)}>
                            <val.icon className="h-3.5 w-3.5 mr-1" />
                            {val.label}
                        </Button>
                    ))}
                </div>

                {/* 事件流 */}
                {!ready ? (
                    <div className="flex items-center justify-center h-48">
                        <RefreshCw className="h-5 w-5 animate-spin mr-2 text-primary" />
                        <span className="text-muted-foreground">加载动态中...</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {events.map((evt: any, i: number) => {
                            const info = TYPE_MAP[evt.type] || { label: evt.type, color: "bg-gray-500/10 text-gray-400 border-gray-500/30", icon: Newspaper };
                            const Icon = info.icon;
                            return (
                                <Card key={evt.id ?? i} className="hover:border-primary/30 transition-colors">
                                    <CardContent className="py-4 px-5">
                                        <div className="flex items-start gap-4">
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${info.color} border`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <Badge variant="outline" className={`${info.color} text-[10px] px-1.5 py-0`}>
                                                        {info.label}
                                                    </Badge>
                                                    {evt.ticker && (
                                                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                                            ${evt.ticker}
                                                        </Badge>
                                                    )}
                                                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                                                        {timeAgo(evt.timestamp)}
                                                    </span>
                                                </div>
                                                <h3 className="font-medium text-sm leading-snug">{evt.title}</h3>
                                                {evt.summary && (
                                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{evt.summary}</p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {events.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">暂无动态</div>
                        )}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
