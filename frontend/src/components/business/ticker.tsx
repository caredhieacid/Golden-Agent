"use client";

import { useMemo } from "react";
import { useData } from "@/lib/data-provider";
import { ArrowUp, ArrowDown, Minus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TickerData {
    label: string;
    value: string;
    change: number | null;
    isGold?: boolean;
}

export function Ticker() {
    const { gold, stocks, ready } = useData();

    const tickerItems = useMemo(() => {
        const items: TickerData[] = [];

        // 黄金数据
        const goldPrices = gold.prices;
        if (goldPrices) {
            if (goldPrices.international_usd != null) {
                items.push({
                    label: "现货黄金",
                    value: `$${goldPrices.international_usd.toFixed(2)}`,
                    change: goldPrices.spread_pct ?? null,
                    isGold: true
                });
            }
            if (goldPrices.domestic_cny != null) {
                items.push({
                    label: "黄金 (CNY)",
                    value: `¥${goldPrices.domestic_cny.toFixed(2)}`,
                    change: null,
                    isGold: true
                });
            }
        }

        // A股指数
        for (const idx of stocks.indices) {
            items.push({
                label: (idx as any).name ?? "未知",
                value: (idx as any).price != null ? (idx as any).price.toFixed(2) : "--",
                change: (idx as any).change_pct ?? null,
                isGold: false
            });
        }

        return items;
    }, [gold.prices, stocks.indices]);

    if (!ready) {
        return (
            <div className="h-10 w-full flex items-center justify-center text-xs text-secondary-foreground/50 glass border-y border-border/40">
                <Loader2 className="h-3 w-3 animate-spin mr-2" /> 正在连接实时数据...
            </div>
        );
    }

    if (tickerItems.length === 0) return null;

    return (
        <div className="w-full h-10 overflow-hidden relative z-40 glass border-y border-border/40 flex items-center shadow-sm">
            <motion.div
                className="flex items-center whitespace-nowrap"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 40, // Adjust speed here
                }}
                whileHover={{ animationPlayState: "paused" }} // Note: Framer motion doesn't support playState directly like this easily without useAnimation, but CSS hover works if we use CSS module or simply use standard styles. 
            // Alternatively, let's use a simple CSS animation class for the loop to keep it robust, and framer motion for items.
            // Actually the previous css animation was fine, let's stick to framer motion but maybe just use the basic animate.
            >
                {/* 三组实现无缝滚动 */}
                {[1, 2, 3, 4].map(group => (
                    <div key={group} className="flex shrink-0 items-center">
                        {tickerItems.map((item, i) => (
                            <TickerItem key={`${group}-${i}`} {...item} />
                        ))}
                    </div>
                ))}
            </motion.div>

            {/* 左右遮罩渐变 (Glass specific) */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background/80 to-transparent pointer-events-none z-10 backdrop-blur-[2px]"></div>
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background/80 to-transparent pointer-events-none z-10 backdrop-blur-[2px]"></div>
        </div>
    );
}

function TickerItem({ label, value, change, isGold }: TickerData) {
    const isUp = change != null && change > 0;
    const isDown = change != null && change < 0;

    const valueColor = isGold ? "text-amber-500 font-bold" : "text-foreground";
    const changeColor = isUp ? "text-rise font-medium" : isDown ? "text-fall font-medium" : "text-muted-foreground";
    const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;

    return (
        <div className="flex items-center px-6 h-full border-r border-border/10 group transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
            <span className="text-[10px] font-bold text-muted-foreground uppercase mr-2 tracking-wider group-hover:text-primary transition-colors">{label}</span>
            <span className={cn("font-mono text-xs mr-2 transition-colors", valueColor)}>{value}</span>
            {change != null && (
                <span className={cn("flex items-center text-[10px] font-mono", changeColor)}>
                    <Icon className="h-2.5 w-2.5 mr-0.5" />
                    {Math.abs(change).toFixed(2)}%
                </span>
            )}
        </div>
    );
}
