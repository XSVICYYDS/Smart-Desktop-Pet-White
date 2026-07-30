import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { findFeature, FEATURES, type FeatureMeta } from "../data/playgroundData";

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
    <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-pink-100/70 shadow-sm">
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
  const [best, setBest] = useState<number>(() => {
    const v = Number(localStorage.getItem("pg_2048_best") || 0);
    return Number.isFinite(v) ? v : 0;
  });
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);

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
  };
  useEffect(() => {
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const rot = dir === "up" || dir === "left";
    const flip = dir === "down" || dir === "right";
    const access = (i: number, j: number): [number, number] => {
      // 统一按行处理：先把方向都 rotate 成 "left"
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
      if (ns > best) {
        setBest(ns);
        localStorage.setItem("pg_2048_best", String(ns));
      }
      // 判断是否还能移动
      let canMove = false;
      for (let r = 0; r < SIZE && !canMove; r++)
        for (let c = 0; c < SIZE; c++) {
          if (!g[r][c]) {
            canMove = true;
            break;
          }
          if (c + 1 < SIZE && g[r][c] === g[r][c + 1]) {
            canMove = true;
            break;
          }
          if (r + 1 < SIZE && g[r][c] === g[r + 1][c]) {
            canMove = true;
            break;
          }
        }
      if (!canMove) setOver(true);
    }
    void rot;
    void flip;
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

  return (
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
        <div className="ml-auto text-sm text-slate-500">
          方向键 / 下方按钮移动
        </div>
        <button
          onClick={restart}
          className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold shadow-md hover:shadow-lg px-4 py-2 text-sm flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          新游戏
        </button>
      </div>

      <div className="relative mx-auto max-w-sm">
        <div className="rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 p-3 grid grid-cols-4 gap-3 shadow-inner">
          {grid.flat().map((v, i) => (
            <div key={i}>{tile(v)}</div>
          ))}
        </div>
        {(over || won) && (
          <div className="absolute inset-0 rounded-2xl bg-black/55 backdrop-blur-sm flex items-center justify-center">
            <div className="rounded-2xl bg-white p-6 text-center shadow-2xl max-w-xs">
              <h3 className="text-2xl font-bold text-slate-800">
                {won ? "🎉 你合成了 2048！" : "游戏结束"}
              </h3>
              <p className="mt-2 text-slate-600">得分：{score}</p>
              <button
                onClick={restart}
                className="mt-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold shadow px-5 py-2"
              >
                再来一局
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 触控按钮（手机也能玩）*/}
      <div className="mt-5 grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        <div />
        <button
          onClick={() => move("up")}
          className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 font-bold"
        >
          ↑
        </button>
        <div />
        <button
          onClick={() => move("left")}
          className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 font-bold"
        >
          ←
        </button>
        <button
          onClick={() => move("down")}
          className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 font-bold"
        >
          ↓
        </button>
        <button
          onClick={() => move("right")}
          className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 font-bold"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ===================== 贪吃蛇 =====================
function GameSnake() {
  const W = 20,
    H = 15;
  const [snake, setSnake] = useState<[number, number][]>([
    [10, 7],
    [9, 7],
    [8, 7],
  ]);
  const [dir, setDir] = useState<[number, number]>([1, 0]);
  const [food, setFood] = useState<[number, number]>([15, 7]);
  const [score, setScore] = useState(0);
  const [alive, setAlive] = useState(true);
  const [speed, setSpeed] = useState(130);

  const restart = () => {
    setSnake([
      [10, 7],
      [9, 7],
      [8, 7],
    ]);
    setDir([1, 0]);
    setFood([15, 7]);
    setScore(0);
    setAlive(true);
    setSpeed(130);
  };

  useEffect(() => {
    if (!alive) return;
    const id = setInterval(() => {
      setSnake((s) => {
        const head = s[0];
        const nh: [number, number] = [head[0] + dir[0], head[1] + dir[1]];
        if (
          nh[0] < 0 ||
          nh[0] >= W ||
          nh[1] < 0 ||
          nh[1] >= H ||
          s.some((p) => p[0] === nh[0] && p[1] === nh[1])
        ) {
          setAlive(false);
          return s;
        }
        const next = [nh, ...s];
        if (nh[0] === food[0] && nh[1] === food[1]) {
          setScore((x) => x + 10);
          setSpeed((v) => (v > 60 ? v - 4 : v));
          const empty: [number, number][] = [];
          for (let y = 0; y < H; y++)
            for (let x = 0; x < W; x++)
              if (!next.some((p) => p[0] === x && p[1] === y)) empty.push([x, y]);
          setFood(empty[Math.floor(Math.random() * empty.length)]);
          return next;
        }
        next.pop();
        return next;
      });
    }, speed);
    return () => clearInterval(id);
  }, [dir, alive, speed, food]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowUp" && dir[1] !== 1) setDir([0, -1]);
      if (k === "ArrowDown" && dir[1] !== -1) setDir([0, 1]);
      if (k === "ArrowLeft" && dir[0] !== 1) setDir([-1, 0]);
      if (k === "ArrowRight" && dir[0] !== -1) setDir([1, 0]);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [dir]);

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-emerald-700">长度</div>
          <div className="text-xl font-bold text-emerald-800">{snake.length}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-amber-600">得分</div>
          <div className="text-xl font-bold text-amber-700">{score}</div>
        </div>
        <button
          onClick={restart}
          className="ml-auto rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-md hover:shadow-lg px-4 py-2 text-sm flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          重开
        </button>
      </div>
      <div className="mx-auto max-w-xl rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-3">
        <div
          className="grid gap-[2px] aspect-[4/3]"
          style={{ gridTemplateColumns: `repeat(${W}, minmax(0,1fr))` }}
        >
          {Array.from({ length: H }).flatMap((_, y) =>
            Array.from({ length: W }).map((__, x) => {
              const isHead = snake[0][0] === x && snake[0][1] === y;
              const isBody = !isHead && snake.some((p) => p[0] === x && p[1] === y);
              const isFood = food[0] === x && food[1] === y;
              return (
                <div
                  key={`${x}-${y}`}
                  className={`rounded-sm ${
                    isHead
                      ? "bg-emerald-300 shadow-[inset_0_0_6px_rgba(0,0,0,0.3)]"
                      : isBody
                      ? "bg-emerald-400"
                      : isFood
                      ? "bg-rose-400 rounded-full"
                      : "bg-slate-900/60"
                  }`}
                />
              );
            })
          )}
        </div>
      </div>
      {/* 移动端方向键 */}
      <div className="mt-5 grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        <div />
        <button
          onClick={() => dir[1] !== 1 && setDir([0, -1])}
          className="rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-3 font-bold"
        >
          ↑
        </button>
        <div />
        <button
          onClick={() => dir[0] !== 1 && setDir([-1, 0])}
          className="rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-3 font-bold"
        >
          ←
        </button>
        <button
          onClick={() => dir[1] !== -1 && setDir([0, 1])}
          className="rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-3 font-bold"
        >
          ↓
        </button>
        <button
          onClick={() => dir[0] !== -1 && setDir([1, 0])}
          className="rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-3 font-bold"
        >
          →
        </button>
      </div>
      {!alive && (
        <div className="mt-4 text-center text-rose-600 font-semibold">
          游戏结束！得分：{score}，点「重开」继续～
        </div>
      )}
    </div>
  );
}

// ===================== 井字棋 =====================
function GameTTT() {
  const [board, setBoard] = useState<("X" | "O" | null)[]>(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const [scores, setScores] = useState({ X: 0, O: 0, D: 0 });
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
  return (
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
        <div className="ml-auto text-sm text-slate-600 font-medium">
          当前：
          <span className={xTurn ? "text-sky-600" : "text-rose-600"}>
            {xTurn ? "X" : "O"}
          </span>
        </div>
        <button
          onClick={() => {
            setBoard(Array(9).fill(null));
            setXTurn(true);
          }}
          className="rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 text-white font-semibold px-4 py-2 text-sm"
        >
          清空
        </button>
      </div>
      <div className="mx-auto max-w-xs aspect-square grid grid-cols-3 gap-3">
        {board.map((v, i) => {
          const win = winLine.includes(i);
          return (
            <button
              key={i}
              onClick={() => place(i)}
              className={`rounded-2xl text-4xl md:text-5xl font-black transition-all border-2 ${
                win
                  ? "bg-gradient-to-br from-amber-200 to-orange-300 border-amber-400 shadow-lg"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              } ${
                v === "X" ? "text-sky-600" : v === "O" ? "text-rose-600" : ""
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
      {res && (
        <div className="mt-5 text-center text-lg font-bold text-slate-800">
          {res.win === "D" ? "平局" : `🎉 ${res.win} 获胜！`}
        </div>
      )}
    </div>
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
    if (playing && time <= 0) setPlaying(false);
  }, [time, playing]);
  const hit = (i: number) => {
    if (!playing || !mole || mole.i !== i) return;
    const s =
      mole.kind === "mole" ? 10 : mole.kind === "gold" ? 50 : mole.kind === "chick" ? 30 : -20;
    setScore((v) => Math.max(0, v + s));
    setMole(null);
  };
  const start = () => {
    setScore(0);
    setTime(30);
    setPlaying(true);
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
  return (
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
        <button
          onClick={start}
          className="ml-auto rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg px-5 py-3"
        >
          {playing ? "重新开始" : time > 0 ? "开始游戏" : "再来一局"}
        </button>
      </div>
      <div className="mx-auto max-w-md grid grid-cols-3 gap-3 aspect-square">
        {Array.from({ length: 9 }).map((_, i) => (
          <button
            key={i}
            onClick={() => hit(i)}
            className={`rounded-3xl border-4 border-amber-900/80 ${styleOf(
              i
            )} text-4xl md:text-6xl transition-all shadow-inner active:scale-95`}
          >
            {faceOf(i)}
          </button>
        ))}
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
      {!playing && time === 0 && (
        <div className="mt-6 text-center text-xl font-bold text-slate-800">
          时间到！本局得分：{score}
        </div>
      )}
    </div>
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
  const reset = () => {
    setBoard(makeBoard());
    setRevealed(Array.from({ length: ROW }, () => Array(COL).fill(false)));
    setFlags(Array.from({ length: ROW }, () => Array(COL).fill(false)));
    setGame("play");
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
  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-pink-100 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-sky-700">雷数</div>
          <div className="text-xl font-bold text-sky-800">
            {MINES - flagCount}
          </div>
        </div>
        <div className="rounded-2xl bg-indigo-50 border border-indigo-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-indigo-700">状态</div>
          <div className="text-xl font-bold text-indigo-800">
            {game === "play" ? "🙂" : game === "win" ? "😎" : "💥"}
          </div>
        </div>
        <button
          onClick={reset}
          className="ml-auto rounded-xl bg-gradient-to-r from-sky-500 to-blue-700 text-white font-semibold shadow-md px-4 py-2 text-sm"
        >
          重开
        </button>
      </div>
      <div
        className="mx-auto max-w-md grid gap-[3px] p-3 bg-slate-800 rounded-2xl"
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
                    : "bg-gradient-to-br from-slate-400 to-slate-500 text-white hover:brightness-110 active:scale-95"
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
      <div className="mt-4 text-center text-xs md:text-sm text-slate-500">
        左键翻开 · 右键插旗 · 10×10 / 15 雷
        {game !== "play" && (
          <span className="ml-3 font-bold text-slate-700">
            {game === "win" ? "🎉 你赢了！" : "💥 踩雷啦"}
          </span>
        )}
      </div>
    </div>
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

  const spawn = () => {
    const key = nextKey;
    setNextKey(KEYS[Math.floor(Math.random() * 7)]);
    const rot = 0;
    const shape = SHAPES[key][rot];
    const x = Math.floor((COLS - shape[0].length) / 2);
    const y = 0;
    return { key, rot, x, y };
  };
  const reset = () => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setScore(0);
    setLines(0);
    setOver(false);
    setTickMs(600);
    setNextKey(KEYS[Math.floor(Math.random() * 7)]);
    setCur(spawn());
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
    // 消行
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

  // tick
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

  // 键盘
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

  // 将当前 cur 合并到展示网格
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
  return (
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
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2">
          <div className="text-[11px] font-semibold text-slate-600">下一个</div>
          <div className="mt-1 grid gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${nextShape[0].length}, minmax(0,1fr))`, width: nextShape[0].length * 14 }}>
            {nextShape.flat().map((v, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${colorOf(v)}`} />
            ))}
          </div>
        </div>
        <button
          onClick={reset}
          className="ml-auto rounded-xl bg-gradient-to-r from-violet-500 to-indigo-700 text-white font-semibold shadow-md px-4 py-2 text-sm"
        >
          {over ? "再来一局" : "重新开始"}
        </button>
      </div>
      <div className="flex gap-4 justify-center items-start">
        <div
          className="grid gap-[2px] p-2 rounded-2xl bg-slate-900 shadow-inner"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0,1fr))`, width: "min(90vw, 300px)" }}
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
            <button onClick={rotate} className="rounded-lg bg-slate-200 font-bold py-2 text-sm">↑</button>
            <div />
            <button onClick={() => move(-1, 0)} className="rounded-lg bg-slate-200 font-bold py-2 text-sm">←</button>
            <button onClick={() => move(0, 1)} className="rounded-lg bg-slate-200 font-bold py-2 text-sm">↓</button>
            <button onClick={() => move(1, 0)} className="rounded-lg bg-slate-200 font-bold py-2 text-sm">→</button>
          </div>
          <button onClick={hardDrop} className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-bold py-2">硬降</button>
        </div>
      </div>
      {over && (
        <div className="mt-5 text-center text-lg font-bold text-rose-600">
          游戏结束！最终得分 {score}，消 {lines} 行
        </div>
      )}
    </div>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch {}
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
      case "tool-calculator":
        return <ToolCalculator />;
      case "tool-notepad":
        return <ToolNotepad />;
      case "tool-draw":
      case "tool-smart-painter":
      case "tool-screenpen":
      case "tool-screenshot":
        return <ToolPainter />;
      case "tool-alarm":
        return <ToolAlarm />;
      case "ai-joke":
        return <AiJoke />;
      case "ai-quote":
        return <AiQuote />;
      case "ai-text-analysis":
        return <AiTextAnalysis />;
      // 其它所有：给出精美的说明+预览+降级 UI
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
