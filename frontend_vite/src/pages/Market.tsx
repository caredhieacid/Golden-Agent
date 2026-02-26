
import { useMemo } from "react";
import { useData } from "@/lib/data-provider";
import type { StockIndex, StockItem, Sector } from "@/types";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, BarChart2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ResponsiveContainer, Treemap, Tooltip as RechartsTooltip } from "recharts";

/* ─── Helpers ─── */
function fmt(v: number | null | undefined, decimals = 2): string {
    if (v == null) return "--";
    return v.toFixed(decimals);
}

function toNumber(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function fmtPct(v: number | null | undefined): string {
    if (v == null) return "--";
    const abs = Math.abs(v);
    const decimals = abs > 0 && abs < 0.01 ? 3 : 2;
    return v.toFixed(decimals);
}

function truncateLabel(label: string, boxWidth: number): string {
    const maxChars = Math.max(4, Math.floor(boxWidth / 12));
    return label.length > maxChars ? `${label.slice(0, Math.max(1, maxChars - 1))}…` : label;
}

function amountYi(v: number | null | undefined): string {
    if (v == null) return "--";
    return (v / 100000000).toFixed(1);
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 100, damping: 15 } as any
    }
};

/* ─── Custom Treemap Content ─── */
const getSectorColor = (change: number | null) => {
    // Fallback for null data (Grey Gradient)
    if (change == null) return "#27272a";

    // CN Market: Red = Up, Green = Down
    const isUp = change > 0;
    const abs = Math.min(Math.abs(change), 5); // Cap at 5%
    const intensity = abs / 5; // 0 to 1

    // Helper to mix colors
    const mix = (c1: [number, number, number], c2: [number, number, number], t: number) => {
        return [
            Math.round(c1[0] + (c2[0] - c1[0]) * t),
            Math.round(c1[1] + (c2[1] - c1[1]) * t),
            Math.round(c1[2] + (c2[2] - c1[2]) * t),
        ];
    };

    if (isUp) {
        // Red: Dark to Vivid
        const c = mix([127, 29, 29], [239, 68, 68], intensity);
        return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    } else {
        // Green: Dark to Vivid
        const c = mix([20, 83, 45], [34, 197, 94], intensity);
        return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
};

const CustomizedContent = (props: any) => {
    const { x, y, width, height, payload, name } = props;
    const node = payload ?? {};

    const data =
        payload?.payload ??
        payload ??
        node?.payload ??
        node ??
        props; // Add direct props fallback as last resort

    // Robust extraction: Check both payload and root props
    const changePct = toNumber(data?.change_pct ?? props.change_pct);
    const leaderName = data?.leader_stock ?? props.leader_stock;
    const leaderChange = toNumber(data?.leader_change_pct ?? props.leader_change_pct);

    const fill = getSectorColor(changePct);

    // Visibility
    const showLabel = width > 40 && height > 30;
    const showLeader = width > 80 && height > 60 && leaderName;

    const cx = x + width / 2;
    const cy = y + height / 2;

    // Truncate label
    const label = typeof name === "string" ? truncateLabel(name, width) : "";

    // Safe Font Sizing (Clamp) - Reduce to /8 to be safer
    const labelFontSize = Math.min(22, Math.max(12, width / 8));
    const pctFontSize = Math.min(16, Math.max(10, width / 9));
    const leaderFontSize = Math.min(12, Math.max(9, width / 11));

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill,
                    stroke: "#000",
                    strokeWidth: 2,
                    rx: 6,
                    ry: 6,
                }}
            />
            {showLabel && (
                <>
                    {/* Sector Name */}
                    <text
                        x={cx}
                        y={showLeader ? cy - 8 : cy - 5}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#fff"
                        fontSize={labelFontSize}
                        fontWeight={700}
                        style={{ pointerEvents: "none", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
                    >
                        {label}
                    </text>
                    {/* Sector Change % - Show placeholder if null */}
                    <text
                        x={cx}
                        y={showLeader ? cy + 8 : cy + 10}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="rgba(255,255,255,0.9)"
                        fontSize={pctFontSize}
                        fontWeight={500}
                        style={{ pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                    >
                        {changePct != null ? (changePct > 0 ? "+" : "") + fmtPct(changePct) + "%" : "-"}
                    </text>
                    {/* Leader Stock Info */}
                    {showLeader && (
                        <text
                            x={cx}
                            y={cy + 24}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="rgba(255,255,255,0.7)"
                            fontSize={leaderFontSize}
                            fontWeight={400}
                            style={{ pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                        >
                            {leaderName} {leaderChange != null ? (leaderChange > 0 ? "+" : "") + fmtPct(leaderChange) + "%" : ""}
                        </text>
                    )}
                </>
            )}
        </g>
    );
};

export default function Market() {
    const { stocks, global: globalIndices, ready, sseConnected } = useData();
    const indices = stocks.indices as StockIndex[];
    const hotStocks = stocks.hot as StockItem[];
    const sectors = stocks.sectors as Sector[];

    // 市场标签映射
    const MARKET_LABELS: Record<string, { name: string; flag: string }> = {
        us: { name: "美股", flag: "🇺🇸" },
        hk: { name: "港股", flag: "🇭🇰" },
        jp: { name: "日股", flag: "🇯🇵" },
        eu: { name: "欧洲", flag: "🇪🇺" },
        au: { name: "澳洲", flag: "🇦🇺" },
        kr: { name: "韩国", flag: "🇰🇷" },
        sg: { name: "新加坡", flag: "🇸🇬" },
    };


    const treemapData = useMemo(() => {
        // Strict Blacklist
        const BLACKLIST = [
            "概念", "昨日", "近期", "东方财富", "指数", "板块", "活跃", "统计", "甚至", "即便", "主要", "其他",
            "多板", "连板", "预测", "风格", "成分", "地区", "竞价", "华为", "苹果", "小米", "英伟达", "算力", "CPO", "PCB", "ETF", "LOF", "债"
        ];

        const cleanSectors = sectors.filter(s => {
            const name = s.name || "";
            // Removed strict data checks to allow fallback display

            // B. Must not be in Blacklist
            if (BLACKLIST.some(w => name.includes(w))) return false;

            // C. Must not be too long
            if (name.length > 5) return false;

            return true;
        });

        // Sort & Slice Top 8
        const sortedSectors = cleanSectors
            .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
            .slice(0, 8);

        return [{
            name: "Market",
            children: sortedSectors.map((s) => ({
                name: s.name,
                // Fallback size if amounts are missing
                size: Math.max(s.amount ?? 0, 1000),
                change_pct: toNumber(s.change_pct),
                amount: s.amount,
                market_cap: s.market_cap,
                leader_stock: s.leader_stock,
                leader_change_pct: s.leader_change_pct
            }))
        }];
    }, [sectors]);

    return (
        <div className="container py-8 px-4 md:px-6 relative z-10 max-w-7xl mx-auto" >
            {/* 装饰背景 */}
            < div className="absolute top-20 right-0 w-[500px] h-[500px] bg-red-600/5 blur-[150px] -z-10 rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-600/5 blur-[150px] -z-10 rounded-full pointer-events-none" />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-8"
            >
                {/* 头部 */}
                <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
                            A股 <span className="text-primary">全景</span> <span className="text-xs text-muted-foreground opacity-50 font-normal">v2.2</span>
                        </h1>
                        <p className="text-muted-foreground">
                            AKShare 数据驱动的实时市场洞察与 SSE 推送。
                        </p>
                    </div>
                    <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 bg-black/20 border-white/5">
                        <span className="relative flex h-2 w-2">
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", sseConnected ? "bg-green-500" : "bg-yellow-500")}></span>
                            <span className={cn("relative inline-flex rounded-full h-2 w-2", sseConnected ? "bg-green-500" : "bg-yellow-500")}></span>
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">{sseConnected ? "实时推送" : "连接中..."}</span>
                    </div>
                </motion.div>

                {/* 指数展示 */}
                <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {!ready ? (
                        Array(4).fill(0).map((_, i) => (
                            <div key={i} className="glass-card h-32 animate-pulse rounded-2xl" />
                        ))
                    ) : (
                        indices.slice(0, 4).map((index) => {
                            const isUp = (index.change_pct ?? 0) > 0;
                            return (
                                <div key={index.code} className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                                    <div className={cn("absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity", isUp ? "text-red-500" : "text-green-500")}>
                                        <Activity className="w-24 h-24 -mr-4 -mt-4 opacity-50" />
                                    </div>
                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <span className="text-sm font-medium text-muted-foreground">{index.name}</span>
                                        <Badge variant="outline" className={cn("border-0 font-bold", isUp ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400")}>
                                            {isUp ? "+" : ""}{fmt(index.change_pct)}%
                                        </Badge>
                                    </div>
                                    <div className={cn("text-3xl font-bold tracking-tighter mb-1 relative z-10", isUp ? "text-red-400" : "text-green-400")}>
                                        {fmt(index.price)}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground/70 relative z-10">
                                        <span>Vol: {amountYi(index.amount)}Yi</span>
                                        <span className={cn("flex items-center", isUp ? "text-red-400/70" : "text-green-400/70")}>
                                            {isUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                            {fmt(index.change_amount)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </motion.div>

                {/* 全球指数 */}
                {Object.keys(globalIndices).length > 0 && (
                    <motion.div variants={itemVariants}>
                        <div className="flex items-center gap-2 mb-4">
                            <Globe className="h-5 w-5 text-blue-400" />
                            <h2 className="text-xl font-bold text-white">全球市场</h2>
                            <span className="text-xs text-muted-foreground ml-2">Global Markets</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {Object.entries(globalIndices).flatMap(([market, indices]) =>
                                indices.slice(0, 4).map((idx: any, i: number) => {
                                    const marketInfo = MARKET_LABELS[market] || { name: market.toUpperCase(), flag: "🌍" };
                                    const isUp = (idx.change_pct ?? 0) > 0;
                                    return (
                                        <motion.div
                                            key={`${market}-${idx.code}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="glass-card rounded-xl p-4 relative overflow-hidden group hover:-translate-y-0.5 transition-transform"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <span>{marketInfo.flag}</span>
                                                    <span>{marketInfo.name}</span>
                                                </span>
                                                <Badge variant="outline" className={cn("border-0 text-[10px]", isUp ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                                                    {isUp ? "+" : ""}{fmt(idx.change_pct)}%
                                                </Badge>
                                            </div>
                                            <div className="text-lg font-bold text-white truncate mb-1">{idx.name}</div>
                                            <div className={cn("text-2xl font-bold font-mono", isUp ? "text-green-400" : "text-red-400")}>
                                                {fmt(idx.price)}
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}

                <div className="grid gap-6 md:grid-cols-7">
                    {/* 热门板块 Treemap */}
                    <motion.div variants={itemVariants} className="md:col-span-3 lg:col-span-3 flex flex-col min-h-0 h-[420px] sm:h-[460px] lg:h-[500px]">
                        <Card className="glass-card border-none bg-black/20 flex-1 flex flex-col min-h-0 h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <BarChart2 className="h-5 w-5 text-primary" /> 板块热力图
                                </CardTitle>
                                <CardDescription>按交易额权重的市场热度</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 p-2 min-h-0">
                                {sectors.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <Treemap
                                            data={treemapData}
                                            dataKey="size"
                                            isAnimationActive={false}
                                            animationDuration={0}
                                            content={<CustomizedContent />}
                                        >
                                            <RechartsTooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        const v = toNumber(data.change_pct);
                                                        return (
                                                            <div className="glass-panel p-3 rounded-xl border border-white/10 shadow-xl bg-[#09090b]/90 backdrop-blur-md">
                                                                <p className="font-bold text-white mb-1">{data.name}</p>
                                                                {v != null ? (
                                                                    <p className={cn("text-sm font-mono mb-2", v > 0 ? "text-red-400" : "text-green-400")}>
                                                                        涨跌: {v > 0 ? "+" : ""}{fmtPct(v)}%
                                                                    </p>
                                                                ) : null}
                                                                <div className="space-y-1 text-xs text-muted-foreground border-t border-white/10 pt-2 mt-1">
                                                                    {data.market_cap && <p>市值: {amountYi(data.market_cap)}亿</p>}
                                                                    {data.amount && <p>成交: {amountYi(data.amount)}亿</p>}
                                                                    {data.leader_stock && (
                                                                        <p className="text-zinc-400 mt-1">
                                                                            领涨: <span className="text-zinc-200">{data.leader_stock}</span>
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                        </Treemap>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        暂无板块数据
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* 个股排行 */}
                    <motion.div variants={itemVariants} className="md:col-span-4 lg:col-span-4 flex flex-col min-h-0 h-[420px] sm:h-[460px] lg:h-[500px]">
                        <Card className="glass-card border-none bg-black/20 flex-1 flex flex-col min-h-0">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Activity className="h-5 w-5 text-red-500" /> 市场异动
                                </CardTitle>
                                <div className="flex items-center justify-between">
                                    <CardDescription>按成交量/涨跌幅排名的活跃个股</CardDescription>
                                    <Badge variant="outline" className="border-white/10 text-[10px] text-muted-foreground bg-white/5">
                                        实时
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 min-h-0 overflow-auto overscroll-contain no-scrollbar" data-lenis-prevent>
                                <Table>
                                    <TableHeader className="bg-white/5 sticky top-0 backdrop-blur-md">
                                        <TableRow className="border-white/5 hover:bg-transparent">
                                            <TableHead className="w-[80px]">代码</TableHead>
                                            <TableHead>名称</TableHead>
                                            <TableHead className="text-right">价格</TableHead>
                                            <TableHead className="text-right">涨跌幅</TableHead>
                                            <TableHead className="text-right">成交额(亿)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {hotStocks.length > 0 ? (
                                            hotStocks.map((stock) => (
                                                <TableRow key={stock.code} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                    <TableCell className="font-mono text-xs text-muted-foreground group-hover:text-primary transition-colors">{stock.code}</TableCell>
                                                    <TableCell className="font-medium text-gray-200">{stock.name}</TableCell>
                                                    <TableCell className="text-right font-mono text-white/90">{fmt(stock.price)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline" className={cn("border-0 font-mono text-xs h-5 px-1.5",
                                                            (stock.change_pct ?? 0) > 0 ? "bg-red-500/10 text-red-400" :
                                                                (stock.change_pct ?? 0) < 0 ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400")}>
                                                            {(stock.change_pct ?? 0) > 0 ? "+" : ""}{fmt(stock.change_pct)}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-muted-foreground text-xs">
                                                        {amountYi(stock.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">加载市场数据中...</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </motion.div>
        </div >
    );
}
