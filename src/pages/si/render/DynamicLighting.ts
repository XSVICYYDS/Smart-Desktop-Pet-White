/** 动态点光源叠加（仅 high 档启用），为玩家/BOSS/爆炸添加柔和辉光。 */
import { WORLD } from "../config";

export interface LightSource { x: number; y: number; r: number; color: string; strength: number }
export interface LightingState { list: LightSource[] }

export function createLighting(): LightingState { return { list: [] }; }

export function addLight(ls: LightingState, x: number, y: number, r: number, color: string, strength = 0.8): void {
  if (ls.list.length > 16) ls.list.length = 16;
  ls.list.push({ x, y, r, color, strength });
}

export function drawLighting(ctx: CanvasRenderingContext2D, ls: LightingState): void {
  if (ls.list.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < ls.list.length; i++) {
    const l = ls.list[i];
    const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    grad.addColorStop(0, hexWithAlpha(l.color, Math.min(1, l.strength)));
    grad.addColorStop(0.5, hexWithAlpha(l.color, Math.max(0, l.strength * 0.35)));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  ctx.restore();
  ls.list.length = 0;
  // 整体暗角
  const vignette = ctx.createRadialGradient(WORLD.WIDTH / 2, WORLD.HEIGHT / 2, WORLD.HEIGHT * 0.3, WORLD.WIDTH / 2, WORLD.HEIGHT / 2, WORLD.HEIGHT * 0.85);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD.WIDTH, WORLD.HEIGHT);
}

function hexWithAlpha(hex: string, a: number): string {
  // 支持 #rrggbb
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  if (h.length < 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
