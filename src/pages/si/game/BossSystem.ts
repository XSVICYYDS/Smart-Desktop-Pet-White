/** 12 大 BOSS 系统：状态机+弱点+阶段转换。原 4 种 → 扩展 8 种（hunter/desolator/overlord/dragon/sentinel/warlord/devourer/leviathan）。 */
import { WORLD } from "../config";
import type { BossKind, BossRuntime, BulletRuntime } from "../types";

let __bulletId = 10_000;
export function resetBossBulletIds(): void { __bulletId = 10_000; }

const HP_BY_KIND: Record<BossKind, number> = {
  guardian: 800,
  corruptor: 1600,
  mothership: 2600,
  fuhrer: 4200,
  hunter: 5600,
  desolator: 7200,
  overlord: 9000,
  dragon: 12500,      // L21：+1500，匹配 3 主动技能解锁后的输出
  sentinel: 15000,    // L24：+1500
  warlord: 17500,     // L25 (备用)：+1500
  devourer: 21500,    // L27：+2500
  leviathan: 28000,   // L30：+3000，终关配合 500s 限时
};

/** 每关 BOSS 的起始 Y、尺寸（影响绘制与弱点）。 */
const KIND_UI: Record<BossKind, { baseY: number; weakR: number; weakDy: number }> = {
  guardian: { baseY: 300, weakR: 46, weakDy: 14 },
  corruptor: { baseY: 260, weakR: 50, weakDy: 18 },
  mothership: { baseY: 220, weakR: 56, weakDy: 22 },
  fuhrer: { baseY: 340, weakR: 58, weakDy: 40 },
  hunter: { baseY: 280, weakR: 52, weakDy: 16 },
  desolator: { baseY: 260, weakR: 60, weakDy: 24 },
  overlord: { baseY: 240, weakR: 66, weakDy: 26 },
  dragon: { baseY: 260, weakR: 64, weakDy: 28 },
  sentinel: { baseY: 280, weakR: 72, weakDy: 30 },
  warlord: { baseY: 260, weakR: 70, weakDy: 30 },
  devourer: { baseY: 260, weakR: 76, weakDy: 32 },
  leviathan: { baseY: 300, weakR: 90, weakDy: 44 },
};

export function createBoss(kind: BossKind): BossRuntime {
  const maxHp = HP_BY_KIND[kind];
  const ui = KIND_UI[kind];
  return {
    kind, x: WORLD.WIDTH / 2, y: ui.baseY,
    hp: maxHp, maxHp,
    phase: 0, patternT: 0,
    cooldownMs: 600,
    weakX: WORLD.WIDTH / 2, weakY: ui.baseY + ui.weakDy, weakR: ui.weakR,
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

/** 通用：向玩家角度 + 偏移生成一组追踪扇形子弹。 */
function fanTowardsPlayer(b: BossRuntime, playerX: number, playerY: number, count: number, spread: number, speed: number, dmg: number, kind: BulletRuntime["kind"] = "normal"): BulletRuntime[] {
  const out: BulletRuntime[] = [];
  const base = Math.atan2(playerY - b.y, playerX - b.x);
  for (let i = 0; i < count; i++) {
    const a = base + (count === 1 ? 0 : (i - (count - 1) / 2) * spread);
    out.push(bossBullet(b.x, b.y + 30, Math.cos(a) * speed, Math.sin(a) * speed, dmg, kind));
  }
  return out;
}

/** 通用：从 BOSS 位置发射一圈 N 向螺旋/扩散弹。 */
function radialRing(b: BossRuntime, count: number, speed: number, dmg: number, rot: number, kind: BulletRuntime["kind"] = "spread"): BulletRuntime[] {
  const out: BulletRuntime[] = [];
  for (let i = 0; i < count; i++) {
    const a = rot + (i / count) * Math.PI * 2;
    out.push(bossBullet(b.x, b.y + 20, Math.cos(a) * speed, Math.sin(a) * speed, dmg, kind));
  }
  return out;
}

/** BOSS 主循环。返回：本轮生成的子弹列表。 */
export function tickBoss(b: BossRuntime, dtMs: number, playerX: number, playerY: number): BulletRuntime[] {
  if (!b.alive) return [];
  const dt = dtMs / 1000;
  b.patternT += dt;
  b.cooldownMs -= dtMs;
  const T = b.patternT;
  switch (b.kind) {
    case "guardian":
      b.x = WORLD.WIDTH / 2 + Math.sin(T * 0.8) * 320;
      b.y = 300 + Math.sin(T * 1.6) * 24;
      break;
    case "corruptor":
      b.x = WORLD.WIDTH / 2 + Math.sin(T * 0.5) * 420;
      b.y = 260 + Math.cos(T * 1.1) * 58;
      break;
    case "mothership":
      b.x = WORLD.WIDTH / 2 + Math.sin(T * 0.35) * 480;
      b.y = 220 + Math.sin(T * 0.9) * 40;
      break;
    case "fuhrer":
      b.x = WORLD.WIDTH / 2 + Math.sin(T * 0.6) * 380;
      b.y = 300 + Math.cos(T * 1.3) * 70;
      break;
    case "hunter":
      // 猎鹰式：左右急冲，间歇下压
      b.x = WORLD.WIDTH / 2 + Math.sin(T * 1.4) * 420;
      b.y = 280 + Math.sin(T * 0.9) * 60 + Math.abs(Math.sin(T * 0.4)) * 40;
      break;
    case "desolator":
      // 肃清者：左右缓慢漂移 + 垂直脉冲
      b.x = WORLD.WIDTH / 2 + Math.sin(T * 0.55) * 460;
      b.y = 260 + Math.sin(T * 2.2) * 36;
      break;
    case "overlord":
      // 霸主：8 字巡航，Y 摆动大
      b.x = WORLD.WIDTH / 2 + Math.sin(T * 0.5) * 480;
      b.y = 240 + Math.cos(T * 1.0) * 90 + Math.sin(T * 0.7) * 40;
      break;
    case "dragon":
      // 星环神龙：蛇形正弦
      b.x = WORLD.WIDTH / 2 + Math.sin(T * 0.6 + Math.cos(T * 0.35) * 1.4) * 480;
      b.y = 260 + Math.sin(T * 1.0) * 80;
      break;
    case "sentinel":
      // 壁垒守卫：左右缓移，上下阶梯
      b.x = WORLD.WIDTH / 2 + Math.sin(T * 0.35) * 440;
      b.y = 260 + Math.sign(Math.sin(T * 0.9)) * 80;
      break;
    case "warlord":
      // 军阀：快速折返 + 俯冲
      b.x = WORLD.WIDTH / 2 + Math.sin(T * 1.1 + Math.cos(T * 0.6) * 0.7) * 500;
      b.y = 240 + Math.abs(Math.sin(T * 0.8)) * 100;
      break;
    case "devourer":
      // 饕餮：缓慢移动但带引力式 Y 摆动
      b.x = WORLD.WIDTH / 2 + Math.sin(T * 0.3) * 460;
      b.y = 280 + Math.sin(T * 1.4) * 100 + Math.sin(T * 0.2) * 60;
      break;
    case "leviathan":
      // 利维坦：缓慢正弦大轨道 + 缓慢螺旋 Y
      b.x = WORLD.WIDTH / 2 + Math.sin(T * 0.32) * 500;
      b.y = 320 + Math.sin(T * 0.7) * 100 + Math.cos(T * 0.25) * 60;
      break;
  }
  const ui = KIND_UI[b.kind];
  b.weakX = b.x;
  b.weakY = b.y + ui.weakDy;
  b.weakR = ui.weakR;

  if (b.cooldownMs > 0) return [];
  const out: BulletRuntime[] = [];
  const phaseMul = 1 + b.phase * 0.4;
  switch (b.kind) {
    case "guardian": {
      b.cooldownMs = Math.max(260, 650 / phaseMul);
      for (let i = -1; i <= 1; i++) out.push(bossBullet(b.x + i * 34, b.y + 30, 0, 360 + b.phase * 60, 8));
      out.push(...fanTowardsPlayer(b, playerX, playerY, 5, 0.18, 400, 9, "normal"));
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
      out.push(...fanTowardsPlayer(b, playerX, playerY, 1, 0, 560, 16, "big"));
      break;
    }
    case "fuhrer": {
      b.cooldownMs = Math.max(180, 780 / phaseMul);
      const N = 12 + b.phase * 4;
      out.push(...radialRing(b, N, 260, 10, b.patternT, "spread"));
      out.push(...fanTowardsPlayer(b, playerX, playerY, 3, 0.12, 520, 14, "laser"));
      break;
    }
    // ============ 新 8 BOSS ============
    case "hunter": {
      // 幽影猎手：高速直线三连发 + 扇形追踪
      b.cooldownMs = Math.max(160, 540 / phaseMul);
      for (let i = -2; i <= 2; i++) out.push(bossBullet(b.x + i * 26, b.y + 30, 0, 420 + b.phase * 80, 9));
      out.push(...fanTowardsPlayer(b, playerX, playerY, 7, 0.14, 460, 11, "normal"));
      if (b.phase >= 1) out.push(...fanTowardsPlayer(b, playerX, playerY, 3, 0.26, 560, 14, "laser"));
      break;
    }
    case "desolator": {
      // 肃清者：红色散射 + 环形弹
      b.cooldownMs = Math.max(220, 880 / phaseMul);
      const N = 16 + b.phase * 4;
      out.push(...radialRing(b, N, 240 + b.phase * 40, 10, b.patternT * 0.6, "spread"));
      for (let i = 0; i < 9; i++) {
        const a = (-Math.PI / 2) + (i - 4) * 0.20;
        out.push(bossBullet(b.x, b.y + 50, Math.cos(a) * 380, Math.sin(a) * 380 + 120, 12, "big"));
      }
      break;
    }
    case "overlord": {
      // 木星霸主：左右炮台 + 中心大激光追踪
      b.cooldownMs = Math.max(210, 940 / phaseMul);
      for (let s = -1; s <= 1; s += 2) {
        for (let i = 0; i < 5; i++) {
          out.push(bossBullet(b.x + s * 260, b.y + 20 + i * 24, s * (90 + i * 24), 340 + i * 24, 9));
        }
      }
      out.push(...fanTowardsPlayer(b, playerX, playerY, 5, 0.08, 580, 16, "laser"));
      if (b.phase >= 2) out.push(...radialRing(b, 20, 280, 12, b.patternT * 0.4, "spread"));
      break;
    }
    case "dragon": {
      // 星环神龙：龙头吐息 + 双环逆向（L21 加快节奏）
      b.cooldownMs = Math.max(180, 720 / phaseMul);
      out.push(...fanTowardsPlayer(b, playerX, playerY, 9, 0.12, 440, 12, "normal"));
      const N = 18 + b.phase * 4;
      out.push(...radialRing(b, N, 260, 10, b.patternT, "spread"));
      out.push(...radialRing(b, Math.round(N * 0.75), 360, 11, -b.patternT * 0.8, "big"));
      if (b.phase >= 2) {
        // 第三阶段：追加追踪激光
        out.push(...fanTowardsPlayer(b, playerX, playerY, 3, 0.20, 600, 16, "laser"));
      }
      break;
    }
    case "sentinel": {
      // 壁垒守卫：慢速重炮 + 8 方向墙 + 追踪巨型弹（L24 加快重炮）
      b.cooldownMs = Math.max(260, 980 / phaseMul);
      for (let i = 0; i < 10; i++) {
        const a = (-Math.PI / 2) + (i - 4.5) * 0.18;
        out.push(bossBullet(b.x, b.y + 40, Math.cos(a) * 320, Math.sin(a) * 320 + 140, 13, "big"));
      }
      out.push(...fanTowardsPlayer(b, playerX, playerY, 1, 0, 640, 22, "big"));
      if (b.phase >= 1) {
        for (let i = -3; i <= 3; i++) out.push(bossBullet(b.x + i * 120, b.y + 60, 0, 280 + b.phase * 60, 11));
      }
      if (b.phase >= 2) {
        // 第三阶段：环形弹幕
        out.push(...radialRing(b, 16, 280, 12, b.patternT * 0.6, "spread"));
      }
      break;
    }
    case "warlord": {
      // 星界军阀：高射速三联扇形 + 环形 + 激光连射
      b.cooldownMs = Math.max(160, 640 / phaseMul);
      out.push(...fanTowardsPlayer(b, playerX, playerY, 7, 0.15, 460, 12, "normal"));
      out.push(...fanTowardsPlayer(b, playerX, playerY, 5, 0.10, 560, 15, "laser"));
      if (b.phase >= 2) {
        const N = 24;
        out.push(...radialRing(b, N, 240, 10, b.patternT * 1.1, "spread"));
      }
      break;
    }
    case "devourer": {
      // 虚无饕餮：巨大吸力环 + 多向扩散 + 追踪重力弹（L27 加快）
      b.cooldownMs = Math.max(220, 920 / phaseMul);
      const N1 = 22 + b.phase * 6;
      const N2 = 14 + b.phase * 4;
      out.push(...radialRing(b, N1, 200, 10, b.patternT * 0.25, "spread"));
      out.push(...radialRing(b, N2, 420, 12, -b.patternT * 0.5, "big"));
      for (let i = -2; i <= 2; i++) {
        const a = Math.atan2(playerY - b.y, playerX - b.x) + i * 0.18;
        out.push(bossBullet(b.x, b.y + 30, Math.cos(a) * 500, Math.sin(a) * 500, 16, "big"));
      }
      if (b.phase >= 2) {
        // 第三阶段：增加密集激光
        out.push(...fanTowardsPlayer(b, playerX, playerY, 5, 0.14, 620, 18, "laser"));
      }
      break;
    }
    case "leviathan": {
      // 终极利维坦：超重型弹幕——四环混合 + 追踪激光 + 主炮（L30 终极强化）
      b.cooldownMs = Math.max(170, 720 / phaseMul);
      const R1 = 18 + b.phase * 6;
      const R2 = 24 + b.phase * 6;
      out.push(...radialRing(b, R1, 200, 10, b.patternT * 0.4, "spread"));
      out.push(...radialRing(b, R2, 320, 11, -b.patternT * 0.5, "spread"));
      out.push(...radialRing(b, 12, 440, 13, b.patternT * 0.2 + 0.3, "big"));
      out.push(...fanTowardsPlayer(b, playerX, playerY, 7, 0.10, 560, 15, "laser"));
      out.push(...fanTowardsPlayer(b, playerX, playerY, 1, 0, 680, 24, "big"));
      if (b.phase >= 1) {
        // 第二阶段：追加两侧激光
        out.push(...fanTowardsPlayer(b, playerX, playerY, 5, 0.18, 580, 16, "laser"));
      }
      if (b.phase >= 2) {
        // 最终阶段：再加一对扇形 + 全屏环形
        out.push(...fanTowardsPlayer(b, playerX, playerY, 11, 0.12, 500, 14, "normal"));
        out.push(...radialRing(b, 28, 260, 12, b.patternT * 0.8, "spread"));
      }
      break;
    }
  }
  return out;
}
