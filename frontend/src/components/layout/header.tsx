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

        // 搜美股
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
                "sticky top-0 z-50 w-full transition-all duration-300",
                isScrolled ? "glass shadow-sm py-2" : "bg-transparent py-4"
            )}
        >
            <div className="container flex h-14 items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group relative z-10">
                    <motion.div
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-lg shadow-primary/10"
                    >
                        <Gavel className="h-5 w-5" />
                    </motion.div>
                    <span className="text-xl font-bold tracking-tight relative">
                        金策<span className="text-primary">智显</span>
                    </span>
                </Link>

                {/* Mobile Menu Button */}
                <button className="md:hidden p-2 text-foreground"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-1 glass px-1.5 py-1.5 rounded-full mx-auto absolute left-1/2 -translate-x-1/2">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}
                            className={cn(
                                "relative px-4 py-2 text-sm font-medium transition-colors rounded-full hover:text-foreground",
                                pathname === item.href ? "text-primary-foreground" : "text-muted-foreground"
                            )}>
                            {pathname === item.href && (
                                <motion.div layoutId="nav-pill"
                                    className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/25"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    style={{ zIndex: -1 }} />
                            )}
                            <span className="relative z-10 flex items-center gap-1.5">
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </span>
                        </Link>
                    ))}
                </nav>

                {/* Right Side: Search + Actions */}
                <div className="hidden md:flex items-center gap-3 relative z-10">
                    <div className="relative group" ref={searchRef}>
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input type="search"
                            ref={inputRef}
                            placeholder="搜索..."
                            className="w-40 pl-9 h-9 bg-secondary/50 border-transparent hover:bg-secondary/80 focus:bg-background focus:w-64 focus:shadow-lg focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-full text-sm placeholder:text-muted-foreground/50"
                            value={searchQuery}
                            onChange={e => handleSearchInput(e.target.value)}
                            onFocus={() => { if (searchResults) setSearchOpen(true); }}
                        />
                        <div className="absolute right-3 top-2.5 flex items-center pointer-events-none group-focus-within:opacity-0 transition-opacity">
                            <kbd className="inline-flex h-4 items-center gap-1 rounded bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-70">
                                ⌘K
                            </kbd>
                        </div>

                        {/* 搜索结果下拉 */}
                        <AnimatePresence>
                            {searchOpen && searchResults && (
                                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-full right-0 mt-3 bg-background/80 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl overflow-hidden z-50 min-w-[320px] p-2">

                                    {/* 议员结果 */}
                                    {searchResults.politicians?.length > 0 && (
                                        <div className="mb-2">
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1 font-semibold opacity-70">议员</div>
                                            {searchResults.politicians.map((p: any) => (
                                                <button key={p.id} onClick={() => {
                                                    router.push(`/congress/politician/${encodeURIComponent(p.name)}`);
                                                    setSearchOpen(false); setSearchQuery("");
                                                }}
                                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-accent/50 flex items-center gap-3 text-sm group transition-all">
                                                    <div className={cn("w-2 h-2 rounded-full ring-2 ring-transparent group-hover:ring-offset-1 transition-all",
                                                        p.party === "D" ? "bg-blue-500 group-hover:ring-blue-500" : p.party === "R" ? "bg-red-500 group-hover:ring-red-500" : "bg-gray-400")} />
                                                    <span className="font-medium">{p.name}</span>
                                                    <span className="text-xs text-muted-foreground ml-auto opacity-70">{p.chamber === "Senate" ? "参议院" : "众议院"}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* A 股结果 */}
                                    {searchResults.stocks?.length > 0 && (
                                        <div className="mb-2">
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1 font-semibold opacity-70 border-t border-dashed border-border/40 pt-2">A 股</div>
                                            {searchResults.stocks.map((s: any) => (
                                                <div key={s.code}
                                                    className="px-3 py-2 rounded-xl hover:bg-accent/50 flex items-center gap-3 text-sm cursor-default transition-all">
                                                    <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">{s.code}</span>
                                                    <span>{s.name}</span>
                                                    {s.change_pct != null && (
                                                        <span className={cn("ml-auto text-xs font-bold px-1.5 py-0.5 rounded",
                                                            s.change_pct >= 0 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500")}>
                                                            {s.change_pct >= 0 ? "+" : ""}{s.change_pct?.toFixed(2)}%
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* 美股结果 */}
                                    {searchResults.insider_stocks?.length > 0 && (
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1 font-semibold opacity-70 border-t border-dashed border-border/40 pt-2">美股</div>
                                            {searchResults.insider_stocks.map((s: any) => (
                                                <button key={s.ticker} onClick={() => {
                                                    router.push(`/stock/${s.ticker}`);
                                                    setSearchOpen(false); setSearchQuery("");
                                                }}
                                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-accent/50 flex items-center gap-3 text-sm group transition-all">
                                                    <span className="font-mono font-bold text-foreground bg-secondary px-1.5 py-0.5 rounded text-xs group-hover:bg-primary group-hover:text-white transition-colors">${s.ticker}</span>
                                                    <span className="text-muted-foreground text-xs truncate max-w-[120px]">{s.company_name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* 无结果 */}
                                    {!searchResults.politicians?.length && !searchResults.stocks?.length && !searchResults.insider_stocks?.length && (
                                        <div className="p-6 text-center text-sm text-muted-foreground">
                                            <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                            未找到 &ldquo;{searchQuery}&rdquo;
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <Button variant="ghost" size="sm"
                        className="text-muted-foreground hover:text-foreground font-medium rounded-full px-4 hover:bg-secondary">
                        登录
                    </Button>
                    <Button size="sm"
                        className="rounded-full px-5 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/25 font-semibold">
                        注册
                    </Button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden glass border-t border-border/40 absolute top-full w-full left-0 overflow-hidden">
                        <div className="container py-4 space-y-2">
                            {navItems.map((item) => (
                                <Link key={item.href} href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 text-sm font-medium py-3 px-4 rounded-xl hover:bg-accent/50 text-foreground/80 hover:text-primary transition-colors">
                                    <item.icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            ))}
                            <div className="pt-4 border-t border-dashed border-border/40 mt-2 px-4">
                                <Button className="w-full rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                                    注册 / 登录
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
