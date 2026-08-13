import React from "react";
import { ACTIVE_SKILL_ORDER, PASSIVE_SKILL_ORDER, SKILLS } from "../config";
import type { SkillId, SkillLevel } from "../types";

export interface SkillTreeProps {
  open: boolean;
  onClose: () => void;
  levels: Record<SkillId, SkillLevel>;
  skillPoints: number;
  onUpgrade: (id: SkillId) => void;
}

/** 技能升级树：主动 3 + 被动 2，每技能 4 级。 */
export const SkillTree: React.FC<SkillTreeProps> = ({ open, onClose, levels, skillPoints, onUpgrade }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] overflow-auto">
        <header className="sticky top-0 bg-slate-900/95 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-xl font-black">🎯 技能配置</div>
            <p className="text-xs text-slate-300/80 mt-1">可用技能点：<span className="text-emerald-300 font-bold">{skillPoints}</span> · 每技能最多 Lv3。</p>
          </div>
          <button className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm" onClick={onClose}>关闭 ✕</button>
        </header>

        <div className="p-5 space-y-6">
          <SkillGroup title="主动技能" subtitle="Q 大招 / E 护盾 / Shift 加速（可冷却）" order={ACTIVE_SKILL_ORDER as unknown as SkillId[]}
            levels={levels} skillPoints={skillPoints} onUpgrade={onUpgrade} tagColor="from-cyan-500 to-blue-600" />
          <SkillGroup title="被动技能" subtitle="永久生效，升级即获得加成" order={PASSIVE_SKILL_ORDER as unknown as SkillId[]}
            levels={levels} skillPoints={skillPoints} onUpgrade={onUpgrade} tagColor="from-rose-500 to-orange-500" />
        </div>
      </div>
    </div>
  );
};

const SkillGroup: React.FC<{
  title: string; subtitle: string; order: SkillId[]; levels: Record<SkillId, SkillLevel>; skillPoints: number;
  onUpgrade: (id: SkillId) => void; tagColor: string;
}> = ({ title, subtitle, order, levels, skillPoints, onUpgrade, tagColor }) => (
  <section>
    <div className="flex items-baseline gap-3 mb-3">
      <h3 className={`text-base md:text-lg font-black bg-gradient-to-r ${tagColor} bg-clip-text text-transparent`}>{title}</h3>
      <span className="text-xs text-slate-300/80">{subtitle}</span>
    </div>
    <div className="grid md:grid-cols-3 gap-3 md:gap-4">
      {order.map((id) => {
        const def = SKILLS[id];
        const lv = levels[id] as SkillLevel;
        const maxed = lv >= 3;
        return (
          <div key={id} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 grid place-items-center text-2xl">{def.icon}</div>
              <div className="flex-1">
                <div className="font-bold">{def.name} · Lv{lv}</div>
                <div className="text-[11px] text-slate-300/80">{def.desc}</div>
              </div>
            </div>
            <LevelRow lv={lv} />
            <EffectBlock id={id} lv={lv} />
            <button
              onClick={() => onUpgrade(id)}
              disabled={maxed || skillPoints <= 0}
              className={
                "mt-3 rounded-xl px-3 py-2 text-sm font-bold transition " +
                (maxed ? "bg-amber-500/20 text-amber-200/90 border border-amber-400/40" :
                  skillPoints <= 0 ? "bg-white/5 text-slate-400 border border-white/10" :
                  "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-110 text-white shadow")
              }
            >
              {maxed ? "✓ 已达 Lv3（满）" : skillPoints <= 0 ? "技能点不足" : `升级（消耗 1 点）`}
            </button>
          </div>
        );
      })}
    </div>
  </section>
);

const LevelRow: React.FC<{ lv: SkillLevel }> = ({ lv }) => (
  <div className="mt-3 flex items-center gap-2">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className={
        "flex-1 h-2 rounded-full " +
        (i <= lv ? "bg-gradient-to-r from-emerald-400 to-cyan-400" : "bg-white/10")
      } />
    ))}
  </div>
);

const EffectBlock: React.FC<{ id: SkillId; lv: SkillLevel }> = ({ id, lv }) => {
  const cfg = SKILLS[id].levels[lv];
  const lines: string[] = [];
  if (cfg.energyCost && id.startsWith("s")) lines.push(`能量消耗：${cfg.energyCost}`);
  if (cfg.cooldownMs && cfg.cooldownMs > 0) lines.push(`冷却时间：${(cfg.cooldownMs / 1000).toFixed(1)}s`);
  if (cfg.durationMs) lines.push(`持续时间：${(cfg.durationMs / 1000).toFixed(1)}s`);
  if (id === "s1_nuke") lines.push(`对 BOSS 伤害：${Math.round(cfg.valuePct * 100)}%`);
  if (id === "s2_shield") lines.push(`可抵挡次数：${Math.round(cfg.valuePct)} 次`);
  if (id === "s3_haste") lines.push(`速度倍率：${cfg.valuePct.toFixed(2)}x`);
  if (id === "p1_power" && cfg.dmgBonusPct) lines.push(`基础伤害 +${Math.round(cfg.dmgBonusPct * 100)}%`);
  if (id === "p2_regen" && cfg.regenPctPer10s) lines.push(`每 10s 恢复生命：${Math.round(cfg.regenPctPer10s * 100)}%`);
  return (
    <ul className="mt-3 space-y-1 text-xs text-slate-200/90">
      {lines.map((l, i) => <li key={i}>• {l}</li>)}
    </ul>
  );
};
