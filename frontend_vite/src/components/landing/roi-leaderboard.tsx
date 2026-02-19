import { useMemo } from "react";
import { useData } from "@/lib/data-provider";
import type { Politician } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Trophy, Crown, Medal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn, formatChamber, formatParty, formatPoliticianDisplayName } from "@/lib/utils";

export function RoiLeaderboard() {
    const { congress } = useData();

    // Mock ROI data integration (since API doesnt provide it directly yet)
    // In a real app, this would come from the backend
    const leaderboard = useMemo(() => {
        const raw = (congress.politicians as Politician[]).slice(0, 5);
        return raw.map((p, i) => ({
            ...p,
            roi: 35.4 - (i * 4.2) + (Math.random() * 2), // Mock ROI for demo
            winRate: 85 - (i * 3),
            rank: i + 1
        }));
    }, [congress.politicians]);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500 fill-yellow-500/20" />;
        if (rank === 2) return <Medal className="h-4 w-4 text-gray-300 fill-gray-300/20" />;
        if (rank === 3) return <Medal className="h-4 w-4 text-amber-600 fill-amber-600/20" />;
        return <span className="text-muted-foreground font-mono text-sm">{rank}</span>;
    };

    return (
        <div className="glass-card rounded-3xl p-6 h-full border border-white/10 relative overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                        <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">国会山股神榜</h3>
                        <p className="text-xs text-muted-foreground/80">Best Performing Politicians</p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-yellow-500/5 text-yellow-500 border-yellow-500/20">Yearly</Badge>
            </div>

            {/* List */}
            <div className="flex-1 space-y-2 relative z-10 overflow-y-auto no-scrollbar pr-1">
                {leaderboard.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <span className="text-sm">暂无排行数据</span>
                    </div>
                ) : (
                    leaderboard.map((p, index) => (
                        <motion.div
                            key={p.id ?? index}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + (index * 0.1) }}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group",
                                index === 0 ? "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20" : "bg-white/5 border-white/5 hover:bg-white/10"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-6 flex justify-center">
                                    {getRankIcon(p.rank)}
                                </div>
                                <Avatar className="h-10 w-10 border-2 border-white/5 shadow-sm">
                                    <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || "U")}&background=random`} />
                                    <AvatarFallback>{(p.full_name || "?").substring(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="text-sm font-bold text-gray-100 group-hover:text-primary transition-colors">
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
                                <div className="flex items-center gap-1 font-mono font-bold text-green-400">
                                    <ArrowUpRight className="h-3 w-3" />
                                    {p.roi.toFixed(1)}%
                                </div>
                                <div className="text-[10px] text-muted-foreground opacity-70">
                                    Win Rate: {p.winRate}%
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[80%] h-[80%] bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent blur-3xl pointer-events-none opacity-40"></div>
        </div>
    );
}
