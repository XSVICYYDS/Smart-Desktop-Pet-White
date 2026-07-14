import { Link } from "react-router-dom";
import { Github, Mail, Heart } from "lucide-react";
import { siteConfig } from "@/data/content";

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-white/80 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
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
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">快速导航</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-brand-pink transition-colors">首页</Link></li>
              <li><Link to="/features" className="hover:text-brand-pink transition-colors">功能详情</Link></li>
              <li><Link to="/download" className="hover:text-brand-pink transition-colors">下载</Link></li>
              <li><Link to="/about" className="hover:text-brand-pink transition-colors">关于</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">联系方式</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={siteConfig.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-brand-pink transition-colors"
                >
                  <Github size={16} /> GitHub 仓库
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="flex items-center gap-2 hover:text-brand-pink transition-colors"
                >
                  <Mail size={16} /> {siteConfig.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            © 2024-2026 {siteConfig.developer}. 保留所有权利.
          </p>
          <p className="text-xs text-white/40 flex items-center gap-1">
            用 <Heart size={12} className="text-brand-pink fill-current" /> 构建 · {siteConfig.version}
          </p>
        </div>
      </div>
    </footer>
  );
}
