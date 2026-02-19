import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Ticker } from "@/components/business/ticker";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function RootLayout() {
    const lenisRef = useRef<Lenis | null>(null);

    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            touchMultiplier: 2,
            prevent: (node) => {
                const el = node as HTMLElement | null;
                return !!el?.closest?.("[data-lenis-prevent],[data-lenis-prevent-wheel],[data-lenis-prevent-touch]");
            },
        });
        lenisRef.current = lenis;

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        // Integrate Lenis with GSAP ScrollTrigger
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);

        return () => {
            lenis.destroy();
            gsap.ticker.remove(lenis.raf);
        };
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-background font-sans antialiased text-foreground selection:bg-primary/30 relative overflow-x-hidden">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse delay-1000"></div>
                <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full bg-purple-500/5 blur-[100px] animate-pulse delay-2000"></div>
                {/* Noise Texture */}
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col">
                <Header />
                <Ticker />
                <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-6 py-8">
                    <Outlet />
                </main>
                <Footer />
            </div>
            <Toaster />
        </div>
    );
}
