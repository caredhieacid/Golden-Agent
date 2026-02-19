
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RefreshCw, User, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { formatChamber, formatParty, formatPoliticianDisplayName, formatUsState } from "@/lib/utils";

function safeDate(d: string | null | undefined): string {
    if (!d) return "--";
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return "--";
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    } catch { return "--"; }
}

function formatMoney(val: number | null): string {
    if (!val) return "--";
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
}

const PARTY_COLORS: Record<string, string> = {
    D: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    R: "bg-red-500/20 text-red-400 border-red-500/40",
    I: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
};

export default function PoliticianDetail() {
    const { name: nameParam } = useParams();
    const name = decodeURIComponent(nameParam || "");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!name) return;
        api.congress.getPoliticianDetail(name)
            .then(setData)
            .catch(() => setError("议员信息未找到"))
            .finally(() => setLoading(false));
    }, [name]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
                <span>加载议员信息中...</span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <p className="text-muted-foreground">{error || "未找到该议员"}</p>
            </div>
        );
    }

    const buyTrades = data.trades?.filter((t: any) => t.transaction_type?.includes("purchase")) || [];
    const sellTrades = data.trades?.filter((t: any) => !t.transaction_type?.includes("purchase")) || [];

    return (
        <div className="container py-8 px-4 md:px-6">
            {/* 议员信息头部 */}
            <div className="flex items-start gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center border border-border/40">
                    <User className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{formatPoliticianDisplayName(data.full_name)}</h1>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge className={PARTY_COLORS[data.party] || ""}>{formatParty(data.party)}</Badge>
                        <Badge variant="outline">{formatChamber(data.chamber)}</Badge>
                        <Badge variant="outline">{formatUsState(data.state)}</Badge>
                        {data.district && <Badge variant="outline">第 {data.district} 选区</Badge>}
                    </div>
                </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">总交易数</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.trade_count}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">买入次数</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{buyTrades.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">卖出次数</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{sellTrades.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">涉及股票数</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.top_stocks?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* 高频交易股票 */}
            {data.top_stocks?.length > 0 && (
                <Card className="mb-8">
                    <CardHeader><CardTitle>高频交易股票</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {data.top_stocks.map((s: any) => (
                                <div key={s.ticker} className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2 border border-border/30">
                                    <Badge variant="outline" className="font-mono font-bold">{s.ticker}</Badge>
                                    <span className="text-sm text-muted-foreground">{s.trade_count} 笔</span>
                                    <span className="text-xs text-muted-foreground">
                                        ({formatMoney(s.total_amount_min)} - {formatMoney(s.total_amount_max)})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 交易明细 */}
            <Card>
                <CardHeader><CardTitle>交易记录</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>披露日期</TableHead>
                                <TableHead>股票</TableHead>
                                <TableHead>公司</TableHead>
                                <TableHead>操作</TableHead>
                                <TableHead>金额范围</TableHead>
                                <TableHead className="text-right">交易日期</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(data.trades || []).map((t: any, i: number) => (
                                <TableRow key={t.id ?? i}>
                                    <TableCell className="text-muted-foreground">{safeDate(t.disclosure_date)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono">{t.ticker}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{t.company_name || "--"}</TableCell>
                                    <TableCell>
                                        <span className={t.transaction_type?.includes("purchase") ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                                            {t.transaction_type?.includes("purchase") ? "买入" : "卖出"}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {t.amount_min != null
                                            ? `${formatMoney(t.amount_min)} - ${formatMoney(t.amount_max)}`
                                            : "未披露"}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">{safeDate(t.transaction_date)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
