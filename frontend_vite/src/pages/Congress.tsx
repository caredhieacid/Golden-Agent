
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/lib/data-provider";
import type { Trade } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Filter, ArrowUpRight, ArrowDownRight, DollarSign, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function Congress() {
    const { congress, ready } = useData();
    const trades = congress.trades as Trade[];

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [partyFilter, setPartyFilter] = useState<"all" | "D" | "R">("all");
    const [chamberFilter, setChamberFilter] = useState<"all" | "House" | "Senate">("all");
    const [typeFilter, setTypeFilter] = useState<"all" | "purchase" | "sale">("all");

    // Memoized Filtered Data
    const filteredTrades = useMemo(() => {
        return trades.filter(t => {
            const matchesSearch = (t.politician_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.ticker ?? "").toLowerCase().includes(searchTerm.toLowerCase());
            const matchesParty = partyFilter === "all" || t.politician_party === partyFilter;
            const matchesChamber = chamberFilter === "all" || t.chamber === chamberFilter;
            const isBuy = t.transaction_type?.toLowerCase().includes("purchase");
            const matchesType = typeFilter === "all" || (typeFilter === "purchase" ? isBuy : !isBuy);

            return matchesSearch && matchesParty && matchesChamber && matchesType;
        });
    }, [trades, searchTerm, partyFilter, chamberFilter, typeFilter]);

    const isPurchase = (type: string | null | undefined) =>
        type ? type.toLowerCase().includes("purchase") : false;

    // Stats
    const stats = useMemo(() => {
        const totalVolume = filteredTrades.reduce((acc, t) => acc + (t.amount_min || 0), 0);
        const buyCount = filteredTrades.filter(t => isPurchase(t.transaction_type)).length;
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
                            国会山 <span className="text-primary block md:inline">交易监控</span>
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-2xl">
                            实时追踪美国国会山交易动态，洞察聪明钱的流向。
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
                        placeholder="搜索议员姓名或股票代码..."
                        className="pl-10 bg-white/5 border-white/5 rounded-xl focus:bg-white/10 transition-all text-white placeholder:text-muted-foreground/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                    <Select value={partyFilter} onValueChange={(v: any) => setPartyFilter(v)}>
                        <SelectTrigger className="w-[110px] bg-white/5 border-white/5 rounded-xl text-sm font-medium">
                            <SelectValue placeholder="党派" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全部党派</SelectItem>
                            <SelectItem value="D">民主党</SelectItem>
                            <SelectItem value="R">共和党</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={chamberFilter} onValueChange={(v: any) => setChamberFilter(v)}>
                        <SelectTrigger className="w-[120px] bg-white/5 border-white/5 rounded-xl text-sm font-medium">
                            <SelectValue placeholder="院所" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全部院所</SelectItem>
                            <SelectItem value="House">众议院</SelectItem>
                            <SelectItem value="Senate">参议院</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                        <SelectTrigger className="w-[110px] bg-white/5 border-white/5 rounded-xl text-sm font-medium">
                            <SelectValue placeholder="类型" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全部类型</SelectItem>
                            <SelectItem value="purchase">买入</SelectItem>
                            <SelectItem value="sale">卖出</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white" onClick={() => {
                        setSearchTerm("");
                        setPartyFilter("all");
                        setChamberFilter("all");
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
                        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-primary" />
                        <p>同步国会山数据中...</p>
                    </div>
                ) : filteredTrades.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground glass-panel rounded-3xl border-dashed border-white/10">
                        <Filter className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>没有找到符合条件的交易。</p>
                        <Button variant="link" className="text-primary mt-2" onClick={() => setSearchTerm("")}>清除搜索</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        <AnimatePresence>
                            {filteredTrades.slice(0, 50).map((trade, idx) => (
                                <motion.div
                                    key={trade.id ?? idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03, duration: 0.3 }}
                                    className="glass-card hover:bg-white/5 transition-all duration-300 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4 group cursor-default"
                                >
                                    {/* Politician Info */}
                                    <div className="flex items-center gap-4 min-w-[200px]">
                                        <Avatar className="h-10 w-10 ring-2 ring-white/5 group-hover:ring-primary/50 transition-all">
                                            <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(trade.politician_name || "U")}&background=random`} />
                                            <AvatarFallback>{(trade.politician_name || "?").substring(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <Link to={`/congress/politician/${encodeURIComponent(trade.politician_name || "")}`} className="font-semibold text-white group-hover:text-primary transition-colors flex items-center gap-2">
                                                {trade.politician_name}
                                            </Link>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Badge variant="outline" className={cn(
                                                    "h-4 px-1 text-[10px] border-0",
                                                    trade.politician_party === "D" ? "bg-blue-500/20 text-blue-400" :
                                                        trade.politician_party === "R" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"
                                                )}>
                                                    {trade.politician_party === "D" ? "DEM" : trade.politician_party === "R" ? "REP" : "IND"}
                                                </Badge>
                                                <span>{trade.politician_state}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                <span>{trade.chamber}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stock Info */}
                                    <div className="flex-1 md:pl-4 md:border-l border-white/5 flex items-center gap-3 min-w-[150px]">
                                        <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center font-mono font-bold text-sm text-primary">
                                            {trade.ticker}
                                        </div>
                                        <div className="flex flex-col">
                                            <Link to={`/stock/${trade.ticker}`} className="text-sm font-medium text-gray-200 hover:text-primary transition-colors">
                                                {trade.ticker}
                                            </Link>
                                            <span className="text-xs text-muted-foreground/70 truncate max-w-[120px]">
                                                {/* Stock */}
                                                美股
                                            </span>
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
                                                <DollarSign className="h-3 w-3" /> 金额
                                            </span>
                                            <span className="text-sm font-mono text-gray-200">
                                                ${(trade.amount_min || 0).toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-end gap-1 text-right">
                                            <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> 披露日期
                                            </span>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {safeDate(trade.disclosure_date)}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {filteredTrades.length > 50 && (
                            <div className="text-center py-6">
                                <p className="text-sm text-muted-foreground">显示最近披露的 50 笔交易</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Background Glows */}
            <div className="fixed top-20 left-10 w-[300px] h-[300px] bg-primary/20 blur-[150px] pointer-events-none opacity-30 z-0"></div>
            <div className="fixed bottom-20 right-10 w-[400px] h-[400px] bg-blue-600/10 blur-[150px] pointer-events-none opacity-30 z-0"></div>
        </div>
    );
}
