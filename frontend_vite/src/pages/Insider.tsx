
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/lib/data-provider";
// import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Filter, ArrowUpRight, ArrowDownRight, DollarSign, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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

export default function Insider() {
    const { insiders, ready } = useData();
    const trades = insiders.trades || [];

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | "purchase" | "sale">("all");

    // Memoized Filtered Data
    const filteredTrades = useMemo(() => {
        return trades.filter((t: any) => {
            const matchesSearch = (t.company_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.ticker ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()); // Owner name

            const isBuy = t.transaction_type?.toLowerCase().includes("purchase") || t.transaction_type?.toLowerCase().includes("buy");
            const matchesType = typeFilter === "all" || (typeFilter === "purchase" ? isBuy : !isBuy);

            return matchesSearch && matchesType;
        });
    }, [trades, searchTerm, typeFilter]);

    const isPurchase = (type: string | null | undefined) =>
        type ? (type.toLowerCase().includes("purchase") || type.toLowerCase().includes("buy")) : false;

    // Stats
    const stats = useMemo(() => {
        const totalVolume = filteredTrades.reduce((acc, t: any) => acc + (t.amount || t.value || 0), 0);
        const buyCount = filteredTrades.filter((t: any) => isPurchase(t.transaction_type)).length;
        const sellCount = filteredTrades.length - buyCount;
        return { totalVolume, buyCount, sellCount };
    }, [filteredTrades]);

    return (
        <div className="container relative py-8 px-4 md:px-6 max-w-7xl mx-auto space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                <div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">
                            企业 <span className="text-blue-500 block md:inline">内幕交易</span>
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-2xl">
                            监控 CEO、CFO 及董事会成员的交易活动，捕捉内部人士的市场信号。
                        </p>
                    </motion.div>
                </div>

                {/* Stats Cards (Compact) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex gap-4"
                >
                    <div className="glass-panel rounded-2xl p-4 min-w-[140px] flex flex-col items-center justify-center text-center bg-green-500/5 border-green-500/10">
                        <span className="text-xs text-green-400 uppercase tracking-wider font-semibold mb-1">买入量</span>
                        <span className="text-2xl font-bold text-white">{stats.buyCount}</span>
                    </div>
                    <div className="glass-panel rounded-2xl p-4 min-w-[140px] flex flex-col items-center justify-center text-center bg-red-500/5 border-red-500/10">
                        <span className="text-xs text-red-400 uppercase tracking-wider font-semibold mb-1">卖出量</span>
                        <span className="text-2xl font-bold text-white">{stats.sellCount}</span>
                    </div>
                </motion.div>
            </div>

            {/* Controls Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="glass-card p-4 rounded-3xl flex flex-col md:flex-row gap-4 items-center justify-between sticky top-24 z-30 backdrop-blur-xl bg-[#09090b]/80 border shadow-2xl"
            >
                {/* Search */}
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        type="search"
                        placeholder="搜索公司或高管姓名..."
                        className="pl-10 bg-white/5 border-white/5 rounded-xl focus:bg-white/10 transition-all text-white placeholder:text-muted-foreground/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                    <div className="flex bg-white/5 rounded-xl border border-white/5 p-1">
                        <button onClick={() => setTypeFilter("all")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", typeFilter === "all" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white")}>全部</button>
                        <button onClick={() => setTypeFilter("purchase")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", typeFilter === "purchase" ? "bg-white/10 text-green-400 shadow-sm" : "text-muted-foreground hover:text-green-400")}>买入</button>
                        <button onClick={() => setTypeFilter("sale")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", typeFilter === "sale" ? "bg-white/10 text-red-400 shadow-sm" : "text-muted-foreground hover:text-red-400")}>卖出</button>
                    </div>

                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white" onClick={() => {
                        setSearchTerm("");
                        setTypeFilter("all");
                    }}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </motion.div>

            {/* Content List */}
            <div className="min-h-[500px]">
                {!ready ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-blue-500" />
                        <p>加载内幕交易数据中...</p>
                    </div>
                ) : filteredTrades.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground glass-panel rounded-3xl border-dashed border-white/10">
                        <Filter className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>没有找到内幕交易记录。</p>
                        <Button variant="link" className="text-blue-500 mt-2" onClick={() => setSearchTerm("")}>清除搜索</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        <AnimatePresence>
                            {filteredTrades.slice(0, 50).map((trade: any, idx: number) => (
                                <motion.div
                                    key={trade.id ?? idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03, duration: 0.3 }}
                                    className="glass-card hover:bg-white/5 transition-all duration-300 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4 group cursor-default"
                                >
                                    {/* Company Info */}
                                    <div className="flex items-center gap-4 min-w-[200px]">
                                        <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center font-mono font-bold text-sm text-blue-400 group-hover:text-blue-300 transition-colors">
                                            {trade.ticker}
                                        </div>
                                        <div>
                                            <Link to={`/stock/${trade.ticker}`} className="font-semibold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                                {trade.company_name || trade.ticker}
                                            </Link>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{trade.name}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                <span className="uppercase">{trade.title || "内部人士"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Trade Details */}
                                    <div className="flex flex-1 items-center justify-between md:justify-end gap-8 w-full md:w-auto mt-3 md:mt-0 pt-3 md:pt-0 border-t border-white/5 md:border-0 pl-1">

                                        <div className="flex flex-col items-start gap-1">
                                            <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">交易类型</span>
                                            <div className={cn(
                                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                                                isPurchase(trade.transaction_type)
                                                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                                            )}>
                                                {isPurchase(trade.transaction_type) ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                                {isPurchase(trade.transaction_type) ? "买入" : "卖出"}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-start gap-1">
                                            <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold flex items-center gap-1">
                                                <DollarSign className="h-3 w-3" /> 交易价值
                                            </span>
                                            <span className="text-sm font-mono text-gray-200">
                                                ${(trade.value || trade.amount || 0).toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-end gap-1 text-right">
                                            <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> 披露日期
                                            </span>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {safeDate(trade.filing_date)}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {filteredTrades.length > 50 && (
                            <div className="text-center py-6">
                                {filteredTrades.length > 50 && (
                                    <div className="text-center py-6">
                                        <p className="text-sm text-muted-foreground">显示最近披露的 50 笔交易</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Background Glows */}
            <div className="fixed top-20 right-1/4 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] pointer-events-none -z-10 rounded-full" />
        </div>
    );
}
