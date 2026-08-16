import React from "react";
import type { LevelClearResult } from "../types";

export interface GameOverScreenProps {
  open: boolean;
  victory: boolean;
  score: number;
  level: number;
  totalLevels: number;
  cleared: LevelClearResult | null;
  stats: { killed: number; skillsUsed: number; totalDamageTaken: number };
  onRestartLevel: () => void;
  onNextLevel: () => void;
  onSelectLevel: () => void;
  onBackToMenu: () => void;
  onOpenSkillTree: () => void;
}

/** 通关 / 失败结算界面：S/A/B/C 等级 + 技能点奖励 + 下一步按钮。 */
export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  open, victory, score, level, totalLevels, cleared, stats,
  onRestartLevel, onNextLevel, onSelectLevel, onBackToMenu, onOpenSkillTree,
}) => {
  if (!open) return null;
  const grade = cleared?.grade;
  const gradeColor = grade === "S" ? "from-amber-300 to-orange-500" :
    grade === "A" ? "from-emerald-300 to-cyan-500" :
    grade === "B" ? "from-sky-300 to-indigo-500" : "from-slate-300 to-slate-500";
  // 最终关判定改为动态：第 totalLevels 关为最终关（支持 30 关）
  const last = level >= totalLevels;
  const clearedAll = victory && last;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-white/15 shadow-2xl overflow-hidden">
        <header className="p-6 md:p-7 text-center">
          <div className="text-xs md:text-sm text-white/70 tracking-widest">
            {victory ? (clearedAll ? "★ 全关卡通关 · 最终胜利 ★" : "关卡完成") : "任务失败"}
          </div>
          <div className={"mt-2 text-5xl md:text-7xl font-black bg-gradient-to-br bg-clip-text text-transparent " +
            (victory ? gradeColor : "from-rose-300 to-rose-600")}>
            {victory ? (grade ? `${grade} 级` : "通过") : "GAME OVER"}
          </div>
          <p className="mt-3 text-sm md:text-base text-white/85">
            {victory
              ? (clearedAll
                ? `恭喜征服全部 ${totalLevels} 关！你击败了终极利维坦，成为星海皇者！`
                : `第 ${level} / ${totalLevels} 关扫荡完毕，进入奖励结算。`)
              : "战机被摧毁，但仍可从当前关卡重新挑战。"}
          </p>
        </header>

        <div className="grid md:grid-cols-4 gap-3 mx-5 md:mx-7 mb-5">
          <StatBox label="累计得分" value={score.toLocaleString()} />
          <StatBox label="到达关卡" value={`第 ${level} 关`} />
          <StatBox label="击杀单位" value={String(stats.killed)} />
          <StatBox label="技能使用" value={String(stats.skillsUsed)} />
        </div>

        {cleared && (
          <div className="mx-5 md:mx-7 mb-5 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className={`px-4 py-2 rounded-xl font-black bg-gradient-to-r ${gradeColor} text-slate-900 shadow`}>评分 {cleared.grade}</div>
              <div>
                <div className="text-xs text-white/70">结算详情</div>
                <div className="text-sm md:text-base">
                  剩余生命 <b>{Math.round(cleared.hpLeftPct * 100)}%</b> ·
                  用时 <b>{(cleared.timeMs / 1000).toFixed(1)} 秒</b> ·
                  技能 <b>{cleared.skillsUsed}</b> 次
                </div>
              </div>
              <div className="ml-auto">
                <div className="text-xs text-emerald-200/90">获得技能点</div>
                <div className="text-2xl font-black text-emerald-300 tabular-nums">+{cleared.skillPointReward}</div>
              </div>
            </div>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-center gap-3 p-5 md:p-6 bg-black/20 border-t border-white/10">
          {victory && !last && (
            <button onClick={onNextLevel}
              className="rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-900 font-black px-5 py-3 shadow-lg hover:brightness-105">
              ▶ 下一关（第 {level + 1} 关）
            </button>
          )}
          <button onClick={onSelectLevel}
            className="rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-white font-bold px-5 py-3 shadow-lg hover:brightness-105">
            🗺️ 选关
          </button>
          <button onClick={onOpenSkillTree}
            className="rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold px-5 py-3 shadow-lg hover:brightness-105">
            🎯 技能升级
          </button>
          <button onClick={onRestartLevel}
            className="rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold px-5 py-3">
            🔁 重玩本关
          </button>
          <button onClick={onBackToMenu}
            className="rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold px-5 py-3">
            🏠 返回主菜单
          </button>
        </footer>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl bg-white/5 border border-white/10 p-3 md:p-4">
    <div className="text-xs text-white/70">{label}</div>
    <div className="mt-1 text-xl md:text-2xl font-black tabular-nums">{value}</div>
  </div>
);
