/** UIAssets 矢量图集：统一按 WORLD 逻辑尺寸绘制玩家/敌人/BOSS/子弹/爆炸，保证 4K 缩放仍然锐利。 */
import { ENEMY_STATS, WORLD } from "../config";
import type { BossRuntime, EnemyRuntime, PlayerRuntime } from "../types";
import type { EnemyKind } from "../types";

export function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerRuntime, nowMs: number, scale = 1): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(scale, scale);
  // 推进尾焰
  const flick = 0.6 + 0.4 * Math.sin(nowMs * 0.02);
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.moveTo(-22, 32); ctx.lineTo(0, 46 + 14 * flick); ctx.lineTo(22, 32); ctx.closePath();
  ctx.fill();
  // 机身
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.moveTo(0, -40); ctx.lineTo(-44, 32); ctx.lineTo(-18, 28); ctx.lineTo(18, 28); ctx.lineTo(44, 32); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ca8a04";
  ctx.lineWidth = 2;
  ctx.stroke();
  // 驾驶舱
  ctx.fillStyle = "#22d3ee";
  ctx.beginPath(); ctx.ellipse(0, -4, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#0891b2"; ctx.stroke();
  // 护盾环
  if (p.shieldUntilMs > nowMs) {
    ctx.strokeStyle = `rgba(96,165,250,${0.55 + 0.2 * Math.sin(nowMs * 0.02)})`;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 64, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(191,219,254,${0.35})`;
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 76, 0, Math.PI * 2); ctx.stroke();
  }
  if (p.speedBoostUntilMs > nowMs) {
    ctx.fillStyle = `rgba(125,211,252,${0.5 + 0.25 * Math.sin(nowMs * 0.05)})`;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(-52 + i * 24, 44 - ((nowMs * 0.5 + i * 30) % 60), 4, 24);
    }
  }
  ctx.restore();
}

function baseEnemyColor(k: EnemyKind): [string, string] {
  const s = ENEMY_STATS[k];
  return [s.color, s.accent];
}

export function drawEnemy(ctx: CanvasRenderingContext2D, e: EnemyRuntime, nowMs: number): void {
  if (!e.alive) return;
  const [c, accent] = baseEnemyColor(e.kind);
  ctx.save();
  ctx.translate(e.x, e.y);
  const bob = Math.sin(nowMs * 0.005 + e.phaseT) * 3;
  ctx.translate(0, bob);
  switch (e.kind) {
    case 0: // 普通兵：小圆头 + 触手
      roundedRectBody(ctx, c, accent);
      ctx.fillStyle = accent;
      for (let i = -1; i <= 1; i++) ctx.fillRect(i * 12 - 2, 18, 4, 14);
      break;
    case 1: // 快速兵：三角飞船
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(-28, -18); ctx.lineTo(28, -18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.fillRect(-6, -8, 12, 12);
      break;
    case 2: // 重装兵：厚重方甲
      ctx.fillStyle = accent; ctx.fillRect(-34, -22, 68, 44);
      ctx.fillStyle = c; ctx.fillRect(-28, -18, 56, 36);
      ctx.fillStyle = "#fef3c7"; ctx.fillRect(-10, -8, 20, 14);
      break;
    case 3: // 分裂兵：双球
      for (let s = -1; s <= 1; s += 2) {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(s * 14, 0, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(s * 14 + 4, -2, 6, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 4: // 护盾兵：六边形 + 半透外盾
      ctx.fillStyle = c; hexagon(ctx, 0, 0, 22); ctx.fill();
      ctx.strokeStyle = `rgba(191,219,254,${0.5 + 0.2 * Math.sin(nowMs * 0.008)})`;
      ctx.lineWidth = 3; hexagon(ctx, 0, 0, 32); ctx.stroke();
      break;
    case 5: // 狙击手：长管
      ctx.fillStyle = c; ctx.fillRect(-10, -26, 20, 52);
      ctx.fillStyle = accent; ctx.fillRect(-3, -36, 6, 20);
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 12, 14, 0, Math.PI * 2); ctx.fill();
      break;
    case 6: // 激光兵：炮口闪烁
      ctx.fillStyle = c; roundedRectBody(ctx, c, accent);
      ctx.fillStyle = `rgba(244,63,94,${0.6 + 0.4 * Math.sin(nowMs * 0.04)})`;
      ctx.beginPath(); ctx.arc(0, -22, 8, 0, Math.PI * 2); ctx.fill();
      break;
    case 7: // 冲锋兵：尖锐箭头
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(0, 30); ctx.lineTo(-26, -10); ctx.lineTo(-8, -24); ctx.lineTo(8, -24); ctx.lineTo(26, -10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.fillRect(-4, -14, 8, 18);
      break;
    case 8: // 治疗兵：十字 + 光环
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ecfeff"; ctx.fillRect(-3, -14, 6, 28); ctx.fillRect(-14, -3, 28, 6);
      ctx.strokeStyle = `rgba(45,212,191,${0.35 + 0.2 * Math.sin(nowMs * 0.006)})`;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
      break;
  }
  // 血条
  if (e.hp < e.maxHp || e.shieldHp > 0) {
    const w = 44; const h = 4;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(-w / 2, -36, w, h);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-w / 2, -36, w * Math.max(0, e.hp / e.maxHp), h);
    if (e.shieldHp > 0) {
      ctx.fillStyle = "#60a5fa";
      ctx.fillRect(-w / 2, -41, w * Math.min(1, e.shieldHp / Math.max(1, e.maxHp * 0.6)), h);
    }
  }
  ctx.restore();
}

export function drawBoss(ctx: CanvasRenderingContext2D, b: BossRuntime, nowMs: number): void {
  if (!b.alive) return;
  ctx.save();
  ctx.translate(b.x, b.y);
  switch (b.kind) {
    case "guardian":
      ctx.fillStyle = "#7c3aed";
      roundedRectBody(ctx, "#8b5cf6", "#4c1d95");
      ctx.fillRect(-120, -16, 240, 32);
      ctx.fillStyle = "#c4b5fd";
      for (let i = -2; i <= 2; i++) ctx.fillRect(i * 44 - 6, -8, 12, 16);
      break;
    case "corruptor":
      ctx.fillStyle = "#be185d";
      ctx.beginPath(); ctx.ellipse(0, 0, 170, 100, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fb7185";
      for (let i = 0; i < 7; i++) {
        const a = i + nowMs * 0.001;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 90, Math.sin(a) * 50, 22, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case "mothership":
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.moveTo(-320, 0); ctx.quadraticCurveTo(0, -140, 320, 0); ctx.quadraticCurveTo(0, 60, -320, 0);
      ctx.fill();
      ctx.fillStyle = "#64748b"; ctx.fillRect(-280, 6, 560, 16);
      ctx.fillStyle = "#a78bfa";
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(i * 70 - 6, -14, 12, 14);
      }
      break;
    case "fuhrer":
      ctx.fillStyle = "#7f1d1d"; ctx.beginPath(); ctx.arc(0, 0, 180, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(0, 0, 140, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(248,113,113,${0.6 + 0.3 * Math.sin(nowMs * 0.01)})`;
      ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();
      break;
  }
  // 弱点发光
  const pulse = 0.5 + 0.5 * Math.sin(nowMs * 0.012);
  ctx.fillStyle = `rgba(253,224,71,${0.35 + 0.45 * pulse})`;
  ctx.beginPath(); ctx.arc(b.weakX - b.x, b.weakY - b.y, b.weakR * (0.9 + 0.2 * pulse), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(250,204,21,${0.8})`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(b.weakX - b.x, b.weakY - b.y, b.weakR, 0, Math.PI * 2); ctx.stroke();
  // BOSS 血条
  ctx.restore();
  const w = WORLD.WIDTH * 0.8;
  const x = (WORLD.WIDTH - w) / 2;
  const y = 70;
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x - 4, y - 4, w + 8, 22);
  ctx.fillStyle = "#1f2937"; ctx.fillRect(x, y, w, 14);
  const pct = Math.max(0, b.hp / b.maxHp);
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, "#ef4444"); grad.addColorStop(1, "#f59e0b");
  ctx.fillStyle = grad; ctx.fillRect(x, y, w * pct, 14);
  ctx.fillStyle = "#f9fafb"; ctx.font = "bold 20px system-ui"; ctx.textAlign = "center";
  ctx.fillText(`BOSS · ${bossTitle(b.kind)}   ${Math.ceil(b.hp)} / ${b.maxHp}   阶段 ${b.phase + 1}/3`, WORLD.WIDTH / 2, y - 10);
}

function bossTitle(k: BossRuntime["kind"]): string {
  switch (k) {
    case "guardian": return "外星护卫者";
    case "corruptor": return "腐蚀者";
    case "mothership": return "元首母舰";
    case "fuhrer": return "元首本体";
  }
}

function roundedRectBody(ctx: CanvasRenderingContext2D, c: string, accent: string): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(-28, -18); ctx.quadraticCurveTo(0, -30, 28, -18);
  ctx.lineTo(28, 18); ctx.quadraticCurveTo(0, 30, -28, 18); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(-14, -8, 8, 10); ctx.fillRect(6, -8, 8, 10);
}

function hexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** 爆炸 + 粒子（简单、不引入额外依赖）。 */
export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
}

export function createParticleSystem(): Particle[] { return []; }

export function spawnBurst(ps: Particle[], x: number, y: number, count: number, colors: string[], spd = 4, size = 3, lifeMs = 500): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = spd * (0.4 + Math.random() * 0.9);
    ps.push({
      x, y,
      vx: Math.cos(a) * s * 60,
      vy: Math.sin(a) * s * 60,
      life: lifeMs, maxLife: lifeMs,
      color: colors[(Math.random() * colors.length) | 0],
      size: size * (0.7 + Math.random() * 1.1),
    });
  }
}

export function stepParticles(ps: Particle[], dtMs: number, maxCount: number): void {
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    p.life -= dtMs;
    p.x += p.vx * (dtMs / 1000);
    p.y += p.vy * (dtMs / 1000);
    p.vx *= 0.98; p.vy *= 0.98;
  }
  // 过滤死掉的
  for (let i = ps.length - 1; i >= 0; i--) if (ps[i].life <= 0) ps.splice(i, 1);
  if (ps.length > maxCount) ps.splice(0, ps.length - maxCount);
}

export function drawParticles(ctx: CanvasRenderingContext2D, ps: Particle[]): void {
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

/** 伤害数字飘字。 */
export interface FloatText { x: number; y: number; vy: number; life: number; maxLife: number; text: string; color: string; size: number }
export function createFloatTexts(): FloatText[] { return []; }
export function spawnFloatText(arr: FloatText[], x: number, y: number, text: string, color: string, size = 18, lifeMs = 650): void {
  arr.push({ x, y, vy: -80, life: lifeMs, maxLife: lifeMs, text, color, size });
  if (arr.length > 80) arr.splice(0, arr.length - 80);
}
export function stepFloats(arr: FloatText[], dtMs: number): void {
  for (let i = 0; i < arr.length; i++) {
    const f = arr[i];
    f.life -= dtMs;
    f.y += f.vy * (dtMs / 1000);
    f.vy *= 0.98;
  }
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i].life <= 0) arr.splice(i, 1);
}
export function drawFloats(ctx: CanvasRenderingContext2D, arr: FloatText[]): void {
  for (let i = 0; i < arr.length; i++) {
    const f = arr[i];
    const a = Math.max(0, f.life / f.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    ctx.font = `bold ${f.size}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
