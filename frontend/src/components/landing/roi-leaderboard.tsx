"use client";

import { useMemo } from "react";
import { useData } from "@/lib/data-provider";
import { Politician } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trophy, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// 确定性伪随机数生成器（基于 seed），避免 hydration mismatch
function seededRandom(seed: number) {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
}

export function RoiLeaderboard() {
    const { congress } = useData();
    const politicians = useMemo(() => (congress.politicians as Politician[]).slice(0, 5), [congress.politicians]);

    // 用 useMemo 固定随机数据，避免每次 render 变化
    const roiData = useMemo(() => {
        return politicians.map((pol, index) => ({
            roi: (seededRandom(pol.id * 7 + 1) * 50 + 10).toFixed(1),
            sparkPoints: Array.from({ length: 5 }, (_, i) =>
                15 - seededRandom(pol.id * 13 + i * 3) * 15
            ),
        }));
    }, [politicians]);

    return (
        <Card className="h-full glass-card border-0 shadow-2xl flex flex-col overflow-hidden">
            <CardHeader className="border-b border-border/10 bg-white/5 pb-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground/90">
                        <div className="p-1.5 rounded bg-[#ffd700]/10 border border-[#ffd700]/20">
                            <Trophy className="h-4 w-4 text-[#ffd700]" />
                        </div>
                        议员Alpha收益榜
                    </CardTitle>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/20 px-2 py-1 rounded border border-white/5">30D ROI</span>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto no-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="text-muted-foreground/60 border-b border-white/5 text-[10px] uppercase tracking-wider bg-black/20">
                            <th className="px-4 py-2 font-medium w-10">#</th>
                            <th className="py-2 font-medium">Politician</th>
                            <th className="py-2 font-medium text-right w-24">Chart</th>
                            <th className="py-2 font-medium text-right pr-4">ROI</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {politicians.map((pol, index) => (
                            <motion.tr
                                key={pol.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <td className="px-4 py-3">
                                    <div className={cn(
                                        "w-6 h-6 flex items-center justify-center rounded text-xs font-bold font-mono",
                                        index === 0 ? "bg-gradient-to-b from-[#ffd700] to-[#b39500] text-black shadow-[0_2px_5px_rgba(255,215,0,0.3)]" :
                                            index === 1 ? "bg-gradient-to-b from-[#e0e0e0] to-[#bdbdbd] text-black shadow-[0_2px_5px_rgba(255,255,255,0.2)]" :
                                                index === 2 ? "bg-gradient-to-b from-[#cd7f32] to-[#8c5622] text-black shadow-[0_2px_5px_rgba(205,127,50,0.2)]" :
                                                    "text-muted-foreground bg-white/5"
                                    )}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="py-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="relative">
                                            <Avatar className="h-8 w-8 border border-white/10 ring-1 ring-black">
                                                <AvatarImage src={`https://ui-avatars.com/api/?name=${pol.full_name}&background=random`} />
                                                <AvatarFallback className="text-[10px]">{pol.full_name.substring(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            {/* 党派指示点 */}
                                            <div className={cn(
                                                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#161b22]",
                                                pol.party === 'D' ? "bg-blue-500" : "bg-red-500"
                                            )}></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="font-medium text-sm text-gray-200 group-hover:text-primary transition-colors">{pol.full_name}</div>
                                            <div className="text-[10px] text-muted-foreground font-mono leading-none mt-0.5">{pol.state} • {pol.chamber === 'house' ? 'Rep' : 'Sen'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 text-right">
                                    {/* 确定性 Sparkline SVG */}
                                    <div className="h-6 w-16 ml-auto opacity-70 group-hover:opacity-100 transition-opacity">
                                        {roiData[index] && (
                                            <svg viewBox="0 0 40 15" className="w-full h-full overflow-visible">
                                                <path
                                                    d={`M0,${roiData[index].sparkPoints[0].toFixed(1)} L10,${roiData[index].sparkPoints[1].toFixed(1)} L20,${roiData[index].sparkPoints[2].toFixed(1)} L30,${roiData[index].sparkPoints[3].toFixed(1)} L40,${roiData[index].sparkPoints[4].toFixed(1)}`}
                                                    fill="none"
                                                    stroke={index < 2 ? "#0de3f2" : "#a1a1aa"}
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                                <circle cx="40" cy={roiData[index].sparkPoints[4].toFixed(1)} r="1.5" fill={index < 2 ? "#0de3f2" : "#a1a1aa"} />
                                            </svg>
                                        )}
                                    </div>
                                </td>
                                <td className="py-3 text-right pr-4">
                                    <div className="font-mono font-bold text-sm text-primary text-shadow-glow">
                                        +{roiData[index]?.roi ?? "0.0"}%
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}
