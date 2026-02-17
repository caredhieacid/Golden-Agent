"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useData } from "@/lib/data-provider";
import { Trade } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Gavel, Clock, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

export function CongressPreview() {
    const { congress, ready } = useData();
    const trades = useMemo(() => (congress.trades as Trade[]).slice(0, 4), [congress.trades]);
    const loading = !ready;

    const isPurchase = (type: string | null | undefined) => {
        if (!type) return false;
        return type.toLowerCase().includes("purchase");
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return "N/A";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return "N/A";
            return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
        } catch {
            return "N/A";
        }
    };

    return (
        <Card className="h-full bg-[#161b22] border-border/40 shadow-lg relative overflow-hidden group">
            {/* 顶部光效 */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50"></div>

            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/30">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Gavel className="h-5 w-5 text-primary" />
                    最新国会交易动态
                </CardTitle>
                <Link href="/congress" className="text-xs text-muted-foreground hover:text-primary flex items-center transition-colors">
                    查看全部 <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" /> 加载中...
                    </div>
                ) : trades.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        暂无交易数据，请先同步数据
                    </div>
                ) : (
                    trades.map((trade, index) => (
                        <motion.div
                            key={trade.id ?? index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.15 }}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/20 bg-muted/5 hover:bg-muted/10 hover:border-border/40 transition-all cursor-pointer group/item"
                        >
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-border/40">
                                    <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(trade.politician_name || "U")}&background=random`} />
                                    <AvatarFallback>{(trade.politician_name || "?").substring(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="text-sm font-medium text-foreground group-hover/item:text-primary transition-colors">
                                        {trade.politician_name || "未知议员"}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="outline" className="text-[10px] h-5 border-border/40 font-mono bg-[#0D1117] text-muted-foreground">
                                            {trade.ticker || "--"}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground flex items-center">
                                            <Clock className="h-3 w-3 mr-0.5" />
                                            {formatDate(trade.disclosure_date || trade.transaction_date)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <Badge
                                    variant={isPurchase(trade.transaction_type) ? "default" : "secondary"}
                                    className={isPurchase(trade.transaction_type)
                                        ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                        : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"}
                                >
                                    {isPurchase(trade.transaction_type) ? "买入" : "卖出"}
                                </Badge>
                                <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                                    ${formatAmount(trade.amount_min)}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

function formatAmount(amount: number | null | undefined) {
    if (amount == null || amount === 0) return "N/A";
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return `${amount}`;
}
