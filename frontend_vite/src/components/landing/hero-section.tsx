import { useRef, useEffect } from "react";
import { ArrowRight, DollarSign, Activity, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gsap } from "gsap";


export function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const cardsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Title Animation: Staggered Fade Up
            const titleChars = titleRef.current?.querySelectorAll(".char");
            if (titleChars) {
                gsap.fromTo(titleChars,
                    { opacity: 0, y: 50, rotateX: -90 },
                    { opacity: 1, y: 0, rotateX: 0, stagger: 0.02, duration: 1, ease: "back.out(1.7)" }
                );
            }

            // Cards Animation: Float in
            gsap.from(cardsRef.current?.children || [], {
                y: 100,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: "power3.out",
                delay: 0.5
            });

            // Floating Animation for Cards
            gsap.to(cardsRef.current?.children || [], {
                y: -10,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                stagger: {
                    each: 0.5,
                    from: "random"
                }
            });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    const splitText = (text: string) => {
        return text.split("").map((char, i) => (
            <span key={i} className="char inline-block" style={{ opacity: 0 }}>
                {char === " " ? "\u00A0" : char}
            </span>
        ));
    };

    return (
        <div ref={containerRef} className="relative overflow-hidden py-24 sm:py-32">
            {/* Hero Content */}
            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="text-center mb-20">
                    <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary backdrop-blur-xl mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                        天枢 Alpha v2.0
                    </div>

                    <h1 ref={titleRef} className="text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl md:text-8xl mb-6 drop-shadow-2xl">
                        <div className="overflow-hidden">
                            {splitText("洞察资金流向")}
                        </div>
                        <div className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-blue-500 overflow-hidden pb-4">
                            {splitText("智胜金融未来")}
                        </div>
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground/80 font-light leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
                        基于 AI 的全维度金融情报平台。
                        <span className="hidden sm:inline"> 实时监控国会山内幕交易、A股主力资金动向及全球黄金套利机会。</span>
                    </p>

                    <div className="mt-10 flex justify-center gap-6 animate-fade-in-up" style={{ animationDelay: '1s' }}>
                        <Button size="lg" className="rounded-full px-8 h-12 text-base bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.3)] border-0 hover:scale-105 active:scale-95 transition-all duration-300">
                            立即开始 <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button size="lg" variant="outline" className="rounded-full px-8 h-12 text-base border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-300">
                            查看演示
                        </Button>
                    </div>
                </div>

                {/* Floating Cards Area */}
                <div ref={cardsRef} className="grid grid-cols-1 gap-8 lg:grid-cols-3 perspective-1000">
                    {/* Card 1: Congress */}
                    <div className="transform transition-all duration-500 hover:scale-105 hover:rotate-y-2 hover:rotate-x-2">
                        <div className="glass-card rounded-3xl p-6 h-full border border-white/10 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity">
                                <DollarSign className="w-24 h-24 text-green-500 rotate-12" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 rounded-2xl bg-green-500/20 text-green-400">
                                        <DollarSign className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">国会山交易</h3>
                                </div>
                                <div className="space-y-4 flex-1">
                                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                        <span className="text-gray-400">最新披露</span>
                                        <span className="text-green-400 font-mono">+12.5%</span>
                                    </div>
                                    <div className="text-3xl font-bold font-mono text-white tracking-tight">NVDA</div>
                                    <div className="text-sm text-gray-400">佩洛西 <span className="text-green-400">看涨期权</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: A-Share */}
                    <div className="transform transition-all duration-500 hover:scale-105 hover:rotate-y-2 hover:rotate-x-2">
                        <div className="glass-card rounded-3xl p-6 h-full border border-white/10 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity">
                                <Activity className="w-24 h-24 text-red-500 rotate-12" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 rounded-2xl bg-red-500/20 text-red-400">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">A股主力</h3>
                                </div>
                                <div className="space-y-4 flex-1">
                                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                        <span className="text-gray-400">今日净流入</span>
                                        <span className="text-red-400 font-mono">Top 1</span>
                                    </div>
                                    <div className="text-3xl font-bold font-mono text-white tracking-tight">TMT 科技</div>
                                    <div className="text-sm text-gray-400">主力买入 <span className="text-red-400 font-bold">¥24.5亿</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Gold */}
                    <div className="transform transition-all duration-500 hover:scale-105 hover:rotate-y-2 hover:rotate-x-2">
                        <div className="glass-card rounded-3xl p-6 h-full border border-white/10 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity">
                                <TrendingUp className="w-24 h-24 text-yellow-500 rotate-12" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 rounded-2xl bg-yellow-500/20 text-yellow-400">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">黄金套利</h3>
                                </div>
                                <div className="space-y-4 flex-1">
                                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                        <span className="text-gray-400">内外价差</span>
                                        <span className="text-yellow-400 font-mono">高位</span>
                                    </div>
                                    <div className="text-3xl font-bold font-mono text-white tracking-tight">$2,048.5</div>
                                    <div className="text-sm text-gray-400">套利空间 <span className="text-yellow-400 font-bold">¥12.5/g</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
