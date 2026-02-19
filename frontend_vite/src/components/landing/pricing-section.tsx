
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";

export function PricingSection() {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="container px-4 md:px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
                        选择适合您的 <span className="text-primary">天枢</span> 计划
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        解锁全维度金融情报，洞察市场先机。无论是个人投资者还是专业机构，天枢都能助您智胜未来。
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Free Plan */}
                    <div className="glass-card rounded-3xl p-8 border border-white/5 hover:border-white/10 transition-all duration-300 relative group">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />

                        <div className="relative z-10">
                            <h3 className="text-xl font-medium text-white mb-2">基础版</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold text-white">免费</span>
                                <span className="text-muted-foreground">/ 永久</span>
                            </div>
                            <p className="text-muted-foreground mb-8 text-sm h-10">
                                适合刚刚开始探索市场的个人投资者，提供基础数据查询功能。
                            </p>

                            <Button variant="outline" className="w-full rounded-full border-white/10 hover:bg-white/5 hover:text-white mb-8">
                                立即注册
                            </Button>

                            <ul className="space-y-4 text-sm text-gray-300">
                                {[
                                    "国会山交易数据查询 (延迟 24h)",
                                    "A股大盘资金流向概览",
                                    "基础黄金内外价差监控",
                                    "每日 5 次智能搜索",
                                    "社区支持"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Pro Plan */}
                    <div className="glass-card rounded-3xl p-8 border border-primary/20 bg-primary/5 hover:border-primary/40 transition-all duration-300 relative group shadow-2xl shadow-primary/10">
                        <div className="absolute top-0 right-0 p-3">
                            <span className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/30">
                                最受欢迎
                            </span>
                        </div>

                        <div className="relative z-10">
                            <h3 className="text-xl font-medium text-white mb-2">专业版</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold text-white">¥199</span>
                                <span className="text-muted-foreground">/ 月</span>
                            </div>
                            <p className="text-primary/80 mb-8 text-sm h-10">
                                为专业交易者打造，实时数据推送与深度 AI 分析，快人一步。
                            </p>

                            <Button className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] mb-8 transition-all hover:scale-105 active:scale-95">
                                开启 7 天免费试用
                            </Button>

                            <ul className="space-y-4 text-sm text-white">
                                {[
                                    "实时国会山内幕交易推送 (0 延迟)",
                                    "A股个股主力资金深度透视",
                                    "黄金套利实时计算器 & 预警",
                                    "无限次 AI 智能搜索 & 分析",
                                    "专属客服支持",
                                    "API 访问权限 (限流)"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                                            <Check className="h-3 w-3 text-primary" />
                                        </div>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        </section>
    );
}
