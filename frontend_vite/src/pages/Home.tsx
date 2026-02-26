import { MarketPanorama } from "@/components/landing/market-panorama";
import { CongressPreview } from "@/components/landing/congress-preview";
import { RoiLeaderboard } from "@/components/landing/roi-leaderboard";
import { HeroSection } from "@/components/landing/hero-section";

export default function Home() {
    return (
        <div className="pb-20">
            <HeroSection />

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
                {/* Dashboard Section Title */}
                <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-2xl font-bold tracking-tight text-white">Market Dashboard</h2>
                    <div className="flex-1 h-px bg-white/10"></div>
                </div>

                {/* Top Section Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7">
                        <CongressPreview />
                    </div>
                    <div className="lg:col-span-5 h-[400px] lg:h-auto">
                        <RoiLeaderboard />
                    </div>
                </div>

                {/* Middle Full-Width Card */}
                <div>
                    <MarketPanorama />
                </div>
            </div>
        </div>
    );
}
