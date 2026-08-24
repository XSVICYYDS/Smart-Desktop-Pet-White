import React from "react";
import type { SkillId, SkillRuntimeState } from "../types";
import { ACTIVE_SKILL_ORDER, SKILLS } from "../config";
import { skillLevelCfg } from "../game/SkillSystem";

export interface HUDProps {
  score: number;
  hp: number; maxHp: number;
  energy: number; maxEnergy: number;
  level: number; levelName: string;
  enemiesLeft: number;
  bossHpPct: number | null;
  bossName: string | null;
  skills: SkillRuntimeState;
  paused: boolean;
  onTogglePause: () => void;
  onOpenMenu: () => void;
  onCast: (slot: 0 | 1 | 2 | 3) => void;
  reviveCount: number;   // p10_revive 本关剩余复活次数
  wingmanCount: number; // p9_wingman 当前僚机数量
  superShieldMs: number; // s4_shield 超级防御盾剩余毫秒
  shipLevelBullets: number; // p11_shiplevel 单次开火子弹数
}

const COOLDOWNS = { 0: 0, 1: 0, 2: 0 } as const;

/** 游戏内 HUD：分数 / 生命 / 能量 / 关卡 / 敌人数量 / 3 主动技能冷却环。 */
export const HUD: React.FC<HUDProps> = ({
  score, hp, maxHp, energy, maxEnergy, level, levelName, enemiesLeft, bossHpPct, bossName,
  skills, paused, onTogglePause, onOpenMenu, onCast, reviveCount, wingmanCount,
  superShieldMs, shipLevelBullets,
}) => {
  void COOLDOWNS;
  return (
    <div className="pointer-events-none absolute inset-0 p-3 md:p-4 flex flex-col gap-3 text-white">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <HudChip title="分数" value={score.toLocaleString()} className="from-amber-400 to-orange-500" />
        <HudChip title="第 N 关" value={`${level} · ${levelName}`} className="from-violet-500 to-fuchsia-600" />
        <HudChip title="剩余敌人" value={String(Math.max(0, enemiesLeft))} className="from-rose-500 to-pink-600" />
        {wingmanCount > 0 && (
          <HudChip title="僚机" value={`✈️ ×${wingmanCount}`} className="from-cyan-500 to-teal-600" />
        )}
        {reviveCount > 0 && (
          <HudChip title="复活" value={`🔥 ×${reviveCount}`} className="from-orange-500 to-red-600" />
        )}
        {shipLevelBullets > 1 && (
          <HudChip title="战机" value={`⭐ ×${shipLevelBullets} 发`} className="from-amber-400 to-yellow-600" />
        )}
        {superShieldMs > 0 && (
          <HudChip title="无敌" value={`🛡️ ${(superShieldMs / 1000).toFixed(1)}s`} className="from-cyan-400 to-sky-600" />
        )}
        <div className="ml-auto pointer-events-auto flex gap-2">
          <button onClick={onTogglePause} className="rounded-xl bg-white/90 text-indigo-900 px-3 py-2 text-sm font-bold shadow hover:brightness-105">
            {paused ? "▶ 继续" : "⏸ 暂停"}
          </button>
          <button onClick={onOpenMenu} className="rounded-xl bg-indigo-600 text-white px-3 py-2 text-sm font-bold shadow hover:bg-indigo-500">
            菜单
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-2 md:gap-3 items-end">
        <Bar label="生命" value={hp} max={maxHp} color="from-rose-500 to-red-500" helper={`${Math.ceil(hp)}/${maxHp}`} />
        <Bar label="能量" value={energy} max={maxEnergy} color="from-cyan-400 to-sky-500" helper={`${Math.floor(energy)}/${maxEnergy}`} />
        {bossHpPct != null ? (
          <Bar label={`BOSS · ${bossName || ""}`} value={bossHpPct * 100} max={100} color="from-fuchsia-500 to-rose-500" helper={`${Math.max(0, Math.round(bossHpPct * 100))}%`} />
        ) : (
          <div className="rounded-xl bg-black/35 border border-white/10 p-3 text-sm">
            <div className="text-white/70 text-xs">操作</div>
            <div className="mt-1 font-semibold">P/ESC 暂停 · Q/E/⇧/R 技能</div>
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 md:gap-3 pointer-events-auto">
        {(ACTIVE_SKILL_ORDER as unknown as SkillId[]).map((id, i) => {
          const lv = skills.levels[id];
          const cfg = skillLevelCfg(id, lv);
          const def = SKILLS[id];
          const slot = (i as 0 | 1 | 2 | 3);
          const cd = skills.cooldowns[slot] || 0;
          const ratio = cfg.cooldownMs > 0 ? Math.max(0, Math.min(1, cd / cfg.cooldownMs)) : 0;
          const canCast = cd <= 0 && energy >= cfg.energyCost;
          return (
            <button key={id} onClick={() => onCast(slot)} disabled={!canCast}
              className={
                "group relative w-16 h-16 md:w-20 md:h-20 rounded-2xl border transition shadow-lg overflow-hidden grid place-items-center " +
                (canCast ? "bg-slate-900/80 border-white/30 hover:border-cyan-400" : "bg-slate-900/50 border-white/10 opacity-70")
              }>
              <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#22d3ee" strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 15}
                  strokeDashoffset={2 * Math.PI * 15 * ratio}
                  strokeLinecap="round" />
              </svg>
              <div className="relative text-2xl md:text-3xl">{def.icon}</div>
              <div className="absolute inset-x-0 bottom-1 text-center text-[10px] md:text-xs font-bold text-white/90">
                {["Q", "E", "⇧", "R"][slot]}
              </div>
              <div className="absolute top-1 left-1 rounded bg-black/40 px-1 text-[10px]">Lv{lv}</div>
              {!canCast && cd > 0 && (
                <div className="absolute inset-0 grid place-items-center font-black text-xl bg-black/50">
                  {(cd / 1000).toFixed(1)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const HudChip: React.FC<{ title: string; value: string; className: string }> = ({ title, value, className }) => (
  <div className={`rounded-xl px-3 py-1.5 bg-gradient-to-r ${className} shadow`}>
    <div className="text-[10px] opacity-90 leading-none">{title}</div>
    <div className="text-sm md:text-base font-bold leading-tight tabular-nums">{value}</div>
  </div>
);

const Bar: React.FC<{ label: string; value: number; max: number; color: string; helper?: string }> = ({ label, value, max, color, helper }) => {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <div className="rounded-xl bg-black/35 border border-white/10 p-3">
      <div className="flex items-center justify-between text-xs text-white/80">
        <span>{label}</span>
        <span className="tabular-nums">{helper}</span>
      </div>
      <div className="mt-1 h-3 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
};
