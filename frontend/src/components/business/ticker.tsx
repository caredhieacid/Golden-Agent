"use client";

import { useMemo } from "react";
import { useData } from "@/lib/data-provider";
import { ArrowUp, ArrowDown, Minus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

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
                    label: "现货黄金 (Intl)",
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
            <div className="h-10 w-full bg-[#0D1117] border-b border-border/10 flex items-center justify-center text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin mr-2" /> 加载行情数据...
            </div>
        );
    }

    if (tickerItems.length === 0) {
        return (
            <div className="h-10 w-full bg-[#0D1117] border-b border-border/10 flex items-center justify-center text-xs text-muted-foreground">
                暂无行情数据
            </div>
        );
    }

    return (
        <div className="w-full bg-[#0D1117] border-b border-border/10 overflow-hidden h-9 flex items-center relative z-40 shadow-sm">
            <div className="flex animate-ticker hover:[animation-play-state:paused] whitespace-nowrap will-change-transform items-center">
                {/* 三组实现无缝滚动 */}
                {[1, 2, 3].map(group => (
                    <div key={group} className="flex shrink-0 items-center">
                        {tickerItems.map((item, i) => (
                            <TickerItem key={`${group}-${i}`} {...item} />
                        ))}
                    </div>
                ))}
            </div>

            {/* 左右遮罩渐变 */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0D1117] to-transparent pointer-events-none z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0D1117] to-transparent pointer-events-none z-10"></div>
        </div>
    );
}

function TickerItem({ label, value, change, isGold }: TickerData) {
    const isUp = change != null && change > 0;
    const isDown = change != null && change < 0;

    const valueColor = isGold ? "text-[#ffd700]" : "text-gray-200";
    const changeColor = isUp ? "text-red-400" : isDown ? "text-green-400" : "text-muted-foreground";
    const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;

    return (
        <div className="flex items-center px-6 h-full border-r border-white/5 group transition-colors hover:bg-white/5 cursor-pointer">
            <span className="text-[10px] font-bold text-muted-foreground uppercase mr-2 tracking-wider group-hover:text-gray-400 transition-colors">{label}</span>
            <span className={cn("font-mono font-medium text-xs mr-2 transition-colors", valueColor)}>{value}</span>
            {change != null && (
                <span className={cn("flex items-center text-[10px] font-medium font-mono", changeColor)}>
                    <Icon className="h-2.5 w-2.5 mr-0.5" />
                    {Math.abs(change).toFixed(2)}%
                </span>
            )}
        </div>
    );
}
