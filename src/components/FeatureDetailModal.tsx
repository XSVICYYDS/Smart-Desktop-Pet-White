import { useEffect } from "react";
import { X, Play, BookOpen, Sparkles } from "lucide-react";
import type { FeatureMeta } from "../data/playgroundData";

/**
 * 功能详细说明弹窗组件
 *
 * 行为：
 *  - 点击卡片的「进入」按钮弹出；展示功能概览、详细说明、操作步骤、技巧亮点
 *  - 弹窗底部包含「试玩」「试用」按钮（与卡片行为一致，方便在弹窗里直接进入）
 *  - 支持 Esc 关闭、点击遮罩关闭、右上角 X 关闭
 */

interface FeatureDetailModalProps {
  open: boolean;
  feature: FeatureMeta | null;
  onClose: () => void;
  onPlay?: (f: FeatureMeta) => void;
  onTry?: (f: FeatureMeta) => void;
}

export function FeatureDetailModal({
  open,
  feature,
  onClose,
  onPlay,
  onTry,
}: FeatureDetailModalProps) {
  // ESC 关闭 & 锁定滚动
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !feature) return null;

  const badgeText =
    feature.category === "game"
      ? "小游戏"
      : feature.category === "tool"
      ? "桌面工具"
      : "AI 功能";
  const badgeClass =
    feature.category === "game"
      ? "bg-pink-100 text-pink-700 border-pink-200"
      : feature.category === "tool"
      ? "bg-sky-100 text-sky-700 border-sky-200"
      : "bg-violet-100 text-violet-700 border-violet-200";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* 弹窗外框 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border border-pink-200/70 animate-scale-in-up"
      >
        {/* 顶部色带 */}
        <div
          className={`h-32 md:h-40 w-full bg-gradient-to-r ${feature.colorScheme} relative overflow-hidden`}
        >
          <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(circle_at_30%_20%,white,transparent_55%)]" />
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <div
                className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${badgeClass} mb-3 backdrop-blur-md`}
              >
                {badgeText}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">
                {feature.name}
              </h2>
              <p className="text-white/90 mt-1 text-sm md:text-base max-w-xl drop-shadow">
                {feature.summary}
              </p>
            </div>
            <button
              aria-label="关闭"
              onClick={onClose}
              className="shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 backdrop-blur-md text-white transition-all"
            >
              <X className="w-5 h-5 mx-auto" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="px-6 md:px-8 py-6 overflow-y-auto max-h-[calc(88vh-16rem)]">
          {/* 详细说明 */}
          <section className="space-y-2">
            <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-pink-500" />
              功能说明
            </h3>
            <p className="text-slate-600 leading-relaxed text-sm md:text-[15px]">
              {feature.description}
            </p>
          </section>

          {/* 操作步骤 */}
          <section className="mt-6 space-y-3">
            <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" />
              如何使用
            </h3>
            <ol className="space-y-2">
              {feature.howTo.map((step, i) => (
                <li
                  key={i}
                  className="flex gap-3 items-start rounded-xl bg-gradient-to-r from-pink-50/90 to-rose-50/60 border border-pink-100 px-4 py-3"
                >
                  <span className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {i + 1}
                  </span>
                  <span className="text-slate-700 text-sm md:text-[15px] leading-relaxed">
                    {step.replace(/^\d+\.\s*/, "")}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* 技巧亮点 */}
          <section className="mt-6 space-y-3">
            <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Play className="w-4 h-4 text-purple-500" />
              技巧 & 亮点
            </h3>
            <ul className="space-y-2">
              {feature.tips.map((t, i) => (
                <li
                  key={i}
                  className="flex gap-3 items-start rounded-xl bg-gradient-to-r from-violet-50/90 to-indigo-50/60 border border-violet-100 px-4 py-3 text-slate-700 text-sm md:text-[15px] leading-relaxed"
                >
                  <span className="text-violet-500 mt-0.5">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 底部按钮条 */}
        <div className="px-6 md:px-8 py-4 border-t border-slate-200/80 bg-gradient-to-r from-white/90 via-rose-50/60 to-pink-50/80 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center sm:justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-all"
          >
            关闭
          </button>
          {feature.actions.try && (
            <button
              onClick={() => onTry?.(feature)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-semibold shadow-md hover:shadow-lg hover:brightness-105 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              立即试用
            </button>
          )}
          {feature.actions.play && (
            <button
              onClick={() => onPlay?.(feature)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold shadow-md hover:shadow-lg hover:brightness-105 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              立即试玩
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
