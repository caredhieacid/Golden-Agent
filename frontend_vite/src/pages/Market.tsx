
import { useMemo } from "react";
import { useData } from "@/lib/data-provider";
import type { StockIndex, StockItem, Sector } from "@/types";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ResponsiveContainer, Treemap, Tooltip as RechartsTooltip } from "recharts";

/* ─── Helpers ─── */
function fmt(v: number | null | undefined, decimals = 2): string {
    if (v == null) return "--";
    return v.toFixed(decimals);
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
const CustomizedContent = (props: any) => {
    const { depth, x, y, width, height, payload, name } = props;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: payload.fill,
                    stroke: "rgba(255,255,255,0.1)",
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
            />
            {width > 50 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                    dy={-6}
                    style={{ fontWeight: "bold", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                >
                    {name}
                </text>
            )}
            {width > 50 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.8)"
                    fontSize={10}
                    dy={8}
                >
                    {payload.change_pct > 0 ? "+" : ""}{fmt(payload.change_pct)}%
                </text>
            )}
        </g>
    );
};

export default function Market() {
    const { stocks, ready, sseConnected } = useData();
    const indices = stocks.indices as StockIndex[];
    const hotStocks = stocks.hot as StockItem[];
    const sectors = stocks.sectors as Sector[];



    const treemapData = useMemo(() => {
        return [{
            name: "Market",
            children: sectors.map((s) => ({
                name: s.name,
                size: Math.abs(s.change_pct || 0) + 0.5, // Mock size for visibility
                change_pct: s.change_pct || 0,
                fill: (s.change_pct || 0) >= 0 ?
                    `rgba(239, 68, 68, ${Math.min(0.3 + (s.change_pct || 0) * 0.1, 0.9)})` : // Red for positive (CN)
                    `rgba(34, 197, 94, ${Math.min(0.3 + Math.abs(s.change_pct || 0) * 0.1, 0.9)})`   // Green for negative
            }))
        }];
    }, [sectors]);

    return (
        <div className="container py-8 px-4 md:px-6 relative z-10 max-w-7xl mx-auto">
            {/* 装饰背景 */}
            <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-red-600/5 blur-[150px] -z-10 rounded-full pointer-events-none" />
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
                            A股 <span className="text-primary">全景</span>
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

                <div className="grid gap-6 md:grid-cols-7 h-full">
                    {/* 热门板块 Treemap */}
                    <motion.div variants={itemVariants} className="md:col-span-3 lg:col-span-3 flex flex-col h-[500px]">
                        <Card className="glass-card border-none bg-black/20 flex-1 flex flex-col h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <BarChart2 className="h-5 w-5 text-primary" /> 板块热力图
                                </CardTitle>
                                <CardDescription>各行业板块市场表现</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 p-2 min-h-0">
                                {sectors.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <Treemap
                                            data={treemapData}
                                            dataKey="size"
                                            stroke="#fff"
                                            fill="#8884d8"
                                            content={<CustomizedContent />}
                                        >
                                            <RechartsTooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="glass-panel p-3 rounded-xl border border-white/10 shadow-xl bg-[#09090b]/90 backdrop-blur-md">
                                                                <p className="font-bold text-white mb-1">{data.name}</p>
                                                                <p className={cn("text-sm font-mono", data.change_pct > 0 ? "text-red-400" : "text-green-400")}>
                                                                    Change: {data.change_pct > 0 ? "+" : ""}{fmt(data.change_pct)}%
                                                                </p>
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
                    <motion.div variants={itemVariants} className="md:col-span-4 lg:col-span-4 h-[500px] flex flex-col">
                        <Card className="glass-card border-none bg-black/20 flex-1 flex flex-col">
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
                            <CardContent className="p-0 overflow-auto no-scrollbar flex-1">
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
        </div>
    );
}
