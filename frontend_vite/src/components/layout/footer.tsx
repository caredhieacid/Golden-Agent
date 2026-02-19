import { Link } from "react-router-dom";
import { Github, Twitter, Mail, ArrowUpRight, Sparkles } from "lucide-react";

export function Footer() {
    return (
        <footer className="relative bg-[#050505] border-t border-white/5 py-16 text-muted-foreground overflow-hidden">
            {/* Glow Effect */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[300px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="container px-4 md:px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 space-y-4">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center justify-center w-10 h-10">
                                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight text-white">
                                天枢 <span className="text-primary-foreground/90"></span>
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-400 max-w-[260px]">
                            赋能投资者，提供机构级另类数据分析与全维度金融情报。
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-6 tracking-wide text-sm uppercase opacity-80">平台功能</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link to="/congress" className="hover:text-primary transition-colors flex items-center gap-1 group">国会交易监控 <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></Link></li>
                            <li><Link to="/insider" className="hover:text-primary transition-colors flex items-center gap-1 group">企业内幕交易 <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></Link></li>
                            <li><Link to="/gold" className="hover:text-primary transition-colors flex items-center gap-1 group">黄金套利模型 <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-6 tracking-wide text-sm uppercase opacity-80">关于我们</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link to="#" className="hover:text-primary transition-colors">项目介绍</Link></li>
                            <li><Link to="#" className="hover:text-primary transition-colors">数据方法论</Link></li>
                            <li><Link to="#" className="hover:text-primary transition-colors">联系方式</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-6 tracking-wide text-sm uppercase opacity-80">关注我们</h4>
                        <div className="flex space-x-4">
                            <Link to="#" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all hover:scale-110"><Twitter className="h-5 w-5" /></Link>
                            <Link to="#" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all hover:scale-110"><Github className="h-5 w-5" /></Link>
                            <Link to="#" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all hover:scale-110"><Mail className="h-5 w-5" /></Link>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-gray-500">
                    <p>© 2026 天枢. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link to="#" className="hover:text-white transition-colors">隐私政策</Link>
                        <Link to="#" className="hover:text-white transition-colors">服务条款</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
