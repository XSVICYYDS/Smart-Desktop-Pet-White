import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dog, Gamepad2, Wrench, Brain,
  Move, MousePointer2, BellOff,
  PawPrint, Grid3x3, Square, Worm, Circle, Puzzle, Link,
  Bomb, CircleDot, Package, Hash, Crosshair, Grid, Hammer, Candy,
  FolderTree, Palette, FileOutput, Camera, PenTool,
  Calculator, StickyNote, Brush, HardDrive, ZoomIn, NotebookPen, AlarmClock,
  CloudSun, Languages, BookOpen, Smile, Quote, FileText,
  Heart, Zap, Activity, Moon, Sun, ThumbsUp, Flame,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import DownloadButton from "@/components/DownloadButton";
import { FeatureCard } from "@/components/FeatureCard";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { petFeatures, petModes, petAnimations, games, tools, aiTools } from "@/data/content";
import { findFeatureByName, type FeatureMeta } from "@/data/playgroundData";
import {
  computeHotScore,
  getFeatureLikes,
  subscribeSocial,
  type FeatureLikes,
} from "@/lib/socialStore";

const iconMap: Record<string, LucideIcon> = {
  Dog, Gamepad2, Wrench, Brain,
  Move, MousePointer2, BellOff,
  PawPrint, Grid3x3, Square, Worm, Circle, Puzzle, Link,
  Bomb, CircleDot, Package, Hash, Crosshair, Grid, Hammer, Candy,
  FolderTree, Palette, FileOutput, Camera, PenTool,
  Calculator, StickyNote, Brush, HardDrive, ZoomIn, NotebookPen, AlarmClock,
  CloudSun, Languages, BookOpen, Smile, Quote, FileText,
};

export default function Features() {
  const { ref: ref1, isVisible: vis1 } = useScrollReveal();
  const { ref: ref2, isVisible: vis2 } = useScrollReveal();
  const { ref: ref3, isVisible: vis3 } = useScrollReveal();
  const [selectedAnim, setSelectedAnim] = useState<string | null>(null);
  const { ref: ref4, isVisible: vis4 } = useScrollReveal();
  const navigate = useNavigate();

  // 订阅 socialStore 的变更，点赞后立刻刷新榜单
  const [likesTick, setLikesTick] = useState(0);
  useEffect(() => {
    const off = subscribeSocial(() => setLikesTick((t) => t + 1));
    return off;
  }, []);

  /**
   * 带热度排序的通用列表生成器（纯函数）
   *  - 先按「热度 = 赞×2 + 喜欢×3」降序
   *  - 同热度按原顺序保留
   */
  const buildHotRank = <T extends { name: string; featured?: boolean }>(arr: T[]) =>
    arr
      .map((x) => {
        const meta = findFeatureByName(x.name);
        const likes = meta ? getFeatureLikes(meta.id) : null;
        return {
          row: x,
          meta: meta as FeatureMeta | null,
          likes: likes as FeatureLikes | null,
          hot: likes ? computeHotScore(likes) : 0,
        };
      })
      .sort((a, b) => b.hot - a.hot);

  const rankedGames = useMemo(() => {
    void likesTick;
    return buildHotRank(games);
  }, [likesTick]);
  const rankedTools = useMemo(() => {
    void likesTick;
    return buildHotRank(tools);
  }, [likesTick]);
  const rankedAi = useMemo(() => {
    void likesTick;
    return buildHotRank(aiTools);
  }, [likesTick]);
  // 跨分类 Top 5（全局热门推荐位）
  const overallTop = useMemo(() => {
    void likesTick;
    return [...rankedGames, ...rankedTools, ...rankedAi]
      .sort((a, b) => b.hot - a.hot)
      .slice(0, 5);
  }, [rankedGames, rankedTools, rankedAi, likesTick]);

  /**
   * 统一的带导航的功能卡片包装
   *  - 把 useNavigate 的结果注入到 onNavigatePlayground 回调中
   *  - 避免在循环/条件中调用 hooks（违反 React 规则）
   */
  const CardWrap: React.FC<{
    meta: ReturnType<typeof findFeatureByName>;
    Icon: LucideIcon;
    featured?: boolean;
  }> = ({ meta, Icon, featured }) => {
    if (!meta) return null;
    return (
      <FeatureCard
        meta={meta}
        Icon={Icon}
        featured={featured}
        onNavigatePlayground={(id) => navigate(`/playground/${id}`)}
      />
    );
  };
  const FeatureCardWithNav = CardWrap;
  void FeatureCardWithNav;

  return (
    <div className="pt-24">
      {/* Page Header */}
      <section className="py-16 px-6 text-center bg-gradient-to-b from-pink-50 to-white">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-brand-dark mb-4">
          功能<span className="gradient-text">详情</span>
        </h1>
        <p className="text-brand-gray text-lg max-w-2xl mx-auto">
          四大核心板块，45+ 功能项，全方位打造你的智能桌面体验
        </p>
      </section>

      {/* Section 1: Desktop Pet */}
      <section ref={ref1} className={`reveal ${vis1 ? "is-visible" : ""} py-20 px-6`}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-pink-100 rounded-full px-4 py-2 mb-4">
                <Dog size={20} className="text-brand-pink" />
                <span className="text-sm font-medium text-brand-pink">桌面宠物</span>
              </div>
              <h2 className="font-serif text-3xl font-bold text-brand-dark mb-4">
                你的桌面<span className="gradient-text">小伙伴</span>
              </h2>
              <p className="text-brand-gray mb-6 leading-relaxed">
                小白拥有 26+ 种可爱动画效果，从日常待机到各种互动动画，让你的桌面充满生机。
                通过状态系统（快乐值、能量值）模拟真实的养成体验。
              </p>

              <h3 className="font-semibold text-brand-dark mb-3">9 种互动方式</h3>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {petFeatures.map((feature) => (
                  <div key={feature.name} className="flex items-start gap-2 text-sm">
                    <Heart size={14} className="text-brand-pink mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-brand-dark">{feature.name}</span>
                      <span className="text-brand-gray text-xs block">{feature.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-brand-dark mb-4">3 种行为模式</h3>
              <div className="space-y-4 mb-6">
                {petModes.map((mode) => {
                  const Icon = iconMap[mode.icon] || Move;
                  return (
                    <div key={mode.name} className="glass rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-pink to-brand-pink-light flex items-center justify-center text-white shrink-0">
                        <Icon size={24} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-brand-dark">{mode.name}</h4>
                        <p className="text-xs text-brand-gray">{mode.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <h3 className="font-semibold text-brand-dark mb-4">状态系统</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={18} className="text-brand-pink" />
                    <span className="font-semibold text-brand-dark">快乐值</span>
                  </div>
                  <p className="text-xs text-brand-gray">表示小白的快乐程度，通过互动提升</p>
                </div>
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={18} className="text-amber-400" />
                    <span className="font-semibold text-brand-dark">能量值</span>
                  </div>
                  <p className="text-xs text-brand-gray">表示小白的能量程度，通过充电恢复</p>
                </div>
              </div>
            </div>
          </div>

          {/* Animation list */}
          <div className="mt-12">
            <h3 className="font-serif text-xl font-bold text-brand-dark mb-4 text-center">26+ 种动画效果</h3>
            <p className="text-center text-brand-gray text-sm mb-4">点击按钮预览对应动画</p>
            <div className="flex flex-wrap justify-center gap-2">
              {petAnimations.map((anim) => (
                <button
                  key={anim}
                  onClick={() => setSelectedAnim(anim)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all cursor-pointer ${
                    selectedAnim === anim
                      ? "bg-brand-pink text-white border-brand-pink shadow-md"
                      : "bg-white text-brand-dark border-pink-100 hover:border-brand-pink hover:text-brand-pink"
                  }`}
                >
                  {anim}
                </button>
              ))}
            </div>

            {/* GIF preview area */}
            {selectedAnim && (
              <div className="mt-8 flex flex-col items-center animate-fade-in-up">
                <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-pink-100">
                  <button
                    onClick={() => setSelectedAnim(null)}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-brand-pink text-white rounded-full flex items-center justify-center hover:bg-brand-pink/90 transition-colors shadow-md cursor-pointer"
                    title="关闭预览"
                  >
                    ✕
                  </button>
                  <img
                    src={`/Smart-Desktop-Pet-White/gif/${selectedAnim}.gif`}
                    alt={`${selectedAnim} animation`}
                    className="w-64 h-64 object-contain rounded-xl"
                  />
                  <p className="text-center text-brand-dark font-medium mt-3">
                    {selectedAnim}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: 全局人气推荐榜（跨游戏/工具/AI 的 Top 5） */}
      <section className="py-16 px-6 bg-gradient-to-b from-white via-amber-50/40 to-pink-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 text-sm font-medium mb-4 shadow-sm">
              <Flame size={16} className="animate-pulse" />
              人气推荐榜 · 实时热度排序
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-dark mb-2">
              大家<span className="gradient-text">最喜欢</span>的功能
            </h2>
            <p className="text-brand-gray text-sm md:text-base max-w-xl mx-auto">
              热度 = 赞👍×2 + 喜欢❤️×3。喜欢什么就点什么，让你的爱把它推到榜首吧～
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {overallTop.map((row, idx) => {
              const Icon = row.row ? (iconMap[(row.row as any).icon] || Brain) : Brain;
              const rankGradient =
                idx === 0
                  ? "from-amber-400 via-orange-500 to-pink-500"
                  : idx === 1
                  ? "from-slate-300 via-slate-400 to-slate-500"
                  : idx === 2
                  ? "from-amber-600 via-amber-700 to-yellow-800"
                  : "from-slate-100 via-pink-100 to-violet-100";
              const textLight = idx <= 2;
              const rank = idx + 1;
              const likes = row.likes;
              return (
                <button
                  key={row.meta?.id || `${idx}-${row.row?.name}`}
                  onClick={() => row.meta && navigate(`/playground/${row.meta.id}`)}
                  className={`relative group rounded-3xl p-[1px] shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer bg-gradient-to-br ${rankGradient}`}
                >
                  <div className={`rounded-[calc(1.5rem-1px)] h-full p-4 flex flex-col items-center text-center ${textLight ? "text-white" : "text-slate-800"} bg-gradient-to-br ${textLight ? "from-white/0 via-white/0 to-black/10" : "from-white to-white"}`}>
                    <div
                      className={`absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center font-black shadow-lg text-white ${
                        idx === 0
                          ? "bg-gradient-to-br from-amber-400 to-orange-500"
                          : idx === 1
                          ? "bg-gradient-to-br from-slate-400 to-slate-600"
                          : idx === 2
                          ? "bg-gradient-to-br from-amber-700 to-yellow-800"
                          : "bg-gradient-to-br from-violet-400 to-fuchsia-500"
                      }`}
                    >
                      {rank}
                    </div>
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner ${
                        textLight ? "bg-white/25 border border-white/30" : "bg-gradient-to-br from-pink-50 to-violet-50 border border-pink-200 text-brand-pink"
                      }`}
                    >
                      <Icon size={28} />
                    </div>
                    <h4 className={`font-bold ${textLight ? "text-white" : "text-brand-dark"} truncate w-full`}>
                      {row.meta?.name || (row.row as any)?.name}
                    </h4>
                    <p className={`text-[11px] mt-1 line-clamp-2 ${textLight ? "text-white/80" : "text-slate-500"} min-h-[2em]`}>
                      {row.meta?.summary || (row.row as any)?.description}
                    </p>

                    {/* 热度 / 赞 / 喜欢 显示 */}
                    <div className="mt-3 w-full">
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          textLight ? "bg-white/20 text-white" : "bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 border border-orange-200"
                        }`}
                      >
                        <Flame size={11} /> 热度 {row.hot}
                      </div>
                      <div className={`mt-2 flex items-center justify-center gap-3 text-[11px] ${textLight ? "text-white/85" : "text-slate-600"}`}>
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp size={11} className="text-rose-500" /> {likes?.thumbsUp ?? 0}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart size={11} className="text-pink-500 fill-pink-500/20" /> {likes?.hearts ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3: Games */}
      <section ref={ref2} className={`reveal ${vis2 ? "is-visible" : ""} py-20 px-6 bg-gradient-to-b from-white to-pink-50`}>
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="15 款休闲游戏"
            subtitle="从经典到创新，闯关与无尽双模式 · 已按人气自动排序"
          />
          {/* 分类榜 Top 3 预览条 */}
          <div className="mb-6 rounded-2xl border border-pink-200 bg-gradient-to-r from-white via-pink-50 to-rose-50 p-4 shadow-sm">
            <div className="text-xs text-rose-700 font-semibold mb-2 flex items-center gap-1">
              <Flame size={12} /> 游戏人气 Top 3
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {rankedGames.slice(0, 3).map((r, i) => {
                const Icon = iconMap[(r.row as any).icon] || Gamepad2;
                return (
                  <div
                    key={`gtop-${i}`}
                    onClick={() => r.meta && navigate(`/playground/${r.meta.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-pink-100 hover:bg-white hover:shadow-md transition-all cursor-pointer"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 ${
                        i === 0
                          ? "bg-gradient-to-br from-amber-400 to-orange-500"
                          : i === 1
                          ? "bg-gradient-to-br from-slate-400 to-slate-600"
                          : "bg-gradient-to-br from-amber-700 to-yellow-800"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <Icon size={20} className="text-brand-pink shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-brand-dark truncate">{r.meta?.name || r.row.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span><Flame size={10} className="inline -mt-0.5 text-orange-500" /> {r.hot}</span>
                        <span><ThumbsUp size={10} className="inline -mt-0.5 text-rose-500" /> {r.likes?.thumbsUp ?? 0}</span>
                        <span><Heart size={10} className="inline -mt-0.5 text-pink-500" /> {r.likes?.hearts ?? 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rankedGames.map((r) => {
              const Icon = iconMap[(r.row as any).icon] || Gamepad2;
              return (
                <FeatureCardWithNav
                  key={r.meta?.id || r.row.name}
                  meta={r.meta || undefined}
                  Icon={Icon}
                  featured={r.hot > 0 || !!r.row.featured}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 4: Tools */}
      <section ref={ref3} className={`reveal ${vis3 ? "is-visible" : ""} py-20 px-6`}>
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="十余款实用工具"
            subtitle="一站式效率工具集，自研实现无需依赖系统组件 · 已按人气自动排序"
          />
          <div className="mb-6 rounded-2xl border border-sky-200 bg-gradient-to-r from-white via-sky-50 to-indigo-50 p-4 shadow-sm">
            <div className="text-xs text-sky-700 font-semibold mb-2 flex items-center gap-1">
              <Flame size={12} /> 工具人气 Top 3
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {rankedTools.slice(0, 3).map((r, i) => {
                const Icon = iconMap[(r.row as any).icon] || Wrench;
                return (
                  <div
                    key={`ttop-${i}`}
                    onClick={() => r.meta && navigate(`/playground/${r.meta.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-sky-100 hover:bg-white hover:shadow-md transition-all cursor-pointer"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 ${
                        i === 0
                          ? "bg-gradient-to-br from-amber-400 to-orange-500"
                          : i === 1
                          ? "bg-gradient-to-br from-slate-400 to-slate-600"
                          : "bg-gradient-to-br from-amber-700 to-yellow-800"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <Icon size={20} className="text-sky-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-brand-dark truncate">{r.meta?.name || r.row.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span><Flame size={10} className="inline -mt-0.5 text-orange-500" /> {r.hot}</span>
                        <span><ThumbsUp size={10} className="inline -mt-0.5 text-rose-500" /> {r.likes?.thumbsUp ?? 0}</span>
                        <span><Heart size={10} className="inline -mt-0.5 text-pink-500" /> {r.likes?.hearts ?? 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rankedTools.map((r) => {
              const Icon = iconMap[(r.row as any).icon] || Wrench;
              return (
                <FeatureCardWithNav
                  key={r.meta?.id || r.row.name}
                  meta={r.meta || undefined}
                  Icon={Icon}
                  featured={r.hot > 0 || !!r.row.featured}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 5: AI Tools */}
      <section ref={ref4} className={`reveal ${vis4 ? "is-visible" : ""} py-20 px-6 bg-gradient-to-b from-pink-50 to-white`}>
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="AI 智能助手"
            subtitle="集成多种 AI 工具，让你的桌面更智能 · 已按人气自动排序"
          />
          <div className="mb-6 rounded-2xl border border-violet-200 bg-gradient-to-r from-white via-violet-50 to-fuchsia-50 p-4 shadow-sm">
            <div className="text-xs text-violet-700 font-semibold mb-2 flex items-center gap-1">
              <Flame size={12} /> AI 人气 Top 3
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {rankedAi.slice(0, 3).map((r, i) => {
                const Icon = iconMap[(r.row as any).icon] || Brain;
                return (
                  <div
                    key={`aitop-${i}`}
                    onClick={() => r.meta && navigate(`/playground/${r.meta.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-violet-100 hover:bg-white hover:shadow-md transition-all cursor-pointer"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 ${
                        i === 0
                          ? "bg-gradient-to-br from-amber-400 to-orange-500"
                          : i === 1
                          ? "bg-gradient-to-br from-slate-400 to-slate-600"
                          : "bg-gradient-to-br from-amber-700 to-yellow-800"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <Icon size={20} className="text-violet-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-brand-dark truncate">{r.meta?.name || r.row.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span><Flame size={10} className="inline -mt-0.5 text-orange-500" /> {r.hot}</span>
                        <span><ThumbsUp size={10} className="inline -mt-0.5 text-rose-500" /> {r.likes?.thumbsUp ?? 0}</span>
                        <span><Heart size={10} className="inline -mt-0.5 text-pink-500" /> {r.likes?.hearts ?? 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rankedAi.map((r) => {
              const Icon = iconMap[(r.row as any).icon] || Brain;
              return (
                <FeatureCardWithNav
                  key={r.meta?.id || r.row.name}
                  meta={r.meta || undefined}
                  Icon={Icon}
                  featured={r.hot > 0}
                />
              );
            })}
          </div>

          <div className="text-center mt-12">
            <DownloadButton variant="primary" size="large" label="立即体验" internalLink="/download" />
          </div>
        </div>
      </section>
    </div>
  );
}
