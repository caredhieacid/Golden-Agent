
import { Bell, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function PricingSection() {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="container px-4 md:px-6 relative z-10">
                {/* Risk Warning */}
                <div className="max-w-3xl mx-auto mb-12 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-600 dark:text-amber-400">
                            <p className="font-medium mb-1">风险提示</p>
                            <p>
                                本站仅提供客观信息聚合与工具服务，不构成任何投资建议，不推荐任何证券标的，
                                不对投资盈亏承担任何责任。投资有风险，入市需谨慎。
                            </p>
                        </div>
                    </div>
                </div>

                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
                        工具<span className="text-primary">服务</span>
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        纯数据情报平台，为您提供客观数据查询与工具服务，不提供任何投资建议。
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Free Plan */}
                    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-xl">基础版</CardTitle>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-4xl font-bold">免费</span>
                                <span className="text-muted-foreground">/ 永久</span>
                            </div>
                            <CardDescription className="mt-4">
                                适合需要查询公开市场数据的用户，提供基础数据查询功能。
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                {[
                                    "美国国会交易公开记录查询",
                                    "SEC内幕交易公开披露查询",
                                    "黄金市场公开行情数据",
                                    "A股市场公开行情数据",
                                    "新闻资讯公开信息聚合"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full rounded-full">
                                免费使用
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Alert Service Plan */}
                    <Card className="bg-primary/5 border-primary/20 backdrop-blur-sm relative">
                        <div className="absolute top-4 right-4">
                            <span className="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
                                开发中
                            </span>
                        </div>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-primary" />
                                <CardTitle className="text-xl">黄金盯盘提醒</CardTitle>
                            </div>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-4xl font-bold">暂未开放</span>
                            </div>
                            <CardDescription className="mt-4">
                                价格提醒工具，由您自主设置关注的黄金价格范围，达到时自动发送邮件通知。
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                    <p className="text-xs text-muted-foreground mb-2">功能说明</p>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary">•</span>
                                            <span>盯盘标的由您自主添加，平台不做任何推荐</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary">•</span>
                                            <span>预警价格由您自主设置，平台不提供预设价格</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary">•</span>
                                            <span>提醒内容仅做事实告知，无任何投资引导</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-xs text-amber-500 mb-1">提醒话术示例</p>
                                    <p className="text-sm text-muted-foreground">
                                        「您关注的黄金价格已达到您预设的价格 XXX 元/克」
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button disabled className="w-full rounded-full opacity-60 cursor-not-allowed">
                                功能开发中，敬请期待
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Bottom Disclaimer */}
                <div className="max-w-3xl mx-auto mt-12 text-center">
                    <p className="text-xs text-muted-foreground">
                        * 所有数据均来自公开渠道，本站仅做信息聚合展示，不保证数据完整性、准确性、及时性。
                        * 工具功能仅作为辅助手段，不构成任何投资建议，不承担任何投资决策责任。
                    </p>
                </div>
            </div>

            {/* Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        </section>
    );
}
