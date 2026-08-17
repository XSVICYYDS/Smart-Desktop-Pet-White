import React, { useEffect, useState } from "react";

export type TransitionKind = "level-start" | "level-clear" | "pause" | "skill-nuke" | "skill-shield" | "skill-haste" | "skill-cruise" | "skill-emp" | "skill-timewarp";

export interface TransitionOverlayProps {
  trigger: number; // 通过改变该数字触发一次动画
  kind: TransitionKind;
  title?: string;
  subtitle?: string;
  durationMs?: number;
}

/** 过渡叠层：关卡开始/结束、暂停、技能释放的淡入淡出 + 标题动画。 */
export const TransitionOverlay: React.FC<TransitionOverlayProps> = ({ trigger, kind, title, subtitle, durationMs = 900 }) => {
  const [vis, setVis] = useState(false);
  const [localTrigger, setLocalTrigger] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    setLocalTrigger((x) => x + 1);
    setVis(true);
    const t1 = window.setTimeout(() => setVis(false), durationMs);
    return () => window.clearTimeout(t1);
  }, [trigger, durationMs]);

  if (!vis) return null;
  const color =
    kind === "skill-nuke" ? "from-orange-500/70 via-red-500/70 to-fuchsia-600/70" :
    kind === "skill-shield" ? "from-sky-400/70 to-indigo-600/70" :
    kind === "skill-haste" ? "from-yellow-300/70 to-emerald-400/70" :
    kind === "skill-cruise" ? "from-orange-500/70 via-amber-500/70 to-red-600/70" :
    kind === "skill-emp" ? "from-violet-500/70 via-purple-500/70 to-fuchsia-600/70" :
    kind === "skill-timewarp" ? "from-cyan-400/70 via-blue-500/70 to-indigo-600/70" :
    kind === "pause" ? "from-slate-900/80 to-indigo-950/80" :
    kind === "level-clear" ? "from-emerald-400/70 via-cyan-400/60 to-violet-500/70" :
    "from-indigo-500/60 via-violet-500/60 to-fuchsia-500/60";
  const headline = title || defaultTitle(kind);
  const sub = subtitle || defaultSubtitle(kind);
  return (
    <div key={localTrigger} className="pointer-events-none fixed inset-0 z-40 grid place-items-center animate-si-overlay">
      <div className={`absolute inset-0 bg-gradient-to-br ${color}`} />
      <div className="relative text-center text-white">
        <div className="text-3xl md:text-6xl font-black drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)] animate-si-pop">
          {headline}
        </div>
        <div className="mt-3 text-sm md:text-xl text-white/90">{sub}</div>
      </div>
      <style>{`
        @keyframes si-overlay { 0% { opacity: 0 } 12% { opacity: 1 } 88% { opacity: 1 } 100% { opacity: 0 } }
        @keyframes si-pop { 0% { transform: scale(.85); opacity: 0 } 40% { transform: scale(1.06); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
        .animate-si-overlay { animation: si-overlay ${durationMs}ms ease both; }
        .animate-si-pop { animation: si-pop ${Math.round(durationMs * 0.6)}ms ease both; }
      `}</style>
    </div>
  );
};

function defaultTitle(k: TransitionKind): string {
  switch (k) {
    case "level-start": return "准备出击";
    case "level-clear": return "关卡通过";
    case "pause": return "已暂停";
    case "skill-nuke": return "全屏攻击 · 引爆";
    case "skill-shield": return "护盾展开";
    case "skill-haste": return "引擎过载";
    case "skill-cruise": return "巡航导弹 · 锁定目标";
    case "skill-emp": return "电磁脉冲 · 瘫痪敌军";
    case "skill-timewarp": return "时间扭曲 · 时空凝滞";
  }
}

function defaultSubtitle(k: TransitionKind): string {
  switch (k) {
    case "level-start": return "击退所有外星入侵者";
    case "level-clear": return "进入奖励结算与下一关";
    case "pause": return "按 P / ESC 或点击继续按钮恢复";
    case "skill-nuke": return "清场弹雨 · 对 BOSS 造成重创";
    case "skill-shield": return "抵挡接下来的若干次敌方攻击";
    case "skill-haste": return "移动速度大幅提升";
    case "skill-cruise": return "自动追踪并消灭多个敌人";
    case "skill-emp": return "眩晕周围敌人并使其护盾失效";
    case "skill-timewarp": return "减缓时间流速，玩家不受影响";
  }
}
