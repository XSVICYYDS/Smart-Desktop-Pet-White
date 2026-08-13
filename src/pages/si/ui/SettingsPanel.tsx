import React from "react";
import type { QualityTier } from "../engine/HardwareDetect";
import type { InputMode } from "../types";

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  sfx: number;
  bgm: number;
  quality: QualityTier | "auto";
  input: InputMode;
  onChange: (patch: Partial<{ sfx: number; bgm: number; quality: QualityTier | "auto"; input: InputMode }>) => void;
}

const QUALITY_OPTIONS: Array<{ id: SettingsPanelProps["quality"]; label: string; desc: string }> = [
  { id: "auto", label: "自动检测", desc: "根据设备性能自动选择" },
  { id: "low", label: "低（省电/稳定）", desc: "关闭光影/震波，1 层视差" },
  { id: "medium", label: "中（推荐）", desc: "2 层视差 + 震波，平衡表现" },
  { id: "high", label: "高（极致）", desc: "4 层视差 + 动态光影 + 满粒子" },
];

const INPUT_OPTIONS: Array<{ id: InputMode; label: string; desc: string }> = [
  { id: "keyboard", label: "键盘", desc: "← → / A D 移动，空格射击，Q/E/Shift 技能，P/ESC 暂停" },
  { id: "mouse", label: "鼠标", desc: "横向移动控制战机，左键射击，滚轮切技能，点击按钮释放" },
  { id: "touch", label: "触屏", desc: "左摇杆控制，右下 4 按钮（射击/大招/护盾/加速）44×44" },
];

/** 游戏内设置面板（音频 / 画质 / 控制），抽屉式弹出。 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose, sfx, bgm, quality, input, onChange }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-xl font-black">⚙️ 设置</div>
            <p className="text-xs text-slate-300/80 mt-1">修改会自动写入当前存档槽，下次进入自动恢复。</p>
          </div>
          <button className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm" onClick={onClose}>关闭 ✕</button>
        </header>
        <div className="grid md:grid-cols-2 gap-5 p-5">
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-cyan-300">🔊 音频</h3>
            <Slider label={`BGM 音量  ${Math.round(bgm * 100)}%`} value={bgm} onChange={(v) => onChange({ bgm: v })} />
            <Slider label={`SFX 音量  ${Math.round(sfx * 100)}%`} value={sfx} onChange={(v) => onChange({ sfx: v })} />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-violet-300">🖥️ 画质</h3>
            <div className="space-y-2">
              {QUALITY_OPTIONS.map((q) => (
                <button key={q.id} onClick={() => onChange({ quality: q.id })}
                  className={"w-full text-left rounded-xl px-3 py-2 border transition " +
                    (quality === q.id ? "bg-violet-500/20 border-violet-400/70" : "bg-white/5 border-white/10 hover:bg-white/10")}>
                  <div className="text-sm font-bold">{q.label}</div>
                  <div className="text-[11px] text-slate-300/80">{q.desc}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="md:col-span-2 space-y-3">
            <h3 className="text-sm font-bold text-emerald-300">🎮 控制偏好</h3>
            <div className="grid md:grid-cols-3 gap-2">
              {INPUT_OPTIONS.map((o) => (
                <button key={o.id} onClick={() => onChange({ input: o.id })}
                  className={"text-left rounded-xl px-3 py-2 border transition " +
                    (input === o.id ? "bg-emerald-500/20 border-emerald-400/70" : "bg-white/5 border-white/10 hover:bg-white/10")}>
                  <div className="text-sm font-bold">{o.label}</div>
                  <div className="text-[11px] text-slate-300/80 leading-5 mt-1">{o.desc}</div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const Slider: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
  <label className="block space-y-1">
    <div className="text-xs text-white/80">{label}</div>
    <input type="range" min={0} max={1} step={0.01} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-cyan-400" />
  </label>
);
