"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Gavel, BarChart3, TrendingUp, Search,
    Menu, X, Newspaper, UserSearch, ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/lib/data-provider";

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // 搜索 — 使用全局 Context 本地过滤
    const { congress, insiders, stocks } = useData();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Command+K 快捷键聚焦
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                inputRef.current?.focus();
            }
            if (e.key === "Escape") {
                setSearchOpen(false);
                inputRef.current?.blur();
            }
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, []);

    // 点击外部关闭搜索
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // 本地搜索：从 Context 数据中实时过滤
    const searchResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (q.length < 1) return null;

        // 搜议员
        const politicians = (congress.politicians as any[])
            .filter(p => {
                const name = (p.full_name || p.name || "").toLowerCase();
                const state = (p.state || "").toLowerCase();
                return name.includes(q) || state.includes(q);
            })
            .slice(0, 5)
            .map(p => ({
                id: p.id,
                name: p.full_name || p.name,
                party: p.party,
                state: p.state,
                chamber: p.chamber,
            }));

        // 搜 A 股
        const aStocks = (stocks.hot as any[])
            .filter(s => {
                const code = (s.code || "").toLowerCase();
                const name = (s.name || "").toLowerCase();
                return code.includes(q) || name.includes(q);
            })
            .slice(0, 5);

        // 搜美股 (从国会交易和内幕交易中提取 unique tickers)
        const tickerMap = new Map<string, string>();
        for (const t of congress.trades as any[]) {
            if (t.ticker) tickerMap.set(t.ticker.toUpperCase(), t.company_name || t.ticker);
        }
        for (const t of insiders.trades as any[]) {
            if (t.ticker && !tickerMap.has(t.ticker.toUpperCase())) {
                tickerMap.set(t.ticker.toUpperCase(), t.company_name || t.ticker);
            }
        }
        const insider_stocks = Array.from(tickerMap.entries())
            .filter(([ticker, company]) =>
                ticker.toLowerCase().includes(q) || company.toLowerCase().includes(q)
            )
            .slice(0, 5)
            .map(([ticker, company_name]) => ({ ticker, company_name }));

        const hasResults = politicians.length > 0 || aStocks.length > 0 || insider_stocks.length > 0;
        return hasResults ? { politicians, stocks: aStocks, insider_stocks } : { politicians: [], stocks: [], insider_stocks: [] };
    }, [searchQuery, congress.politicians, congress.trades, insiders.trades, stocks.hot]);

    const handleSearchInput = (val: string) => {
        setSearchQuery(val);
        if (val.trim().length > 0) setSearchOpen(true);
        else setSearchOpen(false);
    };

    const navItems = [
        { name: "国会交易", href: "/congress", icon: Gavel },
        { name: "内幕交易", href: "/insiders", icon: UserSearch },
        { name: "实时动态", href: "/news", icon: Newspaper },
        { name: "A股行情", href: "/cn-market", icon: TrendingUp },
        { name: "黄金市场", href: "/gold", icon: BarChart3 },
    ];

    return (
        <header
            className={cn(
                "sticky top-0 z-50 w-full transition-all duration-300 border-b border-transparent",
                isScrolled ? "glass-nav py-2" : "bg-transparent py-4 border-transparent"
            )}
        >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-50" />

            <div className="container flex h-14 items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group relative">
                    <div className="absolute -inset-2 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex h-8 w-8 items-center justify-center rounded bg-primary/10 border border-primary/30 transition-colors group-hover:bg-primary/20 group-hover:border-primary/50 shadow-[0_0_15px_rgba(13,227,242,0.15)]">
                        <Gavel className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-foreground relative">
                        金策<span className="text-primary text-shadow-glow">智显</span>
                    </span>
                </Link>

                {/* Mobile Menu Button */}
                <button className="md:hidden p-2 text-foreground"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-1 bg-secondary/30 backdrop-blur-sm px-2 py-1.5 rounded-full border border-border/20">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}
                            className={cn(
                                "relative px-4 py-1.5 text-sm font-medium transition-colors hover:text-primary",
                                pathname === item.href ? "text-primary" : "text-muted-foreground"
                            )}>
                            {pathname === item.href && (
                                <motion.div layoutId="nav-pill"
                                    className="absolute inset-0 bg-background/80 rounded-full shadow-sm border border-border/40"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    style={{ zIndex: -1 }} />
                            )}
                            <span className="relative z-10 flex items-center gap-1.5">
                                {item.name}
                            </span>
                        </Link>
                    ))}
                </nav>

                {/* Right Side: Search + Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <div className="relative group" ref={searchRef}>
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input type="search"
                            ref={inputRef}
                            placeholder="搜索股票 / 议员..."
                            className="w-56 pl-10 h-9 bg-secondary/30 border-border/30 focus-visible:ring-primary/30 transition-all focus:w-72 focus:bg-background/80 font-sans text-sm"
                            value={searchQuery}
                            onChange={e => handleSearchInput(e.target.value)}
                            onFocus={() => { if (searchResults) setSearchOpen(true); }}
                        />
                        <div className="absolute right-3 top-2.5 hidden lg:flex items-center gap-1 pointer-events-none">
                            <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 border border-border/20">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </div>

                        {/* 搜索结果下拉 — 即时本地搜索 */}
                        <AnimatePresence>
                            {searchOpen && searchResults && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border border-border/40 rounded-lg shadow-xl overflow-hidden z-50 min-w-[320px]">
                                    {/* 议员结果 */}
                                    {searchResults.politicians?.length > 0 && (
                                        <div className="p-2">
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1 font-medium">议员</div>
                                            {searchResults.politicians.map((p: any) => (
                                                <button key={p.id} onClick={() => {
                                                    router.push(`/congress/politician/${encodeURIComponent(p.name)}`);
                                                    setSearchOpen(false); setSearchQuery("");
                                                }}
                                                    className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary/50 flex items-center gap-2 text-sm">
                                                    <span className={cn("w-2 h-2 rounded-full",
                                                        p.party === "D" ? "bg-blue-400" : p.party === "R" ? "bg-red-400" : "bg-gray-400")} />
                                                    <span className="font-medium">{p.name}</span>
                                                    <span className="text-xs text-muted-foreground ml-auto">{p.party} · {p.state} · {p.chamber}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* A 股结果 */}
                                    {searchResults.stocks?.length > 0 && (
                                        <div className="p-2 border-t border-border/20">
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1 font-medium">A 股</div>
                                            {searchResults.stocks.map((s: any) => (
                                                <div key={s.code}
                                                    className="px-2 py-1.5 rounded hover:bg-secondary/50 flex items-center gap-2 text-sm">
                                                    <span className="font-mono font-bold text-primary">{s.code}</span>
                                                    <span>{s.name}</span>
                                                    {s.change_pct != null && (
                                                        <span className={cn("ml-auto text-xs font-medium",
                                                            s.change_pct >= 0 ? "text-green-500" : "text-red-500")}>
                                                            {s.change_pct >= 0 ? "+" : ""}{s.change_pct?.toFixed(2)}%
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* 美股结果 */}
                                    {searchResults.insider_stocks?.length > 0 && (
                                        <div className="p-2 border-t border-border/20">
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1 font-medium">美股</div>
                                            {searchResults.insider_stocks.map((s: any) => (
                                                <button key={s.ticker} onClick={() => {
                                                    router.push(`/stock/${s.ticker}`);
                                                    setSearchOpen(false); setSearchQuery("");
                                                }}
                                                    className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary/50 flex items-center gap-2 text-sm">
                                                    <span className="font-mono font-bold text-primary">${s.ticker}</span>
                                                    <span className="text-muted-foreground">{s.company_name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* 无结果 */}
                                    {!searchResults.politicians?.length && !searchResults.stocks?.length && !searchResults.insider_stocks?.length && (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                            没有找到 &ldquo;{searchQuery}&rdquo; 相关结果
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <Button variant="ghost" size="sm"
                        className="text-primary hover:bg-primary/10 hover:text-primary font-medium">
                        登录
                    </Button>
                    <Button size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-[0_0_15px_rgba(13,227,242,0.3)] border border-primary/20">
                        注册
                    </Button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-b border-border/40 bg-background/95 backdrop-blur-md">
                        <div className="container py-4 space-y-4">
                            {navItems.map((item) => (
                                <Link key={item.href} href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-2 text-sm font-medium py-2 text-foreground/80 hover:text-primary">
                                    <item.icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            ))}
                            <div className="pt-4 border-t border-border/40">
                                <Button className="w-full bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30">
                                    登录 / 注册
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
