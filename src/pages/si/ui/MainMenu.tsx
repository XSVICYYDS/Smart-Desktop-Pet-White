import React, { useMemo } from "react";

export interface MainMenuProps {
  tab: "play" | "settings" | "skills" | "leaderboard" | "help";
  onTab: (t: MainMenuProps["tab"]) => void;
  onStart: (slot: 0 | 1 | 2) => void;
  highScore: number;
  skillPoints: number;
  unlockedAchievements: number;
}

const TABS: { id: MainMenuProps["tab"]; label: string; icon: string }[] = [
  { id: "play", label: "开始游戏", icon: "🎮" },
  { id: "settings", label: "设置", icon: "⚙️" },
  { id: "skills", label: "技能配置", icon: "🎯" },
  { id: "leaderboard", label: "排行榜", icon: "🏆" },
  { id: "help", label: "帮助说明", icon: "📘" },
];

/** 主菜单：5 Tab 切换 + 3 存档槽快速开始 + 顶部信息。 */
export const MainMenu: React.FC<MainMenuProps> = ({ tab, onTab, onStart, highScore, skillPoints, unlockedAchievements }) => {
  const slots = useMemo(() => ([0, 1, 2] as const), []);
  return (
    <div className="w-full mx-auto max-w-5xl rounded-2xl bg-gradient-to-br from-indigo-950/95 via-slate-900/95 to-purple-950/95 border border-indigo-500/30 text-white p-5 md:p-7 shadow-2xl">
      <header className="flex flex-wrap items-center gap-3 md:gap-5 pb-4 border-b border-white/10">
        <div className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
          太空侵略者 · 终极版
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto text-xs md:text-sm">
          <Chip label="最高分" value={highScore.toLocaleString()} color="from-amber-400 to-orange-500" />
          <Chip label="技能点" value={String(skillPoints)} color="from-emerald-400 to-cyan-500" />
          <Chip label="成就" value={`${unlockedAchievements}/15`} color="from-pink-400 to-rose-500" />
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 mt-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={
              "px-3 md:px-4 py-2 rounded-xl text-sm md:text-base font-semibold transition border " +
              (tab === t.id
                ? "bg-white text-indigo-900 border-white shadow-lg"
                : "bg-white/5 border-white/15 hover:bg-white/10 text-white/90")
            }
          >
            <span className="mr-1.5">{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>

      <section className="mt-5">
        {tab === "play" && (
          <div className="grid md:grid-cols-3 gap-3 md:gap-4">
            {slots.map((i) => (
              <button
                key={i}
                onClick={() => onStart(i)}
                className="group text-left rounded-2xl p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 transition"
              >
                <div className="text-sm text-cyan-300/90 font-semibold">存档槽 {i + 1}</div>
                <div className="mt-2 text-lg font-bold">▶ 开始 / 继续</div>
                <p className="mt-2 text-xs text-slate-300/80 leading-5">
                  点击该存档槽开始游戏。通关、技能等级、成就、最高分都会自动写入本槽。
                </p>
                <div className="mt-3 text-[11px] text-white/60 group-hover:text-cyan-200 transition">
                  推荐：首次游玩选 槽 1，挑战旧存档可直接读取进度。
                </div>
              </button>
            ))}
          </div>
        )}
        {tab !== "play" && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 md:p-5 text-sm md:text-base leading-7">
            <p>请在游戏对局界面右上角 <b>菜单</b> 按钮中打开 <b>设置 / 技能 / 排行榜 / 帮助</b> 的完整面板。</p>
            <p className="mt-2 text-slate-300/80">
              完整功能包含：音频音量、画质档位（自动/低/中/高）、操作偏好、技能升级树（5 技能 × 4 级）、
              本地排行榜前 10、操作说明 / 敌人图鉴 / BOSS 攻略。
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

const Chip: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className={`rounded-xl px-3 py-1.5 bg-gradient-to-r ${color} text-white/95 shadow-sm`}>
    <div className="text-[10px] opacity-90 leading-none">{label}</div>
    <div className="text-sm md:text-base font-bold leading-tight tabular-nums">{value}</div>
  </div>
);
