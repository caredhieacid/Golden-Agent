import Link from "next/link";
import { Github, Twitter, Mail, Activity } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-card border-t border-border/40 py-12 text-muted-foreground">
            <div className="container px-4 md:px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/20 border border-primary/40">
                                <Activity className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                金策<span className="text-primary">智显</span>
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            致力为个人及机构投资者提供最前沿的金融智能数据分析服务。
                            <br />
                            洞察先机，智胜未来。
                        </p>
                    </div>

                    <div>
                        <h4 className="text-foreground font-medium mb-4">平台服务</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="#" className="hover:text-primary transition-colors">国会山追踪</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">A股大数据</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">AI 研报助手</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">API 文档</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-foreground font-medium mb-4">关于我们</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="#" className="hover:text-primary transition-colors">公司简介</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">联系方式</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">加入我们</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-foreground font-medium mb-4">关注动态</h4>
                        <div className="flex space-x-4">
                            <Link href="#" className="hover:text-foreground transition-colors"><Twitter className="h-5 w-5" /></Link>
                            <Link href="#" className="hover:text-foreground transition-colors"><Github className="h-5 w-5" /></Link>
                            <Link href="#" className="hover:text-foreground transition-colors"><Mail className="h-5 w-5" /></Link>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border/40 pt-8 text-center md:text-left">
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50 mb-6">
                        <p className="text-[10px] leading-relaxed text-justify text-muted-foreground/80">
                            <strong className="text-muted-foreground">免责声明：</strong> 金策智显提供的信息仅供参考，不构成任何投资建议。金融市场存在风险，投资需谨慎。本平台展示的数据（包括但不限于国会交易、股票行情、分析报告）可能存在延迟或误差。用户应独立做出投资决策，并承担相应风险。
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground">
                        <p>© 2024 金策智显 GoldPolicy Intel. All rights reserved.</p>
                        <div className="flex space-x-6 mt-4 md:mt-0">
                            <Link href="#" className="hover:text-foreground">隐私政策</Link>
                            <Link href="#" className="hover:text-foreground">服务条款</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
