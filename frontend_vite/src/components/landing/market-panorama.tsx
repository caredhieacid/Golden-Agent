import { useState, useMemo, useRef, useLayoutEffect } from "react";
import { useData } from "@/lib/data-provider";
import type { Sector } from "@/types";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, BarChart3, ArrowUpRight, Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { gsap } from "gsap";

export function MarketPanorama() {
    const { stocks, gold } = useData();
    const [activeTab, setActiveTab] = useState<"heatmap" | "gold">("heatmap");
    const containerRef = useRef<HTMLDivElement>(null);

    // Mock Data if empty
    const sectors = useMemo(() => {
        const data = stocks.sectors as Sector[];
        if (data.length === 0) {
            return [
                { name: "TMT 科技", change_pct: 2.45, leader_stock: "N/A" },
                { name: "新能源", change_pct: 1.12, leader_stock: "N/A" },
                { name: "半导体", change_pct: 0.85, leader_stock: "N/A" },
                { name: "医药生物", change_pct: -0.05, leader_stock: "N/A" },
                { name: "消费电子", change_pct: -0.15, leader_stock: "N/A" },
                { name: "房地产", change_pct: -1.2, leader_stock: "N/A" },
                { name: "银行", change_pct: 0.1, leader_stock: "N/A" },
            ] as Sector[];
        }
        return data;
    }, [stocks.sectors]);

    const goldHistory = gold.history;

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".panorama-item", {
                opacity: 0,
                y: 20,
                stagger: 0.1,
                duration: 0.8,
                ease: "power2.out"
            });
        }, containerRef);
        return () => ctx.revert();
    }, [activeTab, sectors]); // Add sectors to animate when data arrives

    const getBlockColor = (change: number) => {
        if (change > 1.5) return "bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30 text-red-100 hover:from-red-500/30";
        if (change > 0) return "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20 text-red-200 hover:from-red-500/20";
        if (change === 0) return "bg-white/5 border-white/10 text-muted-foreground";
        if (change > -1.0) return "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 text-green-200 hover:from-green-500/20";
        return "bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30 text-green-100 hover:from-green-500/30";
    };

    return (
        <div ref={containerRef} className="glass-card rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[500px] relative group">
            {/* Header */}
            <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-black/20 backdrop-blur-md z-20">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-base font-bold text-white tracking-tight">市场全景</h2>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                            </span>
                            REAL-TIME MARKET DATA
                        </div>
                    </div>
                </div>

                <div className="flex space-x-1 bg-black/40 p-1 rounded-xl border border-white/5">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("heatmap")}
                        className={cn("h-8 text-xs px-4 font-medium rounded-lg transition-all", activeTab === "heatmap" ? "bg-white/10 text-white shadow-lg" : "text-muted-foreground hover:text-white hover:bg-white/5")}
                    >
                        <Layers className="h-3.5 w-3.5 mr-1.5" />
                        A股热力
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("gold")}
                        className={cn("h-8 text-xs px-4 font-medium rounded-lg transition-all", activeTab === "gold" ? "bg-[#ffd700]/20 text-[#ffd700] shadow-lg" : "text-muted-foreground hover:text-white hover:bg-white/5")}
                    >
                        <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                        黄金走势
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 flex-1 relative z-10">
                <AnimatePresence mode="wait">
                    {activeTab === "heatmap" ? (
                        <motion.div
                            key="heatmap"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full"
                        >
                            <div className="w-full h-full grid grid-cols-4 grid-rows-3 gap-3">
                                {sectors.length >= 7 && (
                                    <>
                                        {/* Main Leaders */}
                                        <div className={cn("panorama-item row-span-2 col-span-2 rounded-2xl border flex flex-col items-center justify-center p-6 cursor-pointer transition-all shadow-lg relative group overflow-hidden", getBlockColor(sectors[0].change_pct ?? 0))}>
                                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowUpRight className="h-5 w-5" />
                                            </div>
                                            <span className="text-3xl font-bold tracking-tight relative z-10">{sectors[0].name}</span>
                                            <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/5">
                                                <span className="text-lg font-mono font-bold">{(sectors[0].change_pct ?? 0) > 0 ? "+" : ""}{sectors[0].change_pct ?? 0}%</span>
                                            </div>
                                        </div>

                                        <div className={cn("panorama-item row-span-2 col-span-1 rounded-2xl border flex flex-col items-center justify-center p-4 cursor-pointer transition-all relative group", getBlockColor(sectors[1].change_pct ?? 0))}>
                                            <span className="text-xl font-bold">{sectors[1].name}</span>
                                            <span className="text-sm font-mono font-bold mt-1 opacity-80">{(sectors[1].change_pct ?? 0) > 0 ? "+" : ""}{sectors[1].change_pct ?? 0}%</span>
                                        </div>

                                        <div className={cn("panorama-item col-span-1 row-span-1 rounded-2xl border flex flex-col items-center justify-center p-3 cursor-pointer transition-all", getBlockColor(sectors[2].change_pct ?? 0))}>
                                            <span className="text-sm font-bold">{sectors[2].name}</span>
                                            <span className="text-xs font-mono mt-0.5 opacity-80">{(sectors[2].change_pct ?? 0) > 0 ? "+" : ""}{sectors[2].change_pct ?? 0}%</span>
                                        </div>

                                        <div className={cn("panorama-item col-span-1 row-span-1 rounded-2xl border flex flex-col items-center justify-center p-3 cursor-pointer transition-all", getBlockColor(sectors[3].change_pct ?? 0))}>
                                            <span className="text-sm font-bold">{sectors[3].name}</span>
                                            <span className="text-xs font-mono mt-0.5 opacity-80">{(sectors[3].change_pct ?? 0) > 0 ? "+" : ""}{sectors[3].change_pct ?? 0}%</span>
                                        </div>

                                        {/* Bottom Row */}
                                        <div className={cn("panorama-item col-span-1 rounded-2xl border flex flex-col items-center justify-center p-3 cursor-pointer transition-all", getBlockColor(sectors[4].change_pct ?? 0))}>
                                            <span className="text-sm font-bold">{sectors[4].name}</span>
                                            <span className="text-xs font-mono opacity-80">{(sectors[4].change_pct ?? 0) > 0 ? "+" : ""}{sectors[4].change_pct ?? 0}%</span>
                                        </div>
                                        <div className={cn("panorama-item col-span-2 rounded-2xl border flex flex-col items-center justify-center p-3 cursor-pointer transition-all", getBlockColor(sectors[5].change_pct ?? 0))}>
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg font-bold">{sectors[5].name}</span>
                                                <span className="text-sm font-mono opacity-80">{(sectors[5].change_pct ?? 0) > 0 ? "+" : ""}{sectors[5].change_pct ?? 0}%</span>
                                            </div>
                                        </div>
                                        <div className={cn("panorama-item col-span-1 rounded-2xl border flex flex-col items-center justify-center p-3 cursor-pointer transition-all", getBlockColor(sectors[6].change_pct ?? 0))}>
                                            <span className="text-sm font-bold">{sectors[6].name}</span>
                                            <span className="text-xs font-mono opacity-80">{(sectors[6].change_pct ?? 0) > 0 ? "+" : ""}{sectors[6].change_pct ?? 0}%</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="gold"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full flex flex-col"
                        >
                            <div className="flex items-baseline gap-4 mb-6 px-2 panorama-item">
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Spot Price (CNY/g)</div>
                                    <div className="text-4xl font-mono font-bold text-[#ffd700] drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">
                                        ¥{goldHistory.length > 0 ? goldHistory[goldHistory.length - 1].price_cny : "---"}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                    +0.45%
                                </div>
                            </div>

                            <div className="flex-grow w-full relative panorama-item">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={goldHistory}>
                                        <defs>
                                            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ffd700" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ffd700" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" hide />
                                        <YAxis domain={['auto', 'auto']} hide />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "rgba(9, 9, 11, 0.8)",
                                                borderColor: "rgba(255, 255, 255, 0.1)",
                                                color: "#e6edf3",
                                                borderRadius: "12px",
                                                backdropFilter: "blur(12px)",
                                                boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
                                            }}
                                            formatter={(value: any) => [`¥${value}`, "价格"]}
                                            labelFormatter={(label) => { try { const d = new Date(label); return isNaN(d.getTime()) ? label : `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`; } catch { return label; } }}
                                            itemStyle={{ color: "#ffd700", fontFamily: "var(--font-mono)" }}
                                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="price_cny"
                                            stroke="#ffd700"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#goldGradient)"
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Background Effects */}
            <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-primary/5 blur-[100px] rounded-full pointer-events-none z-0"></div>
            <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none z-0"></div>
        </div>
    );
}
