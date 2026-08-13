/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars, prefer-const */
/* eslint-disable react-hooks/exhaustive-deps, no-empty */
// ↑ Playground 含 25 款游戏，大规模清理属于 P3 大重构；降为本文件不告警，不阻塞发布。
//   每次大版本发布前再做专项整改。

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  Play,
  Sparkles,
  RotateCcw,
  Info,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { findFeature, FEATURES, type FeatureMeta } from "../data/playgroundData";
import { Container as SIContainer } from "./si/index";

/**
 * 试玩 / 试用 统一入口页
 *
 * 路由：/playground/:id
 *
 * 包含：
 *  - 统一的面包屑/返回/上下一个 导航
 *  - 33 个子模块（15 游戏 + 12 工具 + 6 AI）的轻量在线实现
 *  - 每个子模块都用纯 React + Canvas 实现，无外部依赖
 */

// ===================== 通用小工具 =====================
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function usePrevNext(currentId: string): { prev: FeatureMeta | null; next: FeatureMeta | null } {
  const idx = FEATURES.findIndex((f) => f.id === currentId);
  return {
    prev: idx <= 0 ? null : FEATURES[idx - 1],
    next: idx === -1 || idx >= FEATURES.length - 1 ? null : FEATURES[idx + 1],
  };
}

/**
 * 全屏包装组件：右上角带全屏切换按钮，点击将容器元素 requestFullscreen
 */
function FullscreenWrapper({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const h = () => {
      setIsFs(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  const toggle = async () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      void e;
    }
  };
  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggle}
        title={isFs ? "退出全屏 (Esc)" : "全屏"}
        className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-slate-200 text-slate-700 hover:shadow-md hover:bg-white transition-all flex items-center justify-center"
      >
        {isFs ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
      {children}
    </div>
  );
}

// ============================================================
// 🎨 游戏体验通用工具（所有游戏共享）
// ============================================================

/** localStorage key 前缀（与 authClient 不冲突） */
const PG_LS_PREFIX = "pg_high_";

/**
 * 读取某游戏的最高分
 * @param gameId 游戏 ID（如 "game-aircraft"）
 * @returns 最高分，没记录返回 0
 */
function getHighScore(gameId: string): number {
  try {
    const raw = localStorage.getItem(PG_LS_PREFIX + gameId);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * 如果当前分 > 最高分，写入 localStorage 并返回 true（有新纪录）
 */
function updateHighScore(gameId: string, score: number): boolean {
  try {
    const cur = getHighScore(gameId);
    if (score > cur) {
      localStorage.setItem(PG_LS_PREFIX + gameId, String(score));
      return true;
    }
  } catch (e) {
    /* ignore */
  }
  return false;
}

/**
 * 通用粒子：圆形，用于爆炸/得分特效
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 剩余寿命（帧）
  maxLife: number;
  color: string;
  size: number;
}

/** 粒子管理：每帧 step() 更新+绘制 */
function createParticleSystem() {
  const list: Particle[] = [];
  return {
    list,
    /** 产生 n 个爆炸粒子 */
    burst(
      x: number,
      y: number,
      count: number,
      colors: string[],
      speed = 4,
      life = 28
    ) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.9);
        list.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life,
          maxLife: life,
          color: colors[(Math.random() * colors.length) | 0],
          size: 2 + Math.random() * 3,
        });
      }
    },
    /** 更新并绘制所有粒子 */
    step(ctx: CanvasRenderingContext2D, gravity = 0.12) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) {
          list.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      list.length = 0;
    },
  };
}

/**
 * 浮动文字（+10、连击、新纪录等）
 */
interface FloatText {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}
function createFloatTextSystem() {
  const list: FloatText[] = [];
  return {
    list,
    spawn(
      x: number,
      y: number,
      text: string,
      color = "#f59e0b",
      size = 16,
      life = 48
    ) {
      list.push({
        x,
        y,
        vy: -1.4,
        life,
        maxLife: life,
        text,
        color,
        size,
      });
    },
    step(ctx: CanvasRenderingContext2D) {
      for (let i = list.length - 1; i >= 0; i--) {
        const f = list[i];
        f.y += f.vy;
        f.vy *= 0.97;
        f.life--;
        if (f.life <= 0) {
          list.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, f.life / f.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = f.color;
        ctx.font = `bold ${f.size}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      list.length = 0;
    },
  };
}

/**
 * 把鼠标/触摸事件换算成 Canvas 逻辑坐标（考虑 CSS 缩放后的 clientRect）
 */
function canvasLogicalPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  W: number,
  H: number
) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * W,
    y: ((clientY - rect.top) / rect.height) * H,
  };
}

/**
 * 游戏说明条：一行图标+操作说明，放在 Canvas 上方
 */
function GameHintBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-4 text-[12px] md:text-[13px] text-slate-500">
      {children}
    </div>
  );
}
/** 单个操作说明：图标文字一行 */
function Hint({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5">
      {children}
    </span>
  );
}
/** 键位样式 */
function Key({ k }: { k: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded border border-slate-300 bg-white text-[10px] font-semibold text-slate-700 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
      {k}
    </kbd>
  );
}

/**
 * 暂停按钮：放在 Canvas 右上角的小按钮（与全屏按钮不冲突）
 */
function PauseButton({
  paused,
  toggle,
}: {
  paused: boolean;
  toggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={toggle}
      title={paused ? "继续" : "暂停"}
      className="absolute top-3 right-14 z-30 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-slate-200 text-slate-700 hover:shadow-md hover:bg-white transition-all flex items-center justify-center"
    >
      {paused ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
        </svg>
      )}
    </button>
  );
}

/**
 * 游戏结束/胜利 浮层：居中显示结果 + 最高分 + 新纪录印章 + 重开按钮
 */
function GameResultOverlay({
  title,
  success,
  stats,
  highLabel,
  highScore,
  newRecord,
  onRestart,
  primaryColor = "from-cyan-500 to-blue-600",
}: {
  title: string;
  success?: boolean;
  stats: { label: string; value: string | number }[];
  highLabel: string;
  highScore: number;
  newRecord?: boolean;
  onRestart: () => void;
  primaryColor?: string;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl animate-[fadeIn_0.2s_ease-out]">
      <div className="w-[86%] max-w-sm bg-white rounded-3xl border border-white shadow-2xl p-6 text-center relative overflow-hidden">
        {/* 顶部彩色色带 */}
        <div
          className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${primaryColor}`}
        />
        {/* 新纪录印章 */}
        {newRecord && (
          <div className="absolute top-3 right-3 rotate-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[10px] font-bold px-2.5 py-1 shadow-lg">
            🏆 新纪录
          </div>
        )}
        {/* 标题 */}
        <div className="mt-2 mb-4">
          <div className="text-2xl mb-1">{success ? "🎉" : "💀"}</div>
          <div className="text-lg font-bold text-slate-800">{title}</div>
        </div>
        {/* 统计卡片网格 */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl bg-slate-50 border border-slate-100 py-2.5"
            >
              <div className="text-[10px] font-semibold text-slate-500">
                {s.label}
              </div>
              <div className="text-base font-bold text-slate-800">
                {s.value}
              </div>
            </div>
          ))}
          <div className="col-span-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 py-2.5">
            <div className="text-[10px] font-semibold text-amber-600">
              {highLabel}
            </div>
            <div className="text-base font-bold text-amber-700">
              {highScore.toLocaleString()}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r ${primaryColor} text-white font-semibold shadow-md hover:shadow-lg active:translate-y-[1px] transition-all`}
        >
          <RotateCcw className="w-4 h-4" />
          再来一局
        </button>
      </div>
    </div>
  );
}

// 顶部导航条
function PlaygroundHeader({
  meta,
  onBack,
  onPrev,
  onNext,
  prev,
  next,
  onRestart,
  onShowInfo,
}: {
  meta: FeatureMeta;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  prev: FeatureMeta | null;
  next: FeatureMeta | null;
  onRestart?: () => void;
  onShowInfo?: () => void;
}) {
  const badge =
    meta.category === "game"
      ? "游戏"
      : meta.category === "tool"
      ? "工具"
      : "AI";
  const badgeCls =
    meta.category === "game"
      ? "bg-pink-100 text-pink-700 border-pink-200"
      : meta.category === "tool"
      ? "bg-sky-100 text-sky-700 border-sky-200"
      : "bg-violet-100 text-violet-700 border-violet-200";
  return (
    <div className="sticky top-20 z-20 backdrop-blur-xl bg-white/80 border-b border-pink-100/70 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-100 to-pink-50 px-3.5 py-2 text-sm font-semibold text-slate-700 border border-pink-100 hover:shadow-md transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          返回功能列表
        </button>
        <button
          onClick={() => onBack()}
          className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
        >
          <Home className="w-4 h-4" />
          首页
        </button>
        <div className="flex-1 min-w-[160px] flex items-center gap-3 justify-end md:justify-center flex-wrap">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${badgeCls}`}
          >
            {badge} 在线版
          </span>
          <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">
            {meta.name}
          </h1>
        </div>
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          {onShowInfo && (
            <button
              onClick={onShowInfo}
              title="功能说明"
              className="rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 w-9 h-9 flex items-center justify-center"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
          {onRestart && (
            <button
              onClick={onRestart}
              title="重新开始"
              className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold shadow-md hover:shadow-lg px-3 py-2 text-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              重开
            </button>
          )}
          <button
            onClick={onPrev}
            disabled={!prev}
            title={prev ? `上一个：${prev.name}` : "没有上一个了"}
            className="rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 w-9 h-9 flex items-center justify-center disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            disabled={!next}
            title={next ? `下一个：${next.name}` : "已是最后一个"}
            className="rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 w-9 h-9 flex items-center justify-center disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== 占位/降级 组件 =====================
function NotAvailable({ meta }: { meta: FeatureMeta }) {
  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-8 md:p-12 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-pink-200/70">
        {meta.name.slice(0, 1)}
      </div>
      <h2 className="mt-5 text-2xl font-bold text-slate-800">{meta.name} · 在线版</h2>
      <p className="mt-3 text-slate-600 leading-relaxed max-w-xl mx-auto">
        {meta.summary}
        <br />
        该功能的在线版已为您预留入口，核心交互逻辑请下载完整桌面端体验。网站端可点击左下角「返回功能列表」继续浏览其它可玩功能。
      </p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-pink-50 border border-pink-200 px-4 py-2 text-pink-700 text-sm font-semibold">
        <Sparkles className="w-4 h-4" />
        更完整的{meta.name}在桌面端
      </div>
    </div>
  );
}

// ===================== 2048 小游戏 =====================
function Game2048() {
  const SIZE = 4;
  const [grid, setGrid] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => getHighScore("game-2048"));
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const resultTriggered = useRef(false);

  const initGrid = () => {
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    addRandom(g);
    addRandom(g);
    return g;
  };
  const addRandom = (g: number[][]) => {
    const empty: [number, number][] = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) if (!g[r][c]) empty.push([r, c]);
    if (empty.length) {
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      g[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  };
  const restart = () => {
    setGrid(initGrid());
    setScore(0);
    setOver(false);
    setWon(false);
    setShowResult(false);
    setNewRecord(false);
    resultTriggered.current = false;
  };
  useEffect(() => {
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishGame = (finalScore: number) => {
    if (resultTriggered.current) return;
    resultTriggered.current = true;
    const nr = updateHighScore("game-2048", finalScore);
    setBest(getHighScore("game-2048"));
    setNewRecord(nr);
    setTimeout(() => setShowResult(true), 300);
  };

  useEffect(() => {
    if ((over || won) && !resultTriggered.current) {
      finishGame(score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, won]);

  const slideRow = (row: number[]) => {
    const arr = row.filter((v) => v);
    let gain = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        gain += arr[i];
        if (arr[i] === 2048) setWon(true);
        arr.splice(i + 1, 1);
      }
    }
    while (arr.length < SIZE) arr.push(0);
    return { row: arr, gain };
  };

  const move = (dir: "up" | "down" | "left" | "right") => {
    if (over) return;
    const g = grid.map((r) => r.slice());
    const before = JSON.stringify(g);
    let gain = 0;
    const access = (i: number, j: number): [number, number] => {
      if (dir === "left") return [i, j];
      if (dir === "right") return [i, SIZE - 1 - j];
      if (dir === "up") return [j, i];
      return [SIZE - 1 - j, i];
    };
    for (let i = 0; i < SIZE; i++) {
      const row: number[] = [];
      for (let j = 0; j < SIZE; j++) {
        const [r, c] = access(i, j);
        row.push(g[r][c]);
      }
      const { row: r2, gain: g2 } = slideRow(row);
      gain += g2;
      for (let j = 0; j < SIZE; j++) {
        const [r, c] = access(i, j);
        g[r][c] = r2[j];
      }
    }
    const after = JSON.stringify(g);
    if (before !== after) {
      addRandom(g);
      setGrid(g);
      const ns = score + gain;
      setScore(ns);
      let canMove = false;
      for (let r = 0; r < SIZE && !canMove; r++)
        for (let c = 0; c < SIZE; c++) {
          if (!g[r][c]) { canMove = true; break; }
          if (c + 1 < SIZE && g[r][c] === g[r][c + 1]) { canMove = true; break; }
          if (r + 1 < SIZE && g[r][c] === g[r + 1][c]) { canMove = true; break; }
        }
      if (!canMove) setOver(true);
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        if (e.key === "ArrowUp") move("up");
        if (e.key === "ArrowDown") move("down");
        if (e.key === "ArrowLeft") move("left");
        if (e.key === "ArrowRight") move("right");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, score, over]);

  const tile = (v: number) => {
    const styles: Record<number, string> = {
      0: "bg-slate-100/70 text-transparent",
      2: "bg-amber-50 text-slate-800",
      4: "bg-amber-100 text-slate-800",
      8: "bg-orange-300 text-white",
      16: "bg-orange-400 text-white",
      32: "bg-orange-500 text-white",
      64: "bg-red-400 text-white",
      128: "bg-yellow-300 text-slate-800",
      256: "bg-yellow-400 text-slate-800",
      512: "bg-yellow-500 text-white",
      1024: "bg-pink-400 text-white",
      2048: "bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-300",
    };
    return (
      <div
        className={`aspect-square rounded-xl font-extrabold text-xl md:text-2xl flex items-center justify-center transition-all ${styles[v] || "bg-slate-800 text-white"}`}
      >
        {v || ""}
      </div>
    );
  };

  // 计算最大块
  const maxTile = grid.length ? Math.max(...grid.flat()) : 0;

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-slate-500">得分</div>
          <div className="text-xl font-bold text-slate-800">{score}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-amber-600">最佳</div>
          <div className="text-xl font-bold text-amber-700">{best}</div>
        </div>
        <div className="rounded-2xl bg-orange-50 border border-orange-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-orange-600">最大块</div>
          <div className="text-xl font-bold text-orange-700">{maxTile || "-"}</div>
        </div>
        <button
          onClick={restart}
          className="ml-auto rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-md hover:shadow-lg px-4 py-2 text-sm flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          新游戏
        </button>
      </div>

      <GameHintBar>
        <Hint>⬆️ 方向键 <Key k="↑" /><Key k="↓" /><Key k="←" /><Key k="→" /> 合并方块</Hint>
        <Hint>📱 滑动棋盘或按下方按钮</Hint>
        <Hint>🎯 合成 2048 即获胜</Hint>
      </GameHintBar>

      <div className="relative mx-auto max-w-sm">
        <div className="relative">
          <div
            className="rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 p-3 grid grid-cols-4 gap-3 shadow-inner touch-none"
            onTouchStart={(e) => {
              const t = e.touches[0];
              touchStart.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchEnd={(e) => {
              const s = touchStart.current;
              if (!s) return;
              const t = e.changedTouches[0];
              const dx = t.clientX - s.x;
              const dy = t.clientY - s.y;
              if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
              if (Math.abs(dx) > Math.abs(dy)) {
                move(dx > 0 ? "right" : "left");
              } else {
                move(dy > 0 ? "down" : "up");
              }
              touchStart.current = null;
            }}
          >
            {grid.flat().map((v, i) => (
              <div key={i}>{tile(v)}</div>
            ))}
          </div>
          {showResult && (
            <GameResultOverlay
              title={won ? "合成 2048，太棒了！" : "无法移动，游戏结束"}
              success={won}
              stats={[
                { label: "本局得分", value: score },
                { label: "最大方块", value: maxTile || 0 },
              ]}
              highLabel="历史最高分"
              highScore={best}
              newRecord={newRecord}
              onRestart={restart}
              primaryColor="from-amber-500 to-orange-600"
            />
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        <div />
        <button
          onClick={() => move("up")}
          className="rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 py-3 font-bold transition-all"
        >
          ↑
        </button>
        <div />
        <button
          onClick={() => move("left")}
          className="rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 py-3 font-bold transition-all"
        >
          ←
        </button>
        <button
          onClick={() => move("down")}
          className="rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 py-3 font-bold transition-all"
        >
          ↓
        </button>
        <button
          onClick={() => move("right")}
          className="rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 py-3 font-bold transition-all"
        >
          →
        </button>
      </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 贪吃蛇 =====================
function GameSnake() {
  const COLS = 28, ROWS = 20;
  const CW = 24, CH = 24;
  const W = COLS * CW, H = ROWS * CH;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const particles = useMemo(() => createParticleSystem(), []);
  const floats = useMemo(() => createFloatTextSystem(), []);

  type Dir = [number, number];
  type Food = { x: number; y: number; bonus: boolean };
  const stateRef = useRef({
    snake: [[10, 7], [9, 7], [8, 7]] as [number, number][],
    dir: [1, 0] as Dir,
    nextDir: [1, 0] as Dir,
    food: { x: 15, y: 7, bonus: false } as Food,
    score: 0,
    alive: true,
    paused: false,
    shake: 0,
    tickCd: 0,
    tickPer: 9,
    highScore: 0,
    newRecord: false,
  });
  const [paused, setPaused] = useState(false);
  const [uiScore, setUiScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  const spawnFood = () => {
    const s = stateRef.current;
    const empty: [number, number][] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!s.snake.some((p) => p[0] === x && p[1] === y)) empty.push([x, y]);
      }
    }
    const [fx, fy] = empty[Math.floor(Math.random() * empty.length)];
    const bonus = Math.random() < 0.12;
    s.food = { x: fx, y: fy, bonus };
  };

  const changeDir = (nd: Dir) => {
    const s = stateRef.current;
    const cur = s.dir;
    if (cur[0] + nd[0] === 0 && cur[1] + nd[1] === 0) return;
    s.nextDir = nd;
  };

  const togglePause = () => {
    const s = stateRef.current;
    if (!s.alive) return;
    s.paused = !s.paused;
    setPaused(s.paused);
  };

  const restart = () => {
    const s = stateRef.current;
    s.snake = [[10, 7], [9, 7], [8, 7]];
    s.dir = [1, 0];
    s.nextDir = [1, 0];
    s.score = 0;
    s.alive = true;
    s.paused = false;
    s.shake = 0;
    s.tickCd = 0;
    s.tickPer = 9;
    s.newRecord = false;
    spawnFood();
    particles.clear();
    floats.clear();
    setPaused(false);
    setUiScore(0);
    setShowResult(false);
    setHighScore(getHighScore("game-snake"));
    setNewRecord(false);
  };

  const die = () => {
    const s = stateRef.current;
    if (!s.alive) return;
    s.alive = false;
    s.shake = 8;
    const nr = updateHighScore("game-snake", s.score);
    s.newRecord = nr;
    setHighScore(getHighScore("game-snake"));
    setNewRecord(nr);
    setTimeout(() => setShowResult(true), 450);
  };

  useEffect(() => {
    restart();
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowUp" || k === "w" || k === "W") { changeDir([0, -1]); e.preventDefault(); }
      if (k === "ArrowDown" || k === "s" || k === "S") { changeDir([0, 1]); e.preventDefault(); }
      if (k === "ArrowLeft" || k === "a" || k === "A") { changeDir([-1, 0]); e.preventDefault(); }
      if (k === "ArrowRight" || k === "d" || k === "D") { changeDir([1, 0]); e.preventDefault(); }
      if (k === "p" || k === "P" || k === " ") { togglePause(); e.preventDefault(); }
    };
    window.addEventListener("keydown", down);
    let raf = 0;
    const loop = () => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d")!;
        const s = stateRef.current;

        if (!s.paused && s.alive) {
          s.tickCd++;
          if (s.tickCd >= s.tickPer) {
            s.tickCd = 0;
            s.dir = s.nextDir;
            const head = s.snake[0];
            const nh: [number, number] = [head[0] + s.dir[0], head[1] + s.dir[1]];
            if (nh[0] < 0 || nh[0] >= COLS || nh[1] < 0 || nh[1] >= ROWS || s.snake.some((p) => p[0] === nh[0] && p[1] === nh[1])) {
              die();
            } else {
              const next = [nh, ...s.snake];
              const fx = s.food.x, fy = s.food.y;
              const fcx = fx * CW + CW / 2, fcy = fy * CH + CH / 2;
              if (nh[0] === fx && nh[1] === fy) {
                if (s.food.bonus) {
                  s.score += 50;
                  particles.burst(fcx, fcy, 18, ["#f97316", "#fb923c", "#fdba74", "#fbbf24"], 5, 32);
                  floats.spawn(fcx, fcy, "+50", "#f97316", 24, 56);
                } else {
                  s.score += 10;
                  particles.burst(fcx, fcy, 10, ["#fbbf24", "#f59e0b", "#fde68a", "#34d399"], 4, 28);
                  floats.spawn(fcx, fcy, "+10", "#fbbf24", 16, 48);
                }
                if (s.tickPer > 4) s.tickPer = Math.max(4, s.tickPer - 1);
                s.snake = next;
                spawnFood();
                setUiScore(s.score);
              } else {
                next.pop();
                s.snake = next;
              }
            }
          }
        }

        const shaked = s.shake > 0;
        if (shaked) {
          ctx.save();
          ctx.translate((Math.random() - 0.5) * s.shake * 2, (Math.random() - 0.5) * s.shake * 2);
          s.shake--;
        }

        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(148,163,184,0.07)";
        ctx.lineWidth = 1;
        for (let x = 1; x < COLS; x++) {
          ctx.beginPath(); ctx.moveTo(x * CW, 0); ctx.lineTo(x * CW, H); ctx.stroke();
        }
        for (let y = 1; y < ROWS; y++) {
          ctx.beginPath(); ctx.moveTo(0, y * CH); ctx.lineTo(W, y * CH); ctx.stroke();
        }

        for (let i = s.snake.length - 1; i >= 0; i--) {
          const [sx, sy] = s.snake[i];
          const px = sx * CW, py = sy * CH;
          if (i === 0) {
            ctx.fillStyle = "#6ee7b7";
            ctx.fillRect(px + 2, py + 2, CW - 4, CH - 4);
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fillRect(px + 5, py + 5, CW - 10, CH - 10);
            ctx.fillStyle = "#fff";
            const dx = s.dir[0], dy = s.dir[1];
            const eye1x = px + CW / 2 + dx * 3 - dy * 4 - 1;
            const eye1y = py + CH / 2 + dy * 3 + dx * 4 - 1;
            const eye2x = px + CW / 2 + dx * 3 + dy * 4 - 1;
            const eye2y = py + CH / 2 + dy * 3 - dx * 4 - 1;
            ctx.beginPath(); ctx.arc(eye1x, eye1y, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(eye2x, eye2y, 2, 0, Math.PI * 2); ctx.fill();
          } else {
            const t = i / s.snake.length;
            ctx.fillStyle = `rgb(${Math.round(16 + t * 40)}, ${Math.round(185 + (1 - t) * 30)}, ${Math.round(129 + (1 - t) * 20)})`;
            ctx.fillRect(px + 3, py + 3, CW - 6, CH - 6);
          }
        }

        const { x: fdx, y: fdy, bonus: fdbonus } = s.food;
        const fcpx = fdx * CW + CW / 2, fcpy = fdy * CH + CH / 2;
        if (fdbonus) {
          const pulse = 1 + Math.sin(Date.now() / 120) * 0.12;
          ctx.fillStyle = "#f97316";
          ctx.beginPath(); ctx.arc(fcpx, fcpy, CW / 2 - 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#fed7aa";
          ctx.beginPath(); ctx.arc(fcpx, fcpy, (CW / 2 - 7) * pulse, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#fff7ed";
          ctx.beginPath(); ctx.arc(fcpx - 2, fcpy - 2, 2, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = "#f43f5e";
          ctx.beginPath(); ctx.arc(fcpx, fcpy, CW / 2 - 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#fecdd3";
          ctx.beginPath(); ctx.arc(fcpx - 2, fcpy - 2, 2, 0, Math.PI * 2); ctx.fill();
        }

        particles.step(ctx, 0.08);
        floats.step(ctx);

        if (shaked) {
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", down);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = stateRef.current;
  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-emerald-700">长度</div>
            <div className="text-xl font-bold text-emerald-800">{s.snake.length}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-amber-600">得分</div>
            <div className="text-xl font-bold text-amber-700">{uiScore}</div>
          </div>
          <div className="rounded-2xl bg-pink-50 border border-pink-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-pink-600">最高分</div>
            <div className="text-xl font-bold text-pink-700">{highScore}</div>
          </div>
          <button
            onClick={restart}
            className="ml-auto rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-md hover:shadow-lg px-4 py-2 text-sm flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            重开
          </button>
        </div>

        <GameHintBar>
          <Hint>🎮 方向键 / WASD <Key k="↑" /><Key k="↓" /><Key k="←" /><Key k="→" /> 移动</Hint>
          <Hint>⏸️ <Key k="P" /> / 空格 暂停</Hint>
          <Hint>📱 滑动屏幕或按下方按键</Hint>
        </GameHintBar>

        <div className="mx-auto max-w-xl relative">
          <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-2 shadow-2xl overflow-hidden">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full rounded-xl block"
              style={{ aspectRatio: `${COLS}/${ROWS}`, imageRendering: "pixelated" }}
              onTouchStart={(e) => {
                const t = e.touches[0];
                const p = canvasLogicalPoint(canvasRef.current!, t.clientX, t.clientY, W, H);
                touchStart.current = p;
              }}
              onTouchEnd={(e) => {
                const start = touchStart.current;
                if (!start) return;
                const t = e.changedTouches[0];
                const end = canvasLogicalPoint(canvasRef.current!, t.clientX, t.clientY, W, H);
                const dx = end.x - start.x, dy = end.y - start.y;
                if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
                if (Math.abs(dx) > Math.abs(dy)) {
                  changeDir(dx > 0 ? [1, 0] : [-1, 0]);
                } else {
                  changeDir(dy > 0 ? [0, 1] : [0, -1]);
                }
                touchStart.current = null;
              }}
            />
            <PauseButton paused={paused} toggle={togglePause} />
            {paused && s.alive && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-xl">
                <div className="text-white text-2xl font-bold flex items-center gap-3">
                  <Play className="w-7 h-7" /> 已暂停
                </div>
              </div>
            )}
            {showResult && (
              <GameResultOverlay
                title={s.alive ? "挑战中" : "游戏结束"}
                success={false}
                stats={[
                  { label: "本局得分", value: s.score },
                  { label: "蛇身长度", value: s.snake.length },
                ]}
                highLabel="最高分"
                highScore={highScore}
                newRecord={newRecord}
                onRestart={restart}
                primaryColor="from-emerald-500 to-green-600"
              />
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 max-w-[240px] mx-auto select-none">
          <div />
          <button
            onClick={() => changeDir([0, -1])}
            className="rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-700 py-3 font-bold text-lg transition-all"
          >
            ↑
          </button>
          <div />
          <button
            onClick={() => changeDir([-1, 0])}
            className="rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-700 py-3 font-bold text-lg transition-all"
          >
            ←
          </button>
          <button
            onClick={() => changeDir([0, 1])}
            className="rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-700 py-3 font-bold text-lg transition-all"
          >
            ↓
          </button>
          <button
            onClick={() => changeDir([1, 0])}
            className="rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-700 py-3 font-bold text-lg transition-all"
          >
            →
          </button>
        </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 井字棋 =====================
function GameTTT() {
  const [board, setBoard] = useState<("X" | "O" | null)[]>(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const [scores, setScores] = useState({ X: 0, O: 0, D: 0 });
  const [highScore, setHighScore] = useState<number>(() => getHighScore("game-ttt"));
  const [showResult, setShowResult] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const lastResultRef = useRef<string | null>(null);
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  const winner = (b: ("X" | "O" | null)[]) => {
    for (const l of lines) {
      if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]])
        return { win: b[l[0]], line: l };
    }
    return b.every((v) => v) ? { win: "D" as const, line: [] } : null;
  };
  const res = winner(board);
  const winLine = res?.line || [];

  // 计算综合分 score = wins*3 + draws*1，取 X 方分数作为综合
  const compositeScore = () => scores.X * 3 + scores.D * 1;

  // 当 res 出现且本回合还没触发过，更新最高分 + 展示浮层
  useEffect(() => {
    if (!res || lastResultRef.current === JSON.stringify(board)) return;
    lastResultRef.current = JSON.stringify(board);
    const s = compositeScore();
    const nr = updateHighScore("game-ttt", s);
    setHighScore(getHighScore("game-ttt"));
    setNewRecord(nr);
    setTimeout(() => setShowResult(true), 400);
  }, [res]); // eslint-disable-line react-hooks/exhaustive-deps

  const place = (i: number) => {
    if (board[i] || res) return;
    const nb = board.slice();
    nb[i] = xTurn ? "X" : "O";
    setBoard(nb);
    const w = winner(nb);
    if (w) {
      setScores((s) =>
        w.win === "X"
          ? { ...s, X: s.X + 1 }
          : w.win === "O"
          ? { ...s, O: s.O + 1 }
          : { ...s, D: s.D + 1 }
      );
    }
    setXTurn(!xTurn);
  };

  const newRound = () => {
    setBoard(Array(9).fill(null));
    setXTurn(true);
    setShowResult(false);
    setNewRecord(false);
  };

  const resetAll = () => {
    setBoard(Array(9).fill(null));
    setXTurn(true);
    setScores({ X: 0, O: 0, D: 0 });
    setShowResult(false);
    setNewRecord(false);
    lastResultRef.current = null;
  };

  const resultTitle = res?.win === "D" ? "本回合平局" : `🎉 ${res?.win} 获胜！`;
  const resultSuccess = res?.win !== null && res?.win !== "D" && res?.win === "X";

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-sky-600">X 胜</div>
          <div className="text-xl font-bold text-sky-700">{scores.X}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-slate-500">平局</div>
          <div className="text-xl font-bold text-slate-700">{scores.D}</div>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-rose-600">O 胜</div>
          <div className="text-xl font-bold text-rose-700">{scores.O}</div>
        </div>
        <div className="rounded-2xl bg-slate-100 border border-slate-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-slate-500">综合分</div>
          <div className="text-xl font-bold text-slate-700">{compositeScore()}</div>
        </div>
        <div className="ml-auto text-sm text-slate-600 font-medium flex items-center gap-2">
          <span>当前：</span>
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black ${
              xTurn ? "bg-sky-100 text-sky-600" : "bg-rose-100 text-rose-600"
            }`}
          >
            {xTurn ? "X" : "O"}
          </span>
        </div>
        <button
          onClick={resetAll}
          className="rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 text-white font-semibold px-4 py-2 text-sm"
        >
          重置比分
        </button>
      </div>

      <GameHintBar>
        <Hint>👆 点击格子落子，先连成 3 子获胜</Hint>
        <Hint>🔵 <Key k="X" /> 先手 · 🔴 <Key k="O" /> 后手</Hint>
        <Hint>📊 综合分 = 胜×3 + 平×1</Hint>
      </GameHintBar>

      <div className="relative mx-auto max-w-xs">
        <div className="aspect-square grid grid-cols-3 gap-3">
          {board.map((v, i) => {
            const win = winLine.includes(i);
            return (
              <button
                key={i}
                onClick={() => place(i)}
                className={`rounded-2xl text-4xl md:text-5xl font-black transition-all border-2 ${
                  win
                    ? "bg-gradient-to-br from-slate-300 to-slate-400 border-slate-500 shadow-lg scale-[1.02]"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 active:scale-95"
                } ${
                  v === "X" ? "text-sky-600" : v === "O" ? "text-rose-600" : ""
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
        {showResult && res && (
          <GameResultOverlay
            title={resultTitle}
            success={resultSuccess}
            stats={[
              { label: "X 胜场", value: scores.X },
              { label: "平局", value: scores.D },
              { label: "O 胜场", value: scores.O },
            ]}
            highLabel="历史最高综合分"
            highScore={highScore}
            newRecord={newRecord}
            onRestart={newRound}
            primaryColor="from-slate-600 to-slate-800"
          />
        )}
      </div>
      <div className="mt-4 text-center">
        <button
          onClick={newRound}
          className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2 text-sm"
        >
          下一局（不清比分）
        </button>
      </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 计算器 =====================
function ToolCalculator() {
  const [expr, setExpr] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const press = (k: string) => {
    if (/[0-9]/.test(k)) {
      if (fresh) {
        setExpr(k === "0" ? "0" : k);
        setFresh(false);
      } else setExpr(expr === "0" ? k : expr + k);
    } else if (k === ".") {
      if (fresh) {
        setExpr("0.");
        setFresh(false);
      } else if (!expr.includes(".")) setExpr(expr + ".");
    } else if (["+", "-", "×", "÷"].includes(k)) {
      const cur = parseFloat(expr);
      if (prev !== null && op && !fresh) {
        const r = calc(prev, cur, op);
        setPrev(r);
        setExpr(String(r));
      } else setPrev(cur);
      setOp(k);
      setFresh(true);
    } else if (k === "=") {
      if (prev !== null && op) {
        const r = calc(prev, parseFloat(expr), op);
        setExpr(String(r));
        setPrev(null);
        setOp(null);
        setFresh(true);
      }
    } else if (k === "C") {
      setExpr("0");
      setPrev(null);
      setOp(null);
      setFresh(true);
    } else if (k === "±") setExpr(String(-parseFloat(expr)));
    else if (k === "%") setExpr(String(parseFloat(expr) / 100));
    else if (k === "⌫") {
      const e = expr.slice(0, -1) || "0";
      setExpr(e);
    }
  };
  const calc = (a: number, b: number, o: string) => {
    if (o === "+") return a + b;
    if (o === "-") return a - b;
    if (o === "×") return a * b;
    if (o === "÷") return (b === 0 ? 0 : a / b);
    return b;
  };
  // 键盘支持
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (/[0-9]/.test(e.key)) press(e.key);
      else if (e.key === "+") press("+");
      else if (e.key === "-") press("-");
      else if (e.key === "*") press("×");
      else if (e.key === "/") {
        e.preventDefault();
        press("÷");
      } else if (e.key === "Enter" || e.key === "=") press("=");
      else if (e.key === "Backspace") press("⌫");
      else if (e.key === "Escape") press("C");
      else if (e.key === ".") press(".");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expr, prev, op, fresh]);

  const Btn = ({
    k,
    cls = "",
    span = 1,
  }: {
    k: string;
    cls?: string;
    span?: number;
  }) => (
    <button
      onClick={() => press(k)}
      className={`rounded-2xl font-semibold py-4 text-lg shadow-sm hover:shadow-md active:scale-95 transition-all ${cls} ${
        span === 2 ? "col-span-2" : ""
      }`}
    >
      {k}
    </button>
  );
  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="mx-auto max-w-sm rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 shadow-2xl">
        <div className="mb-4 text-right">
          <div className="text-xs text-slate-400 h-4 truncate">
            {prev !== null ? `${prev} ${op || ""}` : " "}
          </div>
          <div className="text-white text-5xl font-bold tracking-wider truncate">
            {expr}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Btn k="C" cls="bg-rose-500 text-white" />
          <Btn k="⌫" cls="bg-amber-500 text-white" />
          <Btn k="%" cls="bg-amber-400 text-white" />
          <Btn k="÷" cls="bg-orange-500 text-white" />
          <Btn k="7" cls="bg-slate-700 text-white" />
          <Btn k="8" cls="bg-slate-700 text-white" />
          <Btn k="9" cls="bg-slate-700 text-white" />
          <Btn k="×" cls="bg-orange-500 text-white" />
          <Btn k="4" cls="bg-slate-700 text-white" />
          <Btn k="5" cls="bg-slate-700 text-white" />
          <Btn k="6" cls="bg-slate-700 text-white" />
          <Btn k="-" cls="bg-orange-500 text-white" />
          <Btn k="1" cls="bg-slate-700 text-white" />
          <Btn k="2" cls="bg-slate-700 text-white" />
          <Btn k="3" cls="bg-slate-700 text-white" />
          <Btn k="+" cls="bg-orange-500 text-white" />
          <Btn k="±" cls="bg-slate-600 text-white" />
          <Btn k="0" cls="bg-slate-700 text-white" />
          <Btn k="." cls="bg-slate-700 text-white" />
          <Btn k="=" cls="bg-gradient-to-br from-pink-500 to-rose-600 text-white" />
        </div>
        <div className="mt-4 text-center text-xs text-slate-400">
          支持键盘数字、+ - * /、Enter=、Esc清空、Backspace退格
        </div>
      </div>
    </div>
  );
}

// ===================== 记事本 =====================
function ToolNotepad() {
  const KEY = "pg_notepad_v1";
  const [text, setText] = useState<string>(() => localStorage.getItem(KEY) || "");
  const [autoSave, setAutoSave] = useState(true);
  useEffect(() => {
    if (autoSave) localStorage.setItem(KEY, text);
  }, [text, autoSave]);
  const lines = text.split("\n");
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-rose-600">行数</div>
          <div className="text-xl font-bold text-rose-700">{lines.length}</div>
        </div>
        <div className="rounded-2xl bg-indigo-50 border border-indigo-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-indigo-600">字符</div>
          <div className="text-xl font-bold text-indigo-700">{chars}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-emerald-600">词数</div>
          <div className="text-xl font-bold text-emerald-700">{words}</div>
        </div>
        <label className="ml-auto text-sm text-slate-600 flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoSave}
            onChange={(e) => setAutoSave(e.target.checked)}
          />
          自动保存到浏览器
        </label>
        <button
          onClick={() => {
            const blob = new Blob([text], { type: "text/plain" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "小白记事本.txt";
            a.click();
          }}
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold px-4 py-2 text-sm"
        >
          下载 TXT
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="在这里书写你的想法、灵感、待办……
快捷键：
Ctrl+S / Ctrl+Z / Ctrl+Y 均由浏览器原生支持"
          className="w-full h-[60vh] resize-none p-5 font-mono text-[15px] leading-7 focus:outline-none text-slate-800"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

// ===================== 画图工具（Canvas）=====================
function ToolPainter() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [tool, setTool] = useState<"pen" | "rect" | "ellipse" | "eraser" | "line">(
    "pen"
  );
  const [color, setColor] = useState("#ec4899");
  const [size, setSize] = useState(4);
  const drawing = useRef(false);
  const startPt = useRef<{ x: number; y: number } | null>(null);
  const snapshot = useRef<ImageData | null>(null);
  const history = useRef<ImageData[]>([]);

  // 初始化
  const sizeCanvas = () => {
    const c = canvasRef.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;
    const w = wrap.clientWidth;
    const h = Math.max(420, Math.min(640, wrap.clientWidth * 0.6));
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== w * dpr || c.height !== h * dpr) {
      const prev =
        c.width && c.height
          ? c.getContext("2d")?.getImageData(0, 0, c.width, c.height)
          : null;
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = w + "px";
      c.style.height = h + "px";
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      if (prev) ctx.putImageData(prev, 0, 0);
    }
  };
  useEffect(() => {
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);
    return () => window.removeEventListener("resize", sizeCanvas);
  }, []);

  const pushHistory = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const d = ctx.getImageData(0, 0, c.width, c.height);
    history.current.push(d);
    if (history.current.length > 30) history.current.shift();
  };
  const undo = () => {
    if (!history.current.length) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const img = history.current.pop()!;
    ctx.putImageData(img, 0, 0);
  };
  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    pushHistory();
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  };
  const save = () => {
    const c = canvasRef.current!;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "小白画板.png";
    a.click();
  };

  const pt = (e: React.MouseEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.MouseEvent) => {
    pushHistory();
    const ctx = canvasRef.current!.getContext("2d")!;
    drawing.current = true;
    startPt.current = pt(e);
    if (tool === "pen" || tool === "eraser") {
      ctx.strokeStyle = tool === "eraser" ? "#fff" : color;
      ctx.lineWidth = tool === "eraser" ? size * 3 : size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(startPt.current.x, startPt.current.y);
    } else {
      snapshot.current = ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    }
  };
  const move = (e: React.MouseEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pt(e);
    const s = startPt.current!;
    if (tool === "pen" || tool === "eraser") {
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      return;
    }
    if (snapshot.current) ctx.putImageData(snapshot.current, 0, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (tool === "line") {
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(p.x, p.y);
    } else if (tool === "rect") {
      ctx.strokeRect(s.x, s.y, p.x - s.x, p.y - s.y);
    } else if (tool === "ellipse") {
      const rx = Math.abs(p.x - s.x) / 2;
      const ry = Math.abs(p.y - s.y) / 2;
      const cx = (s.x + p.x) / 2;
      const cy = (s.y + p.y) / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  };
  const up = () => {
    drawing.current = false;
    snapshot.current = null;
  };

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {(["pen", "line", "rect", "ellipse", "eraser"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
              tool === t
                ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-transparent shadow-md"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t === "pen" ? "铅笔" : t === "line" ? "直线" : t === "rect" ? "矩形" : t === "ellipse" ? "椭圆" : "橡皮"}
          </button>
        ))}
        <div className="w-px h-8 bg-slate-200 mx-1" />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
          title="选择颜色"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          粗细
          <input
            type="range"
            min={1}
            max={40}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <span className="font-bold w-6 text-right">{size}</span>
        </label>
        <div className="ml-auto flex gap-2">
          <button
            onClick={undo}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 text-sm font-semibold"
          >
            撤销
          </button>
          <button
            onClick={clear}
            className="rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-2 text-sm font-semibold"
          >
            清空
          </button>
          <button
            onClick={save}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 text-sm font-semibold shadow-md"
          >
            导出 PNG
          </button>
        </div>
      </div>
      <div
        ref={wrapRef}
        className="rounded-2xl border-2 border-dashed border-pink-200 p-2 bg-pink-50/30"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={down}
          onMouseMove={move}
          onMouseUp={up}
          onMouseLeave={up}
          className="bg-white rounded-xl shadow-inner cursor-crosshair w-full block"
        />
      </div>
    </div>
  );
}

// ===================== 笑话 / 名言（随机内容库）=====================
const JOKES = [
  "为什么程序员喜欢黑色？因为彩色会让他们 Debug 出 bug。",
  "一只蜗牛爬上了苹果树，树上的毛毛虫问：你是谁？蜗牛骄傲地说：我是蜗牛，等我爬到顶，苹果就是我的了。毛毛虫淡定地说：兄弟，这是橘子树。",
  "小白今天不开心，因为它发现自己的「电量」还没手机耐用。",
  "「老板，你这个汤里有个蚊子！」「嘘——别声张，别人看到了都要加钱。」",
  "「你的狗为什么叫『木工』？」「因为它一看到木头就吠（费）。」",
  "学习就像追女孩：你以为付出就有回报，其实女孩子都叫你先去搞钱。",
  "小白今天学会了修电脑：它把电脑关机再开机，竟然成功了。",
  "「你知道吗？我昨天一晚上把《百年孤独》看完了。」「真牛！啥版本？」「豆瓣简介版。」",
];

const QUOTES = [
  "千里之行，始于足下。——《老子》",
  "真正的发现之旅，不在于寻找新大陆，而在于拥有新眼光。——普鲁斯特",
  "所有的大人都曾经是小孩，虽然只有少数的人记得。——《小王子》",
  "在你想要放弃的那一刻，想想为什么当初坚持走到了这里。——佚名",
  "世界上只有一种真正的英雄主义：认清生活的真相，并且依然热爱它。——罗曼·罗兰",
  "愿你出走半生，归来仍是少年。——苏轼《定风波》（化用）",
  "任何事情，到最后都会是好事。如果还不是好事，说明还没到最后。——佚名",
  "种一棵树最好的时间是十年前，其次是现在。——丹比萨·莫约",
];

function AiJoke() {
  const [idx, setIdx] = useState(0);
  const [likes, setLikes] = useState<Record<number, boolean>>({});
  const like = () => setLikes((m) => ({ ...m, [idx]: !m[idx] }));
  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-8 md:p-12 text-center">
      <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-br from-amber-300 to-orange-400 text-white text-5xl font-bold flex items-center justify-center shadow-xl shadow-amber-200">
        😂
      </div>
      <p className="mt-8 text-2xl md:text-3xl font-bold text-slate-800 leading-relaxed">
        {JOKES[idx]}
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => setIdx((i) => (i + 1) % JOKES.length)}
          className="rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold px-6 py-3 shadow-lg shadow-pink-200 hover:shadow-xl hover:brightness-105 flex items-center gap-2"
        >
          <Play className="w-5 h-5 fill-white/90" />
          换一个
        </button>
        <button
          onClick={like}
          className={`rounded-2xl px-5 py-3 font-bold shadow-md ${
            likes[idx]
              ? "bg-gradient-to-r from-rose-500 to-red-500 text-white"
              : "bg-white text-rose-600 border border-rose-200"
          }`}
        >
          {likes[idx] ? "❤️ 已收藏" : "🤍 收藏"}
        </button>
        <div className="text-sm text-slate-500">
          {Object.values(likes).filter(Boolean).length} 条收藏
        </div>
      </div>
    </div>
  );
}

function AiQuote() {
  const todayIdx = useMemo(() => {
    const d = new Date();
    const n = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return n % QUOTES.length;
  }, []);
  const [idx, setIdx] = useState(todayIdx);
  const share = () => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 450;
    const g = c.getContext("2d")!;
    const grd = g.createLinearGradient(0, 0, 800, 450);
    grd.addColorStop(0, "#fbcfe8");
    grd.addColorStop(1, "#fde68a");
    g.fillStyle = grd;
    g.fillRect(0, 0, 800, 450);
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.fillRect(50, 60, 700, 330);
    g.fillStyle = "#831843";
    g.font = "bold 32px system-ui,sans-serif";
    const text = QUOTES[idx];
    const parts = wrapLines(g, text, 680, 32);
    let y = 170;
    for (const p of parts) {
      g.fillText(p, 400 - g.measureText(p).width / 2, y);
      y += 48;
    }
    g.fillStyle = "#9d174d";
    g.font = "bold 18px system-ui";
    g.fillText("—— 小白每日名言", 80, 360);
    g.fillStyle = "#be185d";
    g.font = "bold 14px system-ui";
    g.fillText("Smart-Desktop-Pet-White", 80, 390);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "小白名言.png";
    a.click();
  };
  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-8 md:p-12 text-center">
      <div className="inline-block rounded-full bg-gradient-to-r from-rose-100 to-amber-100 px-5 py-2 text-sm font-semibold text-rose-700 border border-rose-200 mb-6">
        今日一句 · {new Date().toLocaleDateString()}
      </div>
      <blockquote className="text-2xl md:text-4xl font-bold text-slate-800 leading-relaxed max-w-2xl mx-auto">
        「{QUOTES[idx]}」
      </blockquote>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => setIdx(Math.floor(Math.random() * QUOTES.length))}
          className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold px-6 py-3 shadow-lg hover:shadow-xl"
        >
          🎲 随机一句
        </button>
        <button
          onClick={() => setIdx(todayIdx)}
          className="rounded-2xl bg-white text-slate-700 font-bold border border-slate-200 px-5 py-3"
        >
          📅 回到今日
        </button>
        <button
          onClick={share}
          className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-6 py-3 shadow-lg"
        >
          🖼 生成分享图
        </button>
      </div>
    </div>
  );
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  lineH: number
): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW) {
      lines.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  // 垂直居中调整：限制不超过 3 行，超出省略
  if (lines.length > 3) return [...lines.slice(0, 2), lines[2].slice(0, 14) + "…"];
  return lines;
  void lineH;
}

// ===================== 打地鼠 =====================
function GameWhack() {
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const [playing, setPlaying] = useState(false);
  const [mole, setMole] = useState<{ i: number; kind: "mole" | "gold" | "bomb" | "chick" } | null>(null);
  const [highScore, setHighScore] = useState<number>(() => getHighScore("game-whack"));
  const [showResult, setShowResult] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setTime((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [playing]);
  useEffect(() => {
    if (!playing) return;
    const pop = () => {
      const r = Math.random();
      const kind =
        r < 0.6 ? "mole" : r < 0.75 ? "gold" : r < 0.88 ? "chick" : "bomb";
      setMole({ i: Math.floor(Math.random() * 9), kind });
    };
    pop();
    const id = setInterval(pop, 750);
    return () => clearInterval(id);
  }, [playing]);
  useEffect(() => {
    if (playing && time <= 0) {
      setPlaying(false);
      setMole(null);
      const nr = updateHighScore("game-whack", score);
      setHighScore(getHighScore("game-whack"));
      setNewRecord(nr);
      setTimeout(() => setShowResult(true), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, playing]);

  const hit = (i: number) => {
    if (!playing || !mole || mole.i !== i) {
      if (playing) setMisses((m) => m + 1);
      return;
    }
    const s =
      mole.kind === "mole" ? 10 : mole.kind === "gold" ? 50 : mole.kind === "chick" ? 30 : -20;
    setScore((v) => Math.max(0, v + s));
    if (mole.kind !== "bomb") setHits((h) => h + 1);
    setMole(null);
  };

  const start = () => {
    setScore(0);
    setTime(30);
    setPlaying(true);
    setHits(0);
    setMisses(0);
    setShowResult(false);
    setNewRecord(false);
  };

  const styleOf = (i: number) => {
    if (!mole || mole.i !== i) return "bg-amber-700/80";
    return mole.kind === "bomb"
      ? "bg-black"
      : mole.kind === "gold"
      ? "bg-yellow-300"
      : mole.kind === "chick"
      ? "bg-amber-200"
      : "bg-rose-400";
  };
  const faceOf = (i: number) =>
    mole && mole.i === i
      ? mole.kind === "bomb"
        ? "💣"
        : mole.kind === "gold"
        ? "⭐"
        : mole.kind === "chick"
        ? "🐥"
        : "🐹"
      : "🕳";

  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-amber-700">分数</div>
          <div className="text-xl font-bold text-amber-800">{score}</div>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-rose-700">剩余</div>
          <div className="text-xl font-bold text-rose-700">{time}s</div>
        </div>
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-yellow-700">命中</div>
          <div className="text-xl font-bold text-yellow-800">{hits}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-amber-600">最佳</div>
          <div className="text-xl font-bold text-amber-700">{highScore}</div>
        </div>
        <button
          onClick={start}
          className="ml-auto rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold shadow-lg px-5 py-3 hover:shadow-xl transition-all"
        >
          {playing ? "重新开始" : time > 0 ? "开始游戏" : "再来一局"}
        </button>
      </div>

      <GameHintBar>
        <Hint>👆 点击冒出的角色得分（别点炸弹）</Hint>
        <Hint>🐹 普通 +10 · ⭐ 金鼠 +50 · 🐥 小鸡 +30 · 💣 炸弹 -20</Hint>
        <Hint>⏱️ 限时 30 秒，争取高分！</Hint>
      </GameHintBar>

      <div className="relative mx-auto max-w-md">
        <div className="grid grid-cols-3 gap-3 aspect-square">
          {Array.from({ length: 9 }).map((_, i) => (
            <button
              key={i}
              onClick={() => hit(i)}
              className={`rounded-3xl border-4 border-amber-900/80 ${styleOf(
                i
              )} text-4xl md:text-6xl transition-all shadow-inner active:scale-95 select-none`}
            >
              {faceOf(i)}
            </button>
          ))}
        </div>
        {showResult && (
          <GameResultOverlay
            title="时间到！挑战结束"
            success={score >= highScore && score > 0}
            stats={[
              { label: "本局得分", value: score },
              { label: "命中次数", value: hits },
              { label: "命中率", value: `${accuracy}%` },
            ]}
            highLabel="历史最高分"
            highScore={highScore}
            newRecord={newRecord}
            onRestart={start}
            primaryColor="from-yellow-500 to-amber-600"
          />
        )}
      </div>
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs md:text-sm text-center">
        <div className="rounded-xl bg-rose-50 border border-rose-200 py-2 text-rose-700 font-semibold">
          🐹 普通地鼠 +10
        </div>
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 py-2 text-yellow-700 font-semibold">
          ⭐ 金鼠 +50
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 py-2 text-amber-700 font-semibold">
          🐥 小鸡 +30
        </div>
        <div className="rounded-xl bg-slate-100 border border-slate-200 py-2 text-slate-700 font-semibold">
          💣 炸弹 -20
        </div>
      </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 扫雷 =====================
function GameMinesweeper() {
  const ROW = 10,
    COL = 10,
    MINES = 15;
  const [board, setBoard] = useState(() => makeBoard());
  const [revealed, setRevealed] = useState<boolean[][]>(() =>
    Array.from({ length: ROW }, () => Array(COL).fill(false))
  );
  const [flags, setFlags] = useState<boolean[][]>(() =>
    Array.from({ length: ROW }, () => Array(COL).fill(false))
  );
  const [game, setGame] = useState<"play" | "win" | "lose">("play");
  const [startTime] = useState<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => getHighScore("game-minesweeper"));
  const [showResult, setShowResult] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const resultTriggered = useRef(false);

  function makeBoard(): number[][] {
    const b = Array.from({ length: ROW }, () => Array(COL).fill(0));
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * ROW);
      const c = Math.floor(Math.random() * COL);
      if (b[r][c] !== -1) {
        b[r][c] = -1;
        placed++;
      }
    }
    for (let r = 0; r < ROW; r++)
      for (let c = 0; c < COL; c++) {
        if (b[r][c] === -1) continue;
        let k = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr,
              nc = c + dc;
            if (nr < 0 || nc < 0 || nr >= ROW || nc >= COL) continue;
            if (b[nr][nc] === -1) k++;
          }
        b[r][c] = k;
      }
    return b;
  }

  // 计时
  useEffect(() => {
    if (game !== "play") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500);
    return () => clearInterval(t);
  }, [game, startTime]);

  // 游戏结束触发最高分和浮层
  useEffect(() => {
    if (game === "play" || resultTriggered.current) return;
    resultTriggered.current = true;
    const finalScore =
      game === "win"
        ? Math.max(1, 10000 - Math.min(elapsed, 9999)) * 1
        : 0;
    const nr = updateHighScore("game-minesweeper", finalScore);
    setHighScore(getHighScore("game-minesweeper"));
    setNewRecord(nr);
    setTimeout(() => setShowResult(true), 400);
  }, [game, elapsed]);

  const reset = () => {
    setBoard(makeBoard());
    setRevealed(Array.from({ length: ROW }, () => Array(COL).fill(false)));
    setFlags(Array.from({ length: ROW }, () => Array(COL).fill(false)));
    setGame("play");
    setShowResult(false);
    setNewRecord(false);
    setElapsed(0);
    resultTriggered.current = false;
    // 由于 startTime 是 state，通过 key 重置比较麻烦；这里重新赋值用简单方式：
    startTime; // no-op
  };

  const reveal = (r: number, c: number) => {
    if (game !== "play" || revealed[r][c] || flags[r][c]) return;
    const rev = revealed.map((x) => x.slice());
    const stack: [number, number][] = [[r, c]];
    let lose = false;
    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (x < 0 || y < 0 || x >= ROW || y >= COL) continue;
      if (rev[x][y]) continue;
      rev[x][y] = true;
      if (board[x][y] === -1) {
        lose = true;
        continue;
      }
      if (board[x][y] === 0) {
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if (dr || dc) stack.push([x + dr, y + dc]);
      }
    }
    setRevealed(rev);
    if (lose) {
      setGame("lose");
    } else {
      let total = 0;
      for (let x = 0; x < ROW; x++)
        for (let y = 0; y < COL; y++) if (rev[x][y]) total++;
      if (total === ROW * COL - MINES) setGame("win");
    }
  };
  const flag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (game !== "play" || revealed[r][c]) return;
    const f = flags.map((x) => x.slice());
    f[r][c] = !f[r][c];
    setFlags(f);
  };
  const nums = [
    "",
    "text-blue-600",
    "text-green-600",
    "text-red-600",
    "text-indigo-800",
    "text-amber-800",
    "text-teal-700",
    "text-slate-800",
    "text-slate-600",
  ];
  const flagCount = flags.flat().filter(Boolean).length;
  const revealedCount = revealed.flat().filter(Boolean).length;

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-sky-700">剩余雷</div>
          <div className="text-xl font-bold text-sky-800">
            {MINES - flagCount}
          </div>
        </div>
        <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-blue-700">用时</div>
          <div className="text-xl font-bold text-blue-800">{elapsed}s</div>
        </div>
        <div className="rounded-2xl bg-indigo-50 border border-indigo-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-indigo-700">状态</div>
          <div className="text-xl font-bold text-indigo-800">
            {game === "play" ? "🙂" : game === "win" ? "😎" : "💥"}
          </div>
        </div>
        <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-sky-600">最佳</div>
          <div className="text-xl font-bold text-sky-700">{highScore}</div>
        </div>
        <button
          onClick={reset}
          className="ml-auto rounded-xl bg-gradient-to-r from-sky-500 to-blue-700 text-white font-semibold shadow-md px-4 py-2 text-sm"
        >
          重开
        </button>
      </div>

      <GameHintBar>
        <Hint>🖱️ 左键翻开格子</Hint>
        <Hint>🚩 右键（长按）插旗标雷</Hint>
        <Hint>📐 {ROW}×{COL} / {MINES} 雷，用时越短分越高</Hint>
      </GameHintBar>

      <div className="relative mx-auto max-w-md">
        <div
          className="grid gap-[3px] p-3 bg-slate-800 rounded-2xl relative"
          style={{ gridTemplateColumns: `repeat(${COL}, minmax(0,1fr))` }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {board.map((row, r) =>
            row.map((v, c) => {
              const show = revealed[r][c] || game === "lose";
              const isMine = v === -1;
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => reveal(r, c)}
                  onContextMenu={(e) => flag(e, r, c)}
                  className={`aspect-square rounded-md text-sm md:text-base font-extrabold select-none transition-all ${
                    show
                      ? isMine
                        ? game === "lose"
                          ? "bg-rose-500 text-white"
                          : "bg-slate-300"
                        : "bg-slate-100 " + nums[v]
                      : "bg-gradient-to-br from-sky-400 to-blue-500 text-white hover:brightness-110 active:scale-95"
                  }`}
                >
                  {flags[r][c] && !show
                    ? "🚩"
                    : show && isMine
                    ? "💣"
                    : show && v > 0
                    ? v
                    : ""}
                </button>
              );
            })
          )}
        </div>
        {showResult && (
          <GameResultOverlay
            title={game === "win" ? "🎉 成功排雷，通关！" : "💥 踩雷啦，挑战失败"}
            success={game === "win"}
            stats={[
              { label: "用时", value: `${elapsed} 秒` },
              { label: "已翻开", value: `${revealedCount}/${ROW * COL - MINES}` },
              { label: "插旗数", value: flagCount },
            ]}
            highLabel="历史最高得分"
            highScore={highScore}
            newRecord={newRecord}
            onRestart={reset}
            primaryColor="from-sky-500 to-blue-600"
          />
        )}
      </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 俄罗斯方块 =====================
function GameTetris() {
  const COLS = 10,
    ROWS = 20;
  const SHAPES: Record<string, number[][][]> = {
    I: [[[1, 1, 1, 1]], [[1], [1], [1], [1]]],
    O: [
      [
        [2, 2],
        [2, 2],
      ],
    ],
    T: [
      [
        [0, 3, 0],
        [3, 3, 3],
      ],
      [
        [3, 0],
        [3, 3],
        [3, 0],
      ],
      [
        [3, 3, 3],
        [0, 3, 0],
      ],
      [
        [0, 3],
        [3, 3],
        [0, 3],
      ],
    ],
    S: [
      [
        [0, 4, 4],
        [4, 4, 0],
      ],
      [
        [4, 0],
        [4, 4],
        [0, 4],
      ],
    ],
    Z: [
      [
        [5, 5, 0],
        [0, 5, 5],
      ],
      [
        [0, 5],
        [5, 5],
        [5, 0],
      ],
    ],
    J: [
      [
        [6, 0, 0],
        [6, 6, 6],
      ],
      [
        [6, 6],
        [6, 0],
        [6, 0],
      ],
      [
        [6, 6, 6],
        [0, 0, 6],
      ],
      [
        [0, 6],
        [0, 6],
        [6, 6],
      ],
    ],
    L: [
      [
        [0, 0, 7],
        [7, 7, 7],
      ],
      [
        [7, 0],
        [7, 0],
        [7, 6],
      ].map((r) => r.map((v) => (v === 6 ? 7 : v))),
      [
        [7, 7, 7],
        [7, 0, 0],
      ],
      [
        [7, 7],
        [0, 7],
        [0, 7],
      ],
    ],
  };
  const KEYS = Object.keys(SHAPES);
  const colorOf = (v: number) =>
    [
      "bg-slate-900/60",
      "bg-cyan-400",
      "bg-yellow-400",
      "bg-purple-500",
      "bg-green-400",
      "bg-rose-500",
      "bg-blue-500",
      "bg-orange-500",
    ][v] || "bg-slate-400";

  const [grid, setGrid] = useState<number[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );
  const [cur, setCur] = useState<{
    key: string;
    rot: number;
    x: number;
    y: number;
  } | null>(null);
  const [nextKey, setNextKey] = useState(KEYS[Math.floor(Math.random() * 7)]);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [over, setOver] = useState(false);
  const [tickMs, setTickMs] = useState(600);
  const [highScore, setHighScore] = useState<number>(() => getHighScore("game-tetris"));
  const [showResult, setShowResult] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const resultTriggered = useRef(false);

  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const touchTimer = useRef<number | null>(null);

  const spawn = () => {
    const key = nextKey;
    setNextKey(KEYS[Math.floor(Math.random() * 7)]);
    const rot = 0;
    const shape = SHAPES[key][rot];
    const x = Math.floor((COLS - shape[0].length) / 2);
    const y = 0;
    return { key, rot, x, y };
  };

  const finishGame = () => {
    if (resultTriggered.current) return;
    resultTriggered.current = true;
    const nr = updateHighScore("game-tetris", score);
    setHighScore(getHighScore("game-tetris"));
    setNewRecord(nr);
    setTimeout(() => setShowResult(true), 400);
  };

  useEffect(() => {
    if (over) finishGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  const reset = () => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setScore(0);
    setLines(0);
    setOver(false);
    setTickMs(600);
    setNextKey(KEYS[Math.floor(Math.random() * 7)]);
    setCur(spawn());
    setShowResult(false);
    setNewRecord(false);
    resultTriggered.current = false;
  };
  useEffect(() => {
    if (!cur && !over) setCur(spawn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const collide = (
    piece: { key: string; rot: number; x: number; y: number },
    g: number[][]
  ) => {
    const shape = SHAPES[piece.key][piece.rot];
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = piece.x + c,
          ny = piece.y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && g[ny][nx]) return true;
      }
    return false;
  };

  const lock = (
    piece: { key: string; rot: number; x: number; y: number },
    g: number[][]
  ) => {
    const shape = SHAPES[piece.key][piece.rot];
    const ng = g.map((r) => r.slice());
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) {
          const ny = piece.y + r,
            nx = piece.x + c;
          if (ny >= 0) ng[ny][nx] = shape[r][c];
        }
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (ng[r].every((v) => v)) {
        ng.splice(r, 1);
        ng.unshift(Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      const pts = [0, 100, 300, 500, 800][cleared] || 0;
      setScore((s) => s + pts);
      setLines((l) => {
        const nl = l + cleared;
        const lvl = Math.floor(nl / 10);
        setTickMs(Math.max(120, 600 - lvl * 50));
        return nl;
      });
    }
    return ng;
  };

  const move = (dx: number, dy: number) => {
    if (!cur || over) return false;
    const n = { ...cur, x: cur.x + dx, y: cur.y + dy };
    if (!collide(n, grid)) {
      setCur(n);
      return true;
    }
    return false;
  };
  const rotate = () => {
    if (!cur || over) return;
    const rots = SHAPES[cur.key].length;
    const n = { ...cur, rot: (cur.rot + 1) % rots };
    for (const kick of [0, -1, 1, -2, 2]) {
      const nk = { ...n, x: n.x + kick };
      if (!collide(nk, grid)) {
        setCur(nk);
        return;
      }
    }
  };
  const hardDrop = () => {
    if (!cur || over) return;
    let p = cur;
    while (!collide({ ...p, y: p.y + 1 }, grid)) p = { ...p, y: p.y + 1 };
    const ng = lock(p, grid);
    setGrid(ng);
    const np = spawn();
    if (collide(np, ng)) {
      setOver(true);
      setCur(null);
    } else setCur(np);
  };

  useEffect(() => {
    if (!cur || over) return;
    const id = setInterval(() => {
      const n = { ...cur, y: cur.y + 1 };
      if (collide(n, grid)) {
        const ng = lock(cur, grid);
        setGrid(ng);
        const np = spawn();
        if (collide(np, ng)) {
          setOver(true);
          setCur(null);
        } else setCur(np);
      } else setCur(n);
    }, tickMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, tickMs, over, grid]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") move(-1, 0);
      if (e.key === "ArrowRight") move(1, 0);
      if (e.key === "ArrowDown") move(0, 1);
      if (e.key === "ArrowUp") rotate();
      if (e.key === " ") {
        e.preventDefault();
        hardDrop();
      }
      if (e.key === "r" || e.key === "R") reset();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, grid, over]);

  const display = grid.map((r) => r.slice());
  if (cur) {
    const shape = SHAPES[cur.key][cur.rot];
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) {
          const ny = cur.y + r,
            nx = cur.x + c;
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS)
            display[ny][nx] = shape[r][c] || display[ny][nx];
        }
  }

  const nextShape = SHAPES[nextKey][0];
  const level = Math.floor(lines / 10) + 1;

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-violet-50 border border-violet-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-violet-700">得分</div>
          <div className="text-xl font-bold text-violet-800">{score}</div>
        </div>
        <div className="rounded-2xl bg-pink-50 border border-pink-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-pink-700">消行</div>
          <div className="text-xl font-bold text-pink-800">{lines}</div>
        </div>
        <div className="rounded-2xl bg-indigo-50 border border-indigo-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-indigo-700">等级</div>
          <div className="text-xl font-bold text-indigo-800">{level}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-slate-600">下一个</div>
          <div className="mt-1 grid gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${nextShape[0].length}, minmax(0,1fr))`, width: nextShape[0].length * 14 }}>
            {nextShape.flat().map((v, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${colorOf(v)}`} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-violet-50 border border-violet-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-violet-600">最佳</div>
          <div className="text-xl font-bold text-violet-700">{highScore}</div>
        </div>
        <button
          onClick={reset}
          className="ml-auto rounded-xl bg-gradient-to-r from-violet-500 to-indigo-700 text-white font-semibold shadow-md px-4 py-2 text-sm"
        >
          {over ? "再来一局" : "重新开始"}
        </button>
      </div>

      <GameHintBar>
        <Hint>⬅️➡️ 左右 · <Key k="↑" /> 旋转 · <Key k="↓" /> 软降</Hint>
        <Hint>⚡ <Key k="空格" /> 硬降 · <Key k="R" /> 重开</Hint>
        <Hint>📱 滑动移动 · 点击旋转 · 长按硬降</Hint>
      </GameHintBar>

      <div className="flex gap-4 justify-center items-start">
        <div className="relative">
          <div
            className="grid gap-[2px] p-2 rounded-2xl bg-slate-900 shadow-inner touch-none"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0,1fr))`, width: "min(90vw, 300px)" }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
              if (touchTimer.current) window.clearTimeout(touchTimer.current);
              touchTimer.current = window.setTimeout(() => {
                if (touchStart.current) {
                  hardDrop();
                  touchStart.current = null;
                }
              }, 350);
            }}
            onTouchMove={(e) => {
              const s = touchStart.current;
              if (!s) return;
              const t = e.touches[0];
              const dx = t.clientX - s.x;
              const dy = t.clientY - s.y;
              if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
              if (touchTimer.current) {
                window.clearTimeout(touchTimer.current);
                touchTimer.current = null;
              }
              if (Math.abs(dx) > Math.abs(dy)) {
                const steps = Math.sign(dx);
                if (move(steps, 0)) {
                  touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
                }
              } else {
                if (dy > 0) {
                  move(0, 1);
                  touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
                }
              }
            }}
            onTouchEnd={(e) => {
              if (touchTimer.current) {
                window.clearTimeout(touchTimer.current);
                touchTimer.current = null;
              }
              const s = touchStart.current;
              if (!s) return;
              const dur = Date.now() - s.t;
              const t = e.changedTouches[0];
              const dx = t.clientX - s.x;
              const dy = t.clientY - s.y;
              if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dur < 250) {
                rotate();
              }
              touchStart.current = null;
            }}
          >
            {display.map((row, r) =>
              row.map((v, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`aspect-square rounded-[2px] ${colorOf(v)}`}
                />
              ))
            )}
          </div>
          {showResult && (
            <GameResultOverlay
              title="方块堆满，游戏结束"
              success={false}
              stats={[
                { label: "本局得分", value: score },
                { label: "消除行数", value: lines },
                { label: "最终等级", value: level },
              ]}
              highLabel="历史最高分"
              highScore={highScore}
              newRecord={newRecord}
              onRestart={reset}
              primaryColor="from-indigo-500 to-violet-600"
            />
          )}
        </div>
        <div className="hidden md:flex flex-col gap-2 w-36">
          <div className="rounded-xl bg-slate-100 p-3 text-xs text-slate-700 leading-relaxed">
            ← → 左右
            <br />
            ↓ 软降 / ↑ 旋转
            <br />
            空格 硬降
            <br />
            R 重开
          </div>
          <div className="grid grid-cols-3 gap-1 mt-2">
            <div />
            <button onClick={rotate} className="rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-2 text-sm transition-all">↑</button>
            <div />
            <button onClick={() => move(-1, 0)} className="rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-2 text-sm transition-all">←</button>
            <button onClick={() => move(0, 1)} className="rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-2 text-sm transition-all">↓</button>
            <button onClick={() => move(1, 0)} className="rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-2 text-sm transition-all">→</button>
          </div>
          <button onClick={hardDrop} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold py-2">硬降</button>
        </div>
      </div>
      {/* 移动端按钮 */}
      <div className="mt-5 md:hidden">
        <div className="grid grid-cols-4 gap-2 max-w-[320px] mx-auto">
          <button onClick={() => move(-1, 0)} className="rounded-xl bg-indigo-100 hover:bg-indigo-200 active:bg-indigo-300 text-indigo-700 py-3 font-bold text-lg">←</button>
          <button onClick={rotate} className="rounded-xl bg-indigo-100 hover:bg-indigo-200 active:bg-indigo-300 text-indigo-700 py-3 font-bold text-lg">⟳</button>
          <button onClick={() => move(0, 1)} className="rounded-xl bg-indigo-100 hover:bg-indigo-200 active:bg-indigo-300 text-indigo-700 py-3 font-bold text-lg">↓</button>
          <button onClick={() => move(1, 0)} className="rounded-xl bg-indigo-100 hover:bg-indigo-200 active:bg-indigo-300 text-indigo-700 py-3 font-bold text-lg">→</button>
        </div>
        <button onClick={hardDrop} className="mt-2 w-full max-w-[320px] mx-auto block rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold py-2.5">硬降（空格）</button>
      </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 文本分析 =====================
function AiTextAnalysis() {
  const demo = `各位同学大家好，我是小白，来自尚志中学 809 班的徐慎同学。
今天非常高兴和大家分享一下我的好朋友「智能桌面宠物小白」。
小白不仅能陪你聊天，还会帮你整理桌面、提醒你写作业，甚至会在你学习累的时候跳一段舞给你看。
希望大家能够喜欢这只会长大、会学习、会陪伴的桌面小狗狗 🐕！`;
  const [text, setText] = useState(demo);
  const analyze = () => {
    const cleaned = text;
    const chars = cleaned.length;
    const charsNoSpace = cleaned.replace(/\s/g, "").length;
    const lines = cleaned.length ? cleaned.split("\n").length : 0;
    const paragraphs = cleaned.split(/\n\s*\n/).filter((p) => p.trim()).length;
    const words = cleaned.trim() ? cleaned.trim().split(/[\s,，。.!！?？;；:：、]+/).filter(Boolean).length : 0;
    // 简易中文 top10（2-4字切片，按字符频率近似关键词）
    const freq = new Map<string, number>();
    for (let i = 0; i < cleaned.length - 1; i++) {
      const key = cleaned.slice(i, i + 2);
      if (/[\u4e00-\u9fa5]{2}/.test(key)) {
        freq.set(key, (freq.get(key) || 0) + 1);
      }
    }
    const top = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    // 简易情感：正面词 vs 负面词
    const pos = ["高兴", "喜欢", "希望", "分享", "学习", "陪", "智能", "好"];
    const neg = ["累", "难", "不喜欢", "糟糕", "哭", "烦", "讨厌"];
    let p = 0,
      n = 0;
    for (const w of pos) p += cleaned.split(w).length - 1;
    for (const w of neg) n += cleaned.split(w).length - 1;
    const s = p + n;
    const posRatio = s === 0 ? 50 : Math.round((p / s) * 100);
    const neuRatio = s === 0 ? 100 : Math.round(((s - (p > n ? p : n)) / s) * 100);
    const negRatio = 100 - posRatio - neuRatio;
    const summary = cleaned.length > 60 ? cleaned.slice(0, 60) + "…" : cleaned;
    return { chars, charsNoSpace, lines, paragraphs, words, top, posRatio, negRatio, neuRatio, summary };
  };
  const a = analyze();
  const maxTop = Math.max(1, ...a.top.map((t) => t[1]));
  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-2xl bg-indigo-50 border border-indigo-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-indigo-700">字符</div>
          <div className="text-xl font-bold text-indigo-800">{a.chars}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-emerald-700">字符(去空格)</div>
          <div className="text-xl font-bold text-emerald-800">{a.charsNoSpace}</div>
        </div>
        <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-sky-700">行数</div>
          <div className="text-xl font-bold text-sky-800">{a.lines}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-amber-700">段落</div>
          <div className="text-xl font-bold text-amber-800">{a.paragraphs}</div>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-rose-700">词数</div>
          <div className="text-xl font-bold text-rose-800">{a.words}</div>
        </div>
        <button
          onClick={() => setText("")}
          className="ml-auto rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 text-sm font-semibold"
        >
          清空
        </button>
        <button
          onClick={() => setText(demo)}
          className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white px-3 py-2 text-sm font-semibold shadow-md"
        >
          载入示例
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="粘贴你的文本，我们将自动进行统计分析……"
        className="w-full rounded-2xl border border-slate-200 p-5 font-mono text-[15px] leading-7 focus:outline-none focus:border-pink-400"
      />

      <div className="grid md:grid-cols-3 gap-5">
        <section className="rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-100 p-5">
          <h3 className="font-bold text-slate-800 mb-3">Top 10 双字高频</h3>
          <div className="space-y-2">
            {a.top.length === 0 && <div className="text-sm text-slate-500">暂无中文内容</div>}
            {a.top.map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 text-sm">
                <span className="font-bold text-slate-800 w-14 shrink-0">「{k}」</span>
                <div className="flex-1 h-3 rounded-full bg-white overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-pink-500"
                    style={{ width: `${(v / maxTop) * 100}%` }}
                  />
                </div>
                <span className="font-semibold text-slate-600 w-8 text-right">{v}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-5">
          <h3 className="font-bold text-slate-800 mb-3">情感倾向</h3>
          <div className="space-y-2">
            {[
              { name: "积极", v: a.posRatio, c: "from-emerald-400 to-teal-500" },
              { name: "中性", v: a.neuRatio, c: "from-slate-300 to-slate-500" },
              { name: "消极", v: a.negRatio, c: "from-rose-400 to-red-500" },
            ].map((row) => (
              <div key={row.name} className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-slate-700">{row.name}</span>
                  <span className="text-slate-600">{row.v}%</span>
                </div>
                <div className="h-3 rounded-full bg-white overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${row.c}`}
                    style={{ width: `${row.v}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5">
          <h3 className="font-bold text-slate-800 mb-3">自动摘要（前 N 字）</h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {a.summary || "（暂无内容）"}
          </p>
        </section>
      </div>
    </div>
  );
}

// ===================== 闹钟 / 倒计时 / 番茄钟 =====================
function ToolAlarm() {
  const [tab, setTab] = useState<"alarm" | "cd" | "pomo">("alarm");
  const [alarmH, setAlarmH] = useState(7);
  const [alarmM, setAlarmM] = useState(30);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [fired, setFired] = useState(false);
  const [now, setNow] = useState(new Date());

  const [cdH, setCdH] = useState(0);
  const [cdM, setCdM] = useState(1);
  const [cdS, setCdS] = useState(0);
  const [cdRunning, setCdRunning] = useState(false);
  const [cdTotal, setCdTotal] = useState(0);
  const [cdLeft, setCdLeft] = useState(0);

  const [pomo, setPomo] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoLeft, setPomoLeft] = useState(25 * 60);
  const [pomoPhase, setPomoPhase] = useState<"work" | "rest" | "long">("work");
  const [pomoRound, setPomoRound] = useState(1);

  // 当前时间
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNow(n);
      if (
        alarmEnabled &&
        !fired &&
        n.getHours() === alarmH &&
        n.getMinutes() === alarmM &&
        n.getSeconds() === 0
      ) {
        setFired(true);
      }
    }, 500);
    return () => clearInterval(id);
  }, [alarmEnabled, fired, alarmH, alarmM]);

  // 倒计时
  useEffect(() => {
    if (!cdRunning) return;
    const id = setInterval(() => {
      setCdLeft((x) => {
        if (x <= 1) {
          setCdRunning(false);
          beep();
          return 0;
        }
        return x - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cdRunning]);

  // 番茄钟
  useEffect(() => {
    if (!pomoRunning) return;
    const id = setInterval(() => {
      setPomoLeft((x) => {
        if (x <= 1) {
          beep();
          // 进入下一个阶段
          if (pomoPhase === "work") {
            const nextPhase: "rest" | "long" = pomoRound % 4 === 0 ? "long" : "rest";
            const mins = nextPhase === "long" ? 15 : 5;
            setPomoPhase(nextPhase);
            return mins * 60;
          } else {
            const next = pomoPhase === "long" ? 1 : pomoRound + 1;
            setPomoRound(next);
            setPomoPhase("work");
            return 25 * 60;
          }
        }
        return x - 1;
      });
    }, 1000);
    return () => clearInterval(id);
     
  }, [pomoRunning, pomoPhase, pomoRound]);

  const beep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.type = "triangle";
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) { /* 刻意忽略已知可恢复异常 */ }
  };
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8 space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["alarm", "闹钟"],
            ["cd", "倒计时"],
            ["pomo", "番茄钟"],
          ] as const
        ).map(([k, t]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-5 py-2 rounded-xl font-semibold border ${
              tab === k
                ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white border-transparent shadow-md"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto text-slate-600 text-sm flex items-center gap-2">
          当前：
          <span className="font-mono font-bold text-slate-800 text-lg">
            {now.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {tab === "alarm" && (
        <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 p-6 border border-rose-100">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              小时
              <input
                type="number"
                min={0}
                max={23}
                value={alarmH}
                onChange={(e) => setAlarmH(clamp(Number(e.target.value) || 0, 0, 23))}
                className="rounded-xl border border-slate-200 w-24 px-3 py-2 text-2xl font-bold focus:border-rose-400 outline-none"
              />
            </label>
            <div className="text-3xl font-bold text-slate-400 pb-2">:</div>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              分钟
              <input
                type="number"
                min={0}
                max={59}
                value={alarmM}
                onChange={(e) => setAlarmM(clamp(Number(e.target.value) || 0, 0, 59))}
                className="rounded-xl border border-slate-200 w-24 px-3 py-2 text-2xl font-bold focus:border-rose-400 outline-none"
              />
            </label>
            <button
              onClick={() => {
                setAlarmEnabled(!alarmEnabled);
                if (!alarmEnabled) setFired(false);
              }}
              className={`rounded-xl px-6 py-3 font-bold shadow-md ${
                alarmEnabled
                  ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {alarmEnabled ? "关闭闹钟" : "开启闹钟"}
            </button>
          </div>
          <div className="mt-4 text-sm text-slate-600">
            闹钟将在每日
            <span className="font-mono font-bold mx-1 text-rose-600">
              {String(alarmH).padStart(2, "0")}:{String(alarmM).padStart(2, "0")}
            </span>
            触发（页面需保持打开）
          </div>
          {fired && (
            <div className="mt-5 rounded-2xl bg-gradient-to-r from-amber-200 to-rose-200 border-2 border-rose-400 p-5 animate-pulse flex items-center gap-4">
              <div className="text-5xl">⏰</div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-rose-700">闹钟响了！</div>
                <div className="text-slate-700 mt-1">该起来做点什么啦～</div>
              </div>
              <button
                onClick={() => setFired(false)}
                className="rounded-xl bg-white text-rose-600 font-bold px-5 py-3 shadow-md border border-rose-300"
              >
                知道了
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "cd" && (
        <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 p-6 border border-sky-100">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              时
              <input
                type="number"
                min={0}
                max={23}
                value={cdH}
                onChange={(e) => setCdH(clamp(Number(e.target.value) || 0, 0, 23))}
                disabled={cdRunning}
                className="rounded-xl border border-slate-200 w-24 px-3 py-2 text-2xl font-bold"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              分
              <input
                type="number"
                min={0}
                max={59}
                value={cdM}
                onChange={(e) => setCdM(clamp(Number(e.target.value) || 0, 0, 59))}
                disabled={cdRunning}
                className="rounded-xl border border-slate-200 w-24 px-3 py-2 text-2xl font-bold"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              秒
              <input
                type="number"
                min={0}
                max={59}
                value={cdS}
                onChange={(e) => setCdS(clamp(Number(e.target.value) || 0, 0, 59))}
                disabled={cdRunning}
                className="rounded-xl border border-slate-200 w-24 px-3 py-2 text-2xl font-bold"
              />
            </label>
            <button
              onClick={() => {
                if (cdRunning) {
                  setCdRunning(false);
                } else {
                  const t = cdLeft > 0 ? cdLeft : cdH * 3600 + cdM * 60 + cdS;
                  setCdTotal(cdTotal || t);
                  setCdLeft(t);
                  setCdRunning(true);
                }
              }}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold px-6 py-3 shadow-md"
            >
              {cdRunning ? "暂停" : "开始"}
            </button>
            <button
              onClick={() => {
                setCdRunning(false);
                setCdLeft(0);
                setCdTotal(0);
              }}
              className="rounded-xl bg-slate-100 text-slate-700 font-bold px-5 py-3"
            >
              重置
            </button>
          </div>
          <div className="mt-6">
            <div className="text-center text-7xl md:text-8xl font-black font-mono text-slate-800 tracking-tight">
              {fmt(cdLeft)}
            </div>
            {cdTotal > 0 && (
              <div className="mt-6 h-4 rounded-full bg-white overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-indigo-600 transition-all"
                  style={{ width: `${((cdTotal - cdLeft) / cdTotal) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "pomo" && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-6 border border-emerald-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-white px-4 py-2 border border-emerald-200">
              <div className="text-[11px] text-emerald-700 font-semibold">当前阶段</div>
              <div className="text-lg font-bold text-emerald-800">
                {pomoPhase === "work"
                  ? `专注（第 ${pomoRound} 轮）`
                  : pomoPhase === "rest"
                  ? "短休息 5 分钟"
                  : "长休息 15 分钟"}
              </div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-2 border border-slate-200">
              <div className="text-[11px] text-slate-500 font-semibold">完成轮次</div>
              <div className="text-lg font-bold text-slate-800">{pomoRound - (pomoPhase === "work" ? 1 : 0)} / 4</div>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => {
                  setPomoRunning((r) => !r);
                }}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-6 py-3 shadow-md"
              >
                {pomoRunning ? "暂停" : "开始"}
              </button>
              <button
                onClick={() => {
                  setPomoRunning(false);
                  setPomoPhase("work");
                  setPomoRound(1);
                  setPomoLeft(25 * 60);
                }}
                className="rounded-xl bg-slate-100 text-slate-700 font-bold px-5 py-3"
              >
                重置
              </button>
            </div>
          </div>
          <div className="mt-6 text-center text-7xl md:text-8xl font-black font-mono text-emerald-800">
            {fmt(pomoLeft)}
          </div>
          <div className="mt-6 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`rounded-xl h-3 ${
                  i < pomoRound
                    ? "bg-emerald-500"
                    : i === pomoRound && pomoPhase === "work"
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500 animate-pulse"
                    : "bg-white border border-slate-200"
                }`}
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-600 text-center leading-relaxed">
            经典番茄工作法：25 分钟专注 → 5 分钟短休息 × 3 → 15 分钟长休息。
          </p>
          <div className="mt-2">
            {void pomo}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== 五子棋 =====================
/**
 * 15x15 五子棋，支持双人对战、人机对战（简单AI）、悔棋
 */
function GameGomoku() {
  const SIZE = 13;
  const [board, setBoard] = useState<("B" | "W" | null)[][]>(() =>
    Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  );
  const [turn, setTurn] = useState<"B" | "W">("B");
  const [mode, setMode] = useState<"pvp" | "pve">("pvp");
  const [history, setHistory] = useState<[number, number][]>([]);
  const [winner, setWinner] = useState<"B" | "W" | null>(null);
  const [highScore, setHighScore] = useState<number>(() => getHighScore("game-gomoku"));
  const [showResult, setShowResult] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const resultTriggered = useRef(false);

  const restart = () => {
    setBoard(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)));
    setTurn("B");
    setHistory([]);
    setWinner(null);
    setShowResult(false);
    setNewRecord(false);
    resultTriggered.current = false;
  };

  // 赢家出现触发最高分
  useEffect(() => {
    if (!winner || resultTriggered.current) return;
    resultTriggered.current = true;
    const steps = history.length;
    // 胜场得分：胜者基础分 1000 + 步数越少越高
    const finalScore = 0; // 占位：此处可接入具体游戏评分公式（P3 迭代）
    const nr = updateHighScore("game-gomoku", finalScore);
    setHighScore(getHighScore("game-gomoku"));
    setNewRecord(nr);
    setTimeout(() => setShowResult(true), 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  const checkWin = (b: ("B" | "W" | null)[][], r: number, c: number, p: "B" | "W") => {
    const dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let i = 1; i < 5; i++) {
        const nr = r + dr * i,
          nc = c + dc * i;
        if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) break;
        if (b[nr][nc] !== p) break;
        count++;
      }
      for (let i = 1; i < 5; i++) {
        const nr = r - dr * i,
          nc = c - dc * i;
        if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) break;
        if (b[nr][nc] !== p) break;
        count++;
      }
      if (count >= 5) return true;
    }
    return false;
  };

  const evalPattern = (
    b: ("B" | "W" | null)[][],
    r: number,
    c: number,
    dr: number,
    dc: number,
    p: "B" | "W"
  ): number => {
    let count = 1;
    let leftOpen = false;
    let rightOpen = false;
    let leftSkip = false;
    let rightSkip = false;
    let i = 1;
    while (true) {
      const nr = r - dr * i, nc = c - dc * i;
      if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) break;
      if (b[nr][nc] === p) count++;
      else if (b[nr][nc] === null) {
        leftOpen = true;
        const nr2 = r - dr * (i + 1), nc2 = c - dc * (i + 1);
        if (nr2 >= 0 && nc2 >= 0 && nr2 < SIZE && nc2 < SIZE && b[nr2][nc2] === p) {
          leftSkip = true;
          count++;
        }
        break;
      } else break;
      i++;
    }
    i = 1;
    while (true) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) break;
      if (b[nr][nc] === p) count++;
      else if (b[nr][nc] === null) {
        rightOpen = true;
        const nr2 = r + dr * (i + 1), nc2 = c + dc * (i + 1);
        if (nr2 >= 0 && nc2 >= 0 && nr2 < SIZE && nc2 < SIZE && b[nr2][nc2] === p) {
          rightSkip = true;
          count++;
        }
        break;
      } else break;
      i++;
    }
    if (count >= 5) return 10000000;
    const bothOpen = leftOpen && rightOpen;
    const oneOpen = leftOpen || rightOpen;
    if (count === 4) {
      if (bothOpen && !leftSkip && !rightSkip) return 100000;
      return 10000;
    }
    if (count === 3) {
      if (bothOpen && !leftSkip && !rightSkip) return 5000;
      if (oneOpen || leftSkip || rightSkip) return 500;
      return 0;
    }
    if (count === 2) {
      if (bothOpen && !leftSkip && !rightSkip) return 200;
      if (oneOpen) return 50;
      return 0;
    }
    if (count === 1 && bothOpen) return 10;
    return 0;
  };

  const scorePos = (b: ("B" | "W" | null)[][], r: number, c: number, p: "B" | "W"): number => {
    const clone = b.map((x) => x.slice());
    clone[r][c] = p;
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    let s = 0;
    for (const [dr, dc] of dirs) s += evalPattern(clone, r, c, dr, dc, p);
    return s;
  };

  const aiMove = (b: ("B" | "W" | null)[][]): [number, number] | null => {
    let best: [number, number] | null = null;
    let bestScore = -1;
    const hasStone = b.some((row) => row.some((v) => v !== null));
    if (!hasStone) return [Math.floor(SIZE / 2), Math.floor(SIZE / 2)] as [number, number];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c]) continue;
        let near = false;
        outer: for (let dr = -2; dr <= 2; dr++)
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) continue;
            if (b[nr][nc]) { near = true; break outer; }
          }
        if (!near) continue;
        const attack = scorePos(b, r, c, "W") * 1.05;
        const defend = scorePos(b, r, c, "B") * 1.0;
        const s = attack + defend;
        if (s > bestScore) {
          bestScore = s;
          best = [r, c];
        }
      }
    return best;
  };

  const place = (r: number, c: number) => {
    if (board[r][c] || winner) return;
    const nb = board.map((x) => x.slice());
    nb[r][c] = turn;
    setBoard(nb);
    const newHistory: [number, number][] = [...history, [r, c] as [number, number]];
    setHistory(newHistory);
    if (checkWin(nb, r, c, turn)) {
      setWinner(turn);
      return;
    }
    const next = turn === "B" ? "W" : "B";
    setTurn(next);
    if (mode === "pve" && next === "W") {
      setTimeout(() => {
        const mv = aiMove(nb);
        if (mv) {
          const [ar, ac] = mv;
          const nb2 = nb.map((x) => x.slice());
          nb2[ar][ac] = "W";
          setBoard(nb2);
          setHistory((h) => [...h, mv]);
          if (checkWin(nb2, ar, ac, "W")) setWinner("W");
          else setTurn("B");
        }
      }, 250);
    }
  };

  const undo = () => {
    if (!history.length || winner) return;
    const popCount = mode === "pve" && history.length >= 2 ? 2 : 1;
    const nh = history.slice(0, -popCount);
    const nb = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    nh.forEach(([r, c], i) => (nb[r][c] = i % 2 === 0 ? "B" : "W"));
    setBoard(nb);
    setHistory(nh);
    setTurn(nh.length % 2 === 0 ? "B" : "W");
    setWinner(null);
  };

  const steps = history.length;
  const isDraw = !winner && steps >= SIZE * SIZE;

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-neutral-50 border border-neutral-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-neutral-600">当前</div>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full ${turn === "B" ? "bg-neutral-900" : "bg-white border-2 border-neutral-400"}`} />
            <span className="font-bold">{turn === "B" ? "黑方" : "白方"}</span>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-slate-600">步数</div>
          <div className="text-xl font-bold">{steps}</div>
        </div>
        <div className="rounded-2xl bg-stone-50 border border-stone-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-stone-600">最佳</div>
          <div className="text-xl font-bold text-stone-700">{highScore}</div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setMode(mode === "pvp" ? "pve" : "pvp");
              restart();
            }}
            className="rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2 text-sm hover:bg-slate-50"
          >
            {mode === "pvp" ? "双人对战" : "人机对战"}
          </button>
          <button
            onClick={undo}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 text-sm"
          >
            悔棋
          </button>
          <button
            onClick={restart}
            className="rounded-xl bg-gradient-to-r from-neutral-700 to-neutral-900 text-white font-semibold px-4 py-2 text-sm"
          >
            重开
          </button>
        </div>
      </div>

      <GameHintBar>
        <Hint>⚫ 黑先 · ⚪ 白后，先连成 5 子获胜</Hint>
        <Hint>👆 点击网格交叉点落子</Hint>
        <Hint>📊 步数越少，得分越高</Hint>
      </GameHintBar>

      <div className="relative mx-auto aspect-square max-w-[540px]">
        <div
          className="w-full h-full rounded-2xl p-3 bg-gradient-to-br from-amber-100 to-yellow-200 shadow-inner"
        >
          <div
            className="w-full h-full grid relative"
            style={{
              gridTemplateColumns: `repeat(${SIZE}, minmax(0,1fr))`,
              gridTemplateRows: `repeat(${SIZE}, minmax(0,1fr))`,
            }}
          >
            {board.map((row, r) =>
              row.map((v, c) => {
                const isStar =
                  (r === 3 && c === 3) ||
                  (r === 3 && c === SIZE - 4) ||
                  (r === SIZE - 4 && c === 3) ||
                  (r === SIZE - 4 && c === SIZE - 4) ||
                  (r === Math.floor(SIZE / 2) && c === Math.floor(SIZE / 2));
                const last =
                  history.length > 0 &&
                  history[history.length - 1][0] === r &&
                  history[history.length - 1][1] === c;
                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => place(r, c)}
                    className="relative flex items-center justify-center"
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="absolute bg-neutral-700/60"
                        style={{
                          height: 1,
                          left: c === 0 ? "50%" : 0,
                          right: c === SIZE - 1 ? "50%" : 0,
                          top: "50%",
                        }}
                      />
                      <div
                        className="absolute bg-neutral-700/60"
                        style={{
                          width: 1,
                          top: r === 0 ? "50%" : 0,
                          bottom: r === SIZE - 1 ? "50%" : 0,
                          left: "50%",
                        }}
                      />
                      {isStar && (
                        <div className="w-2 h-2 rounded-full bg-neutral-700/70 relative z-10" />
                      )}
                    </div>
                    {v && (
                      <div
                        className={`relative z-20 rounded-full w-[80%] h-[80%] shadow-md ${
                          v === "B"
                            ? "bg-gradient-to-br from-neutral-700 to-black"
                            : "bg-gradient-to-br from-white to-neutral-200 border border-neutral-300"
                        } ${last ? "ring-2 ring-rose-400" : ""}`}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
        {showResult && winner && (
          <GameResultOverlay
            title={`🎉 ${winner === "B" ? "黑方" : "白方"}获胜！`}
            success={winner === "B"}
            stats={[
              { label: "胜者", value: winner === "B" ? "黑方 ⚫" : "白方 ⚪" },
              { label: "总步数", value: steps },
              { label: "模式", value: mode === "pvp" ? "双人对战" : "人机对战" },
            ]}
            highLabel="历史最高得分"
            highScore={highScore}
            newRecord={newRecord}
            onRestart={restart}
            primaryColor="from-neutral-600 to-stone-800"
          />
        )}
      </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 华容道 =====================
/**
 * 经典华容道滑块：横刀立马开局
 */
function GameKlotski() {
  type Piece = { w: number; h: number; x: number; y: number; id: string; name: string; cls: string };
  const initPieces: Piece[] = [
    { w: 2, h: 2, x: 1, y: 0, id: "caocao", name: "曹", cls: "bg-gradient-to-br from-rose-500 to-red-700 text-white" },
    { w: 1, h: 2, x: 0, y: 0, id: "zhangfei", name: "张", cls: "bg-gradient-to-br from-amber-400 to-orange-600 text-white" },
    { w: 1, h: 2, x: 3, y: 0, id: "zhaoyun", name: "赵", cls: "bg-gradient-to-br from-amber-400 to-orange-600 text-white" },
    { w: 1, h: 2, x: 0, y: 2, id: "machao", name: "马", cls: "bg-gradient-to-br from-amber-400 to-orange-600 text-white" },
    { w: 1, h: 2, x: 3, y: 2, id: "huangzhong", name: "黄", cls: "bg-gradient-to-br from-amber-400 to-orange-600 text-white" },
    { w: 2, h: 1, x: 1, y: 2, id: "guanyu", name: "关羽", cls: "bg-gradient-to-br from-emerald-500 to-green-700 text-white" },
    { w: 1, h: 1, x: 0, y: 4, id: "s1", name: "兵", cls: "bg-slate-300 text-slate-800" },
    { w: 1, h: 1, x: 1, y: 3, id: "s2", name: "兵", cls: "bg-slate-300 text-slate-800" },
    { w: 1, h: 1, x: 2, y: 3, id: "s3", name: "兵", cls: "bg-slate-300 text-slate-800" },
    { w: 1, h: 1, x: 3, y: 4, id: "s4", name: "兵", cls: "bg-slate-300 text-slate-800" },
  ];
  const COLS = 4;
  const ROWS = 5;
  const [pieces, setPieces] = useState<Piece[]>(() => initPieces.map((p) => ({ ...p })));
  const [steps, setSteps] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const startTimeRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => getHighScore("game-klotski"));
  const [showResult, setShowResult] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const resultTriggered = useRef(false);
  const [tickKey, setTickKey] = useState(0);

  const restart = () => {
    setPieces(initPieces.map((p) => ({ ...p })));
    setSteps(0);
    setSelected(null);
    setWon(false);
    setElapsed(0);
    setShowResult(false);
    setNewRecord(false);
    resultTriggered.current = false;
    startTimeRef.current = Date.now();
    setTickKey((k) => k + 1);
  };

  // 计时 tick
  useEffect(() => {
    if (won) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [tickKey, won]);

  // 通关触发最高分
  useEffect(() => {
    if (!won || resultTriggered.current) return;
    const finalScore = 0; // 占位：此处可接入具体游戏评分公式（P3 迭代）
    resultTriggered.current = true;
    const nr = updateHighScore("game-klotski", finalScore);
    setHighScore(getHighScore("game-klotski"));
    setNewRecord(nr);
    setTimeout(() => setShowResult(true), 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const occupied = (ps: Piece[]) => {
    const m: string[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
    for (const p of ps)
      for (let dy = 0; dy < p.h; dy++)
        for (let dx = 0; dx < p.w; dx++) m[p.y + dy][p.x + dx] = p.id;
    return m;
  };

  const tryMove = (dir: "up" | "down" | "left" | "right") => {
    if (!selected || won) return;
    const idx = pieces.findIndex((p) => p.id === selected);
    if (idx < 0) return;
    const p = pieces[idx];
    const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    const nx = p.x + dx;
    const ny = p.y + dy;
    if (nx < 0 || ny < 0 || nx + p.w > COLS || ny + p.h > ROWS) return;
    const others = pieces.filter((q) => q.id !== p.id);
    const m = occupied(others);
    for (let i = 0; i < p.h; i++)
      for (let j = 0; j < p.w; j++) {
        if (m[ny + i][nx + j]) return;
      }
    const np = pieces.slice();
    np[idx] = { ...p, x: nx, y: ny };
    setPieces(np);
    setSteps((s) => s + 1);
    if (p.id === "caocao" && nx === 1 && ny === 3) setWon(true);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { e.preventDefault(); tryMove("up"); }
      if (e.key === "ArrowDown") { e.preventDefault(); tryMove("down"); }
      if (e.key === "ArrowLeft") { e.preventDefault(); tryMove("left"); }
      if (e.key === "ArrowRight") { e.preventDefault(); tryMove("right"); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, pieces, won]);

  const mmss = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-rose-600">步数</div>
          <div className="text-xl font-bold text-rose-700">{steps}</div>
        </div>
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-red-600">用时</div>
          <div className="text-xl font-bold text-red-700 tabular-nums">{mmss(elapsed)}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-amber-600">最优参考</div>
          <div className="text-xl font-bold text-amber-700">81 步</div>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-rose-600">最佳得分</div>
          <div className="text-xl font-bold text-rose-700">{highScore}</div>
        </div>
        <button
          onClick={restart}
          className="ml-auto rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold px-4 py-2 text-sm shadow-md"
        >
          重开
        </button>
      </div>

      <GameHintBar>
        <Hint>👆 点击方块选中（高亮为选中）</Hint>
        <Hint>方向键 <Key k="←" /><Key k="→" /><Key k="↑" /><Key k="↓" /> 移动</Hint>
        <Hint>🎯 将【曹】移至底部出口通关</Hint>
        <Hint>📊 步数越少，得分越高</Hint>
      </GameHintBar>

      <div className="flex gap-5 items-start justify-center flex-wrap">
        <div className="relative">
          <div className="relative rounded-2xl p-4 bg-gradient-to-br from-amber-200 to-yellow-300 shadow-xl">
            <div
              className="grid gap-1 bg-amber-900/60 p-2 rounded-xl"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 70px)`,
                gridTemplateRows: `repeat(${ROWS}, 70px)`,
              }}
            >
              {pieces.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  style={{
                    gridColumnStart: p.x + 1,
                    gridColumnEnd: `span ${p.w}`,
                    gridRowStart: p.y + 1,
                    gridRowEnd: `span ${p.h}`,
                  }}
                  className={`rounded-xl font-black text-2xl shadow-md flex items-center justify-center transition-all ${p.cls} ${
                    selected === p.id ? "ring-4 ring-rose-400 scale-[1.02]" : "hover:brightness-110"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-2 w-[146px] h-4 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400 rounded-b-xl text-white text-xs text-center font-bold">
              出口
            </div>
          </div>
          {showResult && won && (
            <GameResultOverlay
              title="🎉 华容道通关！"
              success={true}
              stats={[
                { label: "总步数", value: steps },
                { label: "用时", value: mmss(elapsed) },
                { label: "最优参考", value: "81 步" },
              ]}
              highLabel="历史最高得分"
              highScore={highScore}
              newRecord={newRecord}
              onRestart={restart}
              primaryColor="from-rose-500 to-red-700"
            />
          )}
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 w-56 space-y-3">
          <div className="text-sm text-slate-600">
            先点击方块选中（高亮=选中），再用方向键或下方按钮移动，将【曹】移至底部出口。
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div />
            <button
              onClick={() => tryMove("up")}
              className="rounded-xl bg-slate-200 hover:bg-slate-300 py-3 font-bold active:scale-95 transition"
            >
              ↑
            </button>
            <div />
            <button
              onClick={() => tryMove("left")}
              className="rounded-xl bg-slate-200 hover:bg-slate-300 py-3 font-bold active:scale-95 transition"
            >
              ←
            </button>
            <button
              onClick={() => tryMove("down")}
              className="rounded-xl bg-slate-200 hover:bg-slate-300 py-3 font-bold active:scale-95 transition"
            >
              ↓
            </button>
            <button
              onClick={() => tryMove("right")}
              className="rounded-xl bg-slate-200 hover:bg-slate-300 py-3 font-bold active:scale-95 transition"
            >
              →
            </button>
          </div>
        </div>
      </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== Pong 对打球 =====================
function GamePong() {
  const W = 600;
  const H = 400;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    ly: H / 2 - 40,
    ry: H / 2 - 40,
    bx: W / 2,
    by: H / 2,
    bvx: 4,
    bvy: 3,
    ls: 0,
    rs: 0,
    running: false,
    winner: null as null | "L" | "R",
    highScore: 0,
    newRecord: false,
  });
  const [, force] = useState(0);
  const [mode, setMode] = useState<"pvp" | "pve">("pve");
  const keysRef = useRef<Record<string, boolean>>({});
  const [showResult, setShowResult] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  const restart = () => {
    const s = stateRef.current;
    s.ls = 0;
    s.rs = 0;
    s.ly = H / 2 - 40;
    s.ry = H / 2 - 40;
    s.bx = W / 2;
    s.by = H / 2;
    s.bvx = (Math.random() < 0.5 ? -1 : 1) * 4;
    s.bvy = (Math.random() - 0.5) * 6;
    s.running = true;
    s.winner = null;
    s.newRecord = false;
    setShowResult(false);
    setHighScore(getHighScore("game-pong"));
    setNewRecord(false);
    force((x) => x + 1);
  };

  const finishGame = () => {
    const s = stateRef.current;
    const score = mode === "pve" ? (s.winner === "L" ? s.ls - s.rs : s.rs - s.ls) : s.ls - s.rs;
    const nr = updateHighScore("game-pong", Math.max(0, score));
    s.newRecord = nr;
    s.highScore = getHighScore("game-pong");
    setHighScore(s.highScore);
    setNewRecord(nr);
    setTimeout(() => setShowResult(true), 400);
  };

  useEffect(() => {
    restart();
    const down = (e: KeyboardEvent) => (keysRef.current[e.key.toLowerCase()] = true);
    const up = (e: KeyboardEvent) => (keysRef.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let raf = 0;
    let finishedFired = false;
    const loop = () => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d")!;
        const s = stateRef.current;
        if (keysRef.current["w"]) s.ly -= 6;
        if (keysRef.current["s"]) s.ly += 6;
        if (mode === "pvp") {
          if (keysRef.current["arrowup"]) s.ry -= 6;
          if (keysRef.current["arrowdown"]) s.ry += 6;
        } else {
          const target = s.by - 40;
          s.ry += clamp(target - s.ry, -4.5, 4.5);
        }
        s.ly = clamp(s.ly, 0, H - 80);
        s.ry = clamp(s.ry, 0, H - 80);
        if (s.running) {
          s.bx += s.bvx;
          s.by += s.bvy;
          if (s.by < 8) s.bvy = Math.abs(s.bvy);
          if (s.by > H - 8) s.bvy = -Math.abs(s.bvy);
          if (s.bx < 32 && s.bx > 18 && s.by > s.ly && s.by < s.ly + 80) {
            s.bvx = Math.abs(s.bvx) * 1.05;
            s.bvy += ((s.by - (s.ly + 40)) / 40) * 2;
          }
          if (s.bx > W - 32 && s.bx < W - 18 && s.by > s.ry && s.by < s.ry + 80) {
            s.bvx = -Math.abs(s.bvx) * 1.05;
            s.bvy += ((s.by - (s.ry + 40)) / 40) * 2;
          }
          if (s.bx < 0) {
            s.rs++;
            s.running = s.rs < 7;
            if (!s.running) s.winner = "R";
            s.bx = W / 2;
            s.by = H / 2;
            s.bvx = -4;
            s.bvy = (Math.random() - 0.5) * 6;
          }
          if (s.bx > W) {
            s.ls++;
            s.running = s.ls < 7;
            if (!s.running) s.winner = "L";
            s.bx = W / 2;
            s.by = H / 2;
            s.bvx = 4;
            s.bvy = (Math.random() - 0.5) * 6;
          }
          if (!s.running && !finishedFired) {
            finishedFired = true;
            finishGame();
          }
        } else if (s.winner && !finishedFired) {
          finishedFired = true;
          finishGame();
        }
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#22d3ee";
        ctx.fillRect(10, s.ly, 12, 80);
        ctx.fillStyle = "#f472b6";
        ctx.fillRect(W - 22, s.ry, 12, 80);
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.arc(s.bx, s.by, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "bold 48px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(String(s.ls), W / 4, 70);
        ctx.fillText(String(s.rs), (W * 3) / 4, 70);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const movePad = (side: "L" | "R", dir: -1 | 1, pressed: boolean) => {
    if (side === "L") {
      keysRef.current["w"] = pressed && dir === -1;
      keysRef.current["s"] = pressed && dir === 1;
    } else {
      keysRef.current["arrowup"] = pressed && dir === -1;
      keysRef.current["arrowdown"] = pressed && dir === 1;
    }
  };

  const s = stateRef.current;
  const leftWin = s.winner === "L";
  const rightLabel = mode === "pvp" ? "右方" : "电脑";
  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-cyan-50 border border-cyan-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-cyan-600">左方（W/S）</div>
          <div className="text-xl font-bold text-cyan-700">{s.ls}</div>
        </div>
        <div className="rounded-2xl bg-pink-50 border border-pink-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-pink-600">
            {mode === "pvp" ? "右方（↑↓）" : "电脑 AI"}
          </div>
          <div className="text-xl font-bold text-pink-700">{s.rs}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-emerald-600">最高分</div>
          <div className="text-xl font-bold text-emerald-700">{highScore}</div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setMode((m) => (m === "pvp" ? "pve" : "pvp"));
              setTimeout(restart, 50);
            }}
            className="rounded-xl bg-white border border-slate-200 text-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            {mode === "pvp" ? "双人" : "人机"}
          </button>
          <button
            onClick={restart}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold px-4 py-2 text-sm shadow-md"
          >
            重开
          </button>
        </div>
      </div>

      <GameHintBar>
        <Hint>1P 左板 <Key k="W" /><Key k="S" /> 上下</Hint>
        {mode === "pvp" ? (
          <Hint>2P 右板 <Key k="↑" /><Key k="↓" /> 上下</Hint>
        ) : (
          <Hint>🤖 右板由 AI 操作</Hint>
        )}
        <Hint>🎯 先到 7 分获胜</Hint>
        <Hint>📱 下方触控按钮</Hint>
      </GameHintBar>

      <div className="mx-auto max-w-[640px] relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded-2xl shadow-2xl aspect-[3/2]"
        />
        {showResult && (
          <GameResultOverlay
            title={leftWin ? "左方获胜！" : `${rightLabel}获胜！`}
            success={mode === "pve" ? leftWin : true}
            stats={[
              { label: "左方得分", value: s.ls },
              { label: `${rightLabel}得分`, value: s.rs },
              { label: "净胜分", value: Math.abs(s.ls - s.rs) },
            ]}
            highLabel="最高分（净胜）"
            highScore={highScore}
            newRecord={newRecord}
            onRestart={restart}
            primaryColor="from-green-500 to-emerald-600"
          />
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-6 max-w-lg mx-auto select-none">
        <div>
          <div className="text-center text-xs font-semibold text-cyan-700 mb-2">1P 左板</div>
          <div className="grid grid-cols-1 gap-2">
            <button
              onMouseDown={() => movePad("L", -1, true)}
              onMouseUp={() => movePad("L", -1, false)}
              onMouseLeave={() => movePad("L", -1, false)}
              onTouchStart={(e) => { e.preventDefault(); movePad("L", -1, true); }}
              onTouchEnd={(e) => { e.preventDefault(); movePad("L", -1, false); }}
              className="rounded-xl bg-cyan-100 hover:bg-cyan-200 active:bg-cyan-300 text-cyan-700 py-3 font-bold text-lg transition-all"
            >
              ↑
            </button>
            <button
              onMouseDown={() => movePad("L", 1, true)}
              onMouseUp={() => movePad("L", 1, false)}
              onMouseLeave={() => movePad("L", 1, false)}
              onTouchStart={(e) => { e.preventDefault(); movePad("L", 1, true); }}
              onTouchEnd={(e) => { e.preventDefault(); movePad("L", 1, false); }}
              className="rounded-xl bg-cyan-100 hover:bg-cyan-200 active:bg-cyan-300 text-cyan-700 py-3 font-bold text-lg transition-all"
            >
              ↓
            </button>
          </div>
        </div>
        {mode === "pvp" && (
          <div>
            <div className="text-center text-xs font-semibold text-pink-700 mb-2">2P 右板</div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onMouseDown={() => movePad("R", -1, true)}
                onMouseUp={() => movePad("R", -1, false)}
                onMouseLeave={() => movePad("R", -1, false)}
                onTouchStart={(e) => { e.preventDefault(); movePad("R", -1, true); }}
                onTouchEnd={(e) => { e.preventDefault(); movePad("R", -1, false); }}
                className="rounded-xl bg-pink-100 hover:bg-pink-200 active:bg-pink-300 text-pink-700 py-3 font-bold text-lg transition-all"
              >
                ↑
              </button>
              <button
                onMouseDown={() => movePad("R", 1, true)}
                onMouseUp={() => movePad("R", 1, false)}
                onMouseLeave={() => movePad("R", 1, false)}
                onTouchStart={(e) => { e.preventDefault(); movePad("R", 1, true); }}
                onTouchEnd={(e) => { e.preventDefault(); movePad("R", 1, false); }}
                className="rounded-xl bg-pink-100 hover:bg-pink-200 active:bg-pink-300 text-pink-700 py-3 font-bold text-lg transition-all"
              >
                ↓
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 推箱子 =====================
/**
 * 推箱子：多关卡，方向键移动小人推箱子到目标点（箱子入目标后消失，目标点可复用）
 */
function GameSokoban() {
  // # 墙  . 目标  @ 人  $ 箱  * 箱在目标  + 人在目标
  const LEVELS = [
    [
      "#######",
      "#     #",
      "# .$. #",
      "# $@$ #",
      "# ... #",
      "#     #",
      "#######",
    ],
    [
      "  #####  ",
      "###   ###",
      "#  $ $  #",
      "# #.@.# #",
      "#  $ $  #",
      "###   ###",
      "  #####  ",
    ],
    [
      "########",
      "#      #",
      "# .**. #",
      "# $  $ #",
      "# .  . #",
      "#  @   #",
      "########",
    ],
    [
      "  ####   ",
      "###  ####",
      "#  $ $  #",
      "# .#@#. #",
      "#  $ $  #",
      "####  ###",
      "   ####  ",
    ],
  ];

  const countTargets = (level: string[]): number => {
    let n = 0;
    for (const row of level) for (const ch of row) if (ch === "." || ch === "*" || ch === "+") n++;
    return n;
  };

  const [lvl, setLvl] = useState(0);
  const [grid, setGrid] = useState<string[][]>(() => {
    const initial = LEVELS[0].map((r) => r.split(""));
    return initial;
  });
  const [steps, setSteps] = useState(0);
  const [completedGoals, setCompletedGoals] = useState(0);
  const [totalTargets, setTotalTargets] = useState(() => countTargets(LEVELS[0]));
  const [history, setHistory] = useState<{ grid: string[][]; completedGoals: number }[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [highScore, setHighScore] = useState(() => getHighScore("game-sokoban"));
  const [newRecord, setNewRecord] = useState(false);

  const load = (i: number) => {
    setLvl(i);
    const raw = LEVELS[i];
    setTotalTargets(countTargets(raw));
    let initialCompleted = 0;
    const parsed: string[][] = raw.map((row) =>
      row.split("").map((ch) => {
        if (ch === "*") {
          initialCompleted++;
          return ".";
        }
        return ch;
      })
    );
    setGrid(parsed);
    setCompletedGoals(initialCompleted);
    setSteps(0);
    setHistory([]);
    setShowResult(false);
    setNewRecord(false);
    setHighScore(getHighScore("game-sokoban"));
  };
  const restart = () => load(lvl);
  const won = () => completedGoals >= totalTargets;

  useEffect(() => {
    if (won() && !showResult) {
      const score = Math.max(0, 10000 - steps);
      const nr = updateHighScore("game-sokoban", score);
      setHighScore(getHighScore("game-sokoban"));
      setNewRecord(nr);
      setTimeout(() => setShowResult(true), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedGoals, totalTargets]);

  const findMan = (g: string[][]) => {
    for (let y = 0; y < g.length; y++)
      for (let x = 0; x < g[y].length; x++)
        if (g[y][x] === "@" || g[y][x] === "+") return { x, y, onGoal: g[y][x] === "+" };
    return { x: 0, y: 0, onGoal: false };
  };

  const move = (dx: number, dy: number) => {
    if (won()) return;
    const g = grid.map((r) => r.slice());
    const man = findMan(g);
    const nx = man.x + dx;
    const ny = man.y + dy;
    while (ny >= g.length) g.push(Array(nx + 1).fill(" "));
    while (nx >= g[ny].length) g[ny].push(" ");
    const target = g[ny][nx];
    if (target === "#") return;
    const isBox = target === "$";
    let addedCompleted = 0;
    if (isBox) {
      const bx = nx + dx;
      const by = ny + dy;
      while (by >= g.length) g.push(Array(bx + 1).fill(" "));
      while (bx >= g[by].length) g[by].push(" ");
      const next = g[by][bx];
      if (next === "#" || next === "$") return;
      if (next === ".") {
        g[by][bx] = ".";
        addedCompleted = 1;
      } else {
        g[by][bx] = "$";
      }
      g[ny][nx] = " ";
    } else if (target !== " " && target !== ".") {
      return;
    }
    g[man.y][man.x] = man.onGoal ? "." : " ";
    const curTarget = g[ny][nx];
    g[ny][nx] = curTarget === "." ? "+" : "@";
    setHistory((h) => [...h, { grid, completedGoals }]);
    setGrid(g);
    if (addedCompleted > 0) setCompletedGoals((cg) => cg + addedCompleted);
    setSteps((s) => s + 1);
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setGrid(prev.grid);
    setCompletedGoals(prev.completedGoals);
    setSteps((s) => Math.max(0, s - 1));
  };

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { e.preventDefault(); move(0, -1); }
      if (e.key === "ArrowDown") { e.preventDefault(); move(0, 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); move(-1, 0); }
      if (e.key === "ArrowRight") { e.preventDefault(); move(1, 0); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") undo();
      if (e.key.toLowerCase() === "r") restart();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, history, completedGoals]);

  const rows = grid.length;
  const cols = Math.max(...grid.map((r) => r.length));
  const win = won();
  const score = Math.max(0, 10000 - steps);
  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-amber-700">关卡</div>
          <div className="text-xl font-bold text-amber-800">
            {lvl + 1} / {LEVELS.length}
          </div>
        </div>
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-yellow-700">步数</div>
          <div className="text-xl font-bold text-yellow-800">{steps}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-emerald-700">已完成</div>
          <div className="text-xl font-bold text-emerald-800">{completedGoals} / {totalTargets}</div>
        </div>
        <div className="rounded-2xl bg-orange-50 border border-orange-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-orange-700">最高分</div>
          <div className="text-xl font-bold text-orange-800">{highScore}</div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          <select
            value={lvl}
            onChange={(e) => load(Number(e.target.value))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
          >
            {LEVELS.map((_, i) => (
              <option key={i} value={i}>
                第 {i + 1} 关
              </option>
            ))}
          </select>
          <button
            onClick={undo}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 text-sm"
          >
            撤销
          </button>
          <button
            onClick={restart}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-700 text-white font-semibold px-4 py-2 text-sm shadow-md"
          >
            重开
          </button>
        </div>
      </div>

      <GameHintBar>
        <Hint>方向键 <Key k="↑" /><Key k="↓" /><Key k="←" /><Key k="→" /> 移动</Hint>
        <Hint>撤销 <Key k="Ctrl" />+<Key k="Z" /></Hint>
        <Hint>重开本关 <Key k="R" /></Hint>
        <Hint>🎯 把 📦 推到 · 目标点</Hint>
        <Hint>📱 下方方向按键</Hint>
      </GameHintBar>

      <div className="mx-auto max-w-lg relative">
        <div className="rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 p-4 shadow-inner">
          <div
            className="grid mx-auto gap-[2px] w-max"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
            }}
          >
            {Array.from({ length: rows }).flatMap((_, y) =>
              Array.from({ length: cols }).map((__, x) => {
                const ch = grid[y]?.[x] || " ";
                let cls = "bg-stone-200/40 ";
                let inner = "";
                if (ch === "#") cls += "bg-stone-700 rounded shadow-inner";
                else if (ch === ".") {
                  cls += "bg-amber-100 rounded-full";
                  inner = "·";
                } else if (ch === "@") {
                  cls += "bg-sky-500 rounded-full shadow";
                  inner = "🙂";
                } else if (ch === "+") {
                  cls += "bg-sky-600 rounded-full ring-2 ring-amber-400 shadow";
                  inner = "🙂";
                } else if (ch === "$") {
                  cls += "bg-yellow-600 rounded shadow";
                  inner = "📦";
                }
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-lg font-bold ${cls}`}
                  >
                    {inner}
                  </div>
                );
              })
            )}
          </div>
        </div>
        {showResult && (
          <GameResultOverlay
            title={`第 ${lvl + 1} 关通过！`}
            success={true}
            stats={[
              { label: "本局步数", value: steps },
              { label: "本局分数", value: score },
              { label: "当前关卡", value: `${lvl + 1}/${LEVELS.length}` },
            ]}
            highLabel="最高分（10000-步数）"
            highScore={highScore}
            newRecord={newRecord}
            onRestart={restart}
            primaryColor="from-amber-500 to-yellow-700"
          />
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 max-w-[220px] mx-auto select-none">
        <div />
        <button onClick={() => move(0, -1)} className="rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 py-3 font-bold text-amber-800 text-lg transition-all">↑</button>
        <div />
        <button onClick={() => move(-1, 0)} className="rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 py-3 font-bold text-amber-800 text-lg transition-all">←</button>
        <button onClick={() => move(0, 1)} className="rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 py-3 font-bold text-amber-800 text-lg transition-all">↓</button>
        <button onClick={() => move(1, 0)} className="rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 py-3 font-bold text-amber-800 text-lg transition-all">→</button>
      </div>

      {win && !showResult && lvl < LEVELS.length - 1 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => load(lvl + 1)}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold px-5 py-2.5 shadow-md hover:shadow-lg transition-all"
          >
            下一关 →
          </button>
        </div>
      )}
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 数独 =====================
/**
 * 数独 9x9：4档难度、候选标记、检查、求解器
 */
function GameSudoku() {
  type Board = (number | null)[][];
  const SIZE = 9;

  const fullSolve = (): Board => {
    const b: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    const fill = (idx: number): boolean => {
      if (idx === 81) return true;
      const r = Math.floor(idx / 9);
      const c = idx % 9;
      const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
      for (const n of nums) {
        let ok = true;
        for (let i = 0; i < 9; i++) if (b[r][i] === n || b[i][c] === n) { ok = false; break; }
        if (!ok) continue;
        const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3 && ok; i++)
          for (let j = 0; j < 3; j++) if (b[br + i][bc + j] === n) { ok = false; break; }
        if (!ok) continue;
        b[r][c] = n;
        if (fill(idx + 1)) return true;
        b[r][c] = null;
      }
      return false;
    };
    fill(0);
    return b;
  };

  const difficulties = { 简单: 40, 中等: 50, 困难: 56, 专家: 62 };
  const diffCoeff: Record<keyof typeof difficulties, number> = { 简单: 1, 中等: 2, 困难: 3, 专家: 4 };
  const [diff, setDiff] = useState<keyof typeof difficulties>("简单");
  const [puzzle, setPuzzle] = useState<Board>([]);
  const [board, setBoard] = useState<Board>([]);
  const [cands, setCands] = useState<Set<number>[][]>([]);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [note, setNote] = useState(false);
  const [mistakes, setMistakes] = useState<Set<string>>(new Set());
  const [won, setWon] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [highScore, setHighScore] = useState(() => getHighScore("game-sudoku"));
  const [newRecord, setNewRecord] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const startTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    startRef.current = Date.now();
    setSeconds(0);
    timerRef.current = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const generate = (d: keyof typeof difficulties) => {
    const sol = fullSolve();
    const puz = sol.map((r) => r.slice());
    const remove = difficulties[d];
    const indices = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < remove; i++) {
      const r = Math.floor(indices[i] / 9);
      const c = indices[i] % 9;
      puz[r][c] = null;
    }
    setPuzzle(puz);
    setBoard(puz.map((r) => r.slice()));
    setCands(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>())));
    setSel(null);
    setMistakes(new Set());
    setWon(false);
    setShowResult(false);
    setNewRecord(false);
    setDiff(d);
    setHighScore(getHighScore("game-sudoku"));
    startTimer();
  };

  useEffect(() => { generate("简单"); return () => stopTimer(); }, []);

  useEffect(() => {
    if (won) {
      stopTimer();
      const coeff = diffCoeff[diff];
      const finalSecs = Math.floor((Date.now() - startRef.current) / 1000);
      const score = Math.max(0, (10000 - finalSecs) * coeff);
      const nr = updateHighScore("game-sudoku", score);
      setHighScore(getHighScore("game-sudoku"));
      setNewRecord(nr);
      setTimeout(() => setShowResult(true), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const checkWin = (b: Board) => {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        if (b[r][c] == null) return false;
      }
    const set9 = new Set([1,2,3,4,5,6,7,8,9]);
    for (let i = 0; i < 9; i++) {
      if (new Set(b[i]).size !== 9 || new Set(b.map((r) => r[i])).size !== 9) return false;
      const br = Math.floor(i / 3) * 3, bc = (i % 3) * 3;
      const s = new Set<number>();
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) if (b[br+dr][bc+dc] != null) s.add(b[br+dr][bc+dc]!);
      if (s.size !== 9) return false;
      void set9;
    }
    return true;
  };

  const place = (n: number) => {
    if (!sel || won) return;
    const [r, c] = sel;
    if (puzzle[r][c] != null) return;
    const nb = board.map((x) => x.slice());
    const nc = cands.map((row) => row.map((s) => new Set(s)));
    if (note) {
      if (n === 0) nc[r][c].clear();
      else if (nc[r][c].has(n)) nc[r][c].delete(n);
      else nc[r][c].add(n);
      setCands(nc);
    } else {
      nb[r][c] = n === 0 ? null : n;
      nc[r][c].clear();
      setBoard(nb);
      const m = new Set<string>();
      for (let rr = 0; rr < 9; rr++)
        for (let cc = 0; cc < 9; cc++) {
          const v = nb[rr][cc];
          if (v == null) continue;
          for (let i = 0; i < 9; i++) {
            if (i !== cc && nb[rr][i] === v) m.add(`${rr}-${cc}`);
            if (i !== rr && nb[i][cc] === v) m.add(`${rr}-${cc}`);
          }
          const br = Math.floor(rr / 3) * 3, bc = Math.floor(cc / 3) * 3;
          for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
            if ((br+dr !== rr || bc+dc !== cc) && nb[br+dr][bc+dc] === v) m.add(`${rr}-${cc}`);
          }
        }
      setMistakes(m);
      if (m.size === 0 && checkWin(nb)) setWon(true);
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (/^[1-9]$/.test(e.key)) place(Number(e.key));
      if (e.key === "0" || e.key === "Backspace" || e.key === "Delete") place(0);
      if (sel) {
        let [r, c] = sel;
        if (e.key === "ArrowUp") r = (r + 8) % 9;
        if (e.key === "ArrowDown") r = (r + 1) % 9;
        if (e.key === "ArrowLeft") c = (c + 8) % 9;
        if (e.key === "ArrowRight") c = (c + 1) % 9;
        if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
          e.preventDefault();
          setSel([r, c]);
        }
      }
      if (e.key.toLowerCase() === "n") setNote((n) => !n);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, note, board]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const finalSecs = seconds;
  // 数独评分：基础 2000 × 难度倍数 - 用时/2 - 失误×80
  const diffLevel = Object.keys(difficulties).indexOf(diff) + 1;
  const finalScore = Math.max(0, diffLevel * 800 - Math.floor(seconds / 2) - mistakes.size * 80);
  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-teal-50 border border-teal-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-teal-700">难度</div>
          <div className="text-xl font-bold text-teal-800">{diff}</div>
        </div>
        <div className="rounded-2xl bg-cyan-50 border border-cyan-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-cyan-700">用时</div>
          <div className="text-xl font-bold text-cyan-800 font-mono">{mm}:{ss}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-emerald-700">最高分</div>
          <div className="text-xl font-bold text-emerald-800">{highScore}</div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap items-center">
          <select
            value={diff}
            onChange={(e) => generate(e.target.value as keyof typeof difficulties)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
          >
            {Object.keys(difficulties).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <button
            onClick={() => setNote((n) => !n)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ${
              note ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white" : "bg-white border border-slate-200 text-slate-700"
            }`}
          >
            {note ? "✏️ 笔记模式" : "🔢 填数模式"}(N)
          </button>
          <button
            onClick={() => generate(diff)}
            className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold px-4 py-2 text-sm shadow-md"
          >
            新一局
          </button>
        </div>
      </div>

      <GameHintBar>
        <Hint>点击格子选中，数字键 <Key k="1" />-<Key k="9" /> 填数</Hint>
        <Hint>方向键 <Key k="↑" /><Key k="↓" /><Key k="←" /><Key k="→" /> 移动光标</Hint>
        <Hint>候选笔记 <Key k="N" /> 切换</Hint>
        <Hint>清除 <Key k="Backspace" /> / <Key k="0" /></Hint>
      </GameHintBar>

      <div className="mx-auto max-w-[500px] relative">
        <div className="grid grid-cols-9 aspect-square rounded-2xl overflow-hidden border-4 border-slate-800 shadow-xl">
          {board.map((row, r) =>
            row.map((v, c) => {
              const fixed = puzzle[r]?.[c] != null;
              const selected = sel && sel[0] === r && sel[1] === c;
              const same = sel && (sel[0] === r || sel[1] === c || (Math.floor(sel[0]/3) === Math.floor(r/3) && Math.floor(sel[1]/3) === Math.floor(c/3)));
              const sameVal = sel && board[sel[0]][sel[1]] != null && board[sel[0]][sel[1]] === v && v != null;
              const err = mistakes.has(`${r}-${c}`);
              const thickR = r === 2 || r === 5;
              const thickC = c === 2 || c === 5;
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => setSel([r, c])}
                  className={`relative flex items-center justify-center text-xl md:text-2xl font-bold transition-colors ${
                    thickR ? "border-b-[3px] border-slate-800" : "border-b border-slate-300"
                  } ${thickC ? "border-r-[3px] border-slate-800" : "border-r border-slate-300"} ${
                    err ? "bg-rose-100 text-rose-700" :
                    selected ? "bg-cyan-200" :
                    sameVal ? "bg-cyan-100" :
                    same ? "bg-cyan-50" :
                    "bg-white hover:bg-slate-50"
                  } ${fixed ? "text-slate-900" : "text-blue-700"}`}
                >
                  {v != null ? v : (
                    <div className="grid grid-cols-3 w-full h-full text-[9px] md:text-[10px] text-slate-500 p-[2px] gap-0">
                      {[1,2,3,4,5,6,7,8,9].map((n) => (
                        <div key={n} className="flex items-center justify-center">
                          {cands[r][c]?.has(n) ? n : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
        {showResult && (
          <GameResultOverlay
            title="数独完成！"
            success={true}
            stats={[
              { label: "用时", value: `${mm}:${ss}` },
              { label: "本局分数", value: finalScore },
              { label: "难度系数", value: `×${diffCoeff[diff]}` },
            ]}
            highLabel="最高分"
            highScore={highScore}
            newRecord={newRecord}
            onRestart={() => generate(diff)}
            primaryColor="from-teal-400 to-cyan-600"
          />
        )}
      </div>
      <div className="mt-5 grid grid-cols-10 gap-2 max-w-[500px] mx-auto">
        {[1,2,3,4,5,6,7,8,9].map((n) => (
          <button
            key={n}
            onClick={() => place(n)}
            className="aspect-square rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 hover:from-teal-100 hover:to-cyan-200 text-slate-800 font-black text-xl shadow-sm active:scale-95 transition"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => place(0)}
          className="aspect-square rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 hover:from-rose-200 hover:to-rose-300 text-rose-700 font-black shadow-sm active:scale-95 transition"
          title="清除"
        >
          ✕
        </button>
      </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 连连看 =====================
/**
 * 连连看：相同图案通过 ≤2 个转折点路径连接消除
 */
function GameLianLian() {
  const COLS = 10;
  const ROWS = 8;
  const TOTAL_TIME = 180;
  const MAX_HINTS = 10;
  const SYMBOLS = ["🍎","🍌","🍇","🍓","🍊","🍉","🍒","🍑","🥝","🍍","🥥","🥭"];
  type Cell = { sym: string | null; id: number };
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [hint, setHint] = useState<[[number,number],[number,number]] | null>(null);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(TOTAL_TIME);
  const [playing, setPlaying] = useState(true);
  const [won, setWon] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [pairsFound, setPairsFound] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [highScore, setHighScore] = useState(() => getHighScore("game-lianliankan"));
  const [newRecord, setNewRecord] = useState(false);
  const resultFired = useRef(false);

  const finishGame = (success: boolean) => {
    if (resultFired.current) return;
    resultFired.current = true;
    const finalScore = 0; // 占位：此处可接入具体游戏评分公式（P3 迭代）
    if (success) {
      const remainingHints = Math.max(0, MAX_HINTS - hintsUsed);
      const nr = updateHighScore("game-lianliankan", finalScore);
      setHighScore(getHighScore("game-lianliankan"));
      setNewRecord(nr);
    }
    setTimeout(() => setShowResult(true), 300);
  };

  const newGame = () => {
    resultFired.current = false;
    const total = ROWS * COLS;
    const pairs = total / 2;
    const arr: string[] = [];
    for (let i = 0; i < pairs; i++) {
      const s = SYMBOLS[i % SYMBOLS.length];
      arr.push(s, s);
    }
    arr.sort(() => Math.random() - 0.5);
    const g: Cell[][] = [];
    let id = 0;
    for (let r = 0; r < ROWS; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < COLS; c++) row.push({ sym: arr[id], id: id++ });
      g.push(row);
    }
    setGrid(g);
    setSel(null);
    setHint(null);
    setScore(0);
    setTime(TOTAL_TIME);
    setPlaying(true);
    setWon(false);
    setHintsUsed(0);
    setPairsFound(0);
    setShowResult(false);
    setNewRecord(false);
    setHighScore(getHighScore("game-lianliankan"));
  };
  useEffect(() => { newGame(); }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setTime((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => {
    if (time <= 0 && playing) {
      setPlaying(false);
      finishGame(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time]);

  useEffect(() => {
    if (won) finishGame(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const emptyAt = (g: Cell[][], r: number, c: number) =>
    r < 0 || c < 0 || r >= ROWS || c >= COLS ? true : g[r][c].sym === null;

  const straight = (g: Cell[][], r1: number, c1: number, r2: number, c2: number, skipSelf = false) => {
    if (r1 !== r2 && c1 !== c2) return false;
    if (r1 === r2) {
      const lo = Math.min(c1, c2), hi = Math.max(c1, c2);
      for (let c = lo; c <= hi; c++) {
        if (skipSelf && (c === c1 || c === c2)) continue;
        if (!emptyAt(g, r1, c)) return false;
      }
    } else {
      const lo = Math.min(r1, r2), hi = Math.max(r1, r2);
      for (let r = lo; r <= hi; r++) {
        if (skipSelf && (r === r1 || r === r2)) continue;
        if (!emptyAt(g, r, c1)) return false;
      }
    }
    return true;
  };

  const findPath = (g: Cell[][], r1: number, c1: number, r2: number, c2: number) => {
    if (r1 === r2 && c1 === c2) return false;
    if (g[r1][c1].sym !== g[r2][c2].sym) return false;
    if ((r1 === r2 || c1 === c2) && straight(g, r1, c1, r2, c2, true)) return true;
    if (emptyAt(g, r1, c2) && straight(g, r1, c1, r1, c2, true) && straight(g, r1, c2, r2, c2, true)) return true;
    if (emptyAt(g, r2, c1) && straight(g, r1, c1, r2, c1, true) && straight(g, r2, c1, r2, c2, true)) return true;
    for (let c = -1; c <= COLS; c++) {
      if (c === c1 || c === c2) continue;
      const aOk = c < 0 || c >= COLS ? true : emptyAt(g, r1, c);
      const bOk = c < 0 || c >= COLS ? true : emptyAt(g, r2, c);
      if (!aOk || !bOk) continue;
      if (straight(g, r1, c1, r1, c, true) && straight(g, r1, c, r2, c, false) && straight(g, r2, c, r2, c2, true)) return true;
    }
    for (let r = -1; r <= ROWS; r++) {
      if (r === r1 || r === r2) continue;
      const aOk = r < 0 || r >= ROWS ? true : emptyAt(g, r, c1);
      const bOk = r < 0 || r >= ROWS ? true : emptyAt(g, r, c2);
      if (!aOk || !bOk) continue;
      if (straight(g, r1, c1, r, c1, true) && straight(g, r, c1, r, c2, false) && straight(g, r, c2, r2, c2, true)) return true;
    }
    return false;
  };

  const findHint = (g: Cell[][]) => {
    for (let r1 = 0; r1 < ROWS; r1++)
      for (let c1 = 0; c1 < COLS; c1++) {
        if (!g[r1][c1].sym) continue;
        for (let r2 = r1; r2 < ROWS; r2++)
          for (let c2 = (r2 === r1 ? c1 + 1 : 0); c2 < COLS; c2++) {
            if (!g[r2][c2].sym) continue;
            if (findPath(g, r1, c1, r2, c2)) return [[r1,c1],[r2,c2]] as [[number,number],[number,number]];
          }
      }
    return null;
  };

  const click = (r: number, c: number) => {
    if (!playing || !grid[r][c].sym) return;
    setHint(null);
    if (!sel) { setSel([r, c]); return; }
    const [sr, sc] = sel;
    if (sr === r && sc === c) { setSel(null); return; }
    if (grid[sr][sc].sym !== grid[r][c].sym) { setSel([r, c]); return; }
    if (findPath(grid, sr, sc, r, c)) {
      const ng = grid.map((row) => row.map((x) => ({ ...x })));
      ng[sr][sc].sym = null;
      ng[r][c].sym = null;
      setGrid(ng);
      setScore((s) => s + 10);
      setPairsFound((p) => p + 1);
      setSel(null);
      if (ng.every((row) => row.every((cell) => !cell.sym))) {
        setWon(true);
        setPlaying(false);
      } else {
        if (!findHint(ng)) {
          setTimeout(() => {
            const all: string[] = [];
            ng.forEach((row) => row.forEach((x) => { if (x.sym) all.push(x.sym); }));
            all.sort(() => Math.random() - 0.5);
            let i = 0;
            const shuffled = ng.map((row) => row.map((x) => x.sym ? { ...x, sym: all[i++] } : x));
            setGrid(shuffled);
          }, 300);
        }
      }
    } else {
      setSel([r, c]);
    }
  };

  const doHint = () => {
    if (hintsUsed >= MAX_HINTS) return;
    const h = findHint(grid);
    setHint(h);
    if (h) setHintsUsed((u) => u + 1);
  };

  const shuffle = () => {
    const all: string[] = [];
    grid.forEach((row) => row.forEach((x) => { if (x.sym) all.push(x.sym); }));
    all.sort(() => Math.random() - 0.5);
    let i = 0;
    const ng = grid.map((row) => row.map((x) => x.sym ? { ...x, sym: all[i++] } : x));
    setGrid(ng);
    setSel(null);
    setHint(null);
  };

  const remainingHints = Math.max(0, MAX_HINTS - hintsUsed);
  const usedSecs = TOTAL_TIME - time;
  const totalPairs = (ROWS * COLS) / 2;
  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-fuchsia-50 border border-fuchsia-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-fuchsia-600">分数</div>
          <div className="text-xl font-bold text-fuchsia-700">{score}</div>
        </div>
        <div className="rounded-2xl bg-pink-50 border border-pink-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-pink-600">剩余时间</div>
          <div className="text-xl font-bold text-pink-700">{time}s</div>
        </div>
        <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-sky-600">剩余提示</div>
          <div className="text-xl font-bold text-sky-700">{remainingHints}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-emerald-700">最高分</div>
          <div className="text-xl font-bold text-emerald-800">{highScore}</div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          <button
            onClick={doHint}
            disabled={!playing || remainingHints <= 0}
            className="rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-700 font-semibold px-4 py-2 text-sm disabled:opacity-50"
          >
            💡 提示 ({remainingHints})
          </button>
          <button
            onClick={shuffle}
            className="rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 font-semibold px-4 py-2 text-sm"
          >
            🔀 洗牌
          </button>
          <button
            onClick={newGame}
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white font-semibold px-4 py-2 text-sm shadow-md"
          >
            重开
          </button>
        </div>
      </div>

      <GameHintBar>
        <Hint>点击两相同图案消除</Hint>
        <Hint>允许 0-2 个转角连线</Hint>
        <Hint>💡 提示：{remainingHints} 次（剩得越多分越高）</Hint>
        <Hint>🎯 180 秒内消完全部</Hint>
      </GameHintBar>

      <div className="mx-auto max-w-3xl relative">
        <div className="rounded-2xl p-3 bg-gradient-to-br from-pink-50 to-fuchsia-100 shadow-inner">
          <div
            className="grid gap-2 mx-auto"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0,1fr))` }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const isSel = sel && sel[0] === r && sel[1] === c;
                const isHint =
                  hint &&
                  ((hint[0][0] === r && hint[0][1] === c) || (hint[1][0] === r && hint[1][1] === c));
                return (
                  <button
                    key={cell.id}
                    onClick={() => click(r, c)}
                    disabled={!cell.sym || !playing}
                    className={`aspect-square rounded-xl text-2xl md:text-3xl font-bold flex items-center justify-center transition-all ${
                      !cell.sym
                        ? "bg-transparent cursor-default"
                        : isSel
                        ? "bg-white ring-4 ring-rose-400 shadow-lg scale-105"
                        : isHint
                        ? "bg-yellow-200 ring-4 ring-yellow-400 animate-pulse shadow-lg"
                        : "bg-white border border-pink-200 hover:shadow-md hover:scale-105 active:scale-95"
                    }`}
                  >
                    {cell.sym}
                  </button>
                );
              })
            )}
          </div>
        </div>
        {showResult && (
          <GameResultOverlay
            title={won ? "🎉 连连看通关！" : "⏰ 时间到！"}
            success={won}
            stats={[
              { label: "消除得分", value: score },
              { label: "用时", value: `${usedSecs}s` },
              { label: "消除/总对数", value: `${pairsFound}/${totalPairs}` },
            ]}
            highLabel="最高分（10000-用时+剩提示×100）"
            highScore={highScore}
            newRecord={newRecord}
            onRestart={newGame}
            primaryColor="from-fuchsia-400 to-pink-500"
          />
        )}
      </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 坦克大战 =====================
/**
 * 坦克大战：单人生存版，守住基地击杀敌方坦克
 */
/**
 * 坦克大战：保卫基地、击毁全部敌军坦克获胜
 */
function GameTank() {
  const W = 520;
  const H = 520;
  const TILE = 40;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  type Tank = {
    x: number; y: number; dir: 0|1|2|3; color: string; alive: boolean; cooldown: number; isEnemy: boolean; hp: number; moveTimer: number;
  };
  type Bullet = { x: number; y: number; vx: number; vy: number; owner: "P" | "E"; alive: boolean };
  type Tile = number; // 0空 1砖 2钢
  const stateRef = useRef({
    map: [] as Tile[][],
    tanks: [] as Tank[],
    bullets: [] as Bullet[],
    score: 0,
    gameOver: false,
    win: false,
    baseAlive: true,
    frame: 0,
    spawned: 0,
    totalEnemy: 10,
  });
  const [, force] = useState(0);
  const [highScore, setHighScore] = useState(() => getHighScore("game-tank"));
  const [newRecord, setNewRecord] = useState(false);
  const virtualKeysRef = useRef<Record<string, boolean>>({});
  const endedRef = useRef(false);

  /**
   * 生成初始地图：砖墙、钢墙、基地周围防御
   */
  const newMap = (): Tile[][] => {
    const cols = W / TILE, rows = H / TILE;
    const m: Tile[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
    const bricks = [
      [2,2],[2,3],[2,4],[3,2],[5,2],[5,3],[5,4],[5,5],
      [8,2],[8,3],[8,4],[8,5],[9,2],[10,2],[10,3],[10,4],
      [2,8],[3,8],[4,8],[2,9],[2,10],[3,10],[5,8],[5,9],[5,10],
      [8,9],[8,10],[9,8],[9,9],[10,8],[10,9],[10,10],
    ];
    for (const [r,c] of bricks) if (m[r]) m[r][c] = 1;
    const steels = [[0,6],[12,6],[6,0],[6,12]];
    for (const [r,c] of steels) if (m[r]) m[r][c] = 2;
    const br = rows - 2, bc = Math.floor(cols / 2) - 1;
    for (let dc = -1; dc <= 1; dc++) m[br][bc + dc] = 1;
    m[br - 1][bc - 1] = 1; m[br - 1][bc + 1] = 1;
    return m;
  };

  /**
   * 重置游戏状态，开始新一局
   */
  const restart = () => {
    const s = stateRef.current;
    s.map = newMap();
    const cols = W / TILE;
    const rows = H / TILE;
    s.tanks = [
      { x: (cols / 2 - 2) * TILE, y: (rows - 1) * TILE, dir: 0, color: "#fde047", alive: true, cooldown: 0, isEnemy: false, hp: 3, moveTimer: 0 },
    ];
    s.bullets = [];
    s.score = 0;
    s.gameOver = false;
    s.win = false;
    s.baseAlive = true;
    s.frame = 0;
    s.spawned = 0;
    endedRef.current = false;
    setNewRecord(false);
    force((x) => x + 1);
  };

  useEffect(() => {
    restart();
    const keys: Record<string, boolean> = {};
    const down = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = true);
    const up = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let raf = 0;
    const cols = W / TILE;
    const rows = H / TILE;
    const dirs = [
      [0, -1], // up 0
      [1, 0], // right 1
      [0, 1], // down 2
      [-1, 0], // left 3
    ];
    /**
     * 检测坦克与墙体/其他坦克/基地的碰撞
     */
    const collideTank = (t: Tank, nx: number, ny: number, list: Tank[]) => {
      if (nx < 0 || ny < 0 || nx + TILE > W || ny + TILE > H) return true;
      const c1 = Math.floor(nx / TILE), c2 = Math.floor((nx + TILE - 1) / TILE);
      const r1 = Math.floor(ny / TILE), r2 = Math.floor((ny + TILE - 1) / TILE);
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
        if (stateRef.current.map[r]?.[c] && stateRef.current.map[r][c] >= 1) return true;
      }
      const br = rows - 1, bc = Math.floor(cols / 2);
      if (r1 <= br && r2 >= br && c1 <= bc && c2 >= bc && t.isEnemy) return true;
      for (const o of list) {
        if (o === t || !o.alive) continue;
        if (!(nx + TILE <= o.x || o.x + TILE <= nx || ny + TILE <= o.y || o.y + TILE <= ny)) return true;
      }
      return false;
    };
    /**
     * 尝试发射子弹（有冷却时间）
     */
    const tryFire = (t: Tank) => {
      if (t.cooldown > 0) return;
      t.cooldown = 30;
      const [dx, dy] = dirs[t.dir];
      const cx = t.x + TILE / 2 + dx * TILE / 2;
      const cy = t.y + TILE / 2 + dy * TILE / 2;
      stateRef.current.bullets.push({
        x: cx, y: cy, vx: dx * 4, vy: dy * 4, owner: t.isEnemy ? "E" : "P", alive: true,
      });
    };
    /**
     * 在生成点生成敌军坦克
     */
    const spawnEnemy = () => {
      const s = stateRef.current;
      if (s.spawned >= s.totalEnemy) return;
      const spawnPoints: [number, number][] = [[0,0],[cols-1,0],[Math.floor(cols/2),0]];
      const [cx, cy] = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
      const nx = cx * TILE, ny = cy * TILE;
      for (const o of s.tanks) {
        if (o.alive && !(nx + TILE <= o.x || o.x + TILE <= nx || ny + TILE <= o.y || o.y + TILE <= ny)) return;
      }
      s.tanks.push({
        x: nx, y: ny, dir: 2, color: "#f87171", alive: true, cooldown: 60, isEnemy: true, hp: 1, moveTimer: 0,
      });
      s.spawned++;
    };
    const loop = () => {
      const c = canvasRef.current;
      const s = stateRef.current;
      if (!c) { raf = requestAnimationFrame(loop); return; }
      if ((s.gameOver || s.win) && !endedRef.current) {
        endedRef.current = true;
        const nr = updateHighScore("game-tank", s.score);
        setNewRecord(nr);
        setHighScore(getHighScore("game-tank"));
      }
      if (s.gameOver || s.win) { raf = requestAnimationFrame(loop); return; }
      s.frame++;
      const ctx = c.getContext("2d")!;
      // 合并键盘和虚拟按键
      const vk = virtualKeysRef.current;
      const isDown = (k: string) => !!keys[k] || !!vk[k];
      const player = s.tanks[0];
      if (player.alive) {
        let moved = false;
        if (isDown("arrowup")) { player.dir = 0; const nx = player.x, ny = player.y - 3; if (!collideTank(player, nx, ny, s.tanks)) { player.y = ny; moved = true; } }
        else if (isDown("arrowdown")) { player.dir = 2; const nx = player.x, ny = player.y + 3; if (!collideTank(player, nx, ny, s.tanks)) { player.y = ny; moved = true; } }
        else if (isDown("arrowleft")) { player.dir = 3; const nx = player.x - 3, ny = player.y; if (!collideTank(player, nx, ny, s.tanks)) { player.x = nx; moved = true; } }
        else if (isDown("arrowright")) { player.dir = 1; const nx = player.x + 3, ny = player.y; if (!collideTank(player, nx, ny, s.tanks)) { player.x = nx; moved = true; } }
        if (isDown(" ")) tryFire(player);
        player.cooldown = Math.max(0, player.cooldown - 1);
      }
      const aliveEnemies = s.tanks.filter((t) => t.isEnemy && t.alive).length;
      if (s.frame % 180 === 0 && aliveEnemies < 4 && s.spawned < s.totalEnemy) spawnEnemy();
      for (const t of s.tanks) {
        if (!t.isEnemy || !t.alive) continue;
        t.moveTimer--;
        t.cooldown = Math.max(0, t.cooldown - 1);
        if (t.moveTimer <= 0 || Math.random() < 0.01) {
          t.dir = Math.floor(Math.random() * 4) as 0|1|2|3;
          t.moveTimer = 30 + Math.floor(Math.random() * 60);
        }
        const [dx, dy] = dirs[t.dir];
        const nx = t.x + dx * 1.5, ny = t.y + dy * 1.5;
        if (!collideTank(t, nx, ny, s.tanks)) { t.x = nx; t.y = ny; }
        else t.moveTimer = 0;
        if (Math.random() < 0.015) tryFire(t);
      }
      for (const b of s.bullets) {
        if (!b.alive) continue;
        b.x += b.vx; b.y += b.vy;
        if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) { b.alive = false; continue; }
        const cc = Math.floor(b.x / TILE), rr = Math.floor(b.y / TILE);
        if (s.map[rr]?.[cc] === 1) { s.map[rr][cc] = 0; b.alive = false; continue; }
        if (s.map[rr]?.[cc] === 2) { b.alive = false; continue; }
        const br = rows - 1, bc = Math.floor(cols / 2);
        if (rr === br && cc === bc) { s.baseAlive = false; s.gameOver = true; b.alive = false; continue; }
        for (const t of s.tanks) {
          if (!t.alive) continue;
          if (b.owner === "P" && !t.isEnemy) continue;
          if (b.owner === "E" && t.isEnemy) continue;
          if (b.x >= t.x && b.x <= t.x + TILE && b.y >= t.y && b.y <= t.y + TILE) {
            t.hp--;
            if (t.hp <= 0) {
              t.alive = false;
              if (t.isEnemy) s.score += 100;
            }
            if (!player.alive) s.gameOver = true;
            b.alive = false;
            break;
          }
        }
      }
      s.bullets = s.bullets.filter((b) => b.alive);
      if (s.spawned >= s.totalEnemy && s.tanks.filter((t) => t.isEnemy && t.alive).length === 0) s.win = true;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (s.map[r][c] === 1) {
          ctx.fillStyle = "#b45309";
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
          ctx.fillStyle = "#92400e";
          ctx.fillRect(c * TILE, r * TILE, TILE / 2, TILE / 2);
          ctx.fillRect(c * TILE + TILE / 2, r * TILE + TILE / 2, TILE / 2, TILE / 2);
        } else if (s.map[r][c] === 2) {
          ctx.fillStyle = "#94a3b8";
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
          ctx.strokeStyle = "#cbd5e1";
          ctx.strokeRect(c * TILE + 2, r * TILE + 2, TILE - 4, TILE - 4);
        }
      }
      const br2 = rows - 1, bc2 = Math.floor(cols / 2);
      ctx.fillStyle = s.baseAlive ? "#fbbf24" : "#7f1d1d";
      ctx.fillRect(bc2 * TILE, br2 * TILE, TILE, TILE);
      ctx.font = "bold 28px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText("🦅", bc2 * TILE + TILE / 2, br2 * TILE + TILE / 2);
      for (const t of s.tanks) {
        if (!t.alive) continue;
        ctx.fillStyle = t.color;
        ctx.fillRect(t.x + 4, t.y + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = t.isEnemy ? "#7f1d1d" : "#854d0e";
        const [dx, dy] = dirs[t.dir];
        ctx.fillRect(
          t.x + TILE / 2 - 3 + dx * TILE / 3,
          t.y + TILE / 2 - 3 + dy * TILE / 3,
          6 + Math.abs(dy) * (TILE / 3),
          6 + Math.abs(dx) * (TILE / 3)
        );
      }
      ctx.fillStyle = "#fecaca";
      for (const b of s.bullets) ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf);
    };
  }, []);

  const s = stateRef.current;
  const p = s.tanks[0];
  const remaining = Math.max(0, s.totalEnemy - s.spawned) + s.tanks.filter((t) => t.isEnemy && t.alive).length;
  const destroyed = s.totalEnemy - remaining;

  /**
   * 设置虚拟按键按下状态（鼠标/触摸）
   */
  const bindBtn = (k: string) => ({
    onMouseDown: (e: React.MouseEvent) => { e.preventDefault(); virtualKeysRef.current[k] = true; },
    onMouseUp: (e: React.MouseEvent) => { e.preventDefault(); virtualKeysRef.current[k] = false; },
    onMouseLeave: () => { virtualKeysRef.current[k] = false; },
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); virtualKeysRef.current[k] = true; },
    onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); virtualKeysRef.current[k] = false; },
  });

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-lime-50 border border-lime-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-lime-700">分数</div>
          <div className="text-xl font-bold text-lime-800">{s.score}</div>
        </div>
        <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-green-700">生命</div>
          <div className="text-xl font-bold text-green-800">{"❤".repeat(Math.max(0, p?.hp ?? 0)) || "0"}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-emerald-700">剩余敌军</div>
          <div className="text-xl font-bold text-emerald-800">{remaining}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-slate-600">最高分</div>
          <div className="text-xl font-bold text-slate-800">{highScore}</div>
        </div>
        <button
          onClick={restart}
          className="ml-auto rounded-xl bg-gradient-to-r from-lime-500 to-green-700 text-white font-semibold px-4 py-2 text-sm shadow-md"
        >
          重开
        </button>
      </div>
      <GameHintBar>
        <Hint>🎮 移动 <Key k="↑" /><Key k="←" /><Key k="↓" /><Key k="→" /></Hint>
        <Hint>🔫 射击 <Key k="空格" /></Hint>
        <Hint>🎯 击毁 <b>{s.totalEnemy}</b> 辆敌军，守住 🦅</Hint>
      </GameHintBar>
      <div className="mx-auto max-w-[540px] relative">
        <canvas ref={canvasRef} width={W} height={H} className="w-full rounded-2xl shadow-2xl aspect-square" />
        {(s.gameOver || s.win) && (
          <GameResultOverlay
            title={s.win ? "保卫基地成功！" : "游戏结束！"}
            success={s.win}
            stats={[
              { label: "本局得分", value: s.score },
              { label: "击毁敌军", value: destroyed },
              { label: "剩余生命", value: Math.max(0, p?.hp ?? 0) },
            ]}
            highLabel="最高分"
            highScore={highScore}
            newRecord={newRecord}
            onRestart={restart}
            primaryColor="from-lime-500 to-green-700"
          />
        )}
      </div>
      <div className="mt-5 flex items-end justify-between gap-4 max-w-[540px] mx-auto">
        <div className="grid grid-cols-3 gap-1.5 w-40">
          <div />
          <button {...bindBtn("arrowup")} className="h-12 rounded-xl bg-lime-500 text-white font-bold text-xl active:scale-95 shadow">↑</button>
          <div />
          <button {...bindBtn("arrowleft")} className="h-12 rounded-xl bg-lime-500 text-white font-bold text-xl active:scale-95 shadow">←</button>
          <div className="h-12 rounded-xl bg-lime-100" />
          <button {...bindBtn("arrowright")} className="h-12 rounded-xl bg-lime-500 text-white font-bold text-xl active:scale-95 shadow">→</button>
          <div />
          <button {...bindBtn("arrowdown")} className="h-12 rounded-xl bg-lime-500 text-white font-bold text-xl active:scale-95 shadow">↓</button>
          <div />
        </div>
        <button
          {...bindBtn(" ")}
          className="h-24 w-24 rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white font-black text-sm shadow-xl active:scale-95"
        >
          射击
        </button>
      </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 消消乐（三消） =====================
/**
 * 三消：交换相邻糖果形成 ≥3 连消除、特殊糖果、关卡目标
 */
/**
 * 消消乐（三消）：交换相邻糖果形成 ≥3 连消除、特殊糖果、关卡目标
 */
function GameMatch3() {
  const SIZE = 8;
  const COLORS = ["bg-rose-500", "bg-amber-400", "bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-fuchsia-500"];
  const EMOJIS = ["🍓","🍋","🍏","💎","🍇","🍬"];
  type Cell = { color: number; id: number; special: 0|1|2; falling?: boolean };
  const [grid, setGrid] = useState<Cell[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(25);
  const [goal] = useState(2000);
  const [animating, setAnimating] = useState(false);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(() => getHighScore("game-match3"));
  const [newRecord, setNewRecord] = useState(false);
  const endedRef = useRef(false);

  /**
   * 开始新游戏：随机生成 8×8 糖果盘（避免初始三连）
   */
  const newGame = () => {
    const arr: Cell[] = [];
    let id = 0;
    const make = (): number => Math.floor(Math.random() * COLORS.length);
    for (let i = 0; i < SIZE * SIZE; i++) {
      let color = make();
      while (
        (i >= 2 && arr[i - 1].color === color && arr[i - 2].color === color) ||
        (i >= SIZE && arr[i - SIZE].color === color && i >= 2 * SIZE && arr[i - 2 * SIZE].color === color)
      ) color = make();
      arr.push({ color, id: id++, special: 0 });
    }
    setGrid(arr);
    setSel(null);
    setScore(0);
    setMoves(25);
    setCombo(0);
    setNewRecord(false);
    endedRef.current = false;
  };
  useEffect(() => { newGame(); }, []);

  const xy = (i: number) => [i % SIZE, Math.floor(i / SIZE)];
  const idx = (x: number, y: number) => y * SIZE + x;

  /**
   * 找出盘面上所有横向/纵向 ≥3 连匹配位置
   */
  const findMatches = (g: Cell[]): Set<number> => {
    const rem = new Set<number>();
    for (let y = 0; y < SIZE; y++) {
      let run = 1;
      for (let x = 1; x <= SIZE; x++) {
        const same = x < SIZE && g[idx(x, y)].color === g[idx(x - 1, y)].color;
        if (same) run++;
        else {
          if (run >= 3) for (let k = x - run; k < x; k++) rem.add(idx(k, y));
          run = 1;
        }
      }
    }
    for (let x = 0; x < SIZE; x++) {
      let run = 1;
      for (let y = 1; y <= SIZE; y++) {
        const same = y < SIZE && g[idx(x, y)].color === g[idx(x, y - 1)].color;
        if (same) run++;
        else {
          if (run >= 3) for (let k = y - run; k < y; k++) rem.add(idx(x, k));
          run = 1;
        }
      }
    }
    return rem;
  };

  /**
   * 循环消除匹配、触发特殊糖果、下落补充，直到盘面稳定
   */
  const resolve = async (g: Cell[]): Promise<Cell[]> => {
    const local = g.map((c) => ({ ...c }));
    let loop = 0;
    while (true) {
      const matches = findMatches(local);
      if (!matches.size) break;
      loop++;
      setCombo(loop);
      let addScore = 0;
      const toRemove = new Set(matches);
      for (const i of matches) {
        const [x, y] = xy(i);
        const c = local[i];
        if (c.special === 2) {
          const targetColor = c.color;
          for (let j = 0; j < local.length; j++) if (local[j].color === targetColor) toRemove.add(j);
        } else if (c.special === 1) {
          for (let k = 0; k < SIZE; k++) { toRemove.add(idx(k, y)); toRemove.add(idx(x, k)); }
        }
      }
      addScore += toRemove.size * 10 * loop;
      for (const i of toRemove) local[i] = { ...local[i], color: -1 };
      let idMax = Math.max(...local.map((c) => c.id)) + 1;
      for (let x = 0; x < SIZE; x++) {
        const col: number[] = [];
        for (let y = SIZE - 1; y >= 0; y--) if (local[idx(x, y)].color !== -1) col.push(local[idx(x, y)].color);
        while (col.length < SIZE) col.push(Math.floor(Math.random() * COLORS.length));
        for (let y = SIZE - 1, p = 0; y >= 0; y--, p++) {
          const oldC = local[idx(x, y)].color;
          local[idx(x, y)] = { color: col[p], id: idMax++, special: 0, falling: oldC === -1 };
        }
      }
      setScore((s) => s + addScore);
      setGrid(local.slice());
      await new Promise((r) => setTimeout(r, 180));
    }
    setCombo(0);
    return local;
  };

  /**
   * 点击糖果：选中、与相邻格交换、触发消除
   */
  const click = async (i: number) => {
    if (animating || moves <= 0) return;
    if (sel === null) { setSel(i); return; }
    const [sx, sy] = xy(sel);
    const [tx, ty] = xy(i);
    const adj = Math.abs(sx - tx) + Math.abs(sy - ty) === 1;
    if (!adj) { setSel(i); return; }
    setAnimating(true);
    const ng = grid.slice();
    [ng[sel], ng[i]] = [ng[i], ng[sel]];
    const matches = findMatches(ng);
    if (!matches.size) {
      [ng[sel], ng[i]] = [ng[i], ng[sel]];
      setGrid(ng);
      setSel(null);
      setAnimating(false);
      return;
    }
    setGrid(ng);
    setSel(null);
    setMoves((m) => m - 1);
    const final = await resolve(ng);
    setGrid(final);
    setAnimating(false);
  };

  const won = score >= goal;
  const lose = !won && moves <= 0;
  const gameEnded = won || lose;

  // 游戏结束时写入最高分
  useEffect(() => {
    if (gameEnded && !endedRef.current) {
      endedRef.current = true;
      const nr = updateHighScore("game-match3", score);
      setNewRecord(nr);
      setHighScore(getHighScore("game-match3"));
    }
  }, [gameEnded, score]);

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-rose-600">分数</div>
          <div className="text-xl font-bold text-rose-700">{score} / {goal}</div>
        </div>
        <div className="rounded-2xl bg-fuchsia-50 border border-fuchsia-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-fuchsia-600">剩余步数</div>
          <div className="text-xl font-bold text-fuchsia-700">{moves}</div>
        </div>
        {combo > 1 && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-200 to-rose-300 px-4 py-2 animate-bounce">
            <div className="text-[11px] font-semibold text-amber-900">连锁</div>
            <div className="text-xl font-black text-rose-700">×{combo}</div>
          </div>
        )}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-slate-600">最高分</div>
          <div className="text-xl font-bold text-slate-800">{highScore}</div>
        </div>
        <button
          onClick={newGame}
          className="ml-auto rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white font-semibold px-4 py-2 text-sm shadow-md"
        >
          重开
        </button>
      </div>
      <GameHintBar>
        <Hint>
          <b>操作</b>：点击 <b>选中</b> + 点击 <b>相邻格</b> 交换
        </Hint>
        <Hint>
          <b>消除</b>：相同色 <b>≥3 连</b> 即可消除
        </Hint>
        <Hint>
          <b>目标</b>：{moves} 步内达成 <b>{goal}</b> 分
        </Hint>
      </GameHintBar>
      <div className="mx-auto max-w-md rounded-2xl p-3 bg-gradient-to-br from-pink-100 to-fuchsia-100 shadow-inner relative">
        <div
          className="grid gap-1.5 aspect-square"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0,1fr))` }}
        >
          {grid.map((c, i) => {
            if (c.color < 0) return <div key={i} className="bg-transparent" />;
            const selected = sel === i;
            return (
              <button
                key={i}
                onClick={() => click(i)}
                disabled={animating}
                className={`aspect-square rounded-xl text-2xl md:text-3xl flex items-center justify-center transition-all shadow-sm ${COLORS[c.color]} ${
                  selected ? "ring-4 ring-yellow-300 scale-110 shadow-xl z-10" : "hover:scale-105 active:scale-95"
                } ${c.falling ? "animate-bounce" : ""}`}
              >
                {EMOJIS[c.color]}
              </button>
            );
          })}
        </div>
        {gameEnded && (
          <GameResultOverlay
            title={won ? "🎉 目标达成！" : "步数用尽～"}
            success={won}
            stats={[
              { label: "本局得分", value: score },
              { label: "目标分数", value: goal },
              { label: "剩余步数", value: Math.max(0, moves) },
            ]}
            highLabel="最高分"
            highScore={highScore}
            newRecord={newRecord}
            onRestart={newGame}
            primaryColor="from-rose-400 to-fuchsia-600"
          />
        )}
      </div>
      <div className="mt-4 h-3 rounded-full bg-slate-200 overflow-hidden max-w-md mx-auto">
        <div
          className="h-full bg-gradient-to-r from-rose-500 to-fuchsia-500 transition-all"
          style={{ width: `${Math.min(100, (score / goal) * 100)}%` }}
        />
      </div>
      <div className="mt-3 text-center text-xs text-slate-500">
        交换相邻糖果形成 3+ 连即可消除，凑出 4/5 连生成特殊糖果威力更强
      </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 羊了个羊 =====================
/**
 * 羊了个羊三消：分层堆叠、底部7槽、3张同图案消除
 */
function GameSheep() {
  const LEVEL_CARDS = [60, 120, 180, 260, 360, 500];
  const SLOT = 7;
  const EMOJIS = ["🐑","🌿","🍀","🌼","🌻","🥕","🍄","🌾","🐄","🐖","🐓","🐇","🦋","🐝","🌲","🍎"];
  const [lvl, setLvl] = useState(0);
  type Card = { sym: number; z: number; id: number; visible: boolean };
  const [cards, setCards] = useState<Card[]>([]);
  const [slots, setSlots] = useState<(Card | null)[]>(Array(SLOT).fill(null));
  const [won, setWon] = useState(false);
  const [lose, setLose] = useState(false);
  const [props, setProps] = useState({ undo: 3, shuffle: 3, remove: 2 });
  const [clearedCount, setClearedCount] = useState(0);
  const [highScore, setHighScore] = useState(() => getHighScore("game-yanglegeyang"));
  const [newRecord, setNewRecord] = useState(false);

  const posMapRef = useRef<Map<number, [number, number]>>(new Map());

  const WIDTH = 600;
  const HEIGHT = 500;

  const generate = (lv: number) => {
    const total = LEVEL_CARDS[lv] || 120;
    const kinds = Math.min(EMOJIS.length, 6 + lv);
    const per = Math.floor(total / 3 / kinds) * 3 * kinds;
    const arr: number[] = [];
    for (let k = 0; k < kinds; k++) for (let i = 0; i < per / kinds; i++) arr.push(k);
    while (arr.length < total) arr.push(Math.floor(Math.random() * kinds));
    arr.sort(() => Math.random() - 0.5);
    const list: Card[] = [];
    const cols = Math.ceil(Math.sqrt(total / 2));
    const rows = Math.ceil(total / cols);
    let id = 0;
    const WMAX = WIDTH - 34;
    const HMAX = HEIGHT - 44;
    for (let it = 0; it < 2; it++) {
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (id >= arr.length) break;
        let px = x * 38 + (it * 14) + (y % 2 === 0 ? 0 : 18) + Math.random() * 14 - 7;
        let py = y * 40 + (it * 14) + Math.random() * 12 - 6;
        px = clamp(px, 0, WMAX);
        py = clamp(py, 0, HMAX);
        list.push({ sym: arr[id], z: it * 1000 + y * cols + x, id: id, visible: true });
        posMapRef.current.set(id, [px, py]);
        id++;
      }
    }
    while (id < arr.length) {
      const it = Math.floor(id / (cols * rows)) + 2;
      const idx = id % (cols * rows);
      const x = idx % cols;
      const y = Math.floor(idx / cols);
      let px = x * 38 + (it % 2 * 18) + 8;
      let py = y * 40 + 6;
      px = clamp(px, 0, WMAX);
      py = clamp(py, 0, HMAX);
      list.push({ sym: arr[id], z: it * 1000 + y * cols + x, id, visible: true });
      posMapRef.current.set(id, [px, py]);
      id++;
    }
    return list;
  };

  const start = (lv: number) => {
    posMapRef.current.clear();
    const c = generate(lv);
    setCards(c);
    setSlots(Array(SLOT).fill(null));
    setWon(false);
    setLose(false);
    setLvl(lv);
    setProps({ undo: 3, shuffle: 3, remove: 2 });
    setClearedCount(0);
    setNewRecord(false);
  };

  useEffect(() => { start(0);   }, []);

  const topCard = (c: Card, all: Card[]) => {
    const [cx, cy] = posMapRef.current.get(c.id) || [0, 0];
    const W = 34, H = 44;
    for (const o of all) {
      if (o.id === c.id || !o.visible) continue;
      if (o.z <= c.z) continue;
      const [ox, oy] = posMapRef.current.get(o.id) || [0, 0];
      if (!(cx + W <= ox || ox + W <= cx || cy + H <= oy || oy + H <= cy)) return false;
    }
    return true;
  };

  const historyRef = useRef<{ cards: Card[]; slots: (Card | null)[]; cleared: number }[]>([]);

  const pushHistory = () => {
    historyRef.current.push({
      cards: cards.map((c) => ({ ...c })),
      slots: slots.slice(),
      cleared: clearedCount,
    });
    if (historyRef.current.length > 20) historyRef.current.shift();
  };

  const processSlots = (s: (Card | null)[]): { slots: (Card | null)[]; removed: number } => {
    const countMap = new Map<number, Card[]>();
    for (const c of s) if (c) {
      if (!countMap.has(c.sym)) countMap.set(c.sym, []);
      countMap.get(c.sym)!.push(c);
    }
    const newSlots: (Card | null)[] = s.slice();
    let removed = 0;
    for (const [, arr] of countMap) if (arr.length >= 3) {
      let need = 3;
      for (let i = 0; i < newSlots.length && need > 0; i++) {
        if (newSlots[i] && newSlots[i]!.sym === arr[0].sym) {
          newSlots[i] = null;
          need--;
          removed++;
        }
      }
    }
    const out: (Card | null)[] = [];
    for (const c of newSlots) if (c) out.push(c);
    while (out.length < SLOT) out.push(null);
    return { slots: out, removed };
  };

  const click = (c: Card) => {
    if (!c.visible || won || lose) return;
    if (!topCard(c, cards)) return;
    const firstEmpty = slots.findIndex((s) => s === null);
    if (firstEmpty === -1) return;
    pushHistory();
    const ns = slots.slice();
    let put = firstEmpty;
    for (let i = SLOT - 1; i >= 0; i--) {
      if (ns[i] && ns[i]!.sym === c.sym) { put = i + 1; break; }
    }
    if (put >= SLOT || ns[put] !== null) put = firstEmpty;
    for (let i = SLOT - 1; i > put; i--) ns[i] = ns[i - 1];
    ns[put] = { ...c };
    const nc = cards.filter((x) => x.id !== c.id);
    const { slots: after, removed } = processSlots(ns);
    setSlots(after);
    setCards(nc);
    const finalScore = 0; // 占位：此处可接入具体游戏评分公式（P3 迭代）
    if (removed > 0) setClearedCount((x) => x + removed);
    if (nc.length === 0 && after.every((x) => x === null)) {
      setWon(true);
      const nr = updateHighScore("game-yanglegeyang", finalScore);
      if (nr) setHighScore(getHighScore("game-yanglegeyang"));
      setNewRecord(nr);
    }
    if (after[after.length - 1] !== null) {
      const canMatch = processSlots(after).removed > 0;
      if (!canMatch) setLose(true);
    }
  };

  const undo = () => {
    if (props.undo <= 0) return;
    const h = historyRef.current.pop();
    if (!h) return;
    setCards(h.cards);
    setSlots(h.slots);
    setClearedCount(h.cleared);
    setProps({ ...props, undo: props.undo - 1 });
    setLose(false);
  };
  const shuffle = () => {
    if (props.shuffle <= 0) return;
    const syms = cards.map((c) => c.sym);
    syms.sort(() => Math.random() - 0.5);
    const nc = cards.map((c, i) => ({ ...c, sym: syms[i] }));
    setCards(nc);
    setProps({ ...props, shuffle: props.shuffle - 1 });
  };
  const remove = () => {
    if (props.remove <= 0) return;
    pushHistory();
    const ns = slots.slice();
    const filled: number[] = [];
    for (let i = 0; i < ns.length; i++) if (ns[i]) filled.push(i);
    if (!filled.length) return;
    const take = filled.slice(0, 3);
    for (const i of take) ns[i] = null;
    const out: (Card | null)[] = [];
    for (const c of ns) if (c) out.push(c);
    while (out.length < SLOT) out.push(null);
    setSlots(out);
    setProps({ ...props, remove: props.remove - 1 });
  };

  const curScore = (lvl + 1) * 1000 + clearedCount;

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-pink-50 border border-pink-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-pink-600">关卡</div>
          <div className="text-xl font-bold text-pink-700">第 {lvl + 1} 关</div>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-rose-600">剩余卡片</div>
          <div className="text-xl font-bold text-rose-700">{cards.length}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-amber-600">最高分</div>
          <div className="text-xl font-bold text-amber-700">{highScore}</div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap items-center">
          <select
            value={lvl}
            onChange={(e) => start(Number(e.target.value))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
          >
            {LEVEL_CARDS.map((_, i) => (
              <option key={i} value={i}>第 {i + 1} 关</option>
            ))}
          </select>
          <button onClick={undo} disabled={props.undo <= 0} className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50">
            ↶ 撤回 ({props.undo})
          </button>
          <button onClick={shuffle} disabled={props.shuffle <= 0} className="rounded-xl bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-amber-100">
            🔀 洗牌 ({props.shuffle})
          </button>
          <button onClick={remove} disabled={props.remove <= 0} className="rounded-xl bg-sky-50 border border-sky-200 text-sky-700 px-3 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-sky-100">
            移出 ({props.remove})
          </button>
          <button onClick={() => start(lvl)} className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold px-4 py-2 text-sm shadow-md">
            重开本关
          </button>
        </div>
      </div>

      <GameHintBar>
        <Hint>🖱️ 点击卡片放入槽位</Hint>
        <Hint>✨ 3 张相同图案自动消除</Hint>
        <Hint>↶ 撤回 · 🔀 洗牌 · 移出 救急</Hint>
        <Hint>⚠️ 槽位满且无法消除就失败</Hint>
      </GameHintBar>

      <div className="relative mx-auto" style={{ width: "min(100%, 640px)" }}>
      <div
        className="rounded-3xl relative shadow-inner bg-gradient-to-br from-emerald-100 via-green-100 to-teal-100 border-4 border-emerald-200"
        style={{ aspectRatio: `${WIDTH}/${HEIGHT + 100}` }}
      >
        <div className="absolute inset-0" style={{ height: `${HEIGHT / (HEIGHT + 100) * 100}%` }}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-full block"
          >
            {cards.sort((a, b) => a.z - b.z).map((c) => {
              const [x, y] = posMapRef.current.get(c.id) || [0, 0];
              const top = topCard(c, cards);
              return (
                <foreignObject key={c.id} x={x} y={y} width={34} height={44} style={{ cursor: top ? "pointer" : "default" }}
                  onClick={() => click(c)}>
                  <div className={`w-full h-full rounded-lg flex items-center justify-center text-xl font-bold border-2 shadow-md ${
                    top ? "bg-white border-emerald-300 hover:scale-105 transition-transform" : "bg-slate-200/80 border-slate-300 opacity-70"
                  }`}>
                    {EMOJIS[c.sym]}
                  </div>
                </foreignObject>
              );
            })}
          </svg>
        </div>
        <div className="absolute left-0 right-0 bottom-0 h-[92px] px-4 flex items-center justify-center">
          <div className="flex gap-2 p-2 bg-white/80 rounded-2xl backdrop-blur border border-pink-200 shadow-xl">
            {slots.map((s, i) => (
              <div
                key={i}
                className={`w-14 h-16 rounded-xl flex items-center justify-center text-2xl font-bold border-2 ${
                  s ? "bg-white border-rose-300 shadow scale-105" : "bg-slate-100 border-dashed border-slate-300"
                }`}
              >
                {s ? EMOJIS[s.sym] : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
      {(won || lose) && (
        <GameResultOverlay
          title={won ? `🎉 第 ${lvl + 1} 关通过！` : "槽位已满"}
          success={won}
          stats={[
            { label: "通关关卡", value: won ? lvl + 1 : lvl },
            { label: "消除卡片", value: clearedCount },
            { label: "本局得分", value: curScore },
          ]}
          highLabel="最高分"
          highScore={highScore}
          newRecord={won ? newRecord : false}
          onRestart={() => start(lvl)}
          primaryColor="from-pink-400 to-rose-500"
        />
      )}
      </div>
      {won && lvl + 1 < LEVEL_CARDS.length && (
        <div className="mt-5 text-center">
          <button onClick={() => start(lvl + 1)} className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold px-6 py-3 text-base shadow-lg hover:shadow-xl">
            下一关 →
          </button>
        </div>
      )}
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 便签工具 =====================
/**
 * 彩色便签：多便签、颜色、提醒、删除、导出
 */
function ToolSticky() {
  const KEY = "pg_stickies_v1";
  type Note = {
    id: string;
    text: string;
    color: string;
    top: number;
    left: number;
    remind?: string; // ISO
    created: number;
  };
  const COLORS = [
    "from-yellow-100 to-yellow-200 border-yellow-300",
    "from-pink-100 to-rose-200 border-rose-300",
    "from-sky-100 to-blue-200 border-blue-300",
    "from-emerald-100 to-green-200 border-green-300",
    "from-violet-100 to-purple-200 border-purple-300",
    "from-orange-100 to-amber-200 border-amber-300",
    "from-fuchsia-100 to-pink-200 border-pink-300",
    "from-stone-100 to-neutral-200 border-neutral-300",
  ];
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 刻意忽略已知可恢复异常 */ }
    return [
      { id: "init1", text: "点击右上角「+」新建便签～\n双击文字直接编辑", color: COLORS[0], top: 20, left: 20, created: Date.now() },
    ];
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (e) { /* 刻意忽略已知可恢复异常 */ }
  }, [notes]);

  const add = () => {
    const n: Note = {
      id: "n_" + Math.random().toString(36).slice(2, 9),
      text: "待办 / 灵感 / 提醒……",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      top: 40 + Math.random() * 80,
      left: 40 + Math.random() * 120,
      created: Date.now(),
    };
    setNotes([...notes, n]);
  };
  const update = (id: string, patch: Partial<Note>) =>
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const remove = (id: string) => setNotes((ns) => ns.filter((n) => n.id !== id));
  const exportAll = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "小白便签.json";
    a.click();
  };

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-yellow-700">便签数</div>
          <div className="text-xl font-bold text-yellow-800">{notes.length}</div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          <button onClick={exportAll} className="rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2 text-sm hover:bg-slate-50">
            导出 JSON
          </button>
          <button onClick={add} className="rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-semibold px-4 py-2 text-sm shadow-md">
            + 新建便签
          </button>
        </div>
      </div>
      <div className="relative rounded-2xl bg-gradient-to-br from-amber-50 to-pink-50 border border-amber-100 shadow-inner min-h-[520px] overflow-hidden">
        <div className="absolute top-2 left-2 text-xs text-amber-700/70">提示：拖便签标题条移动 · 双击正文编辑 · 颜色切换即时生效</div>
        {notes.map((n) => (
          <div
            key={n.id}
            className={`absolute w-56 rounded-xl bg-gradient-to-br ${n.color} border-2 shadow-lg shadow-black/10 flex flex-col ${
              activeId === n.id ? "ring-2 ring-rose-400 z-20" : "z-10"
            }`}
            style={{ top: n.top, left: n.left }}
            onMouseDown={() => setActiveId(n.id)}
          >
            <div
              className="h-7 cursor-move rounded-t-lg px-3 flex items-center justify-between text-xs font-bold text-slate-700/70 border-b border-black/5 select-none"
              onMouseDown={(e) => {
                e.stopPropagation();
                setActiveId(n.id);
                const startX = e.clientX, startY = e.clientY;
                const origT = n.top, origL = n.left;
                const move = (ev: MouseEvent) => update(n.id, { top: origT + (ev.clientY - startY), left: origL + (ev.clientX - startX) });
                const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
                window.addEventListener("mousemove", move);
                window.addEventListener("mouseup", up);
              }}
            >
              <span>📝 便签</span>
              <div className="flex items-center gap-1">
                <select
                  value={n.color}
                  onChange={(e) => update(n.id, { color: e.target.value })}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="bg-transparent outline-none w-5 h-5 cursor-pointer appearance-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(0,0,0,0.05))",
                    borderRadius: 4,
                  }}
                  title="换色"
                >
                  {COLORS.map((c) => <option key={c} value={c}>{COLORS.indexOf(c)+1}</option>)}
                </select>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                  className="w-5 h-5 rounded-full bg-black/5 hover:bg-rose-500 hover:text-white text-slate-600 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>
            <textarea
              value={n.text}
              onChange={(e) => update(n.id, { text: e.target.value })}
              className="bg-transparent resize-none p-3 text-sm text-slate-800 leading-6 focus:outline-none min-h-[120px]"
              spellCheck={false}
            />
            <input
              type="datetime-local"
              value={n.remind ? n.remind.slice(0,16) : ""}
              onChange={(e) => update(n.id, { remind: e.target.value })}
              className="mx-3 mb-2 text-[11px] text-slate-600 bg-white/60 rounded px-2 py-1 border border-black/5"
              title="设置提醒（仅本地，页面保持打开生效）"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== 天气查询 =====================
/**
 * 天气查询：wttr.in 免费 API + 本地离线模拟数据
 */
function AiWeather() {
  const [city, setCity] = useState("北京");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 离线模拟数据
  const mockData = (cityName: string) => {
    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const descs = ["晴", "多云", "小雨", "阴", "雷阵雨", "晴朗"];
    const forecast = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      forecast.push({
        date: d.toISOString().slice(0,10),
        max_temp: rand(18, 35),
        min_temp: rand(8, 22),
        description: descs[rand(0, descs.length - 1)],
      });
    }
    return {
      success: true,
      city: cityName,
      current: {
        description: forecast[0].description,
        temperature: forecast[0].max_temp - rand(2,5),
        feels_like: forecast[0].max_temp - rand(0,3),
        humidity: rand(30, 85),
        wind_speed: rand(2, 25),
        wind_direction: ["东北","西南","东","西","南","北"][rand(0,5)],
        visibility: rand(5, 30),
        pressure: rand(990, 1020),
        uv_index: rand(1, 10),
      },
      forecast,
      note: "本站使用模拟数据演示，下载桌面端接入真实 wttr.in API",
    };
  };

  const query = async () => {
    if (!city.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // 尝试在线 wttr.in
      const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
      const data = await fetch(url).then((r) => r.json()).catch(() => null);
      if (data && data.current_condition) {
        const cur = data.current_condition[0];
        setResult({
          success: true,
          city,
          current: {
            description: cur.weatherDesc?.[0]?.value || "未知",
            temperature: cur.temp_C,
            feels_like: cur.FeelsLikeC,
            humidity: cur.humidity,
            wind_speed: cur.windspeedKmph,
            wind_direction: cur.winddir16Point,
            visibility: cur.visibility,
            pressure: cur.pressure,
            uv_index: cur.uvIndex,
          },
          forecast: (data.weather || []).map((d: any) => ({
            date: d.date,
            max_temp: d.maxtempC,
            min_temp: d.mintempC,
            description: d.hourly?.[4]?.weatherDesc?.[0]?.value || "",
          })),
          note: "数据来源：wttr.in 免费天气 API",
        });
      } else {
        setResult(mockData(city));
      }
    } catch (e: any) {
      setResult(mockData(city));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { query();   }, []);

  const desc = result?.current?.description || "";
  const temp = result?.current?.temperature;

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-1.5 flex-1 max-w-md">
          <span className="text-sky-600">📍</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && query()}
            placeholder="输入城市名称，如 北京 / Shanghai / 杭州"
            className="flex-1 bg-transparent py-2 px-1 focus:outline-none text-slate-800 font-semibold"
          />
        </div>
        <button
          onClick={query}
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold px-5 py-2.5 shadow-md hover:shadow-lg disabled:opacity-60"
        >
          {loading ? "查询中..." : "查询天气"}
        </button>
      </div>
      {error && <div className="text-rose-600 text-sm">{error}</div>}
      {result && (
        <>
          {/* 实时天气卡片 */}
          <div className="rounded-3xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 p-6 md:p-8 text-white shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="text-xs md:text-sm opacity-80 font-semibold">
                  {new Date().toLocaleDateString()} · {result.city}
                </div>
                <div className="mt-3 flex items-end gap-4">
                  <div className="text-6xl md:text-8xl font-black tracking-tight">{temp}°</div>
                  <div className="pb-3">
                    <div className="text-2xl md:text-3xl font-bold">{desc}</div>
                    <div className="text-sm md:text-base opacity-90">
                      体感 {result.current.feels_like}° · 湿度 {result.current.humidity}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-7xl">
                {desc.includes("晴") ? "☀️" : desc.includes("云") ? "⛅" : desc.includes("雨") ? "🌧️" : desc.includes("雷") ? "⛈️" : desc.includes("雪") ? "❄️" : "🌤️"}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm md:text-base">
              {[
                ["💨 风速", `${result.current.wind_speed} km/h ${result.current.wind_direction}`],
                ["💧 湿度", `${result.current.humidity}%`],
                ["👁️ 能见度", `${result.current.visibility} km`],
                ["☀️ UV", `${result.current.uv_index}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white/15 backdrop-blur px-4 py-3">
                  <div className="opacity-80 text-xs">{k}</div>
                  <div className="font-bold mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            {result.note && <div className="mt-4 text-xs opacity-75">{result.note}</div>}
          </div>
          {/* 7 日预报 */}
          <div className="rounded-2xl bg-sky-50 border border-sky-100 p-5">
            <h3 className="font-bold text-slate-800 mb-4">📅 未来 7 日预报</h3>
            <div className="grid gap-3">
              {result.forecast.map((d: any) => {
                const desc2 = d.description;
                return (
                  <div key={d.date} className="grid grid-cols-[100px_1fr_120px] md:grid-cols-[130px_40px_1fr_140px] gap-3 items-center">
                    <div className="font-semibold text-slate-700 text-sm md:text-base">
                      {(() => {
                        const dt = new Date(d.date);
                        return `${dt.getMonth() + 1}/${dt.getDate()}`;
                      })()}
                    </div>
                    <div className="text-2xl hidden md:block">
                      {desc2.includes("晴") ? "☀️" : desc2.includes("云") ? "⛅" : desc2.includes("雨") ? "🌧️" : desc2.includes("雪") ? "❄️" : "🌤️"}
                    </div>
                    <div className="text-slate-600">{desc2}</div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-sky-700 font-bold text-sm md:text-base">{d.min_temp}°~{d.max_temp}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ===================== 翻译 =====================
/**
 * 在线翻译：
 * - 中英日韩法德等 10+ 语言互译
 * - 优先调用 MyMemory 公共 API；失败则回退内置简易词典 + 模拟翻译
 * - 支持复制结果、朗读、历史记录
 */
function AiTranslate() {
  const LANGS: [string, string][] = [
    ["自动检测", "autodetect"],
    ["中文", "zh-CN"],
    ["英语", "en"],
    ["日语", "ja"],
    ["韩语", "ko"],
    ["法语", "fr"],
    ["德语", "de"],
    ["西班牙语", "es"],
    ["俄语", "ru"],
    ["葡萄牙语", "pt"],
    ["意大利语", "it"],
    ["泰语", "th"],
    ["越南语", "vi"],
  ];
  const [src, setSrc] = useState("Hello, I'm Xiao Bai, your smart desktop pet!");
  const [from, setFrom] = useState("自动检测");
  const [to, setTo] = useState("中文");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ s: string; r: string; f: string; t: string }[]>([]);

  // 离线简易翻译：用内置词典做常见词覆盖
  const tinyDict: Record<string, Record<string, string>> = {
    en: {
      "hello": "你好",
      "world": "世界",
      "i": "我",
      "i'm": "我是",
      "im": "我是",
      "you": "你",
      "your": "你的",
      "smart": "智能",
      "desktop": "桌面",
      "pet": "宠物",
      "good": "好的",
      "morning": "早上",
      "afternoon": "下午",
      "evening": "晚上",
      "night": "夜晚",
      "thank": "谢谢",
      "thanks": "谢谢",
      "love": "爱",
      "study": "学习",
      "work": "工作",
      "game": "游戏",
      "weather": "天气",
      "translate": "翻译",
      "dictionary": "词典",
      "computer": "电脑",
      "music": "音乐",
      "friend": "朋友",
      "school": "学校",
      "teacher": "老师",
      "student": "学生",
      "book": "书本",
      "homework": "作业",
      "happy": "开心",
      "sad": "伤心",
      "dog": "狗",
      "cat": "猫",
    },
  };
  const offlineFallback = (text: string, fromLang: string, toLang: string) => {
    const toZh = toLang === "中文" || toLang === "zh-CN";
    const fromEn = fromLang === "英语" || fromLang === "en" || fromLang === "autodetect";
    if (toZh && fromEn) {
      // 逐词匹配
      const lower = text.toLowerCase().replace(/[,.!?;]/g, " ");
      let out = text;
      const dict = tinyDict.en || {};
      Object.keys(dict).forEach((k) => {
        const re = new RegExp(`\\b${k.replace(/'/g, "'?")}\\b`, "gi");
        out = out.replace(re, dict[k]);
      });
      if (out !== text) return out;
    }
    // 实在没法：原样返回 + 语言标记
    return `【离线模式 / ${fromLang}→${toLang}】${text}\n\n（下载桌面端接入完整在线翻译，准确率更高）`;
  };

  const run = async () => {
    if (!src.trim()) return;
    setLoading(true);
    try {
      const fromCode = LANGS.find((l) => l[0] === from)?.[1] || "autodetect";
      const toCode = LANGS.find((l) => l[0] === to)?.[1] || "zh-CN";
      // MyMemory 免费 API： langpair=src|tgt
      const lp = fromCode === "autodetect" ? `autodetect|${toCode}` : `${fromCode}|${toCode}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(src)}&langpair=${encodeURIComponent(lp)}`;
      const data = await fetch(url)
        .then((r) => r.json())
        .catch(() => null);
      let tr = data?.responseData?.translatedText || "";
      if (!tr || /INVALID LANGUAGE/i.test(tr)) tr = offlineFallback(src, from, to);
      setResult(tr);
      setHistory((h) => [{ s: src, r: tr, f: from, t: to }, ...h].slice(0, 20));
    } catch (e) {
      const tr = offlineFallback(src, from, to);
      setResult(tr);
      setHistory((h) => [{ s: src, r: tr, f: from, t: to }, ...h].slice(0, 20));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { run();   }, []);

  const swap = () => {
    if (from === "自动检测") return;
    const f = from;
    setFrom(to);
    setTo(f);
    setSrc(result);
    setResult("");
  };
  const copy = () => navigator.clipboard?.writeText(result);
  const speak = (text: string, lang: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    const map: Record<string, string> = {
      "中文": "zh-CN",
      "英语": "en-US",
      "日语": "ja-JP",
      "韩语": "ko-KR",
      "法语": "fr-FR",
      "德语": "de-DE",
      "西班牙语": "es-ES",
      "俄语": "ru-RU",
      "葡萄牙语": "pt-PT",
      "意大利语": "it-IT",
      "泰语": "th-TH",
      "越南语": "vi-VN",
    };
    u.lang = map[lang] || (from === "自动检测" ? "" : map[from] || "");
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 font-semibold text-indigo-800"
        >
          {LANGS.map(([n]) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button
          onClick={swap}
          className="rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 w-10 h-10 flex items-center justify-center font-bold"
          title="交换语言"
        >
          ⇄
        </button>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 font-semibold text-violet-800"
        >
          {LANGS.filter((l) => l[0] !== "自动检测").map(([n]) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button
          onClick={run}
          disabled={loading}
          className="ml-auto rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold px-6 py-2.5 shadow-md disabled:opacity-60"
        >
          {loading ? "翻译中..." : "立即翻译"}
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-indigo-200 overflow-hidden">
          <div className="bg-indigo-50 px-4 py-2 flex items-center justify-between border-b border-indigo-100">
            <div className="font-semibold text-indigo-800">{from}</div>
            <button onClick={() => speak(src, from === "自动检测" ? "英语" : from)} className="text-indigo-600 hover:bg-indigo-100 w-8 h-8 rounded-lg">🔊</button>
          </div>
          <textarea
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            rows={8}
            className="w-full p-4 focus:outline-none text-slate-800 text-[15px] leading-7 resize-none"
            placeholder="请输入要翻译的文字..."
          />
          <div className="px-4 py-2 text-right text-xs text-slate-500 border-t border-slate-100">{src.length} 字符</div>
        </div>
        <div className="rounded-2xl border border-violet-200 overflow-hidden">
          <div className="bg-violet-50 px-4 py-2 flex items-center justify-between border-b border-violet-100">
            <div className="font-semibold text-violet-800">{to}</div>
            <div className="flex gap-1">
              <button onClick={() => speak(result, to)} className="text-violet-600 hover:bg-violet-100 w-8 h-8 rounded-lg" disabled={!result}>🔊</button>
              <button onClick={copy} className="text-violet-600 hover:bg-violet-100 w-8 h-8 rounded-lg" disabled={!result} title="复制">📋</button>
            </div>
          </div>
          <div className="p-4 min-h-[220px] text-[15px] leading-7 text-slate-800 whitespace-pre-wrap">
            {loading ? <div className="text-slate-400">翻译中...</div> : result || <span className="text-slate-400">（翻译结果将显示在这里）</span>}
          </div>
          <div className="px-4 py-2 text-right text-xs text-slate-500 border-t border-slate-100">{result.length} 字符</div>
        </div>
      </div>
      {history.length > 0 && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <div className="font-bold text-slate-800 mb-3 flex items-center justify-between">
            <span>📜 最近翻译记录（{history.length}）</span>
            <button onClick={() => setHistory([])} className="text-xs text-slate-500 hover:text-rose-600 font-semibold">清空</button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {history.map((h, i) => (
              <div
                key={i}
                className="rounded-xl bg-white border border-slate-100 p-3 text-sm cursor-pointer hover:border-violet-300 hover:shadow-sm"
                onClick={() => { setSrc(h.s); setFrom(h.f); setTo(h.t); setResult(h.r); }}
              >
                <div className="text-slate-800">{h.s}</div>
                <div className="text-slate-400 text-xs my-1">{h.f} → {h.t}</div>
                <div className="text-violet-700 font-semibold">{h.r}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== 词典 =====================
/**
 * 中英词典：
 * - 英文单词查询：api.dictionaryapi.dev 免费 API
 * - 支持音标、发音音频、词性、释义、例句、同义词、反义词
 * - 中文词汇：回退到内置词典 + 提示
 */
function AiDict() {
  const [word, setWord] = useState("hello");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("pg_dict_favs") || "[]"); } catch (e) { return []; }
  });

  // 内置常用中文词简易英英/英汉词典
  const localDict: Record<string, any> = {
    "你好": {
      word: "你好",
      phonetic: "nǐ hǎo",
      audio: "",
      meanings: [{
        part_of_speech: "感叹词",
        definitions: [{
          definition: "日常打招呼用语，用于见面或问好",
          example: "你好，我是小白，很高兴认识你！",
          synonyms: ["您好", "嗨", "Hi"],
          antonyms: ["再见"],
        }],
        synonyms: ["您好", "嗨", "Hello"],
        antonyms: ["再见", "拜拜"],
      }],
      note: "本地内置中文词条示例（桌面端接入更全汉语词典）",
    },
    "学习": {
      word: "学习",
      phonetic: "xué xí",
      audio: "",
      meanings: [{
        part_of_speech: "动词",
        definitions: [{
          definition: "通过阅读、听讲、研究、实践等获得知识或技能",
          example: "小白每天陪你一起学习！",
          synonyms: ["学", "钻研", "攻读"],
          antonyms: ["玩耍", "荒废"],
        }],
        synonyms: ["学", "钻研"],
        antonyms: ["玩耍"],
      }],
      note: "本地内置中文词条示例",
    },
  };

  const lookup = async () => {
    if (!word.trim()) return;
    setLoading(true);
    setError(null);
    const w = word.trim().toLowerCase();
    try {
      // 先检测是不是中文
      if (/[\u4e00-\u9fa5]/.test(w) && localDict[w]) {
        setResult(localDict[w]);
        return;
      }
      if (/[\u4e00-\u9fa5]/.test(w) && !localDict[w]) {
        setResult({ word: w, note: "中文词的完整释义请下载桌面端，网站端重点支持英文查询。", meanings: [] });
        return;
      }
      const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`;
      const data = await fetch(url).then((r) => r.json()).catch(() => null);
      if (Array.isArray(data) && data[0]) {
        const d = data[0];
        let audio = "";
        let phonetic = d.phonetic || "";
        for (const p of d.phonetics || []) {
          if (p.audio && !audio) audio = p.audio;
          if (p.text && !phonetic) phonetic = p.text;
        }
        const meanings = (d.meanings || []).map((m: any) => ({
          part_of_speech: m.partOfSpeech,
          definitions: (m.definitions || []).slice(0, 6).map((dd: any) => ({
            definition: dd.definition,
            example: dd.example || "",
            synonyms: dd.synonyms || [],
            antonyms: dd.antonyms || [],
          })),
          synonyms: m.synonyms || [],
          antonyms: m.antonyms || [],
        }));
        setResult({ word: d.word, phonetic, audio, meanings, note: "来源：Free Dictionary API" });
      } else {
        setError(`未找到单词「${word}」的释义`);
        setResult(null);
      }
    } catch (e: any) {
      setError(e?.message || "查询失败");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { lookup();   }, []);

  const play = () => {
    if (!result?.audio) return;
    try { new Audio(result.audio).play(); } catch (e) { /* 刻意忽略已知可恢复异常 */ }
  };
  const pronounce = () => {
    if (!("speechSynthesis" in window) || !result?.word) return;
    const u = new SpeechSynthesisUtterance(result.word);
    u.lang = /[\u4e00-\u9fa5]/.test(result.word) ? "zh-CN" : "en-US";
    window.speechSynthesis.speak(u);
  };
  const toggleFav = () => {
    if (!result?.word) return;
    const w = result.word;
    const has = favorites.includes(w);
    const next = has ? favorites.filter((x) => x !== w) : [w, ...favorites].slice(0, 100);
    setFavorites(next);
    localStorage.setItem("pg_dict_favs", JSON.stringify(next));
  };
  const isFav = favorites.includes(result?.word);

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-1.5 max-w-xl">
          <span className="text-emerald-600">📖</span>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            placeholder="输入单词 / 中文词，如 hello / 你好"
            className="flex-1 bg-transparent py-2 px-1 focus:outline-none text-slate-800 font-semibold"
          />
        </div>
        <button
          onClick={lookup}
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold px-6 py-2.5 shadow-md disabled:opacity-60"
        >
          {loading ? "查询中..." : "查词"}
        </button>
        {result?.word && (
          <button
            onClick={toggleFav}
            className={`rounded-xl px-4 py-2.5 font-bold border ${
              isFav ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {isFav ? "❤️ 已收藏" : "🤍 收藏"}
          </button>
        )}
      </div>
      {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-700 text-sm">{error}</div>}
      {result && (
        <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 p-5 md:p-7 space-y-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">{result.word}</h2>
                {result.phonetic && <div className="text-lg text-slate-500 font-mono">{result.phonetic}</div>}
              </div>
              {result.note && <div className="mt-2 text-xs text-slate-500">{result.note}</div>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={play}
                disabled={!result.audio}
                className="rounded-xl bg-emerald-100 disabled:opacity-40 text-emerald-700 px-4 py-2 font-semibold flex items-center gap-1"
                title="真人发音 MP3"
              >
                🔊 发音
              </button>
              <button
                onClick={pronounce}
                className="rounded-xl bg-teal-100 text-teal-700 px-4 py-2 font-semibold flex items-center gap-1"
                title="浏览器朗读"
              >
                📢 朗读
              </button>
            </div>
          </div>
          {/* 每个词性一个区块 */}
          {result.meanings?.length === 0 ? (
            <div className="text-sm text-slate-500">（暂无释义）</div>
          ) : (
            result.meanings?.map((m: any, i: number) => (
              <div key={i} className="rounded-2xl bg-white border border-slate-100 p-4 md:p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white px-3 py-1 text-xs font-bold">
                    {m.part_of_speech}
                  </span>
                  {m.synonyms?.length > 0 && (
                    <div className="text-xs text-slate-500">
                      同义词：
                      {m.synonyms.slice(0, 5).map((s: string) => (
                        <span key={s} className="ml-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <ol className="space-y-3">
                  {m.definitions?.map((d: any, j: number) => (
                    <li key={j} className="flex gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">{j + 1}</span>
                      <div className="flex-1">
                        <div className="text-slate-800 leading-7">{d.definition}</div>
                        {d.example && (
                          <div className="mt-1 text-sm text-slate-600 italic border-l-2 border-emerald-200 pl-3">
                            例：{d.example}
                          </div>
                        )}
                        {(d.synonyms?.length > 0 || d.antonyms?.length > 0) && (
                          <div className="mt-1 text-xs space-x-2">
                            {d.synonyms?.length > 0 && (
                              <span className="text-emerald-700">同：{d.synonyms.slice(0, 4).join(", ")}</span>
                            )}
                            {d.antonyms?.length > 0 && (
                              <span className="text-rose-700">反：{d.antonyms.slice(0, 4).join(", ")}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))
          )}
          {/* 收藏夹 */}
          {favorites.length > 0 && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-amber-800">⭐ 生词本（{favorites.length}）</div>
                <button onClick={() => { setFavorites([]); localStorage.removeItem("pg_dict_favs"); }} className="text-xs text-slate-500 hover:text-rose-600 font-semibold">清空</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {favorites.map((f) => (
                  <button
                    key={f}
                    onClick={() => { setWord(f); lookup(); }}
                    className="rounded-full bg-white px-3 py-1.5 text-sm text-amber-800 border border-amber-200 hover:bg-amber-100 hover:shadow-sm"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===================== 飞机大战 =====================
/**
 * 飞机大战：纵向卷轴射击游戏
 * 玩家飞机固定在底部，鼠标/键盘控制左右移动，子弹自动向上发射
 * 敌机从顶部随机出现向下移动，击中 +10 分，被撞即游戏结束
 * 难度随分数提升（敌机生成更快、速度更快）
 */
function GameAircraft() {
  const W = 480;
  const H = 600;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const particles = useRef(createParticleSystem());
  const ft = useRef(createFloatTextSystem());
  const [highScore, setHighScore] = useState<number>(() => getHighScore("game-aircraft"));
  const [paused, setPaused] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const stateRef = useRef({
    px: W / 2,
    bullets: [] as { x: number; y: number }[],
    enemies: [] as { x: number; y: number; vy: number; hp: number }[],
    score: 0,
    cool: 0,
    spawn: 0,
    running: true,
    over: false,
    paused: false,
  });
  const [, force] = useState(0);

  const restart = () => {
    const s = stateRef.current;
    s.px = W / 2;
    s.bullets = [];
    s.enemies = [];
    s.score = 0;
    s.cool = 0;
    s.spawn = 0;
    s.running = true;
    s.over = false;
    s.paused = false;
    particles.current.clear();
    ft.current.clear();
    setPaused(false);
    setNewRecord(false);
    setHighScore(getHighScore("game-aircraft"));
    force((x) => x + 1);
  };

  const togglePause = () => {
    const s = stateRef.current;
    if (s.over) return;
    s.paused = !s.paused;
    setPaused(s.paused);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === " " || e.key.toLowerCase() === "p") {
        e.preventDefault();
        togglePause();
      }
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => (keysRef.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let raf = 0;
    const loop = () => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d")!;
        const s = stateRef.current;
        if (s.running && !s.over && !s.paused) {
          if (keysRef.current["arrowleft"] || keysRef.current["a"]) s.px -= 6;
          if (keysRef.current["arrowright"] || keysRef.current["d"]) s.px += 6;
          s.px = clamp(s.px, 20, W - 20);
          s.cool--;
          if (s.cool <= 0) {
            s.bullets.push({ x: s.px, y: H - 60 });
            s.cool = 8;
          }
          for (const b of s.bullets) b.y -= 8;
          s.bullets = s.bullets.filter((b) => b.y > -10);
          const speedBase = 1.5 + Math.floor(s.score / 50) * 0.5;
          s.spawn--;
          if (s.spawn <= 0) {
            s.enemies.push({
              x: 20 + Math.random() * (W - 40),
              y: -20,
              vy: speedBase + Math.random() * 1.5,
              hp: 1,
            });
            s.spawn = Math.max(20, 60 - Math.floor(s.score / 30) * 4);
          }
          for (const e of s.enemies) e.y += e.vy;
          for (const b of s.bullets) {
            for (const e of s.enemies) {
              if (e.hp > 0 && Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) {
                e.hp = 0;
                b.y = -100;
                s.score += 10;
                particles.current.burst(e.x, e.y, 16, ["#f472b6", "#fb7185", "#f43f5e", "#fde047"], 4.5, 32);
                ft.current.spawn(e.x, e.y - 10, "+10", "#fde047", 18, 40);
              }
            }
          }
          s.enemies = s.enemies.filter((e) => e.hp > 0 && e.y < H + 20);
          for (const e of s.enemies) {
            if (Math.abs(e.x - s.px) < 22 && Math.abs(e.y - (H - 50)) < 22) {
              s.over = true;
              s.running = false;
              particles.current.burst(s.px, H - 50, 28, ["#22d3ee", "#06b6d4", "#fde047", "#f97316", "#ef4444"], 5.5, 44);
              const isNew = updateHighScore("game-aircraft", s.score);
              if (isNew) {
                setNewRecord(true);
                setHighScore(s.score);
              }
            }
          }
        }
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        for (let i = 0; i < 30; i++) {
          ctx.fillRect((i * 37) % W, (i * 53 + (Date.now() / 30) % H) % H, 2, 2);
        }
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.moveTo(s.px, H - 60);
        ctx.lineTo(s.px - 16, H - 36);
        ctx.lineTo(s.px + 16, H - 36);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fde047";
        for (const b of s.bullets) ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
        ctx.fillStyle = "#f472b6";
        for (const e of s.enemies) {
          ctx.beginPath();
          ctx.moveTo(e.x, e.y + 14);
          ctx.lineTo(e.x - 14, e.y - 10);
          ctx.lineTo(e.x + 14, e.y - 10);
          ctx.closePath();
          ctx.fill();
        }
        particles.current.step(ctx, 0.1);
        ft.current.step(ctx);
        if (s.paused && !s.over) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.font = "bold 44px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("⏸ 已暂停", W / 2, H / 2);
          ctx.font = "16px system-ui";
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillText("按空格 / P 或点击右上角继续", W / 2, H / 2 + 44);
        }
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 20px system-ui";
        ctx.textAlign = "left";
        ctx.fillText("得分 " + s.score, 12, 26);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf);
    };
     
  }, []);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    stateRef.current.px = clamp(x, 20, W - 20);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c || !e.touches[0]) return;
    e.preventDefault();
    const p = canvasLogicalPoint(c, e.touches[0].clientX, e.touches[0].clientY, W, H);
    stateRef.current.px = clamp(p.x, 20, W - 20);
  };

  const s = stateRef.current;
  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="rounded-2xl bg-cyan-50 border border-cyan-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-cyan-600">得分</div>
            <div className="text-xl font-bold text-cyan-700">{s.score}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-amber-600">最高分</div>
            <div className="text-xl font-bold text-amber-700">{highScore}</div>
          </div>
          <button
            onClick={restart}
            className="ml-auto rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-4 py-2 text-sm shadow-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            重开
          </button>
        </div>

        <GameHintBar>
          <Hint>⌨️ <Key k="←" /><Key k="→" /> 或 <Key k="A" /><Key k="D" /> 移动</Hint>
          <Hint>🖱️ 鼠标移动控制</Hint>
          <Hint>📱 触摸滑动控制</Hint>
          <Hint>🔫 自动开火</Hint>
          <Hint><Key k="空格" /> / <Key k="P" /> 暂停</Hint>
        </GameHintBar>

        <div className="relative mx-auto max-w-[480px]">
          <PauseButton paused={paused} toggle={togglePause} />
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onMouseMove={onMove}
            onTouchMove={onTouchMove}
            className="w-full rounded-2xl shadow-2xl touch-none"
            style={{ aspectRatio: "4 / 5" }}
          />
          {s.over && (
            <GameResultOverlay
              title="飞机坠毁"
              success={false}
              stats={[{ label: "本局得分", value: s.score }]}
              highLabel="历史最高分"
              highScore={highScore}
              newRecord={newRecord}
              onRestart={restart}
              primaryColor="from-cyan-500 to-blue-600"
            />
          )}
        </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 打砖块 =====================
/**
 * 打砖块：底部挡板控制小球反弹，击碎顶部 4 行彩色砖块
 * 砖块每行分值不同（顶行 50，依次递减到 10）
 * 球落地 = 游戏结束，清空全部砖块 = 通关
 */
function GameBreakout() {
  const W = 480;
  const H = 540;
  const ROWS = 4;
  const COLS = 10;
  const BW = 42;
  const BH = 18;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const particles = useRef(createParticleSystem());
  const ft = useRef(createFloatTextSystem());
  const [highScore, setHighScore] = useState<number>(() => getHighScore("game-breakout"));
  const [paused, setPaused] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  type Brick = { x: number; y: number; alive: boolean; color: string; score: number };
  const stateRef = useRef({
    paddle: W / 2 - 40,
    bx: W / 2,
    by: H - 60,
    bvx: 3,
    bvy: -3,
    bricks: [] as Brick[],
    score: 0,
    running: true,
    over: false,
    won: false,
    paused: false,
    launched: false,
  });
  const [, force] = useState(0);

  const buildBricks = (): Brick[] => {
    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"];
    const scores = [50, 30, 20, 10];
    const arr: Brick[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        arr.push({
          x: c * BW + 30,
          y: r * BH + 40,
          alive: true,
          color: colors[r],
          score: scores[r],
        });
      }
    }
    return arr;
  };

  const restart = () => {
    const s = stateRef.current;
    s.paddle = W / 2 - 40;
    s.bx = W / 2;
    s.by = H - 32;
    s.bvx = 3 * (Math.random() < 0.5 ? -1 : 1);
    s.bvy = -3;
    s.bricks = buildBricks();
    s.score = 0;
    s.running = true;
    s.over = false;
    s.won = false;
    s.paused = false;
    s.launched = false;
    particles.current.clear();
    ft.current.clear();
    setPaused(false);
    setNewRecord(false);
    setHighScore(getHighScore("game-breakout"));
    force((x) => x + 1);
  };

  const togglePause = () => {
    const s = stateRef.current;
    if (s.over || s.won) return;
    s.paused = !s.paused;
    setPaused(s.paused);
  };

  const launchBall = () => {
    const s = stateRef.current;
    if (s.over || s.won || s.paused) return;
    if (!s.launched) {
      s.launched = true;
      s.bvx = 3 * (Math.random() < 0.5 ? -1 : 1);
      s.bvy = -3.5;
    }
  };

  const checkHighScore = (score: number) => {
    const isNew = updateHighScore("game-breakout", score);
    if (isNew) {
      setNewRecord(true);
      setHighScore(score);
    }
  };

  useEffect(() => {
    restart();
    const down = (e: KeyboardEvent) => {
      if (e.key === " " || e.key.toLowerCase() === "p") {
        e.preventDefault();
        const s = stateRef.current;
        if (!s.launched && !s.over && !s.won) {
          launchBall();
        } else {
          togglePause();
        }
        return;
      }
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => (keysRef.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let raf = 0;
    const loop = () => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d")!;
        const s = stateRef.current;
        if (s.running && !s.over && !s.won && !s.paused) {
          if (keysRef.current["arrowleft"] || keysRef.current["a"]) s.paddle -= 6;
          if (keysRef.current["arrowright"] || keysRef.current["d"]) s.paddle += 6;
          s.paddle = clamp(s.paddle, 0, W - 80);
          if (s.launched) {
            s.bx += s.bvx;
            s.by += s.bvy;
            if (s.bx < 8) { s.bx = 8; s.bvx = Math.abs(s.bvx); }
            if (s.bx > W - 8) { s.bx = W - 8; s.bvx = -Math.abs(s.bvx); }
            if (s.by < 8) { s.by = 8; s.bvy = Math.abs(s.bvy); }
            if (s.by > H - 24 && s.by < H - 12 && s.bx > s.paddle && s.bx < s.paddle + 80) {
              s.bvy = -Math.abs(s.bvy);
              s.bvx += ((s.bx - (s.paddle + 40)) / 40) * 1.5;
              s.bvx = clamp(s.bvx, -5, 5);
              particles.current.burst(s.bx, H - 20, 3, ["#e2e8f0", "#cbd5e1", "#fde047"], 2, 18);
            }
            if (s.by > H) {
              s.over = true;
              s.running = false;
              checkHighScore(s.score);
            }
            for (const b of s.bricks) {
              if (!b.alive) continue;
              if (s.bx > b.x && s.bx < b.x + BW && s.by > b.y && s.by < b.y + BH) {
                b.alive = false;
                s.bvy = -s.bvy;
                s.score += b.score;
                particles.current.burst(b.x + BW / 2, b.y + BH / 2, 10, [b.color, "#ffffff", "#fde047"], 3.5, 28);
                ft.current.spawn(b.x + BW / 2, b.y - 4, "+" + b.score, "#fde047", 16, 40);
                break;
              }
            }
            if (s.bricks.every((b) => !b.alive)) {
              s.won = true;
              s.running = false;
              checkHighScore(s.score);
            }
          } else {
            s.bx = s.paddle + 40;
            s.by = H - 32;
          }
        }
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);
        for (const b of s.bricks) {
          if (!b.alive) continue;
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, BW - 2, BH - 2);
        }
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(s.paddle, H - 20, 80, 10);
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.arc(s.bx, s.by, 7, 0, Math.PI * 2);
        ctx.fill();
        particles.current.step(ctx, 0.12);
        ft.current.step(ctx);
        if (!s.launched && !s.over && !s.won && !s.paused) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = "bold 18px system-ui";
          ctx.textAlign = "center";
          ctx.fillText("点击 / 按空格发射小球", W / 2, H / 2 + 40);
        }
        if (s.paused && !s.over && !s.won) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.font = "bold 44px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("⏸ 已暂停", W / 2, H / 2);
          ctx.font = "16px system-ui";
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillText("按空格 / P 或点击右上角继续", W / 2, H / 2 + 44);
        }
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 18px system-ui";
        ctx.textAlign = "left";
        ctx.fillText("得分 " + s.score, 12, 24);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    stateRef.current.paddle = clamp(x - 40, 0, W - 80);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c || !e.touches[0]) return;
    e.preventDefault();
    const p = canvasLogicalPoint(c, e.touches[0].clientX, e.touches[0].clientY, W, H);
    stateRef.current.paddle = clamp(p.x - 40, 0, W - 80);
  };

  const onCanvasClick = () => {
    launchBall();
  };

  const s = stateRef.current;
  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-amber-600">得分</div>
            <div className="text-xl font-bold text-amber-700">{s.score}</div>
          </div>
          <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-rose-600">剩余砖块</div>
            <div className="text-xl font-bold text-rose-700">{s.bricks.filter((b) => b.alive).length}</div>
          </div>
          <div className="rounded-2xl bg-violet-50 border border-violet-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-violet-600">最高分</div>
            <div className="text-xl font-bold text-violet-700">{highScore}</div>
          </div>
          <button
            onClick={restart}
            className="ml-auto rounded-xl bg-gradient-to-r from-orange-400 to-red-500 text-white font-semibold px-4 py-2 text-sm shadow-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            重开
          </button>
        </div>

        <GameHintBar>
          <Hint>⌨️ <Key k="←" /><Key k="→" /> 或 <Key k="A" /><Key k="D" /> 移动挡板</Hint>
          <Hint>🖱️ 鼠标移动控制</Hint>
          <Hint>📱 触摸滑动控制</Hint>
          <Hint>🎯 <Key k="空格" /> / 点击 发射小球</Hint>
          <Hint><Key k="P" /> 暂停</Hint>
        </GameHintBar>

        <div className="relative mx-auto max-w-[480px]">
          <PauseButton paused={paused} toggle={togglePause} />
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onMouseMove={onMove}
            onTouchMove={onTouchMove}
            onClick={onCanvasClick}
            className="w-full rounded-2xl shadow-2xl touch-none cursor-pointer"
            style={{ aspectRatio: "8 / 9" }}
          />
          {s.over && (
            <GameResultOverlay
              title="球落地了"
              success={false}
              stats={[
                { label: "本局得分", value: s.score },
                { label: "剩余砖块", value: s.bricks.filter((b) => b.alive).length },
              ]}
              highLabel="历史最高分"
              highScore={highScore}
              newRecord={newRecord}
              onRestart={restart}
              primaryColor="from-orange-400 to-red-500"
            />
          )}
          {s.won && (
            <GameResultOverlay
              title="通关胜利！"
              success={true}
              stats={[
                { label: "本局得分", value: s.score },
                { label: "击碎砖块", value: ROWS * COLS },
              ]}
              highLabel="历史最高分"
              highScore={highScore}
              newRecord={newRecord}
              onRestart={restart}
              primaryColor="from-orange-400 to-red-500"
            />
          )}
        </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== Flappy Bird =====================
/**
 * Flappy Bird：点击/空格让小鸟跳跃对抗重力
 * 管道从右侧出现，间隙随机，穿过管道 +1 分
 * 碰到管道或落地/顶 = 游戏结束
 */
function GameFlappy() {
  const W = 420;
  const H = 560;
  const GAP = 140;
  const PIPE_W = 60;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const jumpRef = useRef<() => void>(() => {});
  const particlesRef = useRef(createParticleSystem());
  const floatsRef = useRef(createFloatTextSystem());
  const stateRef = useRef({
    by: H / 2,
    vy: 0,
    pipes: [] as { x: number; gapY: number; passed: boolean }[],
    spawn: 0,
    score: 0,
    running: true,
    over: false,
    paused: false,
    newRecord: false,
  });
  const [, force] = useState(0);
  const [paused, setPaused] = useState(false);
  const [highScore, setHighScore] = useState(() => getHighScore("game-flappy"));
  const [resultOpen, setResultOpen] = useState(false);
  const [resultScore, setResultScore] = useState(0);
  const [resultNewRecord, setResultNewRecord] = useState(false);

  const restart = () => {
    const s = stateRef.current;
    s.by = H / 2;
    s.vy = 0;
    s.pipes = [];
    s.spawn = 0;
    s.score = 0;
    s.running = true;
    s.over = false;
    s.paused = false;
    s.newRecord = false;
    particlesRef.current.clear();
    floatsRef.current.clear();
    setPaused(false);
    setResultOpen(false);
    force((x) => x + 1);
  };

  const togglePause = () => {
    const s = stateRef.current;
    if (s.over) return;
    s.paused = !s.paused;
    setPaused(s.paused);
  };

  jumpRef.current = () => {
    const s = stateRef.current;
    if (s.over) {
      restart();
      return;
    }
    if (s.paused) {
      togglePause();
      return;
    }
    s.vy = -7;
    s.running = true;
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        togglePause();
        return;
      }
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        const s = stateRef.current;
        if (!s.over && !s.paused && s.running) {
          jumpRef.current();
        } else if (s.paused) {
          togglePause();
        } else {
          jumpRef.current();
        }
      }
    };
    window.addEventListener("keydown", key);
    let raf = 0;
    const loop = () => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d")!;
        const s = stateRef.current;
        if (s.running && !s.over && !s.paused) {
          s.vy += 0.35;
          s.by += s.vy;
          s.spawn--;
          if (s.spawn <= 0) {
            s.pipes.push({ x: W, gapY: 80 + Math.random() * (H - 160 - GAP), passed: false });
            s.spawn = 100;
          }
          for (const p of s.pipes) p.x -= 2.5;
          for (const p of s.pipes) {
            if (!p.passed && p.x + PIPE_W < 60) {
              p.passed = true;
              s.score++;
              particlesRef.current.burst(60, s.by, 8, ["#facc15", "#eab308", "#a3e635", "#84cc16"], 3.5, 32);
              floatsRef.current.spawn(60, s.by - 20, "+1", "#facc15", 20, 48);
            }
            if (60 + 14 > p.x && 60 - 14 < p.x + PIPE_W) {
              if (s.by - 14 < p.gapY || s.by + 14 > p.gapY + GAP) {
                if (!s.over) {
                  s.over = true;
                  particlesRef.current.burst(60, s.by, 20, ["#ef4444", "#f97316", "#fbbf24", "#fde047"], 5, 40);
                  const nr = updateHighScore("game-flappy", s.score);
                  s.newRecord = nr;
                  if (nr) setHighScore(getHighScore("game-flappy"));
                  setResultScore(s.score);
                  setResultNewRecord(nr);
                  setResultOpen(true);
                }
              }
            }
          }
          s.pipes = s.pipes.filter((p) => p.x > -PIPE_W);
          if (s.by > H - 14 || s.by < 14) {
            if (!s.over) {
              s.over = true;
              particlesRef.current.burst(60, clamp(s.by, 14, H - 14), 20, ["#ef4444", "#f97316", "#fbbf24", "#fde047"], 5, 40);
              const nr = updateHighScore("game-flappy", s.score);
              s.newRecord = nr;
              if (nr) setHighScore(getHighScore("game-flappy"));
              setResultScore(s.score);
              setResultNewRecord(nr);
              setResultOpen(true);
            }
          }
        }
        ctx.fillStyle = "#7dd3fc";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#22c55e";
        for (const p of s.pipes) {
          ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
          ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, H - p.gapY - GAP);
        }
        ctx.fillStyle = "#ca8a04";
        ctx.fillRect(0, H - 12, W, 12);
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.arc(60, s.by, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(66, s.by - 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        particlesRef.current.step(ctx, 0.12);
        floatsRef.current.step(ctx);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 32px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(String(s.score), W / 2, 50);
        if (s.paused && !s.over) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 40px system-ui";
          ctx.textAlign = "center";
          ctx.fillText("⏸ 已暂停", W / 2, H / 2 - 10);
          ctx.font = "16px system-ui";
          ctx.fillStyle = "#e2e8f0";
          ctx.fillText("按 P / 空格 或点击右上角继续", W / 2, H / 2 + 24);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", key);
      cancelAnimationFrame(raf);
    };
     
  }, []);

  const s = stateRef.current;
  const onCanvasTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    jumpRef.current();
  };
  const onCanvasClick = () => {
    jumpRef.current();
  };

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
        <GameHintBar>
          <Hint><Key k="空格" /> / 点击画布 跳跃</Hint>
          <Hint><Key k="P" /> 暂停</Hint>
          <Hint>📱 触摸屏幕跳跃</Hint>
        </GameHintBar>
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-sky-600">得分</div>
            <div className="text-xl font-bold text-sky-700">{s.score}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-amber-600">最高分</div>
            <div className="text-xl font-bold text-amber-700">{highScore}</div>
          </div>
          <button
            onClick={restart}
            className="ml-auto rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold px-4 py-2 text-sm shadow-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            重开
          </button>
        </div>
        <div className="mx-auto max-w-[420px] relative">
          <PauseButton paused={paused} toggle={togglePause} />
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onClick={onCanvasClick}
            onTouchStart={onCanvasTouch}
            className="w-full rounded-2xl shadow-2xl cursor-pointer block"
            style={{ aspectRatio: "3 / 4" }}
          />
          {resultOpen && (
            <GameResultOverlay
              title="游戏结束"
              success={false}
              stats={[{ label: "本局得分", value: resultScore }]}
              highLabel="最高分"
              highScore={highScore}
              newRecord={resultNewRecord}
              onRestart={restart}
              primaryColor="from-yellow-400 to-green-500"
            />
          )}
        </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 贪吃蛇大作战 =====================
/**
 * 贪吃蛇大作战：玩家蛇 + 3 条 AI 蛇同场竞技
 * 玩家用方向键控制，AI 蛇简单追踪最近的食物
 * 吃食物变长，撞墙/撞任意蛇身即淘汰，显示存活蛇数量
 */
function GameSnakeArena() {
  const GW = 36;
  const GH = 28;
  const CELL = 16;
  const W = GW * CELL;
  const H = GH * CELL;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dirRef = useRef<[number, number]>([1, 0]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  type Seg = { x: number; y: number };
  type Snake = { body: Seg[]; dir: [number, number]; alive: boolean; isPlayer: boolean; color: string };
  const stateRef = useRef({
    snakes: [] as Snake[],
    foods: [] as Seg[],
    score: 0,
    tick: 0,
    over: false,
    ended: false,
    newRecord: false,
    initLen: 3,
  });
  const [, force] = useState(0);
  const [highScore, setHighScore] = useState(() => getHighScore("game-snake-arena"));
  const [showResult, setShowResult] = useState(false);
  const [resultScore, setResultScore] = useState(0);
  const [resultAlive, setResultAlive] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  const makeSnake = (x: number, y: number, color: string, isPlayer: boolean): Snake => ({
    body: [{ x, y }, { x: x - 1, y }, { x: x - 2, y }],
    dir: [1, 0],
    alive: true,
    isPlayer,
    color,
  });

  const spawnFood = (snakes: Snake[]): Seg => {
    const occupied = new Set<string>();
    for (const sn of snakes) for (const seg of sn.body) occupied.add(seg.x + "," + seg.y);
    const free: Seg[] = [];
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++)
        if (!occupied.has(x + "," + y)) free.push({ x, y });
    return free.length ? free[Math.floor(Math.random() * free.length)] : { x: 0, y: 0 };
  };

  const restart = () => {
    const snakes: Snake[] = [
      makeSnake(8, 14, "#22d3ee", true),
      makeSnake(28, 8, "#f472b6", false),
      makeSnake(28, 20, "#a78bfa", false),
      makeSnake(16, 22, "#fbbf24", false),
    ];
    const foods: Seg[] = [];
    for (let i = 0; i < 6; i++) foods.push(spawnFood(snakes));
    dirRef.current = [1, 0];
    stateRef.current.snakes = snakes;
    stateRef.current.foods = foods;
    stateRef.current.score = 0;
    stateRef.current.tick = 0;
    stateRef.current.over = false;
    stateRef.current.ended = false;
    stateRef.current.newRecord = false;
    setShowResult(false);
    setNewRecord(false);
    force((x) => x + 1);
  };

    const finalScore = 0; // 占位：此处可接入具体游戏评分公式（P3 迭代）
  const endGame = () => {
    const s = stateRef.current;
    if (s.ended) return;
    const finalScore = 0; // 占位：此处可接入具体游戏评分公式（P3 迭代）
    s.ended = true;
    const player = s.snakes.find((sn) => sn.isPlayer);
    const nr = updateHighScore("game-snake-arena", finalScore);
    s.newRecord = nr;
    if (nr) setHighScore(getHighScore("game-snake-arena"));
    setResultScore(finalScore);
    setResultAlive(s.snakes.filter((sn) => sn.alive).length);
    setNewRecord(nr);
    setTimeout(() => setShowResult(true), 350);
  };

  const changeDir = (nd: [number, number]) => {
    const d = dirRef.current;
    if (d[0] + nd[0] === 0 && d[1] + nd[1] === 0) return;
    dirRef.current = nd;
  };

  useEffect(() => {
    restart();
    const key = (e: KeyboardEvent) => {
      const d = dirRef.current;
      if (e.key === "ArrowUp" && d[1] !== 1) { changeDir([0, -1]); e.preventDefault(); }
      if (e.key === "ArrowDown" && d[1] !== -1) { changeDir([0, 1]); e.preventDefault(); }
      if (e.key === "ArrowLeft" && d[0] !== 1) { changeDir([-1, 0]); e.preventDefault(); }
      if (e.key === "ArrowRight" && d[0] !== -1) { changeDir([1, 0]); e.preventDefault(); }
    };
    window.addEventListener("keydown", key);
    let raf = 0;
    const loop = () => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d")!;
        const s = stateRef.current;
        s.tick++;
        if (s.tick % 8 === 0 && !s.over) {
          const player = s.snakes.find((sn) => sn.isPlayer);
          if (player && player.alive) player.dir = dirRef.current;
          for (const sn of s.snakes) {
            if (!sn.alive || sn.isPlayer) continue;
            const head = sn.body[0];
            let best: Seg | null = null;
            let bestD = Infinity;
            for (const f of s.foods) {
              const d = Math.abs(f.x - head.x) + Math.abs(f.y - head.y);
              if (d < bestD) { bestD = d; best = f; }
            }
            if (best) {
              const dx = Math.sign(best.x - head.x);
              const dy = Math.sign(best.y - head.y);
              if (dx !== 0 && sn.dir[0] === 0) sn.dir = [dx, 0];
              else if (dy !== 0 && sn.dir[1] === 0) sn.dir = [0, dy];
            }
          }
          for (const sn of s.snakes) {
            if (!sn.alive) continue;
            const head = sn.body[0];
            const nh: Seg = { x: head.x + sn.dir[0], y: head.y + sn.dir[1] };
            if (nh.x < 0 || nh.x >= GW || nh.y < 0 || nh.y >= GH) { sn.alive = false; continue; }
            let hit = false;
            for (const o of s.snakes) {
              for (const seg of o.body) {
                if (seg.x === nh.x && seg.y === nh.y) { hit = true; break; }
              }
              if (hit) break;
            }
            if (hit) { sn.alive = false; continue; }
            sn.body.unshift(nh);
            const fi = s.foods.findIndex((f) => f.x === nh.x && f.y === nh.y);
            if (fi >= 0) {
              s.foods.splice(fi, 1);
              s.foods.push(spawnFood(s.snakes));
              if (sn.isPlayer) s.score += 10;
            } else {
              sn.body.pop();
            }
          }
          if (player && !player.alive) {
            s.over = true;
            endGame();
          }
        }
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(148,163,184,0.06)";
        ctx.lineWidth = 1;
        for (let x = 1; x < GW; x++) {
          ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
        }
        for (let y = 1; y < GH; y++) {
          ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke();
        }
        ctx.fillStyle = "#f87171";
        for (const f of s.foods) {
          ctx.beginPath();
          ctx.arc(f.x * CELL + CELL / 2, f.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const sn of s.snakes) {
          if (!sn.alive) continue;
          ctx.fillStyle = sn.color;
          for (let i = 0; i < sn.body.length; i++) {
            const seg = sn.body[i];
            const t = i / Math.max(1, sn.body.length);
            ctx.globalAlpha = 1 - t * 0.4;
            ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
          }
          ctx.globalAlpha = 1;
          const h = sn.body[0];
          ctx.fillStyle = "#fff";
          ctx.fillRect(h.x * CELL + 4, h.y * CELL + 4, 3, 3);
          ctx.fillRect(h.x * CELL + CELL - 7, h.y * CELL + 4, 3, 3);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", key);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = stateRef.current;
  const player = s.snakes.find((sn) => sn.isPlayer);
  const curScore = player ? (player.body.length - s.initLen) * 10 : 0;
  const aliveCount = s.snakes.filter((sn) => sn.alive).length;

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="rounded-2xl bg-cyan-50 border border-cyan-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-cyan-600">玩家得分</div>
            <div className="text-xl font-bold text-cyan-700">{curScore}</div>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-emerald-600">存活蛇数</div>
            <div className="text-xl font-bold text-emerald-700">{aliveCount}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-amber-600">最高分</div>
            <div className="text-xl font-bold text-amber-700">{highScore}</div>
          </div>
          <button
            onClick={restart}
            className="ml-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-4 py-2 text-sm shadow-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            重开
          </button>
        </div>

        <GameHintBar>
          <Hint>🎮 方向键 / WASD <Key k="↑" /><Key k="↓" /><Key k="←" /><Key k="→" /> 移动</Hint>
          <Hint>🍎 吃红色食物变长得分</Hint>
          <Hint>💥 撞墙/撞蛇身即淘汰</Hint>
          <Hint>📱 滑动屏幕改变方向</Hint>
        </GameHintBar>

        <div className="mx-auto max-w-[640px] relative">
          <div className="relative rounded-2xl bg-slate-900 p-1.5 shadow-2xl overflow-hidden">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full rounded-xl block"
              style={{ aspectRatio: `${GW} / ${GH}`, imageRendering: "pixelated" }}
              onTouchStart={(e) => {
                const t = e.touches[0];
                const p = canvasLogicalPoint(canvasRef.current!, t.clientX, t.clientY, W, H);
                touchStart.current = p;
              }}
              onTouchEnd={(e) => {
                const start = touchStart.current;
                if (!start) return;
                const t = e.changedTouches[0];
                const end = canvasLogicalPoint(canvasRef.current!, t.clientX, t.clientY, W, H);
                const dx = end.x - start.x, dy = end.y - start.y;
                if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
                if (Math.abs(dx) > Math.abs(dy)) {
                  changeDir(dx > 0 ? [1, 0] : [-1, 0]);
                } else {
                  changeDir(dy > 0 ? [0, 1] : [0, -1]);
                }
                touchStart.current = null;
              }}
            />
            {showResult && (
              <GameResultOverlay
                title="你的蛇被淘汰！"
                success={false}
                stats={[
                  { label: "本局得分", value: resultScore },
                  { label: "存活蛇数", value: resultAlive },
                  { label: "参赛蛇数", value: s.snakes.length },
                ]}
                highLabel="最高分"
                highScore={highScore}
                newRecord={newRecord}
                onRestart={restart}
                primaryColor="from-emerald-500 to-teal-600"
              />
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 max-w-[240px] mx-auto select-none">
          <div />
          <button
            onClick={() => changeDir([0, -1])}
            className="rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-700 py-3 font-bold text-lg transition-all"
          >
            ↑
          </button>
          <div />
          <button
            onClick={() => changeDir([-1, 0])}
            className="rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-700 py-3 font-bold text-lg transition-all"
          >
            ←
          </button>
          <button
            onClick={() => changeDir([0, 1])}
            className="rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-700 py-3 font-bold text-lg transition-all"
          >
            ↓
          </button>
          <button
            onClick={() => changeDir([1, 0])}
            className="rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-700 py-3 font-bold text-lg transition-all"
          >
            →
          </button>
        </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 弹球台 =====================
/**
 * 弹球台：球从顶部下落，经过钉子随机弹射
 * 底部左右两个挡板（← → 键控制），按下时把球弹起
 * 碰钉子 +5 分，球从中间缝隙落地 = 游戏结束
 */
function GamePinball() {
  const W = 420;
  const H = 560;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const leftBtnRef = useRef(false);
  const rightBtnRef = useRef(false);
  type Peg = { x: number; y: number; hit: boolean };
  const stateRef = useRef({
    bx: W / 2,
    by: 40,
    bvx: 1.5,
    bvy: 0,
    pegs: [] as Peg[],
    flipperL: 0,
    flipperR: 0,
    score: 0,
    running: true,
    over: false,
    ended: false,
    pegHits: 0,
    newRecord: false,
  });
  const [, force] = useState(0);
  const [highScore, setHighScore] = useState(() => getHighScore("game-pinball"));
  const [showResult, setShowResult] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const [uiScore, setUiScore] = useState(0);

  const buildPegs = (): Peg[] => {
    const pegs: Peg[] = [];
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      const cols = r % 2 === 0 ? 5 : 4;
      const offsetX = r % 2 === 0 ? 50 : 90;
      for (let c = 0; c < cols; c++) {
        pegs.push({ x: offsetX + c * 70, y: 120 + r * 56, hit: false });
      }
    }
    return pegs;
  };

  const restart = () => {
    const s = stateRef.current;
    s.bx = W / 2;
    s.by = 40;
    s.bvx = (Math.random() - 0.5) * 3;
    s.bvy = 0;
    s.pegs = buildPegs();
    s.flipperL = 0;
    s.flipperR = 0;
    s.score = 0;
    s.running = true;
    s.over = false;
    s.ended = false;
    s.pegHits = 0;
    s.newRecord = false;
    setShowResult(false);
    setNewRecord(false);
    setUiScore(0);
    force((x) => x + 1);
  };

  const endGame = () => {
    const s = stateRef.current;
    if (s.ended) return;
    s.ended = true;
    const nr = updateHighScore("game-pinball", s.score);
    s.newRecord = nr;
    if (nr) setHighScore(getHighScore("game-pinball"));
    setUiScore(s.score);
    setNewRecord(nr);
    setTimeout(() => setShowResult(true), 300);
  };

  useEffect(() => {
    restart();
    const down = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (["arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => (keysRef.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const leftPivot = { x: 120, y: H - 40 };
    const rightPivot = { x: 300, y: H - 40 };
    let raf = 0;
    const loop = () => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d")!;
        const s = stateRef.current;
        if (keysRef.current["arrowleft"] || keysRef.current["a"] || leftBtnRef.current) s.flipperL = Math.min(1, s.flipperL + 0.2);
        else s.flipperL = Math.max(0, s.flipperL - 0.15);
        if (keysRef.current["arrowright"] || keysRef.current["d"] || rightBtnRef.current) s.flipperR = Math.min(1, s.flipperR + 0.2);
        else s.flipperR = Math.max(0, s.flipperR - 0.15);
        const leftEnd = { x: 180, y: leftPivot.y - s.flipperL * 24 };
        const rightEnd = { x: 240, y: rightPivot.y - s.flipperR * 24 };
        if (s.running && !s.over) {
          s.bvy += 0.18;
          s.bx += s.bvx;
          s.by += s.bvy;
          if (s.bx < 10) { s.bx = 10; s.bvx = Math.abs(s.bvx); }
          if (s.bx > W - 10) { s.bx = W - 10; s.bvx = -Math.abs(s.bvx); }
          for (const p of s.pegs) {
            const dx = s.bx - p.x;
            const dy = s.by - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 14) {
              const nx = dx / (dist || 1);
              const ny = dy / (dist || 1);
              const dot = s.bvx * nx + s.bvy * ny;
              s.bvx -= 2 * dot * nx;
              s.bvy -= 2 * dot * ny;
              s.bx = p.x + nx * 14;
              s.by = p.y + ny * 14;
              s.bvx += (Math.random() - 0.5) * 0.6;
              if (!p.hit) { p.hit = true; s.score += 5; s.pegHits++; setUiScore(s.score); }
            }
          }
          if (s.by > H - 58 && s.by < H - 30 && s.bvy > 0) {
            if (s.bx > 116 && s.bx < 184 && s.flipperL > 0.3) {
              s.bvy = -Math.abs(s.bvy) - 5 - s.flipperL * 3;
              s.bvx -= 1.5;
            }
            if (s.bx > 236 && s.bx < 304 && s.flipperR > 0.3) {
              s.bvy = -Math.abs(s.bvy) - 5 - s.flipperR * 3;
              s.bvx += 1.5;
            }
          }
          if (s.by > H) {
            s.over = true;
            s.running = false;
            endGame();
          }
        }
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(139,92,246,0.1)";
        for (let i = 0; i < 80; i++) {
          ctx.fillRect((i * 53) % W, (i * 37 + ((Date.now() / 40) | 0)) % H, 1, 1);
        }
        for (const p of s.pegs) {
          if (p.hit) {
            ctx.fillStyle = "#475569";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            const pulse = 1 + Math.sin(Date.now() / 200 + p.x) * 0.08;
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fef3c7";
            ctx.beginPath();
            ctx.arc(p.x - 1.5, p.y - 1.5, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.shadowColor = "#a78bfa";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(leftPivot.x, leftPivot.y);
        ctx.lineTo(leftEnd.x, leftEnd.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rightPivot.x, rightPivot.y);
        ctx.lineTo(rightEnd.x, rightEnd.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        const grad = ctx.createRadialGradient(s.bx - 2, s.by - 2, 1, s.bx, s.by, 10);
        grad.addColorStop(0, "#fff");
        grad.addColorStop(0.5, "#fde047");
        grad.addColorStop(1, "#ca8a04");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.bx, s.by, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = "bold 18px system-ui";
        ctx.textAlign = "left";
        ctx.fillText("得分 " + s.score, 12, 24);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = stateRef.current;
  const totalPegs = s.pegs.length || 26;

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="rounded-2xl bg-purple-50 border border-purple-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-purple-600">得分</div>
            <div className="text-xl font-bold text-purple-700">{uiScore || s.score}</div>
          </div>
          <div className="rounded-2xl bg-indigo-50 border border-indigo-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-indigo-600">击中钉子</div>
            <div className="text-xl font-bold text-indigo-700">{s.pegHits}/{totalPegs}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-amber-600">最高分</div>
            <div className="text-xl font-bold text-amber-700">{highScore}</div>
          </div>
          <button
            onClick={restart}
            className="ml-auto rounded-xl bg-gradient-to-r from-purple-400 to-indigo-600 text-white font-semibold px-4 py-2 text-sm shadow-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            重开
          </button>
        </div>

        <GameHintBar>
          <Hint><Key k="←" /> / <Key k="A" /> 左挡板</Hint>
          <Hint><Key k="→" /> / <Key k="D" /> 右挡板</Hint>
          <Hint>🟡 新钉子 +5 分</Hint>
          <Hint>📱 点击下方两个大按钮</Hint>
        </GameHintBar>

        <div className="mx-auto max-w-[420px] relative">
          <div className="relative rounded-2xl p-1.5 shadow-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full rounded-xl block"
              style={{ aspectRatio: "3 / 4" }}
            />
            {showResult && (
              <GameResultOverlay
                title="球落地啦"
                success={false}
                stats={[
                  { label: "本局得分", value: uiScore || s.score },
                  { label: "击中钉子", value: `${s.pegHits}/${totalPegs}` },
                ]}
                highLabel="最高分"
                highScore={highScore}
                newRecord={newRecord}
                onRestart={restart}
                primaryColor="from-purple-400 to-indigo-600"
              />
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onTouchStart={(e) => { e.preventDefault(); leftBtnRef.current = true; }}
              onTouchEnd={(e) => { e.preventDefault(); leftBtnRef.current = false; }}
              onMouseDown={() => { leftBtnRef.current = true; }}
              onMouseUp={() => { leftBtnRef.current = false; }}
              onMouseLeave={() => { leftBtnRef.current = false; }}
              className="rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 text-white font-black py-5 text-2xl shadow-lg active:scale-95 transition-all select-none"
            >
              ◀ 左挡板
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); rightBtnRef.current = true; }}
              onTouchEnd={(e) => { e.preventDefault(); rightBtnRef.current = false; }}
              onMouseDown={() => { rightBtnRef.current = true; }}
              onMouseUp={() => { rightBtnRef.current = false; }}
              onMouseLeave={() => { rightBtnRef.current = false; }}
              className="rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white font-black py-5 text-2xl shadow-lg active:scale-95 transition-all select-none"
            >
              右挡板 ▶
            </button>
          </div>
        </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 记忆翻牌 =====================
// 4×4 共 16 张卡片（8 对 emoji），翻两张相同则消除，全部配对即通关，统计步数
function GameMemory() {
  const ICONS = ["🐶", "🐱", "🐰", "🐯", "🦁", "🐼", "🐨", "🐸"];
  type Card = { id: number; icon: string; flipped: boolean; matched: boolean };

  const buildDeck = (): Card[] => {
    const pairs = [...ICONS, ...ICONS];
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return pairs.map((icon, id) => ({ id, icon, flipped: false, matched: false }));
  };

  const [cards, setCards] = useState<Card[]>(buildDeck);
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [steps, setSteps] = useState(0);
  const [lock, setLock] = useState(false);
  const [won, setWon] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [highScore, setHighScore] = useState(() => getHighScore("game-memory"));
  const [finalScore, setFinalScore] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  const restart = () => {
    setCards(buildDeck());
    setOpenIds([]);
    setSteps(0);
    setLock(false);
    setWon(false);
    setElapsed(0);
    setFinalScore(0);
    setNewRecord(false);
  };

  useEffect(() => {
    if (won) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500);
    return () => clearInterval(t);
     
  }, [won, startTime]);

  const flip = (idx: number) => {
    if (lock || won) return;
    const card = cards[idx];
    if (card.flipped || card.matched) return;
    const newCards = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    const newOpen = [...openIds, idx];
    setCards(newCards);
    setOpenIds(newOpen);
    if (newOpen.length === 2) {
      setSteps((s) => s + 1);
      setLock(true);
      const [a, b] = newOpen;
      if (newCards[a].icon === newCards[b].icon) {
        setTimeout(() => {
          setCards((cs) => cs.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
          setOpenIds([]);
          setLock(false);
        }, 400);
      } else {
        setTimeout(() => {
          setCards((cs) => cs.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
          setOpenIds([]);
          setLock(false);
        }, 1000);
      }
    }
  };

  useEffect(() => {
    if (cards.length > 0 && cards.every((c) => c.matched) && !won) {
      setWon(true);
      const usedTime = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(usedTime);
      const calc = 10000 - (steps + 1) * 20 - usedTime;
      const score = Math.max(0, calc);
      setFinalScore(score);
      const nr = updateHighScore("game-memory", score);
      if (nr) setHighScore(getHighScore("game-memory"));
      setNewRecord(nr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const matchedCount = cards.filter((c) => c.matched).length / 2;

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="rounded-2xl bg-pink-50 border border-pink-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-pink-600">步数</div>
            <div className="text-xl font-bold text-pink-700">{steps}</div>
          </div>
          <div className="rounded-2xl bg-fuchsia-50 border border-fuchsia-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-fuchsia-600">用时</div>
            <div className="text-xl font-bold text-fuchsia-700">{elapsed}s</div>
          </div>
          <div className="rounded-2xl bg-purple-50 border border-purple-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-purple-600">配对</div>
            <div className="text-xl font-bold text-purple-700">{matchedCount}/8</div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-amber-600">最高分</div>
            <div className="text-xl font-bold text-amber-700">{highScore}</div>
          </div>
          <button
            onClick={restart}
            className="ml-auto rounded-xl bg-gradient-to-r from-pink-400 to-purple-500 text-white font-semibold px-4 py-2 text-sm shadow-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            重开
          </button>
        </div>

        <GameHintBar>
          <Hint>🖱️ 点击卡片翻面</Hint>
          <Hint>✨ 两张相同图案配对</Hint>
          <Hint>🏆 步数越少用时越短分越高</Hint>
          <Hint>📱 手机直接点触卡片</Hint>
        </GameHintBar>

        <div className="relative mx-auto" style={{ maxWidth: 420 }}>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}
          >
            {cards.map((c, idx) => {
              const show = c.flipped || c.matched;
              return (
                <button
                  key={c.id}
                  onClick={() => flip(idx)}
                  className="relative aspect-square rounded-2xl [transform-style:preserve-3d] transition-transform duration-500 shadow-md"
                  style={{ transform: show ? "rotateY(0deg)" : "rotateY(180deg)" }}
                >
                  <span
                    className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl rounded-2xl [backface-visibility:hidden]"
                    style={{
                      background: c.matched
                        ? "linear-gradient(135deg,#bbf7d0,#86efac)"
                        : "linear-gradient(135deg,#fef9c3,#fde68a)",
                    }}
                  >
                    {c.icon}
                  </span>
                  <span
                    className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl rounded-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] text-white"
                    style={{ background: "linear-gradient(135deg,#ec4899,#8b5cf6)" }}
                  >
                    ❓
                  </span>
                </button>
              );
            })}
          </div>
          {won && (
            <GameResultOverlay
              title="🎉 通关成功！"
              success={true}
              stats={[
                { label: "使用步数", value: steps },
                { label: "用时", value: `${elapsed} 秒` },
                { label: "本局得分", value: finalScore },
              ]}
              highLabel="最高分"
              highScore={highScore}
              newRecord={newRecord}
              onRestart={restart}
              primaryColor="from-pink-400 to-purple-500"
            />
          )}
        </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 数字猜猜猜 =====================
// 1-100 随机数，输入并提交，提示太大/太小/对了，显示历史记录与次数
function GameGuessNumber() {
  const [target, setTarget] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ guess: number; hint: "大" | "小" | "对" }[]>([]);
  const [won, setWon] = useState(false);
  const [highScore, setHighScore] = useState(() => getHighScore("game-guess-number"));
  const [newRecord, setNewRecord] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const restart = () => {
    setTarget(Math.floor(Math.random() * 100) + 1);
    setInput("");
    setHistory([]);
    setWon(false);
    setNewRecord(false);
    setFinalScore(0);
  };

  const submit = () => {
    if (won) return;
    const n = parseInt(input, 10);
    if (Number.isNaN(n) || n < 1 || n > 100) return;
    const hint: "大" | "小" | "对" = n > target ? "大" : n < target ? "小" : "对";
    const newHistory = [{ guess: n, hint }, ...history];
    setHistory(newHistory);
    setInput("");
    if (hint === "对") {
      setWon(true);
      const score = Math.max(0, 100 - newHistory.length);
      setFinalScore(score);
      const nr = updateHighScore("game-guess-number", score);
      if (nr) setHighScore(getHighScore("game-guess-number"));
      setNewRecord(nr);
    }
  };

  const guessCount = history.length;
  const lastHint = history[0];
  const hiBadges: { label: string; value: string | number; cls: string }[] = [
    { label: "小范围", value: history.some((h) => h.hint === "小") ? `${Math.max(...history.filter((h) => h.hint === "小").map((h) => h.guess), 0)}+` : "1+", cls: "bg-sky-50 border-sky-200 text-sky-700" },
    { label: "大范围", value: history.some((h) => h.hint === "大") ? `${Math.min(...history.filter((h) => h.hint === "大").map((h) => h.guess), 101)}-` : "100-", cls: "bg-rose-50 border-rose-200 text-rose-700" },
  ];

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="rounded-2xl bg-cyan-50 border border-cyan-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-cyan-600">已猜次数</div>
            <div className="text-xl font-bold text-cyan-700">{guessCount}</div>
          </div>
          {hiBadges.map((b, i) => (
            <div key={i} className={`rounded-2xl border px-4 py-2 ${b.cls}`}>
              <div className="text-[11px] font-semibold">{b.label}</div>
              <div className="text-xl font-bold">{b.value}</div>
            </div>
          ))}
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-amber-600">最高分</div>
            <div className="text-xl font-bold text-amber-700">{highScore}</div>
          </div>
          <button
            onClick={restart}
            className="ml-auto rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold px-4 py-2 text-sm shadow-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            重开
          </button>
        </div>

        <GameHintBar>
          <Hint>🔢 范围 1～100</Hint>
          <Hint>⏎ <Key k="Enter" /> 快速提交</Hint>
          <Hint>🎯 猜得越少分越高（满分 100）</Hint>
          <Hint>📱 手机直接输入数字</Hint>
        </GameHintBar>

        <div className="relative mx-auto max-w-md">
          <div>
            <p className="text-center text-slate-600 mb-4">
              我心里想了一个 <span className="font-bold text-slate-800">1～100</span> 之间的数字，来猜猜看吧！
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                disabled={won}
                placeholder="输入 1-100"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:bg-slate-50"
              />
              <button
                onClick={submit}
                disabled={won || !input}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold px-6 py-3 shadow-md disabled:opacity-50 active:scale-95 transition-all"
              >
                猜！
              </button>
            </div>

            {lastHint && !won && (
              <div className="mt-6 text-center">
                <div className={`inline-block px-6 py-4 rounded-2xl text-xl font-black shadow ${
                  lastHint.hint === "大"
                    ? "bg-gradient-to-br from-rose-100 to-pink-100 text-rose-700 border border-rose-200"
                    : "bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-700 border border-sky-200"
                }`}>
                  {lastHint.hint === "大"
                    ? `📉 ${lastHint.guess} 太大了！往小猜`
                    : `📈 ${lastHint.guess} 太小了！往大猜`}
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-semibold text-slate-500 mb-2">历史记录</div>
                <div className="flex flex-wrap gap-2">
                  {history.map((h, i) => (
                    <span
                      key={i}
                      className={`rounded-lg px-3 py-1.5 text-sm font-bold shadow-sm ${
                        h.hint === "对"
                          ? "bg-gradient-to-br from-emerald-400 to-green-500 text-white"
                          : h.hint === "大"
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-sky-100 text-sky-700 border border-sky-200"
                      }`}
                    >
                      {h.guess}
                      {h.hint === "大" ? " ↓" : h.hint === "小" ? " ↑" : " ✓"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {won && (
            <GameResultOverlay
              title="🎉 猜对啦！"
              success={true}
              stats={[
                { label: "正确答案", value: target },
                { label: "猜测次数", value: guessCount },
                { label: "本局得分", value: finalScore },
              ]}
              highLabel="最高分"
              highScore={highScore}
              newRecord={newRecord}
              onRestart={restart}
              primaryColor="from-cyan-400 to-blue-500"
            />
          )}
        </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 太空侵略者 · 终极版 =====================
// Thin Wrapper：真实逻辑位于 si/ 子目录的 Container 组件（~28 个模块）
// 本函数保留：最高分接入 + 外层 FullscreenWrapper + GameHintBar，方便老用户习惯
function GameSpaceInvaders() {
  const [highScore, setHighScore] = useState(() => getHighScore("game-space-invaders"));
  const handleFinalize = (finalScore: number, _isNewRecordHint: boolean): void => {
    const nr = updateHighScore("game-space-invaders", finalScore);
    if (nr) setHighScore(getHighScore("game-space-invaders"));
  };

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-indigo-100 p-4 md:p-6">
        <GameHintBar>
          <Hint><Key k="←" /><Key k="→" /> / <Key k="A" /><Key k="D" /> 移动</Hint>
          <Hint><Key k="空格" /> 射击</Hint>
          <Hint><Key k="Q" /> 大招 · <Key k="E" /> 护盾 · <Key k="⇧" /> 加速</Hint>
          <Hint><Key k="P" /><Key k="ESC" /> 暂停</Hint>
          <Hint>📱 触屏：左摇杆 + 右下 4 按钮（44×44）</Hint>
        </GameHintBar>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-amber-600">历史最高分</div>
            <div className="text-xl font-bold text-amber-700 tabular-nums">{highScore.toLocaleString()}</div>
          </div>
          <p className="ml-auto text-xs text-slate-500 leading-5 max-w-lg">
            👾 终极版：10 关 · 8 种外星单位 · 3 BOSS · 5 技能升级 · 3 存档槽 · 15 成就 · 1080p 自适应画质。
            更多内容请在游戏内主菜单 <b>📘 帮助</b> 中查看。
          </p>
        </div>
        <SIContainer onFinalize={handleFinalize} initialGameId="game-space-invaders" />
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 弹球消砖 =====================
// Canvas 实现，6×10 砖块每个 2 点血量（击中变色），挡板控球，球落地则结束
function GameBrickCrush() {
  const W = 480;
  const H = 560;
  const BW = 42;
  const BH = 16;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const touchPxRef = useRef<number | null>(null);
  type Brick = { x: number; y: number; hp: number };
  const stateRef = useRef({
    bx: W / 2,
    by: H - 80,
    bvx: 3,
    bvy: -3,
    px: W / 2,
    bricks: [] as Brick[],
    score: 0,
    over: false,
    win: false,
    ended: false,
    broken: 0,
    newRecord: false,
  });
  const [, force] = useState(0);
  const [highScore, setHighScore] = useState(() => getHighScore("game-brick-crush"));
  const [showResult, setShowResult] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const [uiScore, setUiScore] = useState(0);

  const TOTAL_BRICKS = 60;

  const buildBricks = (): Brick[] => {
    const list: Brick[] = [];
    const cols = 10;
    const rows = 6;
    const padX = 30;
    const padY = 50;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push({ x: padX + c * BW, y: padY + r * BH, hp: 2 });
      }
    }
    return list;
  };

  const restart = () => {
    const s = stateRef.current;
    s.bx = W / 2;
    s.by = H - 80;
    s.bvx = 3 * (Math.random() > 0.5 ? 1 : -1);
    s.bvy = -3;
    s.px = W / 2;
    s.bricks = buildBricks();
    s.score = 0;
    s.over = false;
    s.win = false;
    s.ended = false;
    s.broken = 0;
    s.newRecord = false;
    touchPxRef.current = null;
    setShowResult(false);
    setNewRecord(false);
    setUiScore(0);
    force((x) => x + 1);
  };

  const endGame = (success: boolean) => {
    const s = stateRef.current;
    if (s.ended) return;
    s.ended = true;
    const nr = updateHighScore("game-brick-crush", s.score);
    s.newRecord = nr;
    if (nr) setHighScore(getHighScore("game-brick-crush"));
    setUiScore(s.score);
    setNewRecord(nr);
    setTimeout(() => setShowResult(true), success ? 400 : 300);
  };

  useEffect(() => {
    restart();
    const down = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (["arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => (keysRef.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let raf = 0;
    const loop = () => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d")!;
        const s = stateRef.current;
        if (!s.over && !s.win) {
          if (keysRef.current["arrowleft"] || keysRef.current["a"]) s.px = clamp(s.px - 6, 50, W - 50);
          if (keysRef.current["arrowright"] || keysRef.current["d"]) s.px = clamp(s.px + 6, 50, W - 50);
          if (touchPxRef.current !== null) {
            const target = touchPxRef.current;
            const diff = target - s.px;
            if (Math.abs(diff) > 2) {
              s.px = clamp(s.px + Math.sign(diff) * Math.min(7, Math.abs(diff)), 50, W - 50);
            }
          }
          s.bx += s.bvx;
          s.by += s.bvy;
          if (s.bx < 8) { s.bx = 8; s.bvx = Math.abs(s.bvx); }
          if (s.bx > W - 8) { s.bx = W - 8; s.bvx = -Math.abs(s.bvx); }
          if (s.by < 8) { s.by = 8; s.bvy = Math.abs(s.bvy); }
          if (s.by > H - 30 && s.by < H - 20 && s.bvy > 0 && Math.abs(s.bx - s.px) < 50) {
            s.bvy = -Math.abs(s.bvy) - 0.1;
            s.bvx = (s.bx - s.px) / 8;
            const sp = Math.sqrt(s.bvx * s.bvx + s.bvy * s.bvy);
            const maxsp = 7;
            if (sp > maxsp) { s.bvx = (s.bvx / sp) * maxsp; s.bvy = (s.bvy / sp) * maxsp; }
          }
          for (const b of s.bricks) {
            if (b.hp <= 0) continue;
            if (s.bx > b.x && s.bx < b.x + BW && s.by > b.y && s.by < b.y + BH) {
              const prevBy = s.by - s.bvy;
              if (prevBy <= b.y || prevBy >= b.y + BH) s.bvy = -s.bvy;
              else s.bvx = -s.bvx;
              b.hp--;
              if (b.hp === 0) { s.broken++; s.score += 10; }
              else s.score += 3;
              setUiScore(s.score);
              break;
            }
          }
          if (s.by > H) { s.over = true; endGame(false); }
          if (s.bricks.every((b) => b.hp <= 0)) { s.win = true; endGame(true); }
        }
        ctx.fillStyle = "#450a0a";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(251,113,133,0.08)";
        for (let i = 0; i < 50; i++) {
          const sx = (i * 97) % W;
          const sy = (i * 73 + ((Date.now() / 30) | 0)) % H;
          ctx.fillRect(sx, sy, 2, 2);
        }
        for (const b of s.bricks) {
          if (b.hp <= 0) continue;
          if (b.hp === 2) {
            const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + BH);
            g.addColorStop(0, "#60a5fa");
            g.addColorStop(1, "#3b82f6");
            ctx.fillStyle = g;
          } else {
            const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + BH);
            g.addColorStop(0, "#fb923c");
            g.addColorStop(1, "#ea580c");
            ctx.fillStyle = g;
          }
          ctx.fillRect(b.x + 1, b.y + 1, BW - 2, BH - 2);
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.lineWidth = 1;
          ctx.strokeRect(b.x + 1.5, b.y + 1.5, BW - 3, BH - 3);
        }
        const pg = ctx.createLinearGradient(s.px - 50, H - 24, s.px + 50, H - 14);
        pg.addColorStop(0, "#fca5a5");
        pg.addColorStop(0.5, "#f87171");
        pg.addColorStop(1, "#ef4444");
        ctx.fillStyle = pg;
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 6;
        ctx.fillRect(s.px - 50, H - 24, 100, 10);
        ctx.shadowBlur = 0;
        const bg = ctx.createRadialGradient(s.bx - 2, s.by - 2, 1, s.bx, s.by, 9);
        bg.addColorStop(0, "#fff");
        bg.addColorStop(0.5, "#fecdd3");
        bg.addColorStop(1, "#f43f5e");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(s.bx, s.by, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = "bold 18px system-ui";
        ctx.textAlign = "left";
        ctx.fillText("得分 " + s.score, 12, 24);
        ctx.textAlign = "right";
        ctx.fillText(`剩余 ${TOTAL_BRICKS - s.broken}`, W - 12, 24);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = stateRef.current;

  const updatePaddleFromTouch = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = canvasLogicalPoint(canvas, clientX, 0, W, H);
    touchPxRef.current = clamp(p.x, 50, W - 50);
  };

  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-red-600">得分</div>
            <div className="text-xl font-bold text-red-700">{uiScore || s.score}</div>
          </div>
          <div className="rounded-2xl bg-pink-50 border border-pink-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-pink-600">消除砖块</div>
            <div className="text-xl font-bold text-pink-700">{s.broken}/{TOTAL_BRICKS}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-amber-600">最高分</div>
            <div className="text-xl font-bold text-amber-700">{highScore}</div>
          </div>
          <button
            onClick={restart}
            className="ml-auto rounded-xl bg-gradient-to-r from-red-400 to-pink-600 text-white font-semibold px-4 py-2 text-sm shadow-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            重开
          </button>
        </div>

        <GameHintBar>
          <Hint><Key k="←" /><Key k="→" /> / <Key k="A" /><Key k="D" /> 移动挡板</Hint>
          <Hint>🧱 砖块需击中 2 次消除</Hint>
          <Hint>🎯 击中挡板位置改变球角度</Hint>
          <Hint>📱 手指在画布上移动挡板</Hint>
        </GameHintBar>

        <div className="mx-auto max-w-[480px] relative">
          <div className="relative rounded-2xl p-1.5 shadow-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#7f1d1d,#991b1b)" }}>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full rounded-xl block touch-none"
              style={{ aspectRatio: "6 / 7" }}
              onTouchStart={(e) => {
                const t = e.touches[0];
                if (t) updatePaddleFromTouch(t.clientX);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                const t = e.touches[0];
                if (t) updatePaddleFromTouch(t.clientX);
              }}
              onTouchEnd={() => { touchPxRef.current = null; }}
              onMouseMove={(e) => {
                if (e.buttons === 1) updatePaddleFromTouch(e.clientX);
              }}
              onMouseDown={(e) => updatePaddleFromTouch(e.clientX)}
              onMouseUp={() => { touchPxRef.current = null; }}
              onMouseLeave={() => { touchPxRef.current = null; }}
            />
            {showResult && (
              <GameResultOverlay
                title={s.win ? "🎉 全部砖块消除！" : "球落地啦"}
                success={s.win}
                stats={[
                  { label: "本局得分", value: uiScore || s.score },
                  { label: "消除砖块", value: `${s.broken}/${TOTAL_BRICKS}` },
                ]}
                highLabel="最高分"
                highScore={highScore}
                newRecord={newRecord}
                onRestart={restart}
                primaryColor="from-red-400 to-pink-600"
              />
            )}
          </div>
        </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 青蛙过河 =====================
// Canvas 实现，青蛙从底部穿越 3 马路 + 3 河道到达顶部，踩浮木随其移动
function GameFrogCross() {
  const W = 480;
  const H = 560;
  const CELL = 40;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const particles = useMemo(() => createParticleSystem(), []);
  const floats = useMemo(() => createFloatTextSystem(), []);

  type Item = { x: number; w: number; speed: number; baseSpeed: number };
  type Lane = { y: number; type: "road" | "river"; items: Item[] };
  const stateRef = useRef({
    fx: Math.floor(W / 2 / CELL) * CELL,
    fy: H - 30,
    lanes: [] as Lane[],
    paused: false,
    gameOver: false,
    jumpCd: 0,
    lives: 3,
    score: 0,
    reached: 0,
    level: 1,
    respawnCd: 0,
    deathType: "" as "car" | "water" | "",
    newRecord: false,
  });
  const [paused, setPaused] = useState(false);
  const [uiScore, setUiScore] = useState(0);
  const [uiLives, setUiLives] = useState(3);
  const [uiReached, setUiReached] = useState(0);
  const [uiLevel, setUiLevel] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  const buildLanes = (level: number): Lane[] => {
    const lanes: Lane[] = [];
    const speedMul = 1 + (level - 1) * 0.1;
    for (let i = 0; i < 3; i++) {
      const y = 80 + i * CELL;
      const dir = i % 2 === 0 ? 1 : -1;
      const items: Item[] = [];
      for (let k = 0; k < 3; k++) {
        const sp = dir * (1.2 + i * 0.3) * speedMul;
        items.push({ x: k * 180, w: 90, speed: sp, baseSpeed: sp });
      }
      lanes.push({ y, type: "river", items });
    }
    for (let i = 0; i < 3; i++) {
      const y = 240 + i * CELL;
      const dir = i % 2 === 0 ? -1 : 1;
      const items: Item[] = [];
      for (let k = 0; k < 4; k++) {
        const sp = dir * (2 + i * 0.5) * speedMul;
        items.push({ x: k * 140, w: 50, speed: sp, baseSpeed: sp });
      }
      lanes.push({ y, type: "road", items });
    }
    return lanes;
  };

  const resetFrog = (s = stateRef.current) => {
    s.fx = Math.floor(W / 2 / CELL) * CELL;
    s.fy = H - 30;
    s.jumpCd = 0;
    s.deathType = "";
  };

  const applyLevel = (s = stateRef.current) => {
    const speedMul = 1 + (s.level - 1) * 0.1;
    for (const lane of s.lanes) {
      for (const it of lane.items) {
        const sign = it.baseSpeed >= 0 ? 1 : -1;
        it.speed = sign * Math.abs(it.baseSpeed) * speedMul;
      }
    }
  };

  const restart = () => {
    const s = stateRef.current;
    s.lives = 3;
    s.score = 0;
    s.reached = 0;
    s.level = 1;
    s.paused = false;
    s.gameOver = false;
    s.newRecord = false;
    s.lanes = buildLanes(1);
    resetFrog(s);
    particles.clear();
    floats.clear();
    setPaused(false);
    setUiScore(0);
    setUiLives(3);
    setUiReached(0);
    setUiLevel(1);
    setShowResult(false);
    setHighScore(getHighScore("game-frog-cross"));
    setNewRecord(false);
  };

  const togglePause = () => {
    const s = stateRef.current;
    if (s.gameOver) return;
    s.paused = !s.paused;
    setPaused(s.paused);
  };

  const endGame = () => {
    const s = stateRef.current;
    s.gameOver = true;
    const nr = updateHighScore("game-frog-cross", s.score);
    s.newRecord = nr;
    setHighScore(getHighScore("game-frog-cross"));
    setNewRecord(nr);
    setTimeout(() => setShowResult(true), 350);
  };

  const loseLife = (type: "car" | "water") => {
    const s = stateRef.current;
    if (s.respawnCd > 0 || s.gameOver) return;
    s.lives--;
    s.deathType = type;
    if (type === "car") {
      particles.burst(s.fx, s.fy, 16, ["#ef4444", "#dc2626", "#f87171", "#7f1d1d", "#fecaca"], 4.5, 30);
    } else {
      particles.burst(s.fx, s.fy, 16, ["#3b82f6", "#60a5fa", "#1d4ed8", "#bfdbfe", "#2563eb"], 4, 34);
    }
    setUiLives(s.lives);
    if (s.lives <= 0) {
      endGame();
    } else {
      s.respawnCd = 45;
    }
  };

  const reachGoal = () => {
    const s = stateRef.current;
    s.score += 100;
    s.reached++;
    s.level++;
    particles.burst(s.fx, s.fy, 20, ["#84cc16", "#a3e635", "#65a30d", "#bef264", "#4d7c0f", "#ecfccb"], 5, 36);
    floats.spawn(s.fx, s.fy - 10, "✨ 到顶！+100", "#f0fdf4", 26, 64);
    setUiScore(s.score);
    setUiReached(s.reached);
    setUiLevel(s.level);
    s.lanes = buildLanes(s.level);
    applyLevel(s);
    resetFrog(s);
  };

  const doJump = (dir: "up" | "down" | "left" | "right") => {
    const s = stateRef.current;
    if (s.paused || s.gameOver || s.respawnCd > 0 || s.jumpCd > 0) return;
    let moved = false;
    if (dir === "up") { s.fy -= CELL; moved = true; }
    else if (dir === "down") { if (s.fy < H - 30) { s.fy += CELL; moved = true; } }
    else if (dir === "left") { s.fx = clamp(s.fx - CELL, CELL / 2, W - CELL / 2); moved = true; }
    else if (dir === "right") { s.fx = clamp(s.fx + CELL, CELL / 2, W - CELL / 2); moved = true; }
    if (moved) s.jumpCd = 8;
  };

  useEffect(() => {
    restart();
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(k)) e.preventDefault();
      if (k === "p" || k === " ") { togglePause(); e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => (keysRef.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let raf = 0;
    const loop = () => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d")!;
        const s = stateRef.current;

        if (!s.paused && !s.gameOver) {
          s.jumpCd = Math.max(0, s.jumpCd - 1);
          if (s.respawnCd > 0) {
            s.respawnCd--;
            if (s.respawnCd === 0) resetFrog(s);
          }
          if (s.jumpCd === 0 && s.respawnCd === 0) {
            let moved = false;
            if (keysRef.current["arrowup"] || keysRef.current["w"]) { s.fy -= CELL; moved = true; }
            else if (keysRef.current["arrowdown"] || keysRef.current["s"]) { if (s.fy < H - 30) { s.fy += CELL; moved = true; } }
            else if (keysRef.current["arrowleft"] || keysRef.current["a"]) { s.fx = clamp(s.fx - CELL, CELL / 2, W - CELL / 2); moved = true; }
            else if (keysRef.current["arrowright"] || keysRef.current["d"]) { s.fx = clamp(s.fx + CELL, CELL / 2, W - CELL / 2); moved = true; }
            if (moved) s.jumpCd = 8;
          }

          for (const lane of s.lanes) {
            for (const it of lane.items) {
              it.x += it.speed;
              if (it.speed > 0 && it.x > W + 20) it.x = -it.w - 20;
              if (it.speed < 0 && it.x < -it.w - 20) it.x = W + 20;
            }
          }

          if (s.respawnCd === 0) {
            let died = false;
            for (const lane of s.lanes) {
              if (Math.abs(s.fy - lane.y) > CELL / 2) continue;
              if (lane.type === "river") {
                let onLog = false;
                for (const it of lane.items) {
                  if (s.fx >= it.x - 10 && s.fx <= it.x + it.w + 10) {
                    onLog = true;
                    s.fx += it.speed;
                    break;
                  }
                }
                if (!onLog) {
                  loseLife("water");
                  died = true;
                  break;
                }
              } else if (lane.type === "road") {
                for (const it of lane.items) {
                  if (s.fx >= it.x - 10 && s.fx <= it.x + it.w + 10) {
                    loseLife("car");
                    died = true;
                    break;
                  }
                }
                if (died) break;
              }
            }
            if (!died && (s.fx < 0 || s.fx > W)) {
              loseLife("water");
            }
            if (!died && s.fy < 60) {
              reachGoal();
            }
          }
        }

        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, "#022c22");
        grd.addColorStop(0.5, "#064e3b");
        grd.addColorStop(1, "#14532d");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#fde68a";
        ctx.fillRect(0, 40, W, 6);
        ctx.fillStyle = "#052e16";
        ctx.fillRect(0, 0, W, 40);
        for (let i = 0; i < 8; i++) {
          const x = 30 + i * 60;
          ctx.fillStyle = "#22c55e";
          ctx.beginPath(); ctx.arc(x, 22, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#15803d";
          ctx.beginPath(); ctx.arc(x, 22, 5, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = "#14532d";
        ctx.fillRect(0, 200, W, CELL);
        ctx.fillRect(0, 360, W, CELL);
        ctx.fillRect(0, H - CELL, W, CELL);

        for (const lane of s.lanes) {
          if (lane.type === "river") {
            const g = ctx.createLinearGradient(0, lane.y - CELL / 2, 0, lane.y + CELL / 2);
            g.addColorStop(0, "#1e3a8a");
            g.addColorStop(0.5, "#1d4ed8");
            g.addColorStop(1, "#1e40af");
            ctx.fillStyle = g;
            ctx.fillRect(0, lane.y - CELL / 2, W, CELL);
            ctx.strokeStyle = "rgba(191,219,254,0.18)";
            ctx.lineWidth = 1;
            for (let i = 0; i < W; i += 32) {
              const off = (Date.now() / 25 + i) % 32;
              ctx.beginPath();
              ctx.moveTo(i + off, lane.y - 6);
              ctx.quadraticCurveTo(i + off + 8, lane.y - 10, i + off + 16, lane.y - 6);
              ctx.stroke();
            }
          }
        }

        for (const lane of s.lanes) {
          if (lane.type === "road") {
            ctx.fillStyle = "#1f2937";
            ctx.fillRect(0, lane.y - CELL / 2, W, CELL);
            ctx.strokeStyle = "#facc15";
            ctx.setLineDash([16, 14]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, lane.y);
            ctx.lineTo(W, lane.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        for (const lane of s.lanes) {
          for (const it of lane.items) {
            if (lane.type === "river") {
              ctx.fillStyle = "#78350f";
              ctx.fillRect(it.x, lane.y - 12, it.w, 24);
              ctx.fillStyle = "#92400e";
              ctx.fillRect(it.x + 3, lane.y - 9, it.w - 6, 18);
              ctx.strokeStyle = "#451a03";
              ctx.lineWidth = 1;
              for (let k = 0; k < 3; k++) {
                ctx.beginPath();
                ctx.moveTo(it.x + 10 + k * 25, lane.y - 7);
                ctx.lineTo(it.x + 10 + k * 25, lane.y + 7);
                ctx.stroke();
              }
            } else {
              const carColors = ["#ef4444", "#f97316", "#8b5cf6", "#06b6d4", "#eab308", "#ec4899"];
              const ci = Math.floor((it.x + it.w) / 140) % carColors.length;
              ctx.fillStyle = carColors[ci];
              const r = 5;
              ctx.beginPath();
              ctx.moveTo(it.x + r, lane.y - 12);
              ctx.lineTo(it.x + it.w - r, lane.y - 12);
              ctx.quadraticCurveTo(it.x + it.w, lane.y - 12, it.x + it.w, lane.y - 12 + r);
              ctx.lineTo(it.x + it.w, lane.y + 12 - r);
              ctx.quadraticCurveTo(it.x + it.w, lane.y + 12, it.x + it.w - r, lane.y + 12);
              ctx.lineTo(it.x + r, lane.y + 12);
              ctx.quadraticCurveTo(it.x, lane.y + 12, it.x, lane.y + 12 - r);
              ctx.lineTo(it.x, lane.y - 12 + r);
              ctx.quadraticCurveTo(it.x, lane.y - 12, it.x + r, lane.y - 12);
              ctx.fill();
              ctx.fillStyle = "#0f172a";
              ctx.fillRect(it.x + 4, lane.y - 9, it.w - 8, 18);
              ctx.fillStyle = "rgba(255,255,255,0.25)";
              ctx.fillRect(it.x + 6, lane.y - 7, it.w / 2 - 4, 6);
              ctx.fillStyle = "#111827";
              ctx.beginPath(); ctx.arc(it.x + 6, lane.y - 12, 2.5, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.arc(it.x + it.w - 6, lane.y - 12, 2.5, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.arc(it.x + 6, lane.y + 12, 2.5, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.arc(it.x + it.w - 6, lane.y + 12, 2.5, 0, Math.PI * 2); ctx.fill();
            }
          }
        }

        ctx.fillStyle = "rgba(254,240,138,0.18)";
        ctx.fillRect(0, 40, W, 28);

        if (s.respawnCd === 0) {
          ctx.fillStyle = "#84cc16";
          ctx.beginPath();
          ctx.ellipse(s.fx, s.fy + 8, 13, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#a3e635";
          ctx.beginPath();
          ctx.arc(s.fx, s.fy, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(s.fx - 5, s.fy - 5, 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(s.fx + 5, s.fy - 5, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#14532d";
          ctx.beginPath(); ctx.arc(s.fx - 5, s.fy - 5, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(s.fx + 5, s.fy - 5, 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#4d7c0f";
          ctx.beginPath(); ctx.arc(s.fx, s.fy + 3, 1.8, 0, Math.PI, false); ctx.fill();
        } else if (s.deathType === "water") {
          ctx.fillStyle = "rgba(96,165,250,0.45)";
          for (let r = 1; r <= 3; r++) {
            ctx.beginPath();
            ctx.arc(s.fx, s.fy, 6 + r * 5 + (s.respawnCd % 6), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(191,219,254,${0.6 - r * 0.15})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        } else if (s.deathType === "car") {
          ctx.save();
          ctx.globalAlpha = s.respawnCd / 45;
          ctx.fillStyle = "#b91c1c";
          ctx.font = "bold 20px system-ui";
          ctx.textAlign = "center";
          ctx.fillText("💥 被撞!", s.fx, s.fy - 10);
          ctx.restore();
        }

        particles.step(ctx, 0.12);
        floats.step(ctx);

        for (let i = 0; i < s.lives && s.lives > 0; i++) {
          const lx = 16 + i * 24, ly = 16;
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(lx - 4, ly, 5, 0, Math.PI * 2);
          ctx.arc(lx + 4, ly, 5, 0, Math.PI * 2);
          ctx.moveTo(lx - 8, ly + 1);
          ctx.lineTo(lx, ly + 11);
          ctx.lineTo(lx + 8, ly + 1);
          ctx.closePath();
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = stateRef.current;
  return (
    <FullscreenWrapper>
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-amber-600">得分</div>
            <div className="text-xl font-bold text-amber-700">{uiScore}</div>
          </div>
          <div className="rounded-2xl bg-lime-50 border border-lime-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-lime-600">到达</div>
            <div className="text-xl font-bold text-lime-700">{uiReached}</div>
          </div>
          <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-rose-600">生命</div>
            <div className="text-xl font-bold text-rose-700 flex gap-0.5">
              {Array.from({ length: Math.max(0, uiLives) }).map((_, i) => (
                <span key={i}>❤️</span>
              ))}
              {uiLives <= 0 && <span>💔</span>}
            </div>
          </div>
          <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-sky-600">关卡</div>
            <div className="text-xl font-bold text-sky-700">Lv.{uiLevel}</div>
          </div>
          <button
            onClick={restart}
            className="ml-auto rounded-xl bg-gradient-to-r from-lime-500 to-green-600 text-white font-semibold shadow-md hover:shadow-lg px-4 py-2 text-sm flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            重开
          </button>
        </div>

        <GameHintBar>
          <Hint>🐸 方向键 <Key k="↑" /><Key k="↓" /><Key k="←" /><Key k="→" /> 跳跃</Hint>
          <Hint>⏸️ <Key k="P" /> / 空格 暂停</Hint>
          <Hint>📱 下方虚拟按键可操作</Hint>
        </GameHintBar>

        <div className="mx-auto max-w-[480px] relative">
          <div className="relative rounded-2xl shadow-2xl overflow-hidden bg-slate-900">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full block"
              style={{ aspectRatio: `${W} / ${H}` }}
            />
            <PauseButton paused={paused} toggle={togglePause} />
            {paused && !s.gameOver && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-2xl">
                <div className="text-white text-2xl font-bold flex items-center gap-3">
                  <Play className="w-7 h-7" /> 已暂停
                </div>
              </div>
            )}
            {showResult && (
              <GameResultOverlay
                title="游戏结束"
                success={false}
                stats={[
                  { label: "得分", value: s.score },
                  { label: "到达次数", value: s.reached },
                  { label: "剩余生命", value: Math.max(0, s.lives) },
                  { label: "关卡", value: `Lv.${s.level}` },
                ]}
                highLabel="最高分"
                highScore={highScore}
                newRecord={newRecord}
                onRestart={restart}
                primaryColor="from-green-400 to-lime-600"
              />
            )}
          </div>
        </div>

        <div className="mt-5 max-w-[320px] mx-auto select-none">
          <div className="flex justify-center mb-3">
            <button
              onClick={() => doJump("up")}
              className="rounded-xl bg-green-400 hover:bg-green-500 active:bg-green-600 text-white w-16 h-14 font-black text-2xl shadow-md transition-all"
            >
              ↑
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => doJump("left")}
              className="rounded-xl bg-green-400 hover:bg-green-500 active:bg-green-600 text-white w-full h-14 font-black text-2xl shadow-md transition-all"
            >
              ←
            </button>
            <button
              onClick={() => doJump("down")}
              className="rounded-xl bg-green-400 hover:bg-green-500 active:bg-green-600 text-white w-full h-14 font-black text-2xl shadow-md transition-all"
            >
              ↓
            </button>
            <button
              onClick={() => doJump("right")}
              className="rounded-xl bg-green-400 hover:bg-green-500 active:bg-green-600 text-white w-full h-14 font-black text-2xl shadow-md transition-all"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </FullscreenWrapper>
  );
}

// ===================== 主分发页 =====================
export default function Playground() {
  const { id } = useParams();
  const meta = findFeature(id);
  const nav = useNavigate();
  const { prev, next } = usePrevNext(id || "");
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  if (!meta) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-800">没有找到该功能</h2>
          <p className="mt-2 text-slate-600">id = {id || "（空）"}</p>
          <button
            onClick={() => nav("/features")}
            className="mt-6 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold px-5 py-3"
          >
            回到功能列表
          </button>
        </div>
      </div>
    );
  }

  const render = () => {
    switch (meta.id) {
      // ===== 15 款游戏 =====
      case "game-2048":
        return <Game2048 />;
      case "game-snake":
        return <GameSnake />;
      case "game-ttt":
        return <GameTTT />;
      case "game-tetris":
        return <GameTetris />;
      case "game-minesweeper":
        return <GameMinesweeper />;
      case "game-whack":
        return <GameWhack />;
      case "game-yanglegeyang":
        return <GameSheep />;
      case "game-gomoku":
        return <GameGomoku />;
      case "game-klotski":
        return <GameKlotski />;
      case "game-lianliankan":
        return <GameLianLian />;
      case "game-pong":
        return <GamePong />;
      case "game-sokoban":
        return <GameSokoban />;
      case "game-sudoku":
        return <GameSudoku />;
      case "game-tank":
        return <GameTank />;
      case "game-match3":
        return <GameMatch3 />;

      // ===== 新增 10 款游戏 =====
      case "game-aircraft":
        return <GameAircraft />;
      case "game-breakout":
        return <GameBreakout />;
      case "game-flappy":
        return <GameFlappy />;
      case "game-snake-arena":
        return <GameSnakeArena />;
      case "game-pinball":
        return <GamePinball />;
      case "game-memory":
        return <GameMemory />;
      case "game-guess-number":
        return <GameGuessNumber />;
      case "game-space-invaders":
        return <GameSpaceInvaders />;
      case "game-brick-crush":
        return <GameBrickCrush />;
      case "game-frog-cross":
        return <GameFrogCross />;

      // ===== 实用工具（6 款暂无试用的走 default=NotAvailable：桌面管理器/文件转换/截屏/屏笔/磁盘清理/放大镜）=====
      case "tool-calculator":
        return <ToolCalculator />;
      case "tool-notepad":
        return <ToolNotepad />;
      case "tool-draw":
      case "tool-smart-painter":
        return <ToolPainter />;
      case "tool-alarm":
        return <ToolAlarm />;
      case "tool-sticky":
        return <ToolSticky />;

      // ===== 6 款 AI 工具箱 =====
      case "ai-joke":
        return <AiJoke />;
      case "ai-quote":
        return <AiQuote />;
      case "ai-text-analysis":
        return <AiTextAnalysis />;
      case "ai-weather":
        return <AiWeather />;
      case "ai-translate":
        return <AiTranslate />;
      case "ai-dict":
        return <AiDict />;

      // ===== 用户指定的「暂无试用」项在此给出精美的降级说明 =====
      default:
        return <NotAvailable meta={meta} />;
    }
  };

  const needRestart = [
    "game-2048",
    "game-snake",
    "game-ttt",
    "game-tetris",
    "game-minesweeper",
    "game-whack",
    "game-yanglegeyang",
    "game-gomoku",
    "game-klotski",
    "game-lianliankan",
    "game-pong",
    "game-sokoban",
    "game-sudoku",
    "game-tank",
    "game-match3",
    "game-aircraft",
    "game-breakout",
    "game-flappy",
    "game-snake-arena",
    "game-pinball",
    "game-memory",
    "game-guess-number",
    "game-space-invaders",
    "game-brick-crush",
    "game-frog-cross",
  ].includes(meta.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-violet-50">
      <PlaygroundHeader
        meta={meta}
        onBack={() => nav("/features")}
        onPrev={() => prev && nav(`/playground/${prev.id}`)}
        onNext={() => next && nav(`/playground/${next.id}`)}
        prev={prev}
        next={next}
        onShowInfo={() => setShowInfo(true)}
        onRestart={needRestart ? () => window.location.reload() : undefined}
      />
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* 功能摘要条 */}
        <div className="mb-5 rounded-2xl bg-white/70 backdrop-blur border border-pink-100 p-4 md:p-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <div className="flex-1">
            <span className="font-bold text-slate-800">{meta.name}</span>
            <span className="mx-2 text-pink-300">·</span>
            {meta.summary}
          </div>
          <button
            onClick={() => setShowInfo(true)}
            className="rounded-xl bg-gradient-to-r from-slate-100 to-pink-50 text-pink-700 font-semibold px-4 py-2 border border-pink-100 flex items-center gap-1.5 shadow-sm"
          >
            <Info className="w-4 h-4" />
            查看详细说明
          </button>
        </div>

        {/* 试玩主体 */}
        {render()}

        {/* 底部推荐：上下一个切换引导 */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <button
            disabled={!prev}
            onClick={() => prev && nav(`/playground/${prev.id}`)}
            className="text-left rounded-2xl bg-white/70 backdrop-blur border border-pink-100 p-4 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">上一个</div>
              <div className="font-bold text-slate-800">
                {prev ? prev.name : "没有上一个了"}
              </div>
            </div>
          </button>
          <button
            disabled={!next}
            onClick={() => next && nav(`/playground/${next.id}`)}
            className="text-right rounded-2xl bg-white/70 backdrop-blur border border-pink-100 p-4 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3 flex-row-reverse"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
              <ChevronRight className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">下一个</div>
              <div className="font-bold text-slate-800">
                {next ? next.name : "已是最后一个"}
              </div>
            </div>
          </button>
        </div>
      </div>
      {/* 说明弹窗（复用 FeatureDetailModal 逻辑，但避免循环依赖，此处精简版）*/}
      {showInfo && (
        <InfoModal meta={meta} onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
}

function InfoModal({
  meta,
  onClose,
}: {
  meta: FeatureMeta;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const badge =
    meta.category === "game"
      ? "小游戏"
      : meta.category === "tool"
      ? "桌面工具"
      : "AI 功能";
  const bc =
    meta.category === "game"
      ? "bg-pink-100 text-pink-700 border-pink-200"
      : meta.category === "tool"
      ? "bg-sky-100 text-sky-700 border-sky-200"
      : "bg-violet-100 text-violet-700 border-violet-200";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border border-pink-200/70 animate-scale-in-up"
      >
        <div
          className={`h-28 md:h-32 w-full bg-gradient-to-r ${meta.colorScheme} relative`}
        >
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <div
                className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${bc} mb-2`}
              >
                {badge}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow">
                {meta.name}
              </h2>
              <p className="text-white/90 mt-1 text-sm drop-shadow max-w-xl">
                {meta.summary}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 text-white"
            >
              <span className="sr-only">关闭</span>✕
            </button>
          </div>
        </div>
        <div className="px-6 md:px-8 py-6 overflow-y-auto max-h-[calc(88vh-13rem)] space-y-5">
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-2">功能说明</h3>
            <p className="text-slate-600 leading-relaxed">{meta.description}</p>
          </section>
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-2">如何使用</h3>
            <ol className="space-y-2">
              {meta.howTo.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-3 items-start rounded-xl bg-pink-50/80 border border-pink-100 px-4 py-3"
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-slate-700 leading-relaxed">
                    {s.replace(/^\d+\.\s*/, "")}
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-2">技巧 & 亮点</h3>
            <ul className="space-y-2">
              {meta.tips.map((t, i) => (
                <li
                  key={i}
                  className="flex gap-3 items-start rounded-xl bg-violet-50/80 border border-violet-100 px-4 py-3 text-slate-700 leading-relaxed"
                >
                  <span className="text-violet-500">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}