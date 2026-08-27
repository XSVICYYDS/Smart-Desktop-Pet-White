/** 敌人工厂：按 EnemyKind 创建 EnemyRuntime，配置独特移动模式/攻击模式。 */
import { ENEMY_STATS, WORLD } from "../config";
import type { EnemyKind, EnemyRuntime } from "../types";

let __enemyId = 1;

export function resetEnemyIds(): void { __enemyId = 1; }

/** 创建一只敌人，参数 hpMul/speedMul/freqMul 来自动态难度。 */
export function spawnEnemy(
  kind: EnemyKind,
  x: number,
  y: number,
  mul: { hp: number; speed: number; freq: number } = { hp: 1, speed: 1, freq: 1 },
): EnemyRuntime {
  const s = ENEMY_STATS[kind];
  const maxHp = Math.max(1, Math.round(s.hp * mul.hp));
  const shieldHp = kind === 4 ? Math.round(maxHp * 0.6) : 0;
  const cooldownMs = Math.max(200, Math.round(s.fireMs / mul.freq));
  return {
    id: __enemyId++,
    kind,
    x, y,
    vx: s.speed * mul.speed * (Math.random() < 0.5 ? -1 : 1),
    vy: 0,
    hp: maxHp, maxHp,
    cooldownMs: Math.round(Math.random() * cooldownMs), // 初值错峰
    shieldHp,
    phaseT: Math.random() * Math.PI * 2,
    alive: true,
    scoreValue: Math.round(s.score),
    // EMP 状态初始化（>0 表示生效中，0 表示无效果）
    stunnedUntilMs: 0,
    shieldDisabledUntilMs: 0,
    // s2_emp / s3_timewarp 场地状态初始化
    empFieldUntilMs: 0,
    timeWarpFieldUntilMs: 0,
  };
}

/** 按 kind 更新单帧；返回本轮是否应该射击。 */
export function stepEnemy(
  e: EnemyRuntime,
  dtMs: number,
  mul: { speed: number; freq: number },
): boolean {
  const dt = dtMs / 1000;
  e.phaseT += dt;
  const stats = ENEMY_STATS[e.kind];
  switch (e.kind) {
    case 0: // 基础：左右碰撞反向，偶尔下移
      e.x += e.vx * dt;
      if (e.x < 80 || e.x > WORLD.WIDTH - 80) { e.vx *= -1; e.y += 18; }
      break;
    case 1: // 快速：正弦摆动
      e.x += Math.cos(e.phaseT * 2.1) * stats.speed * mul.speed * dt * 1.5;
      e.y += 8 * dt;
      break;
    case 2: // 重装：慢速下滑
      e.x += e.vx * 0.4 * dt;
      if (e.x < 100 || e.x > WORLD.WIDTH - 100) e.vx *= -1;
      e.y += 14 * dt;
      break;
    case 3: // 分裂：之字形
      e.x += Math.sin(e.phaseT * 1.8) * stats.speed * mul.speed * dt * 1.6;
      e.y += 22 * dt;
      break;
    case 4: // 护盾：聚堆
      e.x += Math.cos(e.phaseT * 1.3) * stats.speed * mul.speed * dt * 1.0;
      break;
    case 5: // 狙击：停在上方
      e.y = Math.max(180, e.y + 6 * dt);
      e.x += Math.sin(e.phaseT * 0.9) * 20 * dt;
      break;
    case 6: // 激光：左右快速滑
      e.x += e.vx * 1.3 * dt;
      if (e.x < 80 || e.x > WORLD.WIDTH - 80) e.vx *= -1;
      break;
    case 7: // 冲锋：斜下俯冲
      e.y += (stats.speed * mul.speed) * dt;
      e.x += Math.sin(e.phaseT * 2.4) * 180 * dt;
      break;
    case 8: // 治疗：中上方缓慢游走
      e.y = Math.max(260, e.y + 4 * dt);
      e.x += Math.sin(e.phaseT * 1.2) * 60 * dt;
      break;
  }
  e.cooldownMs -= dtMs / mul.freq;
  if (e.cooldownMs <= 0) {
    e.cooldownMs = Math.max(300, stats.fireMs);
    return true;
  }
  return false;
}
