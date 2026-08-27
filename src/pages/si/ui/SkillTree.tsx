/**
 * 技能升级树：主动 4 + 被动 11，每技能 4 级。
 * 集成自定义垂直滚动条：支持鼠标拖动 + 滚轮双模式控制，60fps 平滑滚动。
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ACTIVE_SKILL_ORDER, PASSIVE_SKILL_ORDER, SKILLS } from "../config";
import type { SkillId, SkillLevel } from "../types";

export interface SkillTreeProps {
  open: boolean;
  onClose: () => void;
  levels: Record<SkillId, SkillLevel>;
  skillPoints: number;
  onUpgrade: (id: SkillId) => void;
}

/** 自定义平滑滚动容器：支持鼠标滚轮 + 拖动滚动条，60fps 平滑过渡。 */
const SmoothScrollContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [thumbH, setThumbH] = useState(40);
  const draggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const rafRef = useRef<number>(0);
  const targetScrollRef = useRef(0);
  const currentScrollRef = useRef(0);

  /** 重新计算滚动范围与滑块高度。 */
  const recalc = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const ms = Math.max(0, el.scrollHeight - el.clientHeight);
    setMaxScroll(ms);
    const ratio = el.clientHeight / Math.max(1, el.scrollHeight);
    setThumbH(Math.max(40, Math.round(el.clientHeight * ratio)));
  }, []);

  /** 平滑滚动动画循环：线性插值逼近目标位置，保持 60fps。 */
  const smoothTick = useCallback(() => {
    rafRef.current = 0;
    const diff = targetScrollRef.current - currentScrollRef.current;
    if (Math.abs(diff) < 0.5) {
      currentScrollRef.current = targetScrollRef.current;
    } else {
      currentScrollRef.current += diff * 0.22;
      rafRef.current = requestAnimationFrame(smoothTick);
    }
    setScrollTop(currentScrollRef.current);
  }, []);

  /** 设置目标滚动位置并启动平滑动画。 */
  const scrollTo = useCallback((target: number) => {
    const clamped = Math.max(0, Math.min(maxScroll, target));
    targetScrollRef.current = clamped;
    if (!rafRef.current) rafRef.current = requestAnimationFrame(smoothTick);
  }, [maxScroll, smoothTick]);

  /** 鼠标滚轮事件：灵敏度可调节，延迟 <100ms。 */
  const onWheel = useCallback((e: React.WheelEvent) => {
    const sensitivity = 1.2; // 滚轮灵敏度系数
    scrollTo(targetScrollRef.current + e.deltaY * sensitivity);
  }, [scrollTo]);

  /** 滚动条拖动开始。 */
  const onThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartScrollRef.current = targetScrollRef.current;
  }, []);

  /** 拖动中 + 全局 mouseup/mousemove 处理。 */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !scrollRef.current) return;
      const trackH = scrollRef.current.clientHeight - thumbH;
      if (trackH <= 0) return;
      const dy = e.clientY - dragStartYRef.current;
      const scrollRatio = dy / trackH;
      scrollTo(dragStartScrollRef.current + scrollRatio * maxScroll);
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [maxScroll, thumbH, scrollTo]);

  /** 同步 DOM scrollTop 到 React state。 */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.scrollTop = scrollTop;
  }, [scrollTop]);

  /** 初始化 + 窗口 resize 时重算。 */
  useEffect(() => {
    recalc();
    const t = setTimeout(recalc, 100);
    window.addEventListener("resize", recalc);
    return () => { clearTimeout(t); window.removeEventListener("resize", recalc); };
  }, [recalc]);

  const showTrack = maxScroll > 2;
  const thumbY = maxScroll > 0 ? (scrollTop / maxScroll) * (scrollRef.current?.clientHeight ?? 0 - thumbH) : 0;
  const atTop = scrollTop <= 0.5;
  const atBottom = scrollTop >= maxScroll - 0.5;

  return (
    <div className={`relative flex ${className}`}>
      <div
        ref={contentRef}
        onWheel={onWheel}
        className="flex-1 overflow-y-auto si-scroll-content"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`.si-scroll-content::-webkit-scrollbar{display:none}`}</style>
        {children}
      </div>
      {showTrack && (
        <div
          ref={scrollRef}
          className="relative w-3 ml-2 flex-shrink-0 rounded-full bg-white/5 border border-white/10"
          style={{ minHeight: "100%" }}
        >
          {/* 顶部边界反馈 */}
          {atTop && <div className="absolute top-0 inset-x-0 h-1 rounded-t-full bg-cyan-400/40" />}
          {/* 滑块 */}
          <div
            ref={thumbRef}
            onMouseDown={onThumbMouseDown}
            className="absolute inset-x-0 rounded-full cursor-grab active:cursor-grabbing transition-colors hover:bg-cyan-300/80"
            style={{
              height: `${thumbH}px`,
              top: `${Math.max(0, Math.min(maxScroll > 0 ? (scrollRef.current?.clientHeight ?? 0) - thumbH : 0, thumbY))}px`,
              background: "linear-gradient(180deg, rgba(34,211,238,0.7), rgba(6,182,212,0.7))",
            }}
          />
          {/* 底部边界反馈 */}
          {atBottom && <div className="absolute bottom-0 inset-x-0 h-1 rounded-b-full bg-cyan-400/40" />}
        </div>
      )}
    </div>
  );
};

/** 技能升级树主组件。 */
export const SkillTree: React.FC<SkillTreeProps> = ({ open, onClose, levels, skillPoints, onUpgrade }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <header className="flex-shrink-0 bg-slate-900/95 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-xl font-black">🎯 技能配置</div>
            <p className="text-xs text-slate-300/80 mt-1">可用技能点：<span className="text-emerald-300 font-bold">{skillPoints}</span> · 每技能最多 Lv3。</p>
          </div>
          <button className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm" onClick={onClose}>关闭 ✕</button>
        </header>
        <SmoothScrollContainer className="flex-1 max-h-[78vh] p-5">
          <div className="space-y-6 pr-1">
            <SkillGroup title="主动技能" subtitle="Q 巡航导弹 / E 电磁脉冲 / ⇧ 时间扭曲 / R 超级防御盾（含冷却）" order={ACTIVE_SKILL_ORDER as unknown as SkillId[]}
              levels={levels} skillPoints={skillPoints} onUpgrade={onUpgrade} tagColor="from-cyan-500 to-blue-600" />
            <SkillGroup title="被动技能" subtitle="11 项被动永久生效：攻强/回血/生命/能量/暴击/吸血/护甲/追踪/僚机/复活/战机等级" order={PASSIVE_SKILL_ORDER as unknown as SkillId[]}
              levels={levels} skillPoints={skillPoints} onUpgrade={onUpgrade} tagColor="from-rose-500 to-orange-500" />
          </div>
        </SmoothScrollContainer>
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
  // 主动技能效果
  if (id === "s1_missile") {
    if (cfg.missileCount) lines.push(`导弹数量：${cfg.missileCount} 枚`);
    if (cfg.missileDmg) lines.push(`单发伤害：${cfg.missileDmg}`);
  }
  if (id === "s2_emp") {
    if (cfg.empRadius) lines.push(`作用半径：${cfg.empRadius}px`);
    if (cfg.empStunMs) lines.push(`眩晕时长：${(cfg.empStunMs / 1000).toFixed(1)}s`);
    if (cfg.empShieldBreakMs) lines.push(`护盾失效：${(cfg.empShieldBreakMs / 1000).toFixed(1)}s`);
  }
  if (id === "s3_timewarp") {
    if (cfg.timeScale) lines.push(`时间流速：×${cfg.timeScale.toFixed(2)}`);
  }
  if (id === "s4_shield") {
    if (cfg.durationMs) lines.push(`无敌持续：${(cfg.durationMs / 1000).toFixed(0)}s · 无视所有伤害`);
  }
  // 被动技能效果
  if (id === "p1_power" && cfg.dmgBonusPct) lines.push(`基础伤害 +${Math.round(cfg.dmgBonusPct * 100)}%`);
  if (id === "p2_regen" && cfg.regenPctPer10s) lines.push(`每 10s 恢复生命：${Math.round(cfg.regenPctPer10s * 100)}%`);
  if (id === "p3_maxhp" && cfg.maxHpPct) lines.push(`最大生命 +${Math.round(cfg.maxHpPct * 100)}%`);
  if (id === "p4_maxenergy" && cfg.maxEnergyPct) lines.push(`最大能量 +${Math.round(cfg.maxEnergyPct * 100)}%`);
  if (id === "p5_crit") {
    if (cfg.critRate) lines.push(`暴击率：${Math.round(cfg.critRate * 100)}%`);
    if (cfg.critMul) lines.push(`暴击倍率：×${cfg.critMul.toFixed(1)}`);
  }
  if (id === "p6_lifesteal" && cfg.lifestealPct) lines.push(`吸血比例：${Math.round(cfg.lifestealPct * 100)}%`);
  if (id === "p7_armor" && cfg.armorPct) lines.push(`伤害减免：${Math.round(cfg.armorPct * 100)}%`);
  if (id === "p8_homing") {
    if (cfg.homingTurnRate) lines.push(`追踪转向：${cfg.homingTurnRate.toFixed(1)} rad/s`);
    else lines.push(`未激活追踪`);
  }
  if (id === "p9_wingman") {
    if (cfg.wingmanCount) lines.push(`僚机数量：${cfg.wingmanCount} 架`);
    if (cfg.wingmanDmgPct) lines.push(`僚机伤害：${Math.round(cfg.wingmanDmgPct * 100)}%`);
  }
  if (id === "p10_revive") {
    if (cfg.reviveCount) lines.push(`复活次数：${cfg.reviveCount} 次/关`);
    if (cfg.reviveHpPct) lines.push(`复活恢复：${Math.round(cfg.reviveHpPct * 100)}% HP`);
  }
  if (id === "p11_shiplevel") {
    if (cfg.shipLevelDmgPct) lines.push(`额外伤害：+${Math.round(cfg.shipLevelDmgPct * 100)}%`);
    else lines.push(`未激活战机进阶`);
    if (cfg.shipLevelBullets) lines.push(`开火子弹：${cfg.shipLevelBullets} 发/次`);
  }
  return (
    <ul className="mt-3 space-y-1 text-xs text-slate-200/90">
      {lines.map((l, i) => <li key={i}>• {l}</li>)}
    </ul>
  );
};
