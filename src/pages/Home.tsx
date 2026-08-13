import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Gamepad2, Wrench, Layers, Dog, Brain,
  Download, ArrowRight, Cloud, Languages, BookOpen,
  Smile, Quote, FileText, Github, ThumbsUp, Heart, Flame,
  Users, Zap,
} from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import SectionTitle from "@/components/SectionTitle";
import OnboardingSpotlight from "@/components/OnboardingSpotlight";
import StatCounter from "@/components/StatCounter";
import DownloadButton from "@/components/DownloadButton";
import { LucideIcon } from "lucide-react";
import { stats, highlights, petFeatures, games, tools, aiTools, siteConfig } from "@/data/content";
import { findFeatureByName } from "@/data/playgroundData";
import {
  computeHotScore,
  getFeatureLikes,
  subscribeSocial,
} from "@/lib/socialStore";
import xiaobaiLogo from "@/assets/xiaobai-logo.gif";

const iconMap: Record<string, LucideIcon> = {
  Sparkles, Gamepad2, Wrench, Layers, Dog, Brain,
  Cloud: Cloud, Languages, BookOpen, Smile, Quote, FileText,
};

function FloatingParticles() {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 20 + 10,
    left: Math.random() * 100,
    duration: Math.random() * 10 + 8,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.3 + 0.1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle bg-brand-pink rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.left}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const { ref: featuresRef, isVisible: featuresVisible } = useScrollReveal();
  const { ref: downloadRef, isVisible: downloadVisible } = useScrollReveal();

  // 订阅社交存储变更，点赞后实时刷新榜单
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const off = subscribeSocial(() => setTick((t) => t + 1));
    return off;
  }, []);

  /** 按热度排序工具函数（赞×2 + 喜欢×3） */
  const hotSorted = <T extends { name: string }>(arr: T[], limit?: number) => {
    void tick;
    const ranked = arr
      .map((x) => {
        const meta = findFeatureByName(x.name);
        const likes = meta ? getFeatureLikes(meta.id) : null;
        return {
          row: x,
          meta,
          likes,
          hot: likes ? computeHotScore(likes) : 0,
        };
      })
      .sort((a, b) => b.hot - a.hot);
    return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
  };

  // 全站跨分类 Top 3 推荐
  const topOverall = useMemo(() => {
    void tick;
    return hotSorted([...games, ...tools, ...aiTools], 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  const topGames = useMemo(() => hotSorted(games, 10), [tick]);
  const topTools = useMemo(() => hotSorted(tools, 8), [tick]);
  const topAi = useMemo(() => hotSorted(aiTools), [tick]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-cream via-white to-pink-50" />
        <FloatingParticles />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-20">
          <div className="animate-float inline-block mb-8">
            <div className="w-40 h-40 md:w-52 md:h-52 rounded-full bg-gradient-to-br from-white to-pink-50 shadow-2xl shadow-pink-200/50 flex items-center justify-center border-4 border-white overflow-hidden">
              <img 
                src={xiaobaiLogo} 
                alt="小白" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <h1 className="font-serif text-5xl md:text-7xl font-bold text-brand-dark mb-6 animate-fade-in-up">
            智能桌面宠物<span className="gradient-text">小白</span>
          </h1>

          <p className="text-lg md:text-xl text-brand-gray mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.2s", opacity: 0, animationFillMode: "forwards" }}>
            集桌面陪伴、15款游戏、十余款工具、AI智能助手于一体的全能桌面小助手
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "0.4s", opacity: 0, animationFillMode: "forwards" }}>
            <DownloadButton variant="primary" size="large" label="立即下载" internalLink="/download" />
            <DownloadButton variant="secondary" size="large" label="查看功能" internalLink="/features" />
          </div>

          <div className="mt-16 flex items-center justify-center gap-2 text-sm text-brand-gray animate-fade-in" style={{ animationDelay: "0.6s", opacity: 0, animationFillMode: "forwards" }}>
            <Github size={16} />
            <a href={siteConfig.github} target="_blank" rel="noopener noreferrer" className="hover:text-brand-pink transition-colors">
              开源项目 · {siteConfig.version}
            </a>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" className="w-full">
            <path d="M0,50 C320,100 720,0 1440,50 L1440,100 L0,100 Z" fill="#FFF9F5" />
          </svg>
        </div>
      </section>

      {/* 升级6：浮动快捷入口卡片（位于 Hero 下方，4 张卡片快速跳转游戏/工具/社交/下载） */}
      <section className="px-6 -mt-10 sm:-mt-14 relative z-20">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {/* 游戏中心 */}
          <Link
            to="/playground"
            className="group relative bg-white dark:bg-[#1a1418] rounded-3xl border border-pink-100 dark:border-white/10 p-5 md:p-6 shadow-xl shadow-pink-200/30 dark:shadow-black/30 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
          >
            <span className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-pink-300/40 to-fuchsia-300/20 blur-xl group-hover:scale-125 transition-transform" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white inline-flex items-center justify-center mb-4 shadow-md">
                <Gamepad2 size={22} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif font-bold text-brand-dark dark:text-gray-100 text-base md:text-lg">
                  游戏中心
                </h3>
                <ArrowRight size={16} className="text-brand-pink opacity-70 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="mt-1 text-xs md:text-sm text-brand-gray dark:text-gray-400">
                15 款小游戏：羊了个羊、2048、贪吃蛇…
              </p>
            </div>
          </Link>

          {/* 工具集合 */}
          <Link
            to="/features"
            className="group relative bg-white dark:bg-[#1a1418] rounded-3xl border border-pink-100 dark:border-white/10 p-5 md:p-6 shadow-xl shadow-pink-200/30 dark:shadow-black/30 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
          >
            <span className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-sky-300/40 to-indigo-300/20 blur-xl group-hover:scale-125 transition-transform" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white inline-flex items-center justify-center mb-4 shadow-md">
                <Wrench size={22} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif font-bold text-brand-dark dark:text-gray-100 text-base md:text-lg">
                  工具集合
                </h3>
                <ArrowRight size={16} className="text-brand-pink opacity-70 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="mt-1 text-xs md:text-sm text-brand-gray dark:text-gray-400">
                磁盘清理、放大镜、便签闹钟等生产力工具
              </p>
            </div>
          </Link>

          {/* 社交广场（跳到 about#community，目前约等社区板块） */}
          <Link
            to="/about"
            className="group relative bg-white dark:bg-[#1a1418] rounded-3xl border border-pink-100 dark:border-white/10 p-5 md:p-6 shadow-xl shadow-pink-200/30 dark:shadow-black/30 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
          >
            <span className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-emerald-300/40 to-teal-300/20 blur-xl group-hover:scale-125 transition-transform" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white inline-flex items-center justify-center mb-4 shadow-md">
                <Users size={22} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif font-bold text-brand-dark dark:text-gray-100 text-base md:text-lg">
                  社交广场
                </h3>
                <ArrowRight size={16} className="text-brand-pink opacity-70 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="mt-1 text-xs md:text-sm text-brand-gray dark:text-gray-400">
                大家的留言墙、作品分享、社区交流
              </p>
            </div>
          </Link>

          {/* 立即下载 */}
          <Link
            to="/download"
            className="group relative bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white rounded-3xl border border-white/20 p-5 md:p-6 shadow-xl shadow-pink-300/40 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
          >
            <span className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/20 blur-xl group-hover:scale-125 transition-transform" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm inline-flex items-center justify-center mb-4 shadow-md ring-1 ring-white/30">
                <Download size={22} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif font-bold text-base md:text-lg">立即下载</h3>
                <div className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2.5 py-1">
                  <Zap size={12} /> 新版 v{siteConfig.version}
                </div>
              </div>
              <p className="mt-1 text-xs md:text-sm text-white/85">
                安装版 / 便携版 · SHA256 校验 · 更新日志
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-brand-cream dark:bg-[#141414]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = iconMap[stat.icon] || Sparkles;
              return (
                <StatCounter
                  key={stat.label}
                  value={stat.value}
                  suffix={stat.suffix}
                  label={stat.label}
                  icon={<Icon size={28} />}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="核心亮点"
            subtitle="四大板块，全方位覆盖你的桌面需求"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((item, index) => {
              const Icon = iconMap[item.icon] || Sparkles;
              return (
                <div
                  key={item.title}
                  className="glass rounded-2xl p-6 hover:shadow-xl hover:shadow-pink-100/50 transition-all duration-300 hover:-translate-y-2 group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon size={28} />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-brand-dark mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-brand-gray leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pet Features Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-pink-50">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="桌面宠物互动"
            subtitle="26+ 种动画效果，9 种互动方式，3 种行为模式"
          />
          <div ref={featuresRef} className={`reveal ${featuresVisible ? "is-visible" : ""} grid grid-cols-1 md:grid-cols-3 gap-4`}>
            {petFeatures.map((feature) => (
              <div
                key={feature.name}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-pink-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-brand-pink" />
                  <h4 className="font-semibold text-brand-dark">{feature.name}</h4>
                </div>
                <p className="text-xs text-brand-gray ml-4">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🔥 全站人气推荐 Top 3（游戏/工具/AI 跨分类） */}
      <section className="py-16 px-6 bg-gradient-to-b from-white via-amber-50/50 to-pink-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 text-sm font-medium mb-4 shadow-sm">
              <Flame size={16} className="animate-pulse" />
              全站人气 Top 3 · 实时热度
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-dark mb-2">
              大家<span className="gradient-text">最喜欢</span>
            </h2>
            <p className="text-brand-gray text-sm md:text-base max-w-xl mx-auto">
              热度 = 赞👍×2 + 喜欢❤️×3，你每一次点击都会把喜欢的功能推向更多人
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {topOverall.map((row, idx) => {
              const Icon = iconMap[(row.row as any).icon] || Sparkles;
              const rankGradient =
                idx === 0
                  ? "from-amber-400 via-orange-500 to-pink-500"
                  : idx === 1
                  ? "from-slate-300 via-slate-400 to-slate-500"
                  : "from-amber-600 via-amber-700 to-yellow-800";
              const likes = row.likes;
              return (
                <Link
                  key={`top-${idx}-${row.meta?.id}`}
                  to={row.meta ? `/playground/${row.meta.id}` : "/features"}
                  className={`relative rounded-3xl p-[1px] shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-all bg-gradient-to-br ${rankGradient} group`}
                >
                  <div className="rounded-[calc(1.5rem-1px)] p-6 h-full bg-gradient-to-br from-white via-white/90 to-white/80">
                    <div
                      className={`absolute -top-4 -left-4 w-12 h-12 rounded-full flex items-center justify-center font-black text-white shadow-lg ${
                        idx === 0
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-lg"
                          : idx === 1
                          ? "bg-gradient-to-br from-slate-400 to-slate-600"
                          : "bg-gradient-to-br from-amber-700 to-yellow-800"
                      }`}
                    >
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 via-violet-100 to-amber-100 flex items-center justify-center text-brand-pink shadow-inner shrink-0 group-hover:scale-105 transition">
                        <Icon size={32} />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h4 className="font-bold text-brand-dark text-lg truncate">
                          {row.meta?.name || row.row.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {row.meta?.summary || (row.row as any).description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl bg-gradient-to-r from-orange-50 via-pink-50 to-violet-50 border border-orange-100 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 text-white text-xs font-bold shadow-sm">
                          <Flame size={12} /> 热度 {row.hot}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <ThumbsUp size={12} className="text-rose-500" /> {likes?.thumbsUp ?? 0}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Heart size={12} className="text-pink-500 fill-pink-500/20" /> {likes?.hearts ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">点击打开功能 →</span>
                      <ArrowRight size={16} className="text-brand-pink group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Games Preview Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="15 款休闲游戏"
            subtitle="从经典到创新，按人气自动排序"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {topGames.map((entry) => {
              const game = entry.row as any;
              const Icon = iconMap[game.icon] || Gamepad2;
              const hot = entry.hot;
              const likes = entry.likes;
              return (
                <Link
                  key={game.name}
                  to={entry.meta ? `/playground/${entry.meta.id}` : "/features"}
                  className={`rounded-xl p-4 text-center transition-all duration-300 hover:-translate-y-1 ${
                    hot > 0 || game.featured
                      ? "bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white shadow-lg shadow-pink-200/50"
                      : "bg-white border border-pink-50 hover:shadow-md"
                  }`}
                >
                  <Icon size={32} className="mx-auto mb-2" />
                  <h4 className={`font-semibold text-sm ${hot > 0 || game.featured ? "text-white" : "text-brand-dark"}`}>
                    {game.name}
                  </h4>
                  {(hot > 0 || game.featured) && (
                    <>
                      <p className="text-xs text-white/80 mt-1 line-clamp-2 min-h-[2em]">{game.description}</p>
                      <div className="mt-2 flex items-center justify-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-0.5 bg-white/20 px-2 py-0.5 rounded-full">
                          <Flame size={10} /> {hot}
                        </span>
                        <span className="inline-flex items-center gap-0.5 bg-white/20 px-2 py-0.5 rounded-full">
                          <ThumbsUp size={10} /> {likes?.thumbsUp ?? 0}
                        </span>
                        <span className="inline-flex items-center gap-0.5 bg-white/20 px-2 py-0.5 rounded-full">
                          <Heart size={10} /> {likes?.hearts ?? 0}
                        </span>
                      </div>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 text-brand-pink hover:text-brand-pink-dark font-medium transition-colors"
            >
              查看全部游戏 <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Tools Preview Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="十余款实用工具"
            subtitle="桌面管理、画板、截图、转换器... 按人气自动排序"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {topTools.map((entry) => {
              const tool = entry.row as any;
              const Icon = iconMap[tool.icon] || Wrench;
              const hot = entry.hot;
              const likes = entry.likes;
              const featured = hot > 0 || tool.featured;
              return (
                <Link
                  key={tool.name}
                  to={entry.meta ? `/playground/${entry.meta.id}` : "/features"}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 border border-pink-50 group"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${featured ? "bg-gradient-to-br from-brand-pink to-pink-600 text-white shadow" : "bg-pink-50 text-brand-pink"}`}>
                    <Icon size={20} />
                  </div>
                  <h4 className="font-semibold text-sm text-brand-dark mb-1">{tool.name}</h4>
                  <p className="text-xs text-brand-gray line-clamp-2 min-h-[2em]">{tool.description}</p>
                  {hot > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                      <span className="inline-flex items-center gap-0.5 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                        <Flame size={10} /> {hot}
                      </span>
                      <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">
                        <ThumbsUp size={10} /> {likes?.thumbsUp ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-0.5 bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full">
                        <Heart size={10} /> {likes?.hearts ?? 0}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Tools Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="AI 智能助手"
            subtitle="天气、翻译、词典、笑话... 按人气自动排序"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {topAi.map((entry) => {
              const tool = entry.row as any;
              const Icon = iconMap[tool.icon] || Brain;
              const hot = entry.hot;
              const likes = entry.likes;
              return (
                <Link
                  key={tool.name}
                  to={entry.meta ? `/playground/${entry.meta.id}` : "/features"}
                  className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-pink-50 group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 ${
                    hot > 0
                      ? "bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 shadow"
                      : "bg-gradient-to-br from-emerald-400 to-teal-400"
                  }`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-brand-dark truncate">{tool.name}</h4>
                    <p className="text-xs text-brand-gray line-clamp-2 min-h-[2em]">{tool.description}</p>
                    {hot > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                        <span className="inline-flex items-center gap-0.5 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                          <Flame size={10} /> {hot}
                        </span>
                        <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">
                          <ThumbsUp size={10} /> {likes?.thumbsUp ?? 0}
                        </span>
                        <span className="inline-flex items-center gap-0.5 bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full">
                          <Heart size={10} /> {likes?.hearts ?? 0}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Download CTA Section */}
      <section ref={downloadRef} className={`reveal ${downloadVisible ? "is-visible" : ""} py-20 px-6`}>
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-12 text-center shadow-xl shadow-pink-100/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-pink/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-pink/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/80 rounded-full px-4 py-2 mb-6">
                <Download size={16} className="text-brand-pink" />
                <span className="text-sm text-brand-dark font-medium">{siteConfig.version} · 最新版本</span>
              </div>

              <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-dark mb-4">
                准备好领养你的<span className="gradient-text">小白</span>了吗？
              </h2>
              <p className="text-brand-gray mb-8 max-w-xl mx-auto">
                免费、开源、持续更新。立即下载，让小白陪伴你的每一天。
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <DownloadButton variant="primary" size="large" label="下载安装包" internalLink="/download" />
                <DownloadButton variant="secondary" size="large" label="查看源码" href={siteConfig.github} />
              </div>

              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-brand-gray">
                <span>✓ Windows 10/11</span>
                <span>✓ 免费 & 开源</span>
                <span>✓ 持续更新</span>
              </div>
            </div>
          </div>
        </div>

      {/* ===== 新手引导 Spotlight（首次访问显示） ===== */}
      <OnboardingSpotlight />
      </section>
    </div>
  );
}
