import { useState } from "react";
import {
  Download, CheckCircle2, Copy, Check, ChevronDown, ChevronUp,
  Monitor, Cpu, HardDrive, MonitorCog, Globe,
  Github, ExternalLink, ShieldCheck,
  FileCheck2, History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import DownloadButton from "@/components/DownloadButton";
import DownloadCounter from "@/components/DownloadCounter";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useDownloadCounter } from "@/hooks/useDownloadCounter";
import {
  siteConfig,
  systemRequirements,
  releaseChecksums,
  changelog,
} from "@/data/content";
import installerIcon from "@/assets/installer.png";
import portableIcon from "@/assets/portable.png";

const sysReqIconMap: Record<string, LucideIcon> = {
  MonitorCog,
  Cpu,
  MemoryStick: HardDrive, // 用现成图标兜底（内存没引入则用 HardDrive 占位）
  HardDrive,
  Monitor,
  Globe,
};

const steps = [
  { step: "1", title: "下载安装包", description: "选择 Setup 安装包或 Portable 便携版下载" },
  { step: "2", title: "运行安装", description: "双击安装包，按照向导提示完成安装" },
  { step: "3", title: "首次启动", description: "首次运行会显示设置向导，配置小白偏好" },
  { step: "4", title: "开始使用", description: "右键小白打开菜单，探索所有功能" },
];

export default function DownloadPage() {
  const { ref, isVisible } = useScrollReveal();
  const installerCounter = useDownloadCounter("installer");
  const portableCounter = useDownloadCounter("portable");

  // 总下载量：两个版本加起来
  const totalDownloads =
    (installerCounter.githubDownloads ?? 0) +
    (portableCounter.githubDownloads ?? 0) +
    installerCounter.localCount +
    portableCounter.localCount;

  /* =============== SHA256 一键复制（升级3） =============== */
  const [copiedShaIdx, setCopiedShaIdx] = useState<number | null>(null);
  /**
   * 复制 SHA256 到剪贴板（不依赖 navigator.clipboard 以外的权限）
   */
  const handleCopySha = async (idx: number, hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedShaIdx(idx);
      window.setTimeout(() => setCopiedShaIdx((cur) => (cur === idx ? null : cur)), 1600);
    } catch {
      // 兜底：创建隐藏 textarea 执行 copy 命令
      const ta = document.createElement("textarea");
      ta.value = hash;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopiedShaIdx(idx);
        window.setTimeout(() => setCopiedShaIdx((cur) => (cur === idx ? null : cur)), 1600);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  /* =============== Changelog 折叠面板（升级3） =============== */
  const [openChangelogVersion, setOpenChangelogVersion] = useState<string | null>(
    changelog[0]?.version ?? null
  );

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
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 bg-white/80 rounded-full px-4 py-2">
            <span className="text-sm text-brand-dark">当前版本：</span>
            <span className="text-sm font-bold text-brand-pink">{siteConfig.version}</span>
          </div>
          {/* 全站总下载量显示 */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-pink/10 to-brand-pink-dark/10 rounded-full px-4 py-2 border border-pink-200/50">
            <Download size={16} className="text-brand-pink" />
            <span className="text-sm text-brand-dark">累计下载：</span>
            <span className="text-sm font-bold text-brand-pink">
              {(installerCounter.loading || portableCounter.loading)
                ? "统计中..."
                : totalDownloads.toLocaleString("zh-CN")}
              次
            </span>
          </div>
        </div>
      </section>

      {/* Download Options */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Installer */}
            <div className="glass rounded-3xl p-8 text-center hover:shadow-xl hover:shadow-pink-100/50 transition-all hover:-translate-y-1">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-pink to-brand-pink-dark flex items-center justify-center mx-auto mb-6">
                <img src={installerIcon} alt="安装包图标" className="w-12 h-12 object-contain" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-brand-dark mb-2">安装包</h3>
              <p className="text-brand-gray text-sm mb-4">推荐大多数用户使用</p>
              <div className="bg-pink-50 rounded-lg p-3 mb-6">
                <code className="text-xs text-brand-dark">Smart-Desktop-Pet-White-Setup-0.5.0.exe</code>
                <div className="text-xs text-brand-gray mt-1">大小：约 141 MB</div>
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
              {/* 安装包下载计数器 */}
              <div className="mb-4 flex justify-center">
                <DownloadCounter assetKey="installer" variant="card" />
              </div>
              <DownloadButton
                variant="primary"
                size="large"
                label="下载安装包"
                href={siteConfig.installerUrl}
                onClick={() => installerCounter.increment()}
              />
            </div>

            {/* Portable */}
            <div className="glass rounded-3xl p-8 text-center hover:shadow-xl hover:shadow-pink-100/50 transition-all hover:-translate-y-1">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center mx-auto mb-6">
                <img src={portableIcon} alt="便携版图标" className="w-12 h-12 object-contain" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-brand-dark mb-2">便携版</h3>
              <p className="text-brand-gray text-sm mb-4">免安装，即开即用</p>
              <div className="bg-purple-50 rounded-lg p-3 mb-6">
                <code className="text-xs text-brand-dark">Smart-Desktop-Pet-White-Portable-0.5.0.exe</code>
                <div className="text-xs text-brand-gray mt-1">大小：约 140 MB</div>
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
              {/* 便携版下载计数器 */}
              <div className="mb-4 flex justify-center">
                <DownloadCounter assetKey="portable" variant="card" />
              </div>
              <DownloadButton
                variant="secondary"
                size="large"
                label="下载便携版"
                href={siteConfig.portableUrl}
                onClick={() => portableCounter.increment()}
              />
            </div>
          </div>
        </div>
      </section>

      {/* System Requirements（升级3：详细表格 最低 / 推荐） */}
      <section className="py-16 px-6 bg-gradient-to-b from-white to-pink-50 dark:from-[#161616] dark:to-[#181316]">
        <div className="max-w-5xl mx-auto">
          <SectionTitle title="系统要求" subtitle="确保你的设备满足运行条件" />
          <div className="glass rounded-3xl overflow-hidden border border-pink-100 shadow-sm dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-brand-pink/10 to-brand-pink-light/10 dark:from-brand-pink/5 dark:to-fuchsia-400/10 text-brand-dark dark:text-gray-100">
                    <th className="text-left px-5 py-3 font-semibold w-40">项目</th>
                    <th className="text-left px-5 py-3 font-semibold w-1/3">最低配置</th>
                    <th className="text-left px-5 py-3 font-semibold w-1/3">推荐配置</th>
                  </tr>
                </thead>
                <tbody>
                  {systemRequirements.map((row, idx) => {
                    const Icon = sysReqIconMap[row.icon] ?? MonitorCog;
                    return (
                      <tr
                        key={row.category}
                        className={`border-t border-pink-50 dark:border-white/5 ${
                          idx % 2 === 1 ? "bg-white/60 dark:bg-white/[0.02]" : ""
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-500/10 items-center justify-center text-brand-pink">
                              <Icon size={16} />
                            </span>
                            <span className="font-semibold text-brand-dark dark:text-gray-100">
                              {row.category}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-brand-gray dark:text-gray-300 align-top">
                          {row.minimum}
                        </td>
                        <td className="px-5 py-4 text-brand-gray dark:text-gray-300 align-top">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] mr-1.5 mb-1">
                            <CheckCircle2 size={11} /> 推荐
                          </span>
                          <span>{row.recommended}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* SHA256 校验和（升级3：防篡改 + 一键复制） */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionTitle
            icon={<FileCheck2 className="text-brand-pink" />}
            title="SHA256 校验"
            subtitle="下载后可用 PowerShell 校验文件完整性，避免被篡改"
          />
          <div className="space-y-4">
            {releaseChecksums.map((it, idx) => (
              <div
                key={it.asset}
                className="glass rounded-2xl border border-pink-100 dark:border-white/10 p-5 flex flex-col md:flex-row md:items-center gap-4"
              >
                <div className="flex items-center gap-3 md:w-64 shrink-0">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${
                    it.asset === "installer"
                      ? "bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white"
                      : "bg-gradient-to-br from-purple-400 to-indigo-400 text-white"
                  }`}>
                    {it.asset === "installer" ? <Monitor size={18} /> : <HardDrive size={18} />}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-brand-dark dark:text-gray-100 truncate">
                      {it.fileName}
                    </div>
                    <div className="text-xs text-brand-gray dark:text-gray-400">{it.size}</div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-brand-gray/80 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <ShieldCheck size={12} /> SHA256
                  </div>
                  <code className="block text-xs break-all bg-pink-50/70 dark:bg-white/5 text-brand-dark dark:text-gray-200 px-3 py-2 rounded-xl border border-pink-50 dark:border-white/10">
                    {it.sha256}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopySha(idx, it.sha256)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition
                    ${copiedShaIdx === idx
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-white dark:bg-white/10 text-brand-dark dark:text-gray-200 border border-pink-100 dark:border-white/10 hover:border-brand-pink hover:shadow-sm"}`}
                  title="复制 SHA256"
                >
                  {copiedShaIdx === idx ? (<><Check size={14} /> 已复制</>) : (<><Copy size={14} /> 复制</>)}
                </button>
              </div>
            ))}
            <div className="text-xs text-brand-gray dark:text-gray-400 pl-2 leading-6">
              💡 PowerShell 校验命令（将文件和脚本放同一目录执行）：
              <pre className="mt-2 bg-brand-dark dark:bg-black text-pink-100/90 px-4 py-3 rounded-xl overflow-x-auto">
{`Get-FileHash .\\Smart-Desktop-Pet-White-Setup-0.5.0.exe -Algorithm SHA256`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* 更新日志 Changelog（升级3：版本折叠面板） */}
      <section id="changelog" className="py-16 px-6 bg-gradient-to-b from-white to-pink-50 dark:from-[#161616] dark:to-[#181316]">
        <div className="max-w-4xl mx-auto">
          <SectionTitle
            icon={<History className="text-brand-pink" />}
            title="更新日志"
            subtitle="每个版本都带来更好的小白。点击版本号可展开/折叠详情。"
          />
          <div className="space-y-3">
            {changelog.map((entry) => {
              const isOpen = openChangelogVersion === entry.version;
              return (
                <div
                  key={entry.version}
                  className="glass rounded-2xl border border-pink-100 dark:border-white/10 overflow-hidden transition-shadow hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenChangelogVersion((cur) => (cur === entry.version ? null : entry.version))
                    }
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-xs font-semibold border border-brand-pink/20 dark:bg-pink-500/10 dark:border-pink-500/20 dark:text-pink-300">
                        <ShieldCheck size={11} />
                        {entry.version}
                      </span>
                      <span className="font-semibold text-brand-dark dark:text-gray-100 truncate">
                        {entry.date}
                      </span>
                      <span className="hidden sm:inline text-xs text-brand-gray dark:text-gray-400">
                        {entry.highlights.length} 项更新
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp size={18} className="text-brand-gray shrink-0" />
                    ) : (
                      <ChevronDown size={18} className="text-brand-gray shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5">
                      <ul className="space-y-2 border-t border-pink-50 dark:border-white/5 pt-3">
                        {entry.highlights.map((h, i) => (
                          <li key={i} className="flex gap-2 text-sm text-brand-gray dark:text-gray-300">
                            <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-brand-pink shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 text-right">
                        <a
                          href={`${siteConfig.githubReleases}/tag/${entry.version}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand-pink hover:text-brand-pink-dark"
                        >
                          <ExternalLink size={12} /> 在 GitHub 查看该版本详情
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
