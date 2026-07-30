import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dog, Gamepad2, Wrench, Brain,
  Move, MousePointer2, BellOff,
  PawPrint, Grid3x3, Square, Worm, Circle, Puzzle, Link,
  Bomb, CircleDot, Package, Hash, Crosshair, Grid, Hammer, Candy,
  FolderTree, Palette, FileOutput, Camera, PenTool,
  Calculator, StickyNote, Brush, HardDrive, ZoomIn, NotebookPen, AlarmClock,
  CloudSun, Languages, BookOpen, Smile, Quote, FileText,
  Heart, Zap, Activity, Moon, Sun,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import DownloadButton from "@/components/DownloadButton";
import { FeatureCard } from "@/components/FeatureCard";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { petFeatures, petModes, petAnimations, games, tools, aiTools } from "@/data/content";
import { findFeatureByName } from "@/data/playgroundData";

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
  // 兼容下面写法中引用的本地组件名（便于复用）
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

      {/* Section 2: Games */}
      <section ref={ref2} className={`reveal ${vis2 ? "is-visible" : ""} py-20 px-6 bg-gradient-to-b from-white to-pink-50`}>
        <div className="max-w-6xl mx-auto">
          <SectionTitle title="15 款休闲游戏" subtitle="从经典到创新，闯关与无尽双模式" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => {
              const Icon = iconMap[game.icon] || Gamepad2;
              const meta = findFeatureByName(game.name);
              return (
                <FeatureCardWithNav
                  key={game.name}
                  meta={meta}
                  Icon={Icon}
                  featured={game.featured}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3: Tools */}
      <section ref={ref3} className={`reveal ${vis3 ? "is-visible" : ""} py-20 px-6`}>
        <div className="max-w-6xl mx-auto">
          <SectionTitle title="十余款实用工具" subtitle="一站式效率工具集，自研实现无需依赖系统组件" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => {
              const Icon = iconMap[tool.icon] || Wrench;
              const meta = findFeatureByName(tool.name);
              return (
                <FeatureCardWithNav
                  key={tool.name}
                  meta={meta}
                  Icon={Icon}
                  featured={tool.featured}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 4: AI Tools */}
      <section ref={ref4} className={`reveal ${vis4 ? "is-visible" : ""} py-20 px-6 bg-gradient-to-b from-pink-50 to-white`}>
        <div className="max-w-6xl mx-auto">
          <SectionTitle title="AI 智能助手" subtitle="集成多种 AI 工具，让你的桌面更智能" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiTools.map((tool) => {
              const Icon = iconMap[tool.icon] || Brain;
              const meta = findFeatureByName(tool.name);
              return (
                <FeatureCardWithNav
                  key={tool.name}
                  meta={meta}
                  Icon={Icon}
                  featured={false}
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
