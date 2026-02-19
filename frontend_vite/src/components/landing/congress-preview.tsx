import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/lib/data-provider";
import type { Trade } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Gavel, Clock, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function CongressPreview() {
    const { congress, ready } = useData();
    const trades = useMemo(() => (congress.trades as Trade[]).slice(0, 5), [congress.trades]);
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
            return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
        } catch {
            return "N/A";
        }
    };

    return (
        <div className="glass-card rounded-3xl p-6 h-full border border-white/10 relative overflow-hidden flex flex-col group">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                        <Gavel className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">国会山交易</h3>
                        <p className="text-xs text-muted-foreground/80">Capitol Hill Trading Tracker</p>
                    </div>
                </div>
                <Link to="/congress" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all hover:scale-105 active:scale-95 group/link">
                    <ArrowRight className="h-4 w-4 transform group-hover/link:-rotate-45 transition-transform" />
                </Link>
            </div>

            {/* List */}
            <div className="flex-1 space-y-3 relative z-10 overflow-y-auto no-scrollbar pr-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 space-y-4 text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-sm">同步国会数据中...</span>
                    </div>
                ) : trades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 space-y-2 text-muted-foreground">
                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                            <Gavel className="h-5 w-5 opacity-20" />
                        </div>
                        <span className="text-sm">暂无最新披露</span>
                    </div>
                ) : (
                    trades.map((trade, index) => (
                        <motion.div
                            key={trade.id ?? index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group/item relative overflow-hidden rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all p-3 cursor-pointer"
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <Avatar className="h-10 w-10 border-2 border-white/5 shadow-sm">
                                    <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(trade.politician_name || "U")}&background=random`} />
                                    <AvatarFallback>{(trade.politician_name || "?").substring(0, 2)}</AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <div className="font-bold text-sm text-gray-100 truncate pr-2 group-hover/item:text-primary transition-colors">
                                            {trade.politician_name}
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "border-0 text-[10px] h-5 px-1.5 font-mono shadow-none flex items-center gap-1",
                                                isPurchase(trade.transaction_type)
                                                    ? "bg-green-500/10 text-green-400"
                                                    : "bg-red-500/10 text-red-400"
                                            )}
                                        >
                                            {isPurchase(trade.transaction_type) ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                            {isPurchase(trade.transaction_type) ? "Buy" : "Sell"}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-medium text-foreground/80 bg-white/5 px-1.5 rounded">
                                                {trade.ticker}
                                            </span>
                                            <span className="flex items-center gap-1 opacity-60">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(trade.disclosure_date)}
                                            </span>
                                        </div>
                                        <div className="font-mono font-medium opacity-80">
                                            ${formatAmount(trade.amount_min)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Background Gradient Blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 blur-3xl pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
        </div>
    );
}

function formatAmount(amount: number | null | undefined) {
    if (amount == null || amount === 0) return "-";
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return `${amount}`;
}
