import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { DataProvider } from "@/lib/data-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "GoldPolicy Intel | 金策智显",
  description: "全球投资情报平台，追踪多个市场的交易信号和资金动向。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark scroll-smooth">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased selection:bg-primary/30 relative overflow-x-hidden",
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        {/* Noise Texture Overlay */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        <div className="relative z-10">
          <DataProvider>
            {children}
          </DataProvider>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
