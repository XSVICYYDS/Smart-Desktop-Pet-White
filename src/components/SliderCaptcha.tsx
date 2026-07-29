/**
 * 滑块拼图验证组件（与桌面端 components/slider_captcha_widget.py 规格完全一致）
 *
 * 规格对齐点：
 *  - TOLERANCE = 5 像素（拼图位置误差 ≤5px 视为通过）
 *  - 失败 800ms 自动回弹（QTimer.singleShot 800ms → setValue(0)）
 *  - 提示文案与桌面端完全一致：
 *      通过 → "✅ 验证通过，您是真人！"
 *      失败 → "❌ 位置偏差 {diff} 像素，请重试"
 *      初始 → "请按住滑块，拖动到正确位置完成拼图验证"
 *  - 拼图尺寸 50x50，拼图带右侧/下方圆形凸起（经典拼图形状）
 *  - 每次挂载/重置都会随机生成新的缺口位置
 *
 * 对外事件：
 *  - onPassed()       验证通过
 *  - onFailed(msg)    验证失败（含偏差提示文案）
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronRight, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

const BG_W = 320;
const BG_H = 160;
const PIECE = 50;
const PAD = 10; // 边距
const TOLERANCE = 5; // 与桌面端 slider_captcha_widget 完全一致
const HINT_IDLE = "请按住滑块，拖动到正确位置完成拼图验证";

interface SliderCaptchaProps {
  onPassed?: () => void;
  onFailed?: (msg: string) => void;
  /** 重置 Key，变化时重新生成缺口位置 */
  resetKey?: number | string;
}

/**
 * 拼图形状：方形 + 右侧/下方各一个圆形凸起（经典"凹凸块"效果）
 * 用法：在 ctx 上调用 ctx.clip() 之前执行此 path
 */
function buildPuzzlePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const r = size * 0.2; // 凸起/凹槽半径
  ctx.beginPath();
  // 左上角起点
  ctx.moveTo(x, y);
  // 上边：左 → 右
  ctx.lineTo(x + size / 2 - r, y);
  // 上边中间凸起
  ctx.arc(x + size / 2, y, r, Math.PI, 0, false);
  ctx.lineTo(x + size, y);
  // 右边：上 → 下
  ctx.lineTo(x + size, y + size / 2 - r);
  // 右边中间凸起
  ctx.arc(x + size, y + size / 2, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(x + size, y + size);
  // 下边：右 → 左
  ctx.lineTo(x, y + size);
  // 回到左上
  ctx.closePath();
}

/**
 * 在画布背景中绘制装饰图案（粉色渐变 + 几何/文字）
 * 目的：让"缺口位置"不会因为背景单色而容易被看穿
 */
function paintBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 粉色渐变底
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#FFC1DD");
  g.addColorStop(0.5, "#FF69B4");
  g.addColorStop(1, "#E0559B");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 圆点装饰
  const dotColors = ["rgba(255,255,255,0.25)", "rgba(255,255,255,0.12)"];
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.fillStyle = dotColors[i % 2];
    const r = 3 + Math.random() * 10;
    ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 大字水印"小白"（居中，半透明白色）
  ctx.save();
  ctx.font = `bold ${Math.floor(h * 0.6)}px "Noto Serif SC", serif`;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("小白", w / 2, h / 2 + 4);
  ctx.restore();
}

export default function SliderCaptcha({ onPassed, onFailed, resetKey }: SliderCaptchaProps) {
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const pieceRef = useRef<HTMLCanvasElement | null>(null);

  // 缺口位置（x,y），留边距避免贴边
  const [target, setTarget] = useState<{ x: number; y: number }>({ x: 100, y: 40 });
  const [sliderVal, setSliderVal] = useState(0); // 0..1，对应拼图偏移量
  const [passed, setPassed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState<string>(HINT_IDLE);
  const [dragging, setDragging] = useState(false);

  /**
   * 生成一组新的随机缺口位置（与桌面端随机 targetX/Y 语义等价）
   */
  const regenerate = useCallback(() => {
    const minX = PAD + PIECE + 10; // 至少留一块拼图大小的起始空间，避免缺块和拼图块叠一起
    const maxX = BG_W - PAD - PIECE - 5;
    const minY = PAD + 5;
    const maxY = BG_H - PAD - PIECE - 5;
    const nx = Math.floor(minX + Math.random() * (maxX - minX));
    const ny = Math.floor(minY + Math.random() * (maxY - minY));
    setTarget({ x: nx, y: ny });
    setSliderVal(0);
    setPassed(false);
    setFailed(false);
    setHint(HINT_IDLE);
  }, []);

  useEffect(() => {
    regenerate();
  }, [regenerate, resetKey]);

  /**
   * 绘制两张画布：
   *   - bgCanvas:     背景 + 挖空缺口（透明区域）
   *   - pieceCanvas:  独立的 50px 宽拼图块（与缺口一模一样的图案，带白底描边）
   */
  useEffect(() => {
    const bg = bgRef.current;
    const piece = pieceRef.current;
    if (!bg || !piece) return;

    // ============ 画 bg（挖空缺口） ============
    const bgCtx = bg.getContext("2d");
    if (bgCtx) {
      bgCtx.clearRect(0, 0, BG_W, BG_H);
      paintBackground(bgCtx, BG_W, BG_H);
      // 用 destination-out 在缺口位置挖空透明拼图形状
      bgCtx.save();
      bgCtx.globalCompositeOperation = "destination-out";
      buildPuzzlePath(bgCtx, target.x, target.y, PIECE);
      bgCtx.fillStyle = "#000";
      bgCtx.fill();
      bgCtx.restore();
      // 给缺口加一圈白色描边，增强视觉
      bgCtx.save();
      buildPuzzlePath(bgCtx, target.x, target.y, PIECE);
      bgCtx.strokeStyle = "rgba(255,255,255,0.9)";
      bgCtx.lineWidth = 1.5;
      bgCtx.stroke();
      bgCtx.restore();
    }

    // ============ 画 piece（独立拼图块） ============
    // pieceCanvas 宽度 = PIECE + 右侧凸起 2r，高度 = PIECE + 上侧凸起 2r
    const pieceW = PIECE + PIECE * 0.4;
    const pieceH = PIECE + PIECE * 0.4;
    piece.width = pieceW;
    piece.height = pieceH;
    const pCtx = piece.getContext("2d");
    if (pCtx) {
      pCtx.clearRect(0, 0, pieceW, pieceH);
      // 把 piece 的 (0,0) 映射到原图的 (target.x, target.y) 减去上边凸起 r 留出空间
      const r = PIECE * 0.2;
      pCtx.save();
      // 裁剪为拼图形状
      buildPuzzlePath(pCtx, r, r, PIECE);
      pCtx.clip();
      // 在裁剪区域内，平移到 target 位置绘制完整背景
      pCtx.translate(r - target.x, r - target.y);
      paintBackground(pCtx, BG_W, BG_H);
      pCtx.restore();
      // 描边
      pCtx.save();
      buildPuzzlePath(pCtx, r, r, PIECE);
      pCtx.strokeStyle = "rgba(255,255,255,0.95)";
      pCtx.lineWidth = 2;
      pCtx.stroke();
      pCtx.restore();
    }
  }, [target]);

  /**
   * 计算当前滑块 value 对应的拼图实际 x 坐标（与桌面端 actual_x = 10 + value 同语义等价）
   */
  const pieceActualX = (() => {
    const minX = PAD;
    const maxX = BG_W - PAD - PIECE - PIECE * 0.4;
    return minX + sliderVal * (maxX - minX);
  })();

  const minSliderX = PAD;
  const maxSliderX = BG_W - PAD - PIECE - PIECE * 0.4;

  /**
   * 滑块释放时校验是否对齐（与桌面端 _on_slider_release 完全等价）
   */
  const checkPosition = useCallback(() => {
    if (passed) return;
    const actual = pieceActualX;
    const expected = target.x;
    const diff = Math.abs(actual - expected);
    if (diff <= TOLERANCE) {
      // 通过
      setPassed(true);
      setFailed(false);
      setHint("✅ 验证通过，您是真人！");
      onPassed?.();
    } else {
      const msg = `❌ 位置偏差 ${diff.toFixed(0)} 像素，请重试`;
      setHint(msg);
      setFailed(true);
      onFailed?.(msg);
      // 800ms 回弹（与桌面端 QTimer.singleShot 800 等价）
      window.setTimeout(() => {
        setSliderVal(0);
        setFailed(false);
        setHint(HINT_IDLE);
      }, 800);
    }
  }, [passed, pieceActualX, target.x, onPassed, onFailed]);

  /**
   * 拖动条的范围输入值 0~100 映射
   */
  const onRange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (passed) return;
    const v = Number(e.target.value) / 100;
    setSliderVal(v);
  };
  const onRangeUp = () => {
    setDragging(false);
    checkPosition();
  };

  // 拼图块整体偏移到 pieceActualX（视觉上和缺口重叠表示通过）
  const pieceStyle: React.CSSProperties = {
    position: "absolute",
    top: `${target.y - PIECE * 0.2}px`,
    left: `${pieceActualX}px`,
    width: `${PIECE + PIECE * 0.4}px`,
    height: `${PIECE + PIECE * 0.4}px`,
    pointerEvents: "none",
    filter: passed
      ? "drop-shadow(0 2px 8px rgba(165,214,167,0.9))"
      : failed
        ? "drop-shadow(0 2px 8px rgba(220,53,69,0.85))"
        : "drop-shadow(0 2px 6px rgba(0,0,0,0.25))",
    transition: dragging ? "none" : "left 0.12s ease",
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 画布区域 */}
      <div
        className="relative rounded-xl overflow-hidden shadow-inner border border-pink-200"
        style={{ width: BG_W, height: BG_H }}
      >
        {/* 背景 Canvas */}
        <canvas
          ref={bgRef}
          width={BG_W}
          height={BG_H}
          className="block w-full h-full"
        />
        {/* 独立拼图块 */}
        <canvas ref={pieceRef} style={pieceStyle} />
        {/* 右上角刷新按钮 */}
        <button
          type="button"
          onClick={regenerate}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 text-brand-pink hover:bg-white shadow-sm transition"
          title="刷新拼图位置"
          aria-label="刷新拼图位置"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* 提示栏 */}
      <div
        className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${
          passed
            ? "bg-green-50 text-green-700 border-green-200"
            : failed
              ? "bg-red-50 text-red-600 border-red-200"
              : "bg-pink-50 text-brand-dark border-pink-100"
        }`}
      >
        {passed ? (
          <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
        ) : failed ? (
          <XCircle size={16} className="text-red-500 flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-brand-pink flex-shrink-0" />
        )}
        <span className="truncate">{hint}</span>
      </div>

      {/* 滑块 */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-brand-gray w-8 text-right">0%</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(sliderVal * 100)}
          onChange={onRange}
          onMouseDown={() => setDragging(true)}
          onMouseUp={onRangeUp}
          onTouchStart={() => setDragging(true)}
          onTouchEnd={onRangeUp}
          disabled={passed}
          className="flex-1 accent-brand-pink disabled:opacity-70"
          style={{
            // 让滑块轨道视觉上是粉色渐变
            background: `linear-gradient(to right, #FF69B4 ${sliderVal * 100}%, #FFE4F1 ${sliderVal * 100}%)`,
            height: 36,
            borderRadius: 999,
            outline: "none",
            appearance: "none",
            WebkitAppearance: "none",
          }}
        />
        <span className="text-xs text-brand-gray w-10">
          {passed ? "100%" : `${Math.min(100, Math.round(((pieceActualX - minSliderX) / (maxSliderX - minSliderX)) * 100))}%`}
        </span>
      </div>
    </div>
  );
}
