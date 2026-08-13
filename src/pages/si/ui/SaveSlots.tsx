import React from "react";
import { deleteSlot, previewSlots } from "../systems/SaveSystem";

export interface SaveSlotsProps {
  open: boolean;
  onClose: () => void;
  onLoad: (slot: 0 | 1 | 2) => void;
  onNew: (slot: 0 | 1 | 2) => void;
  onDeleteConfirm?: (slot: 0 | 1 | 2) => void;
  refreshTick: number;
}

/** 3 独立存档槽预览 / 加载 / 新建 / 删除。 */
export const SaveSlots: React.FC<SaveSlotsProps> = ({ open, onClose, onLoad, onNew, onDeleteConfirm, refreshTick }) => {
  void refreshTick;
  if (!open) return null;
  const previews = previewSlots();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-xl font-black">💾 存档管理</div>
            <p className="text-xs text-slate-300/80 mt-1">支持 3 个独立槽位。每关通关自动保存；设置 / 技能变更会即时写入当前槽。</p>
          </div>
          <button className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm" onClick={onClose}>关闭 ✕</button>
        </header>
        <div className="grid md:grid-cols-3 gap-3 md:gap-4 p-5">
          {previews.map((p, i) => {
            const slot = i as 0 | 1 | 2;
            return (
              <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 grid place-items-center text-xl">💾</div>
                  <div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-[11px] text-slate-300/80">{p.exists ? `最后保存：${fmtTime(p.savedAtMs)}` : "空存档槽"}</div>
                  </div>
                </div>
                {p.exists ? (
                  <ul className="mt-3 space-y-1 text-xs text-slate-200/90">
                    <li>当前关卡：<b>第 {p.level} 关</b></li>
                    <li>累计得分：<b>{p.totalScore.toLocaleString()}</b></li>
                    <li>最佳得分：<b>{p.bestScore.toLocaleString()}</b></li>
                    <li>通关关数：<b>{p.clearedLevels}</b></li>
                    <li>技能点：<b>{p.skillPoints}</b> · 解锁成就：<b>{p.unlockedAchievements.length}/15</b></li>
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-slate-300/80">该槽位尚无数据，点击下方新建开始冒险。</p>
                )}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button disabled={!p.exists} onClick={() => onLoad(slot)}
                    className={"rounded-xl px-2 py-2 text-xs font-bold " + (p.exists ? "bg-cyan-500 hover:bg-cyan-400 text-white" : "bg-white/5 text-white/40")}>
                    读取
                  </button>
                  <button onClick={() => onNew(slot)}
                    className="rounded-xl px-2 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white">
                    新建
                  </button>
                  <button disabled={!p.exists}
                    onClick={() => { deleteSlot(slot); onDeleteConfirm?.(slot); }}
                    className={"rounded-xl px-2 py-2 text-xs font-bold " + (p.exists ? "bg-rose-500 hover:bg-rose-400 text-white" : "bg-white/5 text-white/40")}>
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function fmtTime(ms: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
