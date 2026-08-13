/** 4 层视差滚动背景（星空/星云/尘粒/高光），按质量档位启用层数。 */
import type { QualityProfile } from "../engine/HardwareDetect";
import { WORLD } from "../config";

export interface Star { x: number; y: number; z: number; s: number; c: string }
export interface ParallaxState {
  stars: Star[];
  time: number;
}

export function createParallax(count: number): ParallaxState {
  const COLORS = ["#cbd5e1", "#93c5fd", "#fde68a", "#f0abfc", "#5eead4"];
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * WORLD.WIDTH,
      y: Math.random() * WORLD.HEIGHT,
      z: 0.2 + Math.random() * 1.2, // 深度决定滚动速度
      s: 0.6 + Math.random() * 2.4,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    });
  }
  return { stars, time: 0 };
}

/** 按 dt 更新滚动，返回自身便于链式调用。 */
export function tickParallax(p: ParallaxState, dtMs: number, baseSpeed = 1): ParallaxState {
  const dt = dtMs / 1000;
  p.time += dt;
  for (let i = 0; i < p.stars.length; i++) {
    const s = p.stars[i];
    s.y += s.z * 80 * baseSpeed * dt;
    if (s.y > WORLD.HEIGHT) { s.y = -4; s.x = Math.random() * WORLD.WIDTH; }
  }
  return p;
}

export function drawParallax(
  ctx: CanvasRenderingContext2D,
  p: ParallaxState,
  profile: QualityProfile,
  themeBg: "nebula" | "crimson" | "asteroid" | "void" | "forge",
): void {
  const GRADS: Record<string, [string, string]> = {
    nebula:   ["#0b1026", "#221649"],
    crimson:  ["#2a0a0a", "#521632"],
    asteroid: ["#0b1321", "#1a2740"],
    void:     ["#05060f", "#160b33"],
    forge:    ["#1a0b00", "#4c2400"],
  };
  const [cA, cB] = GRADS[themeBg] || GRADS.void;
  const g = ctx.createLinearGradient(0, 0, 0, WORLD.HEIGHT);
  g.addColorStop(0, cA);
  g.addColorStop(1, cB);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.WIDTH, WORLD.HEIGHT);

  // 视差层数量根据 profile.parallaxLayers（1/2/4）
  const layers = profile.parallaxLayers;
  const layerCut = layers === 1 ? [0, 0] : layers === 2 ? [0.6, 0.2] : [0.8, 0.5, 0.25, 0.08];
  for (let li = 0; li < layerCut.length; li++) {
    const minZ = layerCut[layerCut.length - 1 - li] || 0;
    const maxZ = layerCut[layerCut.length - 1 - li - 1] ?? 1.4;
    const alpha = 0.35 + li * 0.16;
    for (let i = 0; i < p.stars.length; i++) {
      const s = p.stars[i];
      if (s.z < minZ || s.z > maxZ) continue;
      ctx.globalAlpha = Math.max(0.2, Math.min(1, alpha * s.z));
      ctx.fillStyle = s.c;
      ctx.fillRect(s.x | 0, s.y | 0, s.s, s.s);
    }
  }
  ctx.globalAlpha = 1;
}
