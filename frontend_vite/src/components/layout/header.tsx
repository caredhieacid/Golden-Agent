import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn, formatChamber, formatPoliticianDisplayName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Gavel, BarChart3, TrendingUp, Search,
    Menu, X, Newspaper, UserSearch, AlertTriangle
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/lib/data-provider";
import { gsap } from "gsap";

export function Header() {
    const location = useLocation();
    const pathname = location.pathname;
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);

    // 搜索 — 使用全局 Context 本地过滤
    const { congress, insiders, stocks } = useData();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50); // Increased threshold to avoid jitter
        window.addEventListener("scroll", handleScroll);

        // Initial animation
        gsap.fromTo(headerRef.current,
            { y: -100, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, ease: "power4.out", delay: 0.5 }
        );

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
        { name: "内幕交易", href: "/insider", icon: UserSearch },
        { name: "实时动态", href: "/news", icon: Newspaper },
        // AI分析功能已暂停，将作为学术研究项目单独开源
        { name: "行情数据", href: "/cn-market", icon: TrendingUp },
        { name: "黄金市场", href: "/gold", icon: BarChart3 },
    ];

    return (
        <>
            {/* Risk Warning Bar (Top) */}
            <div className="w-full bg-amber-500/10 border-b border-amber-500/20 py-2 text-center backdrop-blur-sm z-50 relative">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center gap-2 flex-wrap">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>
                        本站仅提供客观信息聚合与工具服务，不构成任何投资建议，不推荐任何证券标的，不对投资盈亏承担任何责任。
                    </span>
                    <span className="text-amber-700 dark:text-amber-300">投资有风险，入市需谨慎</span>
                </p>
            </div>

            <header
                ref={headerRef}
                className={cn(
                    "fixed top-14 inset-x-0 mx-auto z-40 w-[95%] max-w-6xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    isScrolled ? "top-6 scale-[0.98]" : "top-14"
                )}
            >
                <div className={cn(
                    "relative grid grid-cols-[auto_1fr_auto] lg:grid-cols-[1fr_auto_1fr] h-16 items-center px-4 rounded-full transition-all duration-500 gap-2",
                    "bg-[#09090b]/60 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/5",
                    isScrolled && "bg-[#09090b]/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                )}>
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group relative z-10 w-fit">
                        <div className="flex items-center justify-center w-10 h-10">
                            <BarChart3 className="h-6 w-6 text-primary" />
                        </div>
                        <Logo className="h-8 w-auto text-white" />
                    </Link>

                    {/* Desktop Nav - Centered in Grid */}
                    <nav className="hidden lg:flex items-center justify-center gap-1">
                        <Link to="/"
                            className={cn(
                                "relative px-3 py-2 text-sm font-medium transition-all duration-300 rounded-full group overflow-hidden whitespace-nowrap",
                                pathname === "/" ? "text-white" : "text-muted-foreground hover:text-white"
                            )}>
                            {pathname === "/" && (
                                <motion.div layoutId="nav-pill"
                                    className="absolute inset-0 bg-white/10 rounded-full"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <UserSearch className={cn("h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:text-primary", pathname === "/" && "text-primary")} />
                                首页
                            </span>
                        </Link>

                        {navItems.map((item) => (
                            <Link key={item.href} to={item.href}
                                className={cn(
                                    "relative px-3 py-2 text-sm font-medium transition-all duration-300 rounded-full group overflow-hidden whitespace-nowrap",
                                    pathname === item.href ? "text-white" : "text-muted-foreground hover:text-white"
                                )}>
                                {pathname === item.href && (
                                    <motion.div layoutId="nav-pill"
                                        className="absolute inset-0 bg-white/10 rounded-full"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    <item.icon className={cn("h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:text-primary", pathname === item.href && "text-primary")} />
                                    {item.name}
                                </span>
                            </Link>
                        ))}
                    </nav>

                    {/* Right Side: Search + Actions */}
                    <div className="flex items-center justify-end gap-2 md:gap-4 relative z-10">
                        <div className="relative group hidden md:block" ref={searchRef}>
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input type="search"
                                ref={inputRef}
                                placeholder="搜索..."
                                className="w-32 lg:w-40 xl:w-56 pl-9 h-10 bg-white/5 border-transparent hover:bg-white/10 focus:bg-black/50 focus:w-48 lg:focus:w-64 focus:border-primary/30 transition-all duration-300 rounded-full text-sm placeholder:text-muted-foreground/50 backdrop-blur-md"
                                value={searchQuery}
                                onChange={e => handleSearchInput(e.target.value)}
                                onFocus={() => { if (searchResults) setSearchOpen(true); }}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none group-focus-within:opacity-0 transition-opacity">
                                <kbd className="inline-flex h-5 items-center gap-1 rounded bg-white/5 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-50 border border-white/5">
                                    ⌘K
                                </kbd>
                            </div>

                            {/* 搜索结果 (保持原有逻辑，仅调整样式) */}
                            <AnimatePresence>
                                {searchOpen && searchResults && (
                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute top-full right-0 mt-4 bg-[#09090b]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 min-w-[340px] p-2 ring-1 ring-black/50">

                                        {/* ... Reusing previous search result rendering logic with slight style tweaks for premium feel ... */}
                                        {/* Simplified list render for brevity, keeping consistent with previous logic */}
                                        <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                                            {/* Politicians */}
                                            {searchResults.politicians?.length > 0 && (
                                                <div className="mb-2">
                                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1.5 font-semibold opacity-70">议员</div>
                                                    {searchResults.politicians.map((p: any) => (
                                                        <button key={p.id} onClick={() => { navigate(`/congress/politician/${encodeURIComponent(p.name)}`); setSearchOpen(false); setSearchQuery(""); }}
                                                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 flex items-center gap-3 text-sm group transition-all border border-transparent hover:border-white/5">
                                                            <div className={cn("w-2 h-2 rounded-full ring-2 ring-transparent group-hover:ring-offset-1 transition-all", p.party === "D" ? "bg-blue-500" : p.party === "R" ? "bg-red-500" : "bg-gray-400")} />
                                                            <span className="font-medium text-gray-200">{formatPoliticianDisplayName(p.name)}</span>
                                                            <span className="text-xs text-muted-foreground ml-auto">{formatChamber(p.chamber)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Stocks */}
                                            {(searchResults.stocks?.length > 0 || searchResults.insider_stocks?.length > 0) && (
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1.5 font-semibold opacity-70 border-t border-white/5 pt-2">股票</div>
                                                    {[...searchResults.stocks, ...searchResults.insider_stocks].map((s: any, i) => (
                                                        <button key={s.code || s.ticker || i} onClick={() => { navigate(s.code ? '/cn-market' : `/stock/${s.ticker}`); setSearchOpen(false); setSearchQuery(""); }}
                                                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 flex items-center gap-3 text-sm group transition-all border border-transparent hover:border-white/5">
                                                            <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs group-hover:bg-primary group-hover:text-black transition-colors">{s.code || s.ticker}</span>
                                                            <span className="text-gray-300 truncate">{s.name || s.company_name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {!searchResults.politicians?.length && !searchResults.stocks?.length && !searchResults.insider_stocks?.length && (
                                                <div className="p-8 text-center text-sm text-muted-foreground">
                                                    <Search className="h-6 w-6 mx-auto mb-2 opacity-20" />
                                                    未找到 &quot;{searchQuery}&quot; 相关结果
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <Link to="/login">
                            <Button size="sm" className="hidden sm:inline-flex rounded-full px-6 bg-white text-black hover:bg-white/90 font-semibold border-0 transition-all duration-300 hover:scale-105 active:scale-95">
                                登录
                            </Button>
                        </Link>

                        {/* Mobile Menu Button */}
                        <button className="lg:hidden p-2 text-foreground/80 hover:text-foreground transition-colors"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="lg:hidden absolute top-20 left-0 w-full p-2">
                            <div className="bg-[#09090b]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-2xl">
                                <div className="space-y-1">
                                    {navItems.map((item) => (
                                        <Link key={item.href} to={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-3 text-sm font-medium py-3 px-4 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-all">
                                            <div className="p-2 bg-white/5 rounded-lg text-primary">
                                                <item.icon className="h-4 w-4" />
                                            </div>
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Spacer to prevent content overlap due to fixed header */}
            <div className="h-28"></div>
        </>
    );
}
