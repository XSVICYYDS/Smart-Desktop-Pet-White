import React from "react";

export interface TouchControlsProps {
  /** 虚拟摇杆：dx/dy ∈ {-1, 0, 1}，上下 dy=-1 表示向上（向画布顶部）。 */
  onMove: (dx: -1 | 0 | 1, dy: -1 | 0 | 1) => void;
  onButton: (which: "shoot" | "s1" | "s2" | "s3" | "s4", pressed: boolean) => void;
}

/** 触屏控件：左虚拟摇杆（8方向） + 右下 4 按钮，全部 ≥44px。 */
export const TouchControls: React.FC<TouchControlsProps> = ({ onMove, onButton }) => {
  const joyRef = React.useRef<HTMLDivElement | null>(null);
  const knobRef = React.useRef<HTMLDivElement | null>(null);
  const touchIdRef = React.useRef<number | null>(null);
  const centerRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastDirRef = React.useRef<{ x: -1 | 0 | 1; y: -1 | 0 | 1 }>({ x: 0, y: 0 });

  /** 将摇杆位移归一化到 8 方向。 */
  const updateJoy = (x: number, y: number): void => {
    const c = centerRef.current;
    const dx = x - c.x;
    const dy = y - c.y;
    const R = 48;
    const len = Math.hypot(dx, dy);
    const kx = len > R ? (dx / len) * R : dx;
    const ky = len > R ? (dy / len) * R : dy;
    const k = knobRef.current;
    if (k) { k.style.transform = `translate3d(${kx}px, ${ky}px, 0)`; }
    const normX = R > 0 ? Math.max(-1, Math.min(1, dx / R)) : 0;
    const normY = R > 0 ? Math.max(-1, Math.min(1, dy / R)) : 0;
    const threshold = 0.25;
    const nextX: -1 | 0 | 1 = normX < -threshold ? -1 : normX > threshold ? 1 : 0;
    const nextY: -1 | 0 | 1 = normY < -threshold ? -1 : normY > threshold ? 1 : 0;
    const last = lastDirRef.current;
    if (nextX !== last.x || nextY !== last.y) {
      lastDirRef.current = { x: nextX, y: nextY };
      onMove(nextX, nextY);
    }
  };

  const onJoyStart = (e: React.TouchEvent): void => {
    const el = joyRef.current;
    if (!el || !e.touches[0]) return;
    const t = e.touches[0];
    touchIdRef.current = t.identifier;
    const r = el.getBoundingClientRect();
    centerRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    updateJoy(t.clientX, t.clientY);
  };
  const onJoyMove = (e: React.TouchEvent): void => {
    if (touchIdRef.current == null) return;
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      if (t.identifier === touchIdRef.current) { updateJoy(t.clientX, t.clientY); return; }
    }
  };
  const onJoyEnd = (): void => {
    touchIdRef.current = null;
    const k = knobRef.current;
    if (k) k.style.transform = "translate3d(0,0,0)";
    const last = lastDirRef.current;
    if (last.x !== 0 || last.y !== 0) { lastDirRef.current = { x: 0, y: 0 }; onMove(0, 0); }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 left-0 right-0 z-30 p-3 md:p-5 flex items-end justify-between select-none">
      <div
        ref={joyRef}
        onTouchStart={onJoyStart} onTouchMove={onJoyMove} onTouchEnd={onJoyEnd} onTouchCancel={onJoyEnd}
        className="pointer-events-auto relative w-40 h-40 rounded-full bg-white/10 border border-white/25 backdrop-blur-sm">
        <div className="absolute inset-6 rounded-full bg-white/5 border border-white/20" />
        <div ref={knobRef} className="absolute left-1/2 top-1/2 w-14 h-14 -ml-7 -mt-7 rounded-full bg-cyan-300/60 border-2 border-white shadow-lg transition-transform" />
      </div>
      <div className="pointer-events-auto grid grid-cols-2 gap-3">
        <ActionBtn label="射击" sub="🔫" color="from-rose-500 to-orange-500"
          onDown={(p) => onButton("shoot", p)} />
        <ActionBtn label="大招 S1" sub="💥" color="from-fuchsia-500 to-rose-500"
          onDown={(p) => onButton("s1", p)} />
        <ActionBtn label="护盾 S2" sub="🛡️" color="from-sky-500 to-indigo-600"
          onDown={(p) => onButton("s2", p)} />
        <ActionBtn label="加速 S3" sub="⚡" color="from-emerald-500 to-cyan-500"
          onDown={(p) => onButton("s3", p)} />
        <ActionBtn label="无敌 S4" sub="🛡️" color="from-cyan-500 to-teal-500"
          onDown={(p) => onButton("s4", p)} />
      </div>
    </div>
  );
};

const ActionBtn: React.FC<{ label: string; sub: string; color: string; onDown: (pressed: boolean) => void }> = ({ label, sub, color, onDown }) => {
  const [pressed, setPressed] = React.useState(false);
  const commit = (p: boolean) => { setPressed(p); onDown(p); };
  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); commit(true); }}
      onTouchEnd={(e) => { e.preventDefault(); commit(false); }}
      onTouchCancel={() => commit(false)}
      onMouseDown={() => commit(true)}
      onMouseUp={() => commit(false)}
      onMouseLeave={() => pressed && commit(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={
        "relative w-[72px] h-[72px] rounded-2xl grid place-items-center text-white shadow-lg transition border border-white/30 bg-gradient-to-br " +
        color + (pressed ? " brightness-110 scale-95" : " hover:brightness-105")
      }
    >
      <div className="text-2xl">{sub}</div>
      <div className="absolute bottom-1 inset-x-0 text-center text-[10px] font-bold opacity-90">{label}</div>
    </button>
  );
};
