/**
 * 图形验证码组件（与桌面端 captcha_generator.py 规格完全一致）
 *
 * 特性：
 *  - 4 位字母数字混合（剔除易混淆字符 0/O/1/l/I）
 *  - 与桌面端相同的验证码生成算法（lib/authClient.ts genMixedCaptcha）
 *  - Canvas 绘制：粉色背景 + 彩色字符 + 干扰线 + 噪点 + 随机旋转
 *  - 点击画布可刷新
 *  - 每次刷新会调用父组件传入的 onChange(id, code)，让父组件拿到 id 用于 verifyGraphCaptcha
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { generateGraphCaptcha, type GraphCaptcha } from "@/lib/authClient";

interface CaptchaCanvasProps {
  /**
   * 每次验证码生成（含首次挂载、刷新）后回调
   * 父组件需要保存 id 以便后续传给 verifyGraphCaptcha
   */
  onChange: (captcha: GraphCaptcha) => void;
  /** 宽度（默认 140px，与桌面端 SVG 宽一致） */
  width?: number;
  /** 高度（默认 44px，与桌面端 SVG 高一致） */
  height?: number;
  /** 显示刷新按钮 */
  showRefresh?: boolean;
}

export default function CaptchaCanvas({
  onChange,
  width = 140,
  height = 44,
  showRefresh = true,
}: CaptchaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [captcha, setCaptcha] = useState<GraphCaptcha | null>(null);

  /**
   * 刷新验证码：生成新验证码 + 重绘 Canvas + 通知父组件
   */
  const refresh = useCallback(() => {
    const newCap = generateGraphCaptcha();
    setCaptcha(newCap);
    onChange(newCap);
  }, [onChange]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!captcha || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // 1. 背景：粉色线性渐变（与桌面端图形验证码风格一致：#FF69B4 → #FFB6D9）
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, "#FFE4F1");
    g.addColorStop(1, "#FFF0F7");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // 2. 干扰线（粉色系随机短线）
    const lineColors = ["#FF69B4", "#FFB6D9", "#E0559B", "#FFD1E6"];
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.strokeStyle = lineColors[i % lineColors.length];
      ctx.lineWidth = 1;
      const x1 = Math.random() * width;
      const y1 = Math.random() * height;
      const x2 = Math.random() * width;
      const y2 = Math.random() * height;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // 3. 噪点（小圆点）
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.fillStyle = lineColors[i % lineColors.length];
      const r = Math.random() * 1.2 + 0.3;
      ctx.arc(Math.random() * width, Math.random() * height, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. 绘制字符：每个字符随机颜色、旋转、位置
    const textColors = ["#E0559B", "#C2185B", "#AD1457", "#FF69B4", "#D81B60"];
    const chars = captcha.code.split("");
    const cellW = width / chars.length;
    const fontSize = Math.floor(height * 0.68);
    chars.forEach((ch, idx) => {
      ctx.save();
      const cx = cellW * idx + cellW / 2;
      const cy = height / 2 + (Math.random() * 6 - 3);
      ctx.translate(cx, cy);
      // 随机旋转 ±25°
      const ang = ((Math.random() * 50) - 25) * (Math.PI / 180);
      ctx.rotate(ang);
      ctx.font = `bold ${fontSize}px "Noto Sans SC", sans-serif`;
      ctx.fillStyle = textColors[idx % textColors.length];
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // 轻微抖动
      const dx = (Math.random() * 6) - 3;
      ctx.fillText(ch, dx, 0);
      ctx.restore();
    });
  }, [captcha, width, height]);

  return (
    <div className="flex items-center gap-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={refresh}
        title="点击刷新验证码"
        className="rounded-lg border border-pink-200 cursor-pointer shadow-sm transition hover:shadow-md hover:scale-[1.02]"
      />
      {showRefresh && (
        <button
          type="button"
          onClick={refresh}
          className="p-2 rounded-lg border border-pink-200 text-brand-pink hover:bg-pink-50 transition"
          title="刷新验证码"
          aria-label="刷新验证码"
        >
          <RefreshCw size={16} />
        </button>
      )}
    </div>
  );
}
