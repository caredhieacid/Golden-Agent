"use client";

import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, DollarSign, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
    return (
        <div className="relative overflow-hidden bg-background py-16 sm:py-24">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent opacity-50 blur-3xl pointer-events-none" />

            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Badge variant="outline" className="mb-4 border-primary/20 bg-primary/5 text-primary">
                            v2.0 全新上线
                        </Badge>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                            洞察资金流向，<span className="text-primary block sm:inline">智胜金融未来</span>
                        </h1>
                        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                            实时追踪美国国会交易、A股主力资金及黄金套利机会。
                            <br className="hidden sm:block" />
                            AI 驱动的全球投资情报平台，助您发现每一次市场良机。
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(13,227,242,0.3)]">
                                立即开始 <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            <Button size="lg" variant="outline" className="border-border/50 hover:bg-accent hover:text-accent-foreground">
                                查看演示
                            </Button>
                        </div>
                    </motion.div>
                </div>

                {/* Market Panorama Grid */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* US Congress */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <Card className="h-full border-border/40 bg-card/50 backdrop-blur hover:border-primary/50 transition-all cursor-pointer group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg font-medium">国会交易追踪</CardTitle>
                                <DollarSign className="h-5 w-5 text-green-500 group-hover:text-green-400 transition-colors" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">NVDA</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    佩洛西 <span className="text-green-500 font-bold">买入 Call</span>
                                </p>
                                <div className="mt-4 h-[60px] w-full bg-gradient-to-t from-primary/10 to-transparent rounded-md relative overflow-hidden">
                                    {/* Pseudo chart */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-primary/20 blur-md"></div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* A-Share Market */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <Card className="h-full border-border/40 bg-card/50 backdrop-blur hover:border-primary/50 transition-all cursor-pointer group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg font-medium">A股主力资金</CardTitle>
                                <Activity className="h-5 w-5 text-red-500 group-hover:text-red-400 transition-colors" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">TMT 科技</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    今日净流入 <span className="text-red-500 font-bold">+24.5亿</span>
                                </p>
                                <div className="mt-4 grid grid-cols-4 gap-1 h-[60px]">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className={`rounded-sm opacity-50 ${i % 3 === 0 ? 'bg-red-500' : 'bg-green-500'}`} style={{ height: `${Math.random() * 100}%` }}></div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Gold Market */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <Card className="h-full border-border/40 bg-card/50 backdrop-blur hover:border-primary/50 transition-all cursor-pointer group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg font-medium">黄金套利监控</CardTitle>
                                <TrendingUp className="h-5 w-5 text-yellow-500 group-hover:text-yellow-400 transition-colors" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">$2,048.50</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    内外价差 <span className="text-yellow-500 font-bold">¥12.5/g</span>
                                </p>
                                <div className="mt-4 h-[60px] w-full border-t border-yellow-500/30 relative">
                                    <div className="absolute top-2 left-0 right-0 h-0.5 bg-yellow-500 shadow-[0_0_8px_rgba(255,215,0,0.5)]"></div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
