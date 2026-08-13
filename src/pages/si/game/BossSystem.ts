/** 3 大 BOSS 系统（外星护卫者 / 腐蚀者 / 元首母舰 / 元首本体）：状态机+弱点+阶段转换。 */
import { WORLD } from "../config";
import type { BossKind, BossRuntime, BulletRuntime } from "../types";

let __bulletId = 10_000;
export function resetBossBulletIds(): void { __bulletId = 10_000; }

const HP_BY_KIND: Record<BossKind, number> = {
  guardian: 800,
  corruptor: 1600,
  mothership: 2600,
  fuhrer: 4200,
};

export function createBoss(kind: BossKind): BossRuntime {
  const maxHp = HP_BY_KIND[kind];
  const baseY = kind === "fuhrer" ? 340 : 300;
  return {
    kind, x: WORLD.WIDTH / 2, y: baseY,
    hp: maxHp, maxHp,
    phase: 0, patternT: 0,
    cooldownMs: 600,
    weakX: WORLD.WIDTH / 2, weakY: baseY + 10, weakR: 46,
    alive: true,
  };
}

export function applyBossDamage(b: BossRuntime, dmg: number, hitX: number, hitY: number): number {
  const dx = hitX - b.weakX, dy = hitY - b.weakY;
  const weak = Math.sqrt(dx * dx + dy * dy) <= b.weakR;
  const final = Math.max(1, Math.round(dmg * (weak ? 1.5 : 1)));
  b.hp = Math.max(0, b.hp - final);
  if (b.hp <= 0) b.alive = false;
  const hpPct = b.hp / b.maxHp;
  b.phase = hpPct > 0.66 ? 0 : hpPct > 0.33 ? 1 : 2;
  return final;
}

function bossBullet(x: number, y: number, vx: number, vy: number, dmg: number, kind: BulletRuntime["kind"] = "normal"): BulletRuntime {
  return {
    id: __bulletId++, x, y, vx, vy, dmg,
    from: "boss", kind, lifeMs: 7000, alive: true,
  };
}

/** BOSS 主循环。返回：本轮生成的子弹列表。 */
export function tickBoss(b: BossRuntime, dtMs: number, playerX: number, playerY: number): BulletRuntime[] {
  if (!b.alive) return [];
  const dt = dtMs / 1000;
  b.patternT += dt;
  b.cooldownMs -= dtMs;
  switch (b.kind) {
    case "guardian":
      b.x = WORLD.WIDTH / 2 + Math.sin(b.patternT * 0.8) * 320;
      b.y = 300 + Math.sin(b.patternT * 1.6) * 24;
      break;
    case "corruptor":
      b.x = WORLD.WIDTH / 2 + Math.sin(b.patternT * 0.5) * 420;
      b.y = 260 + Math.cos(b.patternT * 1.1) * 58;
      break;
    case "mothership":
      b.x = WORLD.WIDTH / 2 + Math.sin(b.patternT * 0.35) * 480;
      b.y = 220 + Math.sin(b.patternT * 0.9) * 40;
      break;
    case "fuhrer":
      b.x = WORLD.WIDTH / 2 + Math.sin(b.patternT * 0.6) * 380;
      b.y = 300 + Math.cos(b.patternT * 1.3) * 70;
      break;
  }
  b.weakX = b.x;
  b.weakY = b.y + (b.kind === "fuhrer" ? 40 : 14);
  b.weakR = b.kind === "fuhrer" ? 58 : 46;

  if (b.cooldownMs > 0) return [];
  const out: BulletRuntime[] = [];
  const phaseMul = 1 + b.phase * 0.35;
  switch (b.kind) {
    case "guardian": {
      b.cooldownMs = Math.max(260, 650 / phaseMul);
      for (let i = -1; i <= 1; i++) out.push(bossBullet(b.x + i * 34, b.y + 30, 0, 360 + b.phase * 60, 8));
      const angle0 = Math.atan2(playerY - b.y, playerX - b.x);
      for (let i = -2; i <= 2; i++) {
        const a = angle0 + i * 0.18;
        out.push(bossBullet(b.x, b.y + 30, Math.cos(a) * 400, Math.sin(a) * 400, 9));
      }
      break;
    }
    case "corruptor": {
      b.cooldownMs = Math.max(240, 820 / phaseMul);
      for (let i = 0; i < 7; i++) {
        const a = (-Math.PI / 2) + (i - 3) * 0.22 + Math.sin(b.patternT * 2) * 0.15;
        out.push(bossBullet(b.x, b.y + 40, Math.cos(a) * 360, Math.sin(a) * 360 + 120, 11));
      }
      break;
    }
    case "mothership": {
      b.cooldownMs = Math.max(220, 900 / phaseMul);
      for (let s = -1; s <= 1; s += 2) {
        for (let i = 0; i < 4; i++) {
          out.push(bossBullet(b.x + s * 220, b.y + 10 + i * 20, s * (60 + i * 20), 320 + i * 20, 8));
        }
      }
      const a = Math.atan2(playerY - b.y, playerX - b.x);
      out.push(bossBullet(b.x, b.y + 40, Math.cos(a) * 560, Math.sin(a) * 560, 16, "big"));
      break;
    }
    case "fuhrer": {
      b.cooldownMs = Math.max(180, 780 / phaseMul);
      const N = 12 + b.phase * 4;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + b.patternT;
        out.push(bossBullet(b.x, b.y + 30, Math.cos(a) * 260, Math.sin(a) * 260, 10, "spread"));
      }
      const a = Math.atan2(playerY - b.y, playerX - b.x);
      for (let i = -1; i <= 1; i++) {
        out.push(bossBullet(b.x, b.y + 30, Math.cos(a + i * 0.12) * 520, Math.sin(a + i * 0.12) * 520, 14, "laser"));
      }
      break;
    }
  }
  return out;
}
