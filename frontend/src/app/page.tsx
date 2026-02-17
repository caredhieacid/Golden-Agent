import { Header } from "@/components/layout/header";
import { Ticker } from "@/components/business/ticker";
import { MarketPanorama } from "@/components/landing/market-panorama";
import { CongressPreview } from "@/components/landing/congress-preview";
import { RoiLeaderboard } from "@/components/landing/roi-leaderboard";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0D1117] text-foreground selection:bg-primary/30 font-sans">
      <Header />
      <Ticker />

      <main className="flex-grow max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Top Section Grid: 7 cols (Trades) + 5 cols (Leaderboard) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-7">
            <CongressPreview />
          </div>
          <div className="lg:col-span-5 h-[400px] lg:h-auto">
            <RoiLeaderboard />
          </div>
        </div>

        {/* Middle Full-Width Card: Market Panorama */}
        <MarketPanorama />
      </main>

      <Footer />
    </div>
  );
}
