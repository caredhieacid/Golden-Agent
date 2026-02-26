import { useMemo, useState } from "react";
import { useData } from "@/lib/data-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    RefreshCw, Sparkles, Activity, AlertTriangle, Clock,
    TrendingUp, TrendingDown, Minus, Target, ShieldAlert,
    BarChart3, ChevronDown, ChevronUp, Info,
    Database, Cpu, Users, Wallet, PieChart, LineChart,
    FileWarning, Scale
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

// A Stock name mapping for common tickers
const A_STOCK_NAMES: Record<string, string> = {
    "600519": "贵州茅台",
    "000858": "五粮液",
    "601318": "中国平安",
    "600036": "招商银行",
    "601166": "兴业银行",
    "000333": "美的集团",
    "600276": "恒瑞医药",
    "000651": "格力电器",
    "601398": "工商银行",
    "601288": "农业银行",
    "600030": "中信证券",
    "601888": "中国中免",
    "300750": "宁德时代",
    "002594": "比亚迪",
    "300059": "东方财富",
};

// US Stock name mapping
const US_STOCK_NAMES: Record<string, string> = {
    "AAPL": "苹果公司",
    "MSFT": "微软",
    "GOOGL": "谷歌",
    "AMZN": "亚马逊",
    "NVDA": "英伟达",
    "META": "Meta",
    "TSLA": "特斯拉",
    "BRK.B": "伯克希尔B",
    "JPM": "摩根大通",
    "V": "Visa",
    "JNJ": "强生",
    "WMT": "沃尔玛",
    "PG": "宝洁",
    "MA": "万事达",
    "UNH": "联合健康",
    "HD": "家得宝",
    "DIS": "迪士尼",
    "PYPL": "PayPal",
    "BAC": "美国银行",
    "ADBE": "Adobe",
};

interface Recommendation {
    id: string;
    market: "us" | "cn";
    ticker: string;
    action: "buy" | "sell" | "hold";
    confidence: number;
    risk_level: string;
    reasoning: string | Record<string, any>;
    price_target?: number;
    stop_loss?: number;
    created_at: string;
    // Stock info
    company_name?: string;
    // Extended fields for enhanced display
    position_size?: string;
    suitable_for?: string[];
    fundamental_analysis?: string[];
    technical_signals?: string[];
    institutional_behavior?: string[];
    risk_factors?: string[];
    model_version?: string;
    data_sources?: string[];
}

// Helper to extract reasoning text
function getReasoningText(reasoning: string | Record<string, any>): string {
    if (typeof reasoning === "string") {
        return reasoning;
    }
    if (typeof reasoning === "object" && reasoning !== null) {
        // Combine all text values from the object
        const parts: string[] = [];
        for (const key of Object.keys(reasoning)) {
            const value = reasoning[key];
            if (typeof value === "string") {
                parts.push(value);
            } else if (Array.isArray(value)) {
                parts.push(value.join(" | "));
            }
        }
        return parts.join(" | ");
    }
    return "基于多维度综合分析";
}

function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
}

function statusBadge(status: string) {
    if (status === "running") return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    if (status === "error") return "bg-red-500/10 text-red-400 border-red-500/30";
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
}

function typeBadge(type: string) {
    if (type === "ai_signal") return "bg-red-500/10 text-red-400 border-red-500/30";
    return "bg-purple-500/10 text-purple-400 border-purple-500/30";
}

function actionBadge(action: string) {
    if (action === "buy") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (action === "sell") return "bg-red-500/10 text-red-400 border-red-500/30";
    return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
}

function actionProfessionalText(action: string): string {
    if (action === "buy") return "买入评级";
    if (action === "sell") return "卖出评级";
    return "持有评级";
}

function riskBadge(risk: string) {
    const level = (risk || "").toLowerCase();
    if (level === "high") return "bg-red-500/10 text-red-400 border-red-500/30";
    if (level === "medium") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
}

function riskText(risk: string): string {
    const level = (risk || "").toLowerCase();
    if (level === "high") return "高风险";
    if (level === "medium") return "中风险";
    return "低风险";
}

function confidenceColor(confidence: number): string {
    if (confidence >= 0.8) return "bg-emerald-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
}

function ActionIcon({ action }: { action: string }) {
    if (action === "buy") return <TrendingUp className="h-4 w-4" />;
    if (action === "sell") return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
}

function isUsTicker(ticker: string) {
    return /^[A-Z.-]{1,10}$/.test(ticker);
}

function formatTicker(ticker: string): string {
    // Format 6-digit code for A-shares
    if (/^\d{6}$/.test(ticker)) {
        return ticker;
    }
    return ticker.toUpperCase();
}

function getStockName(ticker: string, market: "us" | "cn"): string {
    if (market === "cn") {
        return A_STOCK_NAMES[ticker] || `A股 ${ticker}`;
    }
    return US_STOCK_NAMES[ticker.toUpperCase()] || ticker.toUpperCase();
}

function formatPrice(price: number | undefined, market: "us" | "cn"): string {
    if (!price) return "--";
    if (market === "cn") {
        return `¥${price.toFixed(2)}`;
    }
    return `$${price.toFixed(2)}`;
}



function buildEvidenceChain(rec: Recommendation): string[] {
    const evidence: string[] = [];
    const addMany = (items?: string[]) => {
        if (!items) return;
        for (const item of items) {
            const v = String(item || "").trim();
            if (v) evidence.push(v);
            if (evidence.length >= 4) return;
        }
    };

    addMany(rec.fundamental_analysis);
    addMany(rec.technical_signals);
    addMany(rec.institutional_behavior);

    if (evidence.length === 0) {
        const fallback = getReasoningText(rec.reasoning).split("|").map((s) => s.trim()).filter(Boolean);
        addMany(fallback);
    }

    return evidence.slice(0, 4);
}

function buildInvalidationConditions(rec: Recommendation): string[] {
    const conditions: string[] = [];
    if (typeof rec.stop_loss === "number") {
        conditions.push(`Price touches stop-loss (${formatPrice(rec.stop_loss, rec.market)}).`);
    }
    if (rec.risk_level === "high") {
        conditions.push("Risk level remains high for multiple refresh cycles.");
    }
    if (rec.action === "buy") {
        conditions.push("Primary momentum signals weaken or reverse.");
    } else if (rec.action === "sell") {
        conditions.push("Downtrend thesis fails and key levels are reclaimed.");
    } else {
        conditions.push("New catalyst invalidates neutral baseline.");
    }
    conditions.push("Core data source changes or freshness degrades.");
    return conditions.slice(0, 4);
}
// Progress bar component
function ConfidenceBar({ confidence }: { confidence: number }) {
    const percentage = Math.round(confidence * 100);
    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">置信度</span>
                <span className="text-xs font-medium">{percentage}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-300", confidenceColor(confidence))}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

// Collapsible analysis section
function AnalysisSection({
    title,
    icon: Icon,
    items,
    defaultOpen = false
}: {
    title: string;
    icon: React.ElementType;
    items: string[];
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (!items || items.length === 0) return null;

    return (
        <div className="border border-white/5 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
            </button>
            {isOpen && (
                <div className="px-3 pb-3 pt-1">
                    <ul className="space-y-1.5">
                        {items.map((item, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-0.5">-</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// Enhanced recommendation card
function RecommendationCard({ rec }: { rec: Recommendation }) {
    const [showAnalysis, setShowAnalysis] = useState(false);

    // Get stock name - prefer company_name from API, fallback to mapping
    const displayName = rec.company_name || getStockName(rec.ticker, rec.market);

    // Default values for enhanced fields
    const positionSize = rec.position_size || (rec.risk_level === "high" ? "3-5%" : rec.risk_level === "medium" ? "5-10%" : "10-15%");
    const suitableFor = rec.suitable_for || (rec.risk_level === "high" ? ["激进型投资者"] : rec.risk_level === "medium" ? ["平衡型投资者", "进取型投资者"] : ["稳健型投资者", "平衡型投资者"]);
    const fundamentalAnalysis = rec.fundamental_analysis || ["基于财务数据分析", "行业地位评估", "盈利能力评估"];
    const technicalSignals = rec.technical_signals || ["趋势分析", "成交量分析", "技术指标综合"];
    const institutionalBehavior = rec.institutional_behavior || ["机构持仓分析", "资金流向分析"];
    const riskFactors = rec.risk_factors || ["市场波动风险", "行业政策风险", "流动性风险"];
    const modelVersion = rec.model_version || "v2.1.0";
    const dataSources = rec.data_sources || ["公开财务数据", "市场行情数据", "新闻舆情分析"];

    const evidenceChain = buildEvidenceChain(rec);
    const invalidationConditions = buildInvalidationConditions(rec);
    return (
        <Card className="bg-transparent border-white/5 hover:border-primary/30 transition-colors">
            <CardContent className="py-5 px-5">
                {/* Header: Action + Name/Ticker + Risk + Time */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border",
                            actionBadge(rec.action)
                        )}>
                            <ActionIcon action={rec.action} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-lg text-white">
                                    {displayName}
                                </span>
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 uppercase", actionBadge(rec.action))}>
                                    {actionProfessionalText(rec.action)}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-sm text-muted-foreground">
                                    {formatTicker(rec.ticker)}
                                </span>
                                <span className="text-xs text-muted-foreground/60">•</span>
                                <span className="text-xs text-muted-foreground">
                                    {rec.market === "cn" ? "A股" : "美股"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", riskBadge(rec.risk_level))}>
                            {riskText(rec.risk_level)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(rec.created_at)}
                        </span>
                    </div>
                </div>

                {/* Confidence Progress Bar */}
                <div className="mb-4">
                    <ConfidenceBar confidence={rec.confidence} />
                </div>

                {/* Price Targets - Large Display */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Target className="h-3.5 w-3.5 text-primary" />
                            目标价
                        </div>
                        <div className="text-xl font-bold text-primary">
                            {formatPrice(rec.price_target, rec.market)}
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <ShieldAlert className="h-3.5 w-3.5 text-yellow-500" />
                            止损价
                        </div>
                        <div className="text-xl font-bold text-yellow-500">
                            {formatPrice(rec.stop_loss, rec.market)}
                        </div>
                    </div>
                </div>

                {/* Position Size & Suitable For */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="text-[10px] bg-white/5">
                        <Wallet className="h-3 w-3 mr-1" />
                        建议仓位 {positionSize}
                    </Badge>
                    {suitableFor.map((type, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px] bg-white/5">
                            <Users className="h-3 w-3 mr-1" />
                            {type}
                        </Badge>
                    ))}
                </div>

                {/* Brief Reasoning */}
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {getReasoningText(rec.reasoning)}
                </p>

                {/* Expandable Analysis Section */}
                <div className="space-y-2 mb-4">
                    <button
                        onClick={() => setShowAnalysis(!showAnalysis)}
                        className="w-full flex items-center justify-center gap-1 text-xs text-primary hover:underline py-2"
                    >
                        <Info className="h-3.5 w-3.5" />
                        {showAnalysis ? "收起详细分析" : "展开分析依据"}
                        {showAnalysis ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {showAnalysis && (
                        <div className="space-y-2 pt-2">
                            <AnalysisSection
                                title="基本面分析"
                                icon={PieChart}
                                items={fundamentalAnalysis}
                                defaultOpen={true}
                            />
                            <AnalysisSection
                                title="技术面信号"
                                icon={LineChart}
                                items={technicalSignals}
                            />
                            <AnalysisSection
                                title="机构行为解读"
                                icon={BarChart3}
                                items={institutionalBehavior}
                            />
                            <AnalysisSection
                                title="风险因素"
                                icon={AlertTriangle}
                                items={riskFactors}
                            />
                        </div>
                    )}
                </div>



                {/* Explainability */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                        <div className="text-xs font-medium text-zinc-200 mb-2 flex items-center gap-2">
                            <Database className="h-3.5 w-3.5 text-primary" />
                            Evidence Chain
                        </div>
                        <ul className="space-y-1.5">
                            {evidenceChain.map((item, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground leading-relaxed">
                                    {idx + 1}. {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                        <div className="text-xs font-medium text-zinc-200 mb-2 flex items-center gap-2">
                            <FileWarning className="h-3.5 w-3.5 text-yellow-500" />
                            Invalidation Conditions
                        </div>
                        <ul className="space-y-1.5">
                            {invalidationConditions.map((item, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground leading-relaxed">
                                    {idx + 1}. {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                {/* Meta Info */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            {dataSources[0]}
                        </span>
                        <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {modelVersion}
                        </span>
                    </div>
                    {rec.ticker && isUsTicker(rec.ticker.toUpperCase()) ? (
                        <Link
                            to={`/stock/${encodeURIComponent(rec.ticker.toUpperCase())}`}
                            className="text-xs text-primary hover:underline"
                        >
                            查看详情
                        </Link>
                    ) : null}
                </div>

                {/* Disclaimer for each card */}
                <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-muted-foreground/70 flex items-start gap-1">
                        <FileWarning className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span>
                            <strong>风险提示：</strong>本推荐由AI模型生成，仅供参考，不构成投资建议。
                            投资有风险，决策需谨慎。
                        </span>
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function RecommendationsSection({ market, recommendations }: { market: "us" | "cn"; recommendations: Recommendation[] }) {
    const [running, setRunning] = useState(false);

    const runAnalysis = async () => {
        if (running) return;
        try {
            setRunning(true);
            await fetch(`${API_BASE}/ai/recommendations/run?market=${market}`, { method: "POST" });
        } finally {
            setTimeout(() => setRunning(false), 3000);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                        {market === "us" ? "美股推荐" : "A股推荐"}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                        {recommendations.length} 条
                    </Badge>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={runAnalysis}
                    disabled={running}
                    className="gap-1"
                >
                    <RefreshCw className={running ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
                    刷新分析
                </Button>
            </div>

            {recommendations.length === 0 ? (
                <Card className="bg-transparent border-white/5">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                        暂无 {market === "us" ? "美股" : "A股"} 推荐数据
                        <div className="mt-2 text-xs">点击"刷新分析"或等待每小时自动更新</div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {recommendations.slice(0, 10).map((rec) => (
                        <RecommendationCard key={rec.id} rec={rec} />
                    ))}
                </div>
            )}
        </div>
    );
}

function AccuracyStats() {
    const [stats, setStats] = useState<{
        us: { accuracy: number; total: number; hits: number; misses: number } | null;
        cn: { accuracy: number; total: number; hits: number; misses: number } | null;
    }>({ us: null, cn: null });

    const loadStats = async () => {
        try {
            const [usRes, cnRes] = await Promise.all([
                fetch(`${API_BASE}/ai/recommendations/accuracy?market=us&days=30`),
                fetch(`${API_BASE}/ai/recommendations/accuracy?market=cn&days=30`),
            ]);

            const usData = usRes.ok ? await usRes.json() : null;
            const cnData = cnRes.ok ? await cnRes.json() : null;

            setStats({ us: usData, cn: cnData });
        } catch (e) {
            console.error("Failed to load accuracy stats", e);
        }
    };

    useMemo(() => {
        loadStats();
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">历史准确率 (近30天)</span>
                </div>
                <Button variant="outline" size="sm" onClick={loadStats} className="gap-1">
                    <RefreshCw className="h-3 w-3" />
                    刷新
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-transparent border-white/5">
                    <CardContent className="py-4">
                        <div className="text-sm text-muted-foreground mb-2">美股</div>
                        {stats.us ? (
                            <>
                                <div className="text-2xl font-bold text-primary">
                                    {(stats.us.accuracy * 100).toFixed(1)}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {stats.us.hits}/{stats.us.total} 命中
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground">暂无数据</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-transparent border-white/5">
                    <CardContent className="py-4">
                        <div className="text-sm text-muted-foreground mb-2">A股</div>
                        {stats.cn ? (
                            <>
                                <div className="text-2xl font-bold text-primary">
                                    {(stats.cn.accuracy * 100).toFixed(1)}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {stats.cn.hits}/{stats.cn.total} 命中
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground">暂无数据</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Full page disclaimer
function FullDisclaimer() {
    return (
        <Card className="bg-transparent border-yellow-500/20 mt-8">
            <CardContent className="py-4 px-5">
                <div className="flex items-start gap-3">
                    <Scale className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-yellow-500">完整免责声明</h3>
                        <div className="text-xs text-muted-foreground space-y-2">
                            <p>
                                <strong>1. 非投资建议：</strong>
                                本页面所有AI推荐内容仅供参考和学习研究使用，不构成任何投资建议、要约或承诺。
                                AI模型的输出结果基于历史数据和算法分析，不能保证未来收益。
                            </p>
                            <p>
                                <strong>2. 风险告知：</strong>
                                证券投资存在风险，包括但不限于市场风险、流动性风险、信用风险等。
                                投资者应根据自身风险承受能力审慎决策，切勿盲目跟风。
                            </p>
                            <p>
                                <strong>3. 数据来源：</strong>
                                本平台数据来源于公开渠道，我们力求但不保证数据的准确性、完整性和及时性。
                                对于因数据错误或延迟导致的任何损失，本平台不承担责任。
                            </p>
                            <p>
                                <strong>4. 模型局限：</strong>
                                AI分析模型存在固有局限性，可能受到训练数据偏差、市场异常波动、黑天鹅事件等因素影响。
                                历史准确率仅供参考，不代表未来表现。
                            </p>
                            <p>
                                <strong>5. 合规声明：</strong>
                                本平台严格遵守相关法律法规，不从事任何证券投资咨询业务。
                                如有任何疑问，请咨询持牌专业投资顾问。
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AI() {
    const { ai, ready, sseConnected } = useData();
    const [running, setRunning] = useState(false);

    const agents = useMemo(() => {
        const list = Array.isArray(ai?.statuses) ? ai.statuses : [];
        return list.slice().sort((a: any, b: any) => String(a?.name ?? "").localeCompare(String(b?.name ?? "")));
    }, [ai?.statuses]);

    const insights = useMemo(() => {
        const list = Array.isArray(ai?.insights) ? ai.insights : [];
        return list.filter((x: any) => x?.timestamp).slice();
    }, [ai?.insights]);

    const recommendations = useMemo(() => {
        return ai?.recommendations || { us: [], cn: [] };
    }, [ai?.recommendations]);

    const signals = useMemo(() => insights.filter((x: any) => x.type === "ai_signal").slice(0, 10), [insights]);
    const stream = useMemo(() => insights.slice(0, 30), [insights]);

    const runNow = async () => {
        if (running) return;
        try {
            setRunning(true);
            await Promise.all([
                fetch(`${API_BASE}/ai/run`, { method: "POST" }),
                fetch(`${API_BASE}/ai/recommendations/run`, { method: "POST" }),
            ]);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="container py-8 px-4 md:px-6">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Sparkles className="h-8 w-8 text-primary" />
                        AI 智能推荐
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        基于多维度分析的投资参考，涵盖基本面、技术面与机构行为
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={sseConnected ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}>
                        <Activity className="h-3.5 w-3.5 mr-1" />
                        {sseConnected ? "SSE 在线" : "SSE 离线"}
                    </Badge>
                    <Button onClick={runNow} disabled={running} className="gap-2">
                        <RefreshCw className={running ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                        立即分析
                    </Button>
                </div>
            </div>

            {/* Risk Warning Banner */}
            <Card className="bg-yellow-500/5 border-yellow-500/20 mb-6">
                <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        <p className="text-sm text-yellow-500/90">
                            <strong>重要提示：</strong>
                            所有AI推荐仅供投资参考，不构成投资建议。投资有风险，入市需谨慎。
                            请根据自身风险承受能力做出独立判断。
                        </p>
                    </div>
                </CardContent>
            </Card>

            {!ready ? (
                <div className="flex items-center justify-center h-48">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2 text-primary" />
                    <span className="text-muted-foreground">加载中...</span>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* AI Recommendations Section */}
                    <Card className="hover:border-primary/30 transition-colors">
                        <CardContent className="py-4 px-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="font-semibold flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                    AI 投资推荐
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px]">
                                        每小时自动更新
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] bg-white/5">
                                        <Cpu className="h-3 w-3 mr-1" />
                                        模型 v2.1.0
                                    </Badge>
                                </div>
                            </div>

                            <Tabs defaultValue="cn" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="cn">A股推荐</TabsTrigger>
                                    <TabsTrigger value="us">美股推荐</TabsTrigger>
                                    <TabsTrigger value="accuracy">准确率统计</TabsTrigger>
                                </TabsList>

                                <TabsContent value="cn" className="mt-4">
                                    <RecommendationsSection
                                        market="cn"
                                        recommendations={recommendations.cn}
                                    />
                                </TabsContent>

                                <TabsContent value="us" className="mt-4">
                                    <RecommendationsSection
                                        market="us"
                                        recommendations={recommendations.us}
                                    />
                                </TabsContent>

                                <TabsContent value="accuracy" className="mt-4">
                                    <AccuracyStats />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Existing Analysis Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-4">
                            <Card className="hover:border-primary/30 transition-colors">
                                <CardContent className="py-4 px-5">
                                    <div className="flex items-center justify-between">
                                        <div className="font-semibold flex items-center gap-2">
                                            <Activity className="h-4 w-4 text-primary" />
                                            Agent 状态
                                        </div>
                                        <Badge variant="outline" className="text-[10px]">
                                            {agents.length} 个
                                        </Badge>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {agents.map((a: any) => (
                                            <div key={a.id} className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium truncate">{a.name}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {a.last_run_at ? timeAgo(a.last_run_at) : "未运行"}
                                                    </div>
                                                    {a.last_error ? (
                                                        <div className="text-xs text-red-400 mt-1 truncate">{a.last_error}</div>
                                                    ) : null}
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <Badge variant="outline" className={`${statusBadge(a.status)} text-[10px] px-1.5 py-0`}>
                                                        {a.status}
                                                    </Badge>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        今日信号 {a.signals_today ?? 0}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {agents.length === 0 && (
                                            <div className="text-sm text-muted-foreground">暂无 Agent 状态</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="hover:border-primary/30 transition-colors">
                                <CardContent className="py-4 px-5">
                                    <div className="font-semibold flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-primary" />
                                        高关注信号
                                        <Badge variant="outline" className="text-[10px] ml-auto">{signals.length}</Badge>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {signals.map((evt: any, i: number) => (
                                            <div key={evt.id ?? i} className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium leading-snug">{evt.title}</div>
                                                    {evt.summary ? (
                                                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{evt.summary}</div>
                                                    ) : null}
                                                    <div className="mt-1 flex items-center gap-2">
                                                        {evt.ticker ? (
                                                            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                                                {evt.ticker}
                                                            </Badge>
                                                        ) : null}
                                                        <span className="text-[10px] text-muted-foreground">{timeAgo(evt.timestamp)}</span>
                                                    </div>
                                                </div>
                                                {evt.ticker && isUsTicker(String(evt.ticker).toUpperCase()) ? (
                                                    <Link to={`/stock/${encodeURIComponent(String(evt.ticker).toUpperCase())}`} className="text-xs text-primary hover:underline flex-shrink-0">
                                                        详情
                                                    </Link>
                                                ) : null}
                                            </div>
                                        ))}
                                        {signals.length === 0 && (
                                            <div className="text-sm text-muted-foreground">暂无高关注信号</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-8">
                            <Card className="hover:border-primary/30 transition-colors">
                                <CardContent className="py-4 px-5">
                                    <div className="flex items-center justify-between">
                                        <div className="font-semibold flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            实时分析流
                                        </div>
                                        <Badge variant="outline" className="text-[10px]">
                                            {stream.length}
                                        </Badge>
                                    </div>

                                    <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto">
                                        {stream.map((evt: any, i: number) => (
                                            <Card key={evt.id ?? i} className="bg-transparent border-white/5 hover:border-primary/30 transition-colors">
                                                <CardContent className="py-4 px-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${typeBadge(evt.type)} border`}>
                                                            {evt.type === "ai_signal" ? (
                                                                <AlertTriangle className="h-4 w-4" />
                                                            ) : (
                                                                <Sparkles className="h-4 w-4" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <Badge variant="outline" className={`${typeBadge(evt.type)} text-[10px] px-1.5 py-0`}>
                                                                    {evt.type === "ai_signal" ? "信号" : "观点"}
                                                                </Badge>
                                                                {evt.ticker ? (
                                                                    <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                                                        {evt.ticker}
                                                                    </Badge>
                                                                ) : null}
                                                                <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                                                                    {timeAgo(evt.timestamp)}
                                                                </span>
                                                            </div>
                                                            <div className="mt-1 font-medium text-sm leading-snug">{evt.title}</div>
                                                            {evt.summary ? (
                                                                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{evt.summary}</div>
                                                            ) : null}
                                                            <div className="mt-2 flex items-center gap-3">
                                                                {evt.ticker && isUsTicker(String(evt.ticker).toUpperCase()) ? (
                                                                    <Link to={`/stock/${encodeURIComponent(String(evt.ticker).toUpperCase())}`} className="text-xs text-primary hover:underline">
                                                                        查看标的
                                                                    </Link>
                                                                ) : null}
                                                                {evt.url ? (
                                                                    <a href={evt.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                                                                        参考链接
                                                                    </a>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {stream.length === 0 && (
                                            <div className="text-center py-12 text-muted-foreground">暂无分析事件</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Full Disclaimer */}
                    <FullDisclaimer />
                </div>
            )}
        </div>
    );
}
