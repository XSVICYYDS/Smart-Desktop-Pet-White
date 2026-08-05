import { Link } from "react-router-dom";
import {
  Github, Mail, Heart, Gamepad2, Wrench, Brain,
  MessageCircle, Send, Zap,
} from "lucide-react";
import { siteConfig, games, tools, aiTools } from "@/data/content";

/**
 * 页脚：品牌介绍 + 站点地图（页面/游戏/工具/AI 四类） + 联系方式 + 备案风格信息行
 */
export default function Footer() {
  return (
    <footer className="bg-brand-dark text-white/80 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6 md:gap-8">
          {/* 品牌介绍（2列宽） */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-pink to-brand-pink-light flex items-center justify-center text-white font-bold text-lg">
                白
              </div>
              <span className="font-serif text-xl font-bold text-white">
                {siteConfig.shortName}
              </span>
            </div>
            <p className="text-sm text-white/60 max-w-md leading-relaxed">
              {siteConfig.description}
            </p>
            {/* 社交/外联 */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 transition"
                title="GitHub 仓库"
              >
                <Github size={13} /> GitHub
              </a>
              <a
                href={`mailto:${siteConfig.email}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 transition"
                title="邮箱联系"
              >
                <Mail size={13} /> 邮箱反馈
              </a>
              <Link
                to="/social"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 transition"
                title="社区讨论"
              >
                <MessageCircle size={13} /> 社区讨论
              </Link>
              <Link
                to="/about#community"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 transition"
                title="加入小白社群"
              >
                <Send size={13} /> 加入我们
              </Link>
            </div>
          </div>

          {/* 快速导航 */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm flex items-center gap-1.5">
              <Zap size={13} className="text-brand-pink" /> 快速导航
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-brand-pink transition-colors">首页</Link></li>
              <li><Link to="/features" className="hover:text-brand-pink transition-colors">功能详情</Link></li>
              <li><Link to="/social" className="hover:text-brand-pink transition-colors">社交中心</Link></li>
              <li><Link to="/download" className="hover:text-brand-pink transition-colors">下载</Link></li>
              <li><Link to="/about" className="hover:text-brand-pink transition-colors">关于 / FAQ</Link></li>
              <li><Link to="/auth" className="hover:text-brand-pink transition-colors">登录 / 注册</Link></li>
            </ul>
          </div>

          {/* 游戏分类站点地图 */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm flex items-center gap-1.5">
              <Gamepad2 size={13} className="text-pink-300" /> 休闲游戏
            </h4>
            <ul className="space-y-2 text-xs">
              {games.slice(0, 8).map((g) => (
                <li key={g.name}>
                  <Link to="/features" className="hover:text-brand-pink transition-colors">{g.name}</Link>
                </li>
              ))}
              <li>
                <Link to="/features" className="text-brand-pink-light hover:text-brand-pink transition-colors">
                  查看全部 →
                </Link>
              </li>
            </ul>
          </div>

          {/* 工具分类站点地图 */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm flex items-center gap-1.5">
              <Wrench size={13} className="text-emerald-300" /> 实用工具
            </h4>
            <ul className="space-y-2 text-xs">
              {tools.slice(0, 8).map((t) => (
                <li key={t.name}>
                  <Link to="/features" className="hover:text-brand-pink transition-colors">{t.name}</Link>
                </li>
              ))}
              <li>
                <Link to="/features" className="text-emerald-300 hover:text-emerald-200 transition-colors">
                  查看全部 →
                </Link>
              </li>
            </ul>
          </div>

          {/* AI 智能助手站点地图 */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm flex items-center gap-1.5">
              <Brain size={13} className="text-violet-300" /> AI 工具箱
            </h4>
            <ul className="space-y-2 text-xs">
              {aiTools.map((a) => (
                <li key={a.name}>
                  <Link to="/features" className="hover:text-brand-pink transition-colors">{a.name}</Link>
                </li>
              ))}
              <li>
                <Link to="/about#roadmap" className="text-violet-300 hover:text-violet-200 transition-colors">
                  路线图 →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部分割信息 */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>© 2024-2026 {siteConfig.developer}. 保留所有权利.</span>
            <span className="hidden md:inline">本项目为免费开源软件，遵守 MIT License。</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href={siteConfig.githubReleases}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/70 transition"
            >
              Releases
            </a>
            <Link to="/about#faq" className="hover:text-white/70 transition">FAQ</Link>
            <Link to="/about#privacy" className="hover:text-white/70 transition">隐私说明</Link>
            <a
              href="mailto:XSVICYYDS@outlook.com?subject=[小白网站反馈]问题反馈"
              className="hover:text-white/70 transition"
            >
              问题反馈
            </a>
            <span className="inline-flex items-center gap-1">
              用 <Heart size={12} className="text-brand-pink fill-current" /> 构建 · {siteConfig.version}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
