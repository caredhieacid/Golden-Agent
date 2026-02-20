import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/lib/data-provider";
import type { Politician } from "@/types";
import { ArrowRight, Users, FileText, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn, formatChamber, formatParty, formatPoliticianDisplayName } from "@/lib/utils";

export function RoiLeaderboard() {
    const { congress, ready } = useData();
    const loading = !ready;

    // Show politicians sorted by disclosure count (most active)
    const politicians = useMemo(() => {
        const raw = (congress.politicians as Politician[])
            .filter(p => p.trade_count > 0)
            .sort((a, b) => b.trade_count - a.trade_count)
            .slice(0, 5);
        return raw.map((p, i) => ({
            ...p,
            rank: i + 1
        }));
    }, [congress.politicians]);

    return (
        <div className="glass-card rounded-3xl p-6 h-full border border-white/10 relative overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">活跃议员</h3>
                        <p className="text-xs text-muted-foreground/80">Most Active by Disclosures</p>
                    </div>
                </div>
                <Link to="/congress" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all hover:scale-105 active:scale-95">
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>

            {/* List */}
            <div className="flex-1 space-y-2 relative z-10 overflow-y-auto no-scrollbar pr-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 space-y-4 text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                        <span className="text-sm">加载数据中...</span>
                    </div>
                ) : politicians.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                            <Users className="h-5 w-5 opacity-20" />
                        </div>
                        <span className="text-sm">暂无数据</span>
                    </div>
                ) : (
                    politicians.map((p, index) => (
                        <motion.div
                            key={p.id ?? index}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + (index * 0.1) }}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group",
                                index === 0 ? "bg-gradient-to-r from-blue-500/10 to-transparent border-blue-500/20" : "bg-white/5 border-white/5 hover:bg-white/10"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-6 flex justify-center">
                                    <span className="font-mono text-sm text-muted-foreground">{p.rank}</span>
                                </div>
                                <Avatar className="h-10 w-10 border-2 border-white/5 shadow-sm">
                                    <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || "U")}&background=random`} />
                                    <AvatarFallback>{(p.full_name || "?").substring(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="text-sm font-bold text-gray-100 group-hover:text-blue-400 transition-colors">
                                        {formatPoliticianDisplayName(p.full_name)}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span>{formatParty(p.party)}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                        <span>{formatChamber(p.chamber)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-0.5">
                                <div className="flex items-center gap-1 font-mono font-medium text-blue-400">
                                    <FileText className="h-3 w-3" />
                                    {p.trade_count}
                                </div>
                                <div className="text-[10px] text-muted-foreground opacity-70">
                                    披露记录
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Disclaimer */}
            <div className="mt-4 pt-4 border-t border-white/5 relative z-10">
                <p className="text-[10px] text-muted-foreground/60 text-center">
                    * 数据来源于美国国会法定公开披露，仅供信息参考
                </p>
            </div>

            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[80%] h-[80%] bg-gradient-to-br from-blue-500/5 via-transparent to-transparent blur-3xl pointer-events-none opacity-40"></div>
        </div>
    );
}
