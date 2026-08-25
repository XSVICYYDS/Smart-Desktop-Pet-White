/** 选关弹窗：展示全部关卡，已解锁的可进入，未解锁的置灰。 */
import React, { useMemo } from "react";
import { LEVELS } from "../config";

export interface LevelSelectProps {
  open: boolean;
  /** 已解锁到第几关（1-based，等于 save.level）。 */
  unlockedLevel: number;
  /** 当前所在关卡（1-based）。 */
  currentLevel: number;
  onPick: (levelIndex0: number) => void;
  onClose: () => void;
}

/** 主题对应的渐变配色，用于关卡卡片视觉区分。 */
const THEME_GRAD: Record<string, string> = {
  nebula: "from-indigo-600/40 to-purple-700/40",
  crimson: "from-rose-700/40 to-red-900/40",
  asteroid: "from-slate-600/40 to-slate-800/40",
  void: "from-violet-900/40 to-indigo-950/40",
  forge: "from-orange-700/40 to-amber-900/40",
  aurora: "from-cyan-600/40 to-teal-800/40",
  storm: "from-blue-700/40 to-indigo-900/40",
  magma: "from-red-600/40 to-orange-800/40",
  frost: "from-sky-500/40 to-cyan-800/40",
  abyss: "from-purple-900/40 to-slate-950/40",
  galaxy: "from-fuchsia-700/40 to-violet-900/40",
  pulse: "from-pink-600/40 to-rose-900/40",
  solitude: "from-slate-700/40 to-slate-900/40",
  // ===== L31+ 新增主题 =====
  eclipse: "from-zinc-800/40 to-rose-950/40",
  empyrean: "from-amber-400/40 to-yellow-700/40",
  cosmos: "from-violet-600/40 to-fuchsia-900/40",
  chronos: "from-teal-500/40 to-emerald-900/40",
  infinity: "from-cyan-400/40 to-blue-900/40",
  oblivion: "from-slate-800/40 to-purple-950/40",
  omega: "from-red-500/40 via-fuchsia-800/40 to-indigo-950/40",
};

export const LevelSelect: React.FC<LevelSelectProps> = ({ open, unlockedLevel, currentLevel, onPick, onClose }) => {
  const levels = useMemo(() => LEVELS, []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-white/15 shadow-2xl overflow-hidden">
        <header className="flex items-center gap-3 p-5 md:p-6 border-b border-white/10">
          <div className="text-xl md:text-2xl font-black bg-gradient-to-r from-sky-300 to-indigo-300 bg-clip-text text-transparent">
            🗺️ 关卡选择
          </div>
          <div className="ml-auto text-xs md:text-sm text-white/70">
            已解锁 <b className="text-cyan-300">{unlockedLevel}</b> / {levels.length} 关
          </div>
          <button onClick={onClose}
            className="ml-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 text-sm font-bold">
            ✕ 关闭
          </button>
        </header>

        <div className="overflow-y-auto p-4 md:p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {levels.map((lv, idx) => {
            const unlocked = idx + 1 <= unlockedLevel;
            const isCurrent = idx + 1 === currentLevel;
            const grad = THEME_GRAD[lv.theme] || THEME_GRAD.void;
            return (
              <button
                key={lv.id}
                disabled={!unlocked}
                onClick={() => { if (unlocked) onPick(idx); }}
                className={
                  "relative text-left rounded-2xl p-3 border transition group " +
                  (unlocked
                    ? `bg-gradient-to-br ${grad} border-white/15 hover:border-cyan-400/70 hover:brightness-110 cursor-pointer`
                    : "bg-white/[0.03] border-white/5 opacity-50 cursor-not-allowed")
                }
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/60">第 {lv.id} 关</span>
                  {lv.isBoss && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600/70 text-white font-bold">BOSS</span>}
                  {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/80 text-white font-bold">当前</span>}
                </div>
                <div className="mt-1.5 text-sm font-bold leading-tight line-clamp-2 min-h-[2.4em]">
                  {unlocked ? lv.name : "🔒 未解锁"}
                </div>
                <div className="mt-1.5 text-[10px] text-white/55">
                  {lv.isBoss ? `BOSS · 推荐 ${(lv.recommendedTimeMs / 1000 / 60).toFixed(1)} 分钟` : `${lv.waves.length} 波 · 推荐 ${(lv.recommendedTimeMs / 1000).toFixed(0)}s`}
                </div>
              </button>
            );
          })}
        </div>

        <footer className="p-4 border-t border-white/10 text-center text-xs text-white/60">
          通关任意关卡即可自动解锁下一关。继续挑战以揭开星海深处的终焉。
        </footer>
      </div>
    </div>
  );
};
