import React from "react";
import { ACHIEVEMENTS } from "../config";

export interface AchievementBoardProps {
  open: boolean;
  onClose: () => void;
  unlocked: Set<string>;
}

/** 15 项成就面板（解锁高亮）。 */
export const AchievementBoard: React.FC<AchievementBoardProps> = ({ open, onClose, unlocked }) => {
  if (!open) return null;
  const count = unlocked.size;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] overflow-auto">
        <header className="sticky top-0 z-10 bg-slate-900/95 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-xl font-black">🏅 成就面板</div>
            <p className="text-xs text-slate-300/80 mt-1">已解锁 <b className="text-amber-300">{count}</b> / 15。达成后永久保留在当前存档中。</p>
          </div>
          <button className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm" onClick={onClose}>关闭 ✕</button>
        </header>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 p-5">
          {ACHIEVEMENTS.map((a) => {
            const u = unlocked.has(a.id);
            return (
              <div key={a.id}
                className={
                  "rounded-2xl p-4 border transition " +
                  (u ? "bg-gradient-to-br from-amber-400/20 to-rose-500/20 border-amber-300/50" : "bg-white/5 border-white/10 opacity-80")
                }>
                <div className="flex items-center gap-3">
                  <div className={"w-11 h-11 rounded-xl grid place-items-center text-2xl " + (u ? "bg-amber-400/20" : "bg-white/5 grayscale")}>
                    {a.icon}
                  </div>
                  <div>
                    <div className={"font-bold " + (u ? "text-amber-200" : "text-white/80")}>
                      {u ? a.name : "未解锁 · ???"}
                    </div>
                    <div className="text-[11px] text-slate-300/80 mt-0.5">{a.desc}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
