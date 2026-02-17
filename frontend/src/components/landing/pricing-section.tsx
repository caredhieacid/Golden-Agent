"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function PricingSection() {
    return (
        <div className="py-24 bg-background">
            <div className="container px-4 md:px-6 max-w-7xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-3">
                        解锁专业级金融数据
                    </h2>
                    <p className="text-muted-foreground">
                        选择最适合您的投资计划，把握每一次市场脉搏
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {/* Basic Plan */}
                    <Card className="flex flex-col border-border/50 bg-card/50 hover:border-border transition-all">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium text-muted-foreground">基础版</CardTitle>
                            <div className="my-4">
                                <span className="text-3xl font-bold text-foreground">¥0</span>
                                <span className="text-muted-foreground"> / 月</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" /> 每日5条国会交易提醒
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" /> 基础行情数据 (延迟15分)
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" /> 社区访问权限
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full">当前计划</Button>
                        </CardFooter>
                    </Card>

                    {/* Pro Plan */}
                    <Card className="flex flex-col relative border-primary/50 bg-card/80 shadow-[0_0_30px_rgba(13,227,242,0.05)] transform hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                            热门
                        </div>
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-primary">专业版</CardTitle>
                            <div className="my-4">
                                <span className="text-4xl font-bold text-foreground">¥199</span>
                                <span className="text-muted-foreground"> / 月</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="space-y-3 text-sm text-foreground/90">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-primary" /> 实时国会交易推送
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-primary" /> 实时Level-2行情
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-primary" /> AI智能选股分析
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-primary" /> 无限历史数据回测
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25">
                                立即订阅
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Institutional Plan */}
                    <Card className="flex flex-col border-border/50 bg-card/50 hover:border-border transition-all">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium text-muted-foreground">机构版</CardTitle>
                            <div className="my-4">
                                <span className="text-3xl font-bold text-foreground">¥999</span>
                                <span className="text-muted-foreground"> / 月</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" /> 所有专业版功能
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" /> API 数据接口访问
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" /> 专属客户经理
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" /> 多账户协同管理
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full hover:bg-muted">联系销售</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
