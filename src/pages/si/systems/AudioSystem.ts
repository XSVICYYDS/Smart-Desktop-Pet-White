/** AudioContext 程序化 BGM + 事件音效（无外链资源）。 */
export type BGMKind = "menu" | "battle" | "boss";
export type SFXKind = "shoot" | "hit" | "boom" | "shield" | "haste" | "nuke" | "heal" | "levelup" | "click" | "achievement";

interface AudioCtx {
  ctx: AudioContext | null;
  master: GainNode | null;
  bgmGain: GainNode | null;
  sfxGain: GainNode | null;
  bgmStop: null | (() => void);
  bgmCurrent: BGMKind | null;
  bgmVol: number;
  sfxVol: number;
}

const S: AudioCtx = { ctx: null, master: null, bgmGain: null, sfxGain: null, bgmStop: null, bgmCurrent: null, bgmVol: 0.6, sfxVol: 0.8 };

/** 懒加载 AudioContext（需由用户手势第一次触发以解锁）。 */
export function ensureAudio(): AudioContext | null {
  if (S.ctx) return S.ctx;
  const w = typeof window !== "undefined" ? window : null;
  if (!w) return null;
  const Ctor = w.AudioContext || (w as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    const bgmGain = ctx.createGain(); bgmGain.gain.value = S.bgmVol; bgmGain.connect(master);
    const sfxGain = ctx.createGain(); sfxGain.gain.value = S.sfxVol; sfxGain.connect(master);
    S.ctx = ctx; S.master = master; S.bgmGain = bgmGain; S.sfxGain = sfxGain;
    return ctx;
  } catch {
    return null;
  }
}

export function setBgmVolume(v: number): void { S.bgmVol = Math.max(0, Math.min(1, v)); if (S.bgmGain) S.bgmGain.gain.value = S.bgmVol; }
export function setSfxVolume(v: number): void { S.sfxVol = Math.max(0, Math.min(1, v)); if (S.sfxGain) S.sfxGain.gain.value = S.sfxVol; }

export function playSFX(kind: SFXKind): void {
  const ctx = ensureAudio(); if (!ctx || !S.sfxGain) return;
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(S.sfxGain);
  let freq = 440; let dur = 0.09; let type: OscillatorType = "square"; let vol = 0.12;
  switch (kind) {
    case "shoot": freq = 900; dur = 0.06; type = "square"; vol = 0.08; break;
    case "hit": freq = 200; dur = 0.05; type = "sawtooth"; vol = 0.09; break;
    case "boom": freq = 90; dur = 0.3; type = "triangle"; vol = 0.22; break;
    case "shield": freq = 660; dur = 0.18; type = "sine"; vol = 0.16; break;
    case "haste": freq = 1200; dur = 0.22; type = "sawtooth"; vol = 0.12; break;
    case "nuke": freq = 70; dur = 0.8; type = "sawtooth"; vol = 0.26; break;
    case "heal": freq = 880; dur = 0.22; type = "sine"; vol = 0.14; break;
    case "levelup": freq = 1046; dur = 0.3; type = "triangle"; vol = 0.18; break;
    case "click": freq = 520; dur = 0.04; type = "square"; vol = 0.08; break;
    case "achievement": freq = 1318; dur = 0.5; type = "triangle"; vol = 0.18; break;
  }
  o.type = type;
  o.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  o.start(now); o.stop(now + dur + 0.02);
}

interface BgmNote { t: number; f: number; d: number }

const SCALES: Record<BGMKind, { base: number; motif: number[]; lenSec: number }> = {
  menu:   { base: 220, motif: [0, 3, 5, 7, 5, 3, 2, 0], lenSec: 10 },
  battle: { base: 277, motif: [0, 2, 3, 5, 7, 5, 3, 2, 0, -2, 0, 2], lenSec: 12 },
  boss:   { base: 196, motif: [0, -1, 0, 2, 4, 2, 0, 5, 7, 5, 4, 2, 0], lenSec: 16 },
};

function midiHz(base: number, semi: number): number { return base * Math.pow(2, semi / 12); }

function scheduleLoop(ctx: AudioContext, kind: BGMKind, gain: GainNode): { stop: () => void; timer: number } {
  const cfg = SCALES[kind];
  const bpm = kind === "menu" ? 72 : kind === "battle" ? 112 : 132;
  const stepSec = 60 / bpm / 2;
  const total = cfg.lenSec;
  let stopped = false;
  let nextStartAt = ctx.currentTime + 0.05;
  const buildNotes = (t0: number): BgmNote[] => {
    const out: BgmNote[] = [];
    for (let i = 0; i < cfg.motif.length; i++) {
      out.push({ t: t0 + i * stepSec, f: midiHz(cfg.base, cfg.motif[i]), d: stepSec * 1.1 });
    }
    const bassHz = midiHz(cfg.base / 2, 0);
    for (let t = 0; t < total; t += stepSec * 2) {
      out.push({ t: t0 + t, f: bassHz, d: stepSec * 1.6 });
    }
    return out;
  };
  const renderOnce = (startAt: number): void => {
    const ns = buildNotes(startAt);
    for (const n of ns) {
      const o = ctx.createOscillator();
      const gg = ctx.createGain();
      o.type = (kind === "boss" ? "sawtooth" : kind === "battle" ? "square" : "triangle");
      o.frequency.setValueAtTime(n.f, n.t);
      o.connect(gg); gg.connect(gain);
      gg.gain.setValueAtTime(0, n.t);
      gg.gain.linearRampToValueAtTime(kind === "boss" ? 0.07 : 0.05, n.t + 0.02);
      gg.gain.exponentialRampToValueAtTime(0.001, n.t + n.d);
      o.start(n.t); o.stop(n.t + n.d + 0.02);
    }
  };
  renderOnce(nextStartAt);
  nextStartAt += total;
  const timer = window.setInterval(() => {
    if (stopped) return;
    if (nextStartAt - ctx.currentTime < total + 1.5) {
      renderOnce(nextStartAt);
      nextStartAt += total;
    }
  }, 1000);
  return {
    stop: () => { stopped = true; clearInterval(timer); },
    timer,
  };
}

export function playBGM(kind: BGMKind): void {
  const ctx = ensureAudio();
  if (!ctx || !S.bgmGain) return;
  if (S.bgmCurrent === kind && S.bgmStop) return;
  stopBGM();
  const res = scheduleLoop(ctx, kind, S.bgmGain);
  S.bgmStop = res.stop;
  S.bgmCurrent = kind;
}

export function stopBGM(): void {
  if (S.bgmStop) { S.bgmStop(); S.bgmStop = null; }
  S.bgmCurrent = null;
}
