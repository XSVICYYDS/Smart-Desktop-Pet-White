import {
  Download, CheckCircle2,
  Monitor, Cpu, HardDrive, MonitorCog,
  Github, ExternalLink,
} from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import DownloadButton from "@/components/DownloadButton";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { siteConfig } from "@/data/content";

const steps = [
  { step: "1", title: "下载安装包", description: "选择 .msi 安装包或 .exe 便携版下载" },
  { step: "2", title: "运行安装", description: "双击安装包，按照向导提示完成安装" },
  { step: "3", title: "首次启动", description: "首次运行会显示设置向导，配置小白偏好" },
  { step: "4", title: "开始使用", description: "右键小白打开菜单，探索所有功能" },
];

export default function DownloadPage() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div className="pt-24">
      {/* Page Header */}
      <section className="py-16 px-6 text-center bg-gradient-to-b from-pink-50 to-white">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-brand-dark mb-4">
          下载<span className="gradient-text">小白</span>
        </h1>
        <p className="text-brand-gray text-lg max-w-2xl mx-auto">
          免费、开源、持续更新。选择适合你的版本，立即开始使用。
        </p>
        <div className="mt-4 inline-flex items-center gap-2 bg-white/80 rounded-full px-4 py-2">
          <span className="text-sm text-brand-dark">当前版本：</span>
          <span className="text-sm font-bold text-brand-pink">{siteConfig.version}</span>
        </div>
      </section>

      {/* Download Options */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Installer */}
            <div className="glass rounded-3xl p-8 text-center hover:shadow-xl hover:shadow-pink-100/50 transition-all hover:-translate-y-1">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-pink to-brand-pink-dark flex items-center justify-center mx-auto mb-6">
                <img src="/installer.png" alt="安装包图标" className="w-12 h-12 object-contain" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-brand-dark mb-2">安装包</h3>
              <p className="text-brand-gray text-sm mb-4">推荐大多数用户使用</p>
              <div className="bg-pink-50 rounded-lg p-3 mb-6">
                <code className="text-xs text-brand-dark">智能桌面宠物-小白(安装包).msi</code>
              </div>
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-brand-gray">
                  <CheckCircle2 size={16} className="text-brand-mint" /> 自动创建快捷方式
                </li>
                <li className="flex items-center gap-2 text-sm text-brand-gray">
                  <CheckCircle2 size={16} className="text-brand-mint" /> 系统集成安装
                </li>
                <li className="flex items-center gap-2 text-sm text-brand-gray">
                  <CheckCircle2 size={16} className="text-brand-mint" /> 支持卸载
                </li>
              </ul>
              <DownloadButton variant="primary" size="large" label="下载安装包" href={siteConfig.githubReleases} />
            </div>

            {/* Portable */}
            <div className="glass rounded-3xl p-8 text-center hover:shadow-xl hover:shadow-pink-100/50 transition-all hover:-translate-y-1">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center mx-auto mb-6">
                <img src="/portable.png" alt="便携版图标" className="w-12 h-12 object-contain" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-brand-dark mb-2">便携版</h3>
              <p className="text-brand-gray text-sm mb-4">免安装，即开即用</p>
              <div className="bg-purple-50 rounded-lg p-3 mb-6">
                <code className="text-xs text-brand-dark">智能桌面宠物-小白.exe</code>
              </div>
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-brand-gray">
                  <CheckCircle2 size={16} className="text-brand-mint" /> 无需安装
                </li>
                <li className="flex items-center gap-2 text-sm text-brand-gray">
                  <CheckCircle2 size={16} className="text-brand-mint" /> 直接运行
                </li>
                <li className="flex items-center gap-2 text-sm text-brand-gray">
                  <CheckCircle2 size={16} className="text-brand-mint" /> 便于携带
                </li>
              </ul>
              <DownloadButton variant="secondary" size="large" label="下载便携版" href={siteConfig.githubReleases} />
            </div>
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="py-16 px-6 bg-gradient-to-b from-white to-pink-50">
        <div className="max-w-4xl mx-auto">
          <SectionTitle title="系统要求" subtitle="确保你的设备满足运行条件" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 text-center border border-pink-50">
              <MonitorCog size={32} className="mx-auto mb-3 text-blue-500" />
              <h4 className="font-semibold text-brand-dark mb-1">操作系统</h4>
              <p className="text-xs text-brand-gray">Windows 10/11</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center border border-pink-50">
              <Cpu size={32} className="mx-auto mb-3 text-purple-500" />
              <h4 className="font-semibold text-brand-dark mb-1">处理器</h4>
              <p className="text-xs text-brand-gray">双核 1.6GHz+</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center border border-pink-50">
              <HardDrive size={32} className="mx-auto mb-3 text-emerald-500" />
              <h4 className="font-semibold text-brand-dark mb-1">存储空间</h4>
              <p className="text-xs text-brand-gray">200MB+ 可用</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center border border-pink-50">
              <Monitor size={32} className="mx-auto mb-3 text-brand-pink" />
              <h4 className="font-semibold text-brand-dark mb-1">屏幕</h4>
              <p className="text-xs text-brand-gray">1366×768+</p>
            </div>
          </div>
        </div>
      </section>

      {/* Installation Guide */}
      <section ref={ref} className={`reveal ${isVisible ? "is-visible" : ""} py-16 px-6`}>
        <div className="max-w-4xl mx-auto">
          <SectionTitle title="安装指南" subtitle="简单四步，快速上手" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {steps.map((item, index) => (
              <div key={item.step} className="relative">
                <div className="bg-white rounded-2xl p-6 border border-pink-50 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-pink to-brand-pink-dark flex items-center justify-center text-white font-bold mb-4">
                    {item.step}
                  </div>
                  <h4 className="font-semibold text-brand-dark mb-2">{item.title}</h4>
                  <p className="text-xs text-brand-gray">{item.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-0.5 bg-brand-pink-light" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GitHub Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-8 md:p-12 text-center shadow-lg shadow-pink-100/30">
            <Github size={48} className="mx-auto mb-4 text-brand-dark" />
            <h3 className="font-serif text-2xl font-bold text-brand-dark mb-3">
              开源项目 · 欢迎贡献
            </h3>
            <p className="text-brand-gray mb-6 max-w-xl mx-auto">
              小白是一个开源项目，源代码托管在 GitHub 上。欢迎 Star、Fork、提交 Issue 或 PR。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brand-dark text-white px-6 py-3 text-sm font-medium hover:scale-105 transition-transform"
              >
                <Github size={18} /> 查看源码
              </a>
              <a
                href={siteConfig.githubReleases}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white text-brand-dark border-2 border-brand-dark px-6 py-3 text-sm font-medium hover:scale-105 transition-transform"
              >
                <ExternalLink size={18} /> 查看所有版本
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
