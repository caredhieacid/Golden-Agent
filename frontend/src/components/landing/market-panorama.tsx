"use client";

import { useState, useMemo } from "react";
import { useData } from "@/lib/data-provider";
import { Sector } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function MarketPanorama() {
    const { stocks, gold } = useData();
    const [activeTab, setActiveTab] = useState("heatmap");

    const sectors = useMemo(() => {
        const data = stocks.sectors as Sector[];
        if (data.length === 0) {
            // Fallback mock data for visual testing
            return [
                { name: "TMT 科技", change_pct: 2.45, leader_stock: "N/A" },
                { name: "新能源", change_pct: 1.12, leader_stock: "N/A" },
                { name: "半导体", change_pct: 0.85, leader_stock: "N/A" },
                { name: "医药生物", change_pct: -0.05, leader_stock: "N/A" },
                { name: "消费电子", change_pct: -0.15, leader_stock: "N/A" },
                { name: "房地产", change_pct: -1.2, leader_stock: "N/A" },
                { name: "银行", change_pct: 0.0, leader_stock: "N/A" },
            ] as Sector[];
        }
        return data;
    }, [stocks.sectors]);

    const goldHistory = gold.history;

    // Helper to determine block color based on change
    const getBlockColor = (change: number) => {
        if (change > 1.5) return "bg-primary/30 border-primary/50 text-white";
        if (change > 0) return "bg-primary/10 border-primary/20 text-gray-200";
        if (change === 0) return "bg-muted/20 border-border/20 text-muted-foreground";
        if (change > -1.0) return "bg-destructive/10 border-destructive/20 text-gray-300";
        return "bg-destructive/20 border-destructive/40 text-white";
    };

    return (
        <Card className="w-full glass-card border-0 shadow-2xl mb-12 overflow-hidden flex flex-col">
            <div className="border-b border-border/10 px-5 py-4 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        市场概览全景
                    </h2>
                    <div className="flex space-x-1 bg-black/40 p-1 rounded-lg border border-white/5">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab("heatmap")}
                            className={cn("h-6 text-[10px] px-3 font-medium rounded-md transition-all", activeTab === "heatmap" ? "bg-primary/20 text-primary shadow-sm" : "text-muted-foreground hover:text-gray-300")}
                        >
                            A股热力图
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab("gold")}
                            className={cn("h-6 text-[10px] px-3 font-medium rounded-md transition-all", activeTab === "gold" ? "bg-[#ffd700]/20 text-[#ffd700] shadow-sm" : "text-muted-foreground hover:text-gray-300")}
                        >
                            黄金走势
                        </Button>
                    </div>
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-mono bg-black/30 px-2 py-1 rounded-full border border-white/5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    LIVE DATA
                </div>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[420px]">
                {/* Heatmap Area */}
                <div className="lg:col-span-2 bg-[#0D1117]/50 rounded-xl border border-white/5 p-1 relative overflow-hidden shadow-inner flex flex-col">
                    <div className="absolute inset-0 p-2 flex flex-wrap content-start">
                        {/* Complex Grid for Treemap feel */}
                        {sectors.length >= 7 ? (
                            <div className="w-full h-full grid grid-cols-4 grid-rows-3 gap-1.5">
                                {/* Main Leaders */}
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                                    className={cn("row-span-2 col-span-2 rounded-lg border flex flex-col items-center justify-center p-4 cursor-pointer hover:brightness-110 transition-all shadow-sm relative group overflow-hidden", getBlockColor(sectors[0].change_pct ?? 0))}
                                >
                                    <span className="text-xl font-bold tracking-tight relative z-10">{sectors[0].name}</span>
                                    <span className="text-sm font-mono font-bold mt-1 relative z-10">{(sectors[0].change_pct ?? 0) > 0 ? "+" : ""}{sectors[0].change_pct ?? 0}%</span>
                                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                                </motion.div>

                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                                    className={cn("row-span-2 col-span-1 rounded-lg border flex flex-col items-center justify-center p-2 cursor-pointer hover:brightness-110 transition-all relative group", getBlockColor(sectors[1].change_pct ?? 0))}
                                >
                                    <span className="text-sm font-bold">{sectors[1].name}</span>
                                    <span className="text-xs font-mono font-bold mt-1">{(sectors[1].change_pct ?? 0) > 0 ? "+" : ""}{sectors[1].change_pct ?? 0}%</span>
                                </motion.div>

                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                                    className={cn("col-span-1 row-span-1 rounded-lg border flex flex-col items-center justify-center p-2 cursor-pointer hover:brightness-110 transition-all", getBlockColor(sectors[2].change_pct ?? 0))}
                                >
                                    <span className="text-xs font-bold">{sectors[2].name}</span>
                                    <span className="text-[10px] font-mono mt-0.5">{(sectors[2].change_pct ?? 0) > 0 ? "+" : ""}{sectors[2].change_pct ?? 0}%</span>
                                </motion.div>

                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}
                                    className={cn("col-span-1 row-span-1 rounded-lg border flex flex-col items-center justify-center p-2 cursor-pointer hover:brightness-110 transition-all", getBlockColor(sectors[3].change_pct ?? 0))}
                                >
                                    <span className="text-xs font-bold">{sectors[3].name}</span>
                                    <span className="text-[10px] font-mono mt-0.5">{(sectors[3].change_pct ?? 0) > 0 ? "+" : ""}{sectors[3].change_pct ?? 0}%</span>
                                </motion.div>

                                {/* Bottom Row */}
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                                    className={cn("col-span-1 rounded-lg border flex flex-col items-center justify-center p-2 cursor-pointer hover:brightness-110 transition-all", getBlockColor(sectors[4].change_pct ?? 0))}
                                >
                                    <span className="text-xs font-bold">{sectors[4].name}</span>
                                    <span className="text-[10px] font-mono">{(sectors[4].change_pct ?? 0) > 0 ? "+" : ""}{sectors[4].change_pct ?? 0}%</span>
                                </motion.div>
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
                                    className={cn("col-span-2 rounded-lg border flex flex-col items-center justify-center p-2 cursor-pointer hover:brightness-110 transition-all", getBlockColor(sectors[5].change_pct ?? 0))}
                                >
                                    <span className="text-xs font-bold">{sectors[5].name}</span>
                                    <span className="text-[10px] font-mono">{(sectors[5].change_pct ?? 0) > 0 ? "+" : ""}{sectors[5].change_pct ?? 0}%</span>
                                </motion.div>
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}
                                    className={cn("col-span-1 rounded-lg border flex flex-col items-center justify-center p-2 cursor-pointer hover:brightness-110 transition-all", getBlockColor(sectors[6].change_pct ?? 0))}
                                >
                                    <span className="text-xs font-bold">{sectors[6].name}</span>
                                    <span className="text-[10px] font-mono">{(sectors[6].change_pct ?? 0) > 0 ? "+" : ""}{sectors[6].change_pct ?? 0}%</span>
                                </motion.div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                                加载板块数据中...
                            </div>
                        )}
                    </div>
                </div>

                {/* Gold Chart Area */}
                <div className="lg:col-span-1 flex flex-col bg-[#0D1117]/50 rounded-xl border border-white/5 p-4 shadow-inner relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">XAU/CNY</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[#ffd700] font-mono font-bold text-2xl text-shadow-glow">
                                    {goldHistory.length > 0 ? goldHistory[goldHistory.length - 1].price_cny : "---"}
                                </span>
                                <span className="text-[10px] text-primary/80 font-mono">+0.45%</span>
                            </div>
                        </div>
                        <div className="p-2 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/20 animate-glow-pulse">
                            <TrendingUp className="h-5 w-5 text-[#ffd700]" />
                        </div>
                    </div>

                    <div className="flex-grow w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={goldHistory}>
                                <defs>
                                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ffd700" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#ffd700" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis domain={['auto', 'auto']} hide />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(13, 17, 23, 0.9)",
                                        borderColor: "rgba(255, 255, 255, 0.1)",
                                        color: "#e6edf3",
                                        borderRadius: "8px",
                                        backdropFilter: "blur(4px)",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
                                    }}
                                    formatter={(value: any) => [`¥${value}`, "价格"]}
                                    labelFormatter={(label) => { try { const d = new Date(label); return isNaN(d.getTime()) ? label : `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`; } catch { return label; } }}
                                    itemStyle={{ color: "#ffd700", fontFamily: "var(--font-mono)" }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="price_cny"
                                    stroke="#ffd700"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#goldGradient)"
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>

                        {/* Blinking Dot (Simulated at end of line) */}
                        <div className="absolute right-[2px] top-[30%] w-2 h-2 rounded-full bg-[#ffd700] shadow-[0_0_10px_#ffd700] animate-pulse"></div>
                    </div>

                    {/* Timeframe Selector */}
                    <div className="flex justify-between mt-4 border-t border-white/5 pt-3">
                        {['1D', '1W', '1M', '3M', '1Y'].map((t, i) => (
                            <button key={t} className={cn(
                                "text-[10px] font-medium px-2 py-0.5 rounded hover:bg-white/5 transition-colors",
                                i === 2 ? "text-primary bg-primary/10" : "text-muted-foreground"
                            )}>{t}</button>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
}
