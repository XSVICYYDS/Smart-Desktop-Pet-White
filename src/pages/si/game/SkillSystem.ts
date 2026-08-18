/**
 * 技能系统核心：3 主动（巡航导弹/电磁脉冲/时间扭曲）+ 7 被动（攻击强化/生命恢复/最大生命/最大能量/暴击/吸血/护甲）。
 * 负责冷却管理、释放判定、被动属性计算与每帧 tick。
 */
import { BALANCE, SKILLS, ACTIVE_SKILL_ORDER } from "../config";
import type { MissileRuntime, PlayerRuntime, SkillId, SkillLevel, SkillRuntimeState, SkillSlot } from "../types";

const LEVELS: SkillLevel[] = [0, 1, 2, 3];
const ALL_IDS: SkillId[] = [
  "s1_missile", "s2_emp", "s3_timewarp",
  "p1_power", "p2_regen", "p3_maxhp", "p4_maxenergy", "p5_crit", "p6_lifesteal", "p7_armor",
];

let __missileId = 50_000;

/** 初始化：默认全 Lv0。 */
export function createInitialSkillState(): SkillRuntimeState {
  const levels = {} as SkillRuntimeState["levels"];
  const lastCastAt = {} as SkillRuntimeState["lastCastAt"];
  (ALL_IDS as SkillId[]).forEach((id) => { levels[id] = 0; lastCastAt[id] = 0; });
  return {
    cooldowns: { 0: 0, 1: 0, 2: 0 },
    levels, lastCastAt,
    timeWarpUntilMs: 0, timeWarpScale: 1,
  };
}

/** 安全的 clamp 等级到 0..3。 */
export function clampLv(lv: number): SkillLevel {
  const v = Math.max(0, Math.min(3, lv | 0));
  return LEVELS[v] ?? 0;
}

/** 获取技能当前等级配置。 */
export function skillLevelCfg(id: SkillId, lv: SkillLevel) {
  const def = SKILLS[id];
  const l = clampLv(lv);
  return def.levels[l] || def.levels[0];
}

/**
 * 将被动技能等级应用到玩家属性。
 * 在关卡启动时调用一次，计算最终 maxHp/maxEnergy/critRate 等。
 */
export function applyPassiveSkills(state: SkillRuntimeState, player: PlayerRuntime): void {
  // p3_maxhp: 最大生命 +15~40%
  const hpCfg = skillLevelCfg("p3_maxhp", state.levels.p3_maxhp);
  const hpBonus = hpCfg.maxHpPct ?? 0;
  player.maxHp = Math.round(BALANCE.BASE_HP * (1 + hpBonus));
  player.hp = Math.min(player.hp, player.maxHp);

  // p4_maxenergy: 最大能量 +15~40%
  const enCfg = skillLevelCfg("p4_maxenergy", state.levels.p4_maxenergy);
  const enBonus = enCfg.maxEnergyPct ?? 0;
  player.maxEnergy = Math.round(BALANCE.BASE_ENERGY * (1 + enBonus));
  player.energy = Math.min(player.energy, player.maxEnergy);

  // p5_crit: 暴击率 + 暴击倍率
  const critCfg = skillLevelCfg("p5_crit", state.levels.p5_crit);
  player.critRate = critCfg.critRate ?? 0;
  player.critMul = critCfg.critMul ?? 2.0;

  // p6_lifesteal: 吸血
  const lsCfg = skillLevelCfg("p6_lifesteal", state.levels.p6_lifesteal);
  player.lifestealPct = lsCfg.lifestealPct ?? 0;

  // p7_armor: 护甲减伤
  const armorCfg = skillLevelCfg("p7_armor", state.levels.p7_armor);
  player.armorPct = armorCfg.armorPct ?? 0;
}

/** 每帧更新：冷却递减、被动（回血）、能量回复、时间扭曲状态。 */
export function tickSkills(
  state: SkillRuntimeState,
  player: PlayerRuntime,
  dtMs: number,
  nowMs: number,
): void {
  const dt = dtMs / 1000;
  player.energy = Math.min(player.maxEnergy, player.energy + BALANCE.ENERGY_REGEN_PER_SEC * dt);

  // 主动技能冷却
  (ACTIVE_SKILL_ORDER as readonly SkillId[]).forEach((id, idx) => {
    const slot = (idx as SkillSlot);
    if (state.cooldowns[slot] > 0) {
      state.cooldowns[slot] = Math.max(0, state.cooldowns[slot] - dtMs);
    }
  });

  // 被动：生命恢复（每 10s x%）
  const p2Lv = state.levels.p2_regen;
  const p2Cfg = skillLevelCfg("p2_regen", p2Lv);
  if (p2Cfg.regenPctPer10s) {
    const healPerSec = (player.maxHp * p2Cfg.regenPctPer10s) / 10;
    player.hp = Math.min(player.maxHp, player.hp + healPerSec * dt);
  }

  // 时间扭曲到期清理
  if (state.timeWarpUntilMs && nowMs > state.timeWarpUntilMs) {
    state.timeWarpUntilMs = 0;
    state.timeWarpScale = 1;
  }
}

/** 尝试释放主动技能；成功返回 true 并扣能量+扣冷却。 */
export function tryCastActive(
  state: SkillRuntimeState,
  slot: SkillSlot,
  player: PlayerRuntime,
  nowMs: number,
): { ok: boolean; skill: SkillId; level: SkillLevel; cfg: ReturnType<typeof skillLevelCfg> } | null {
  const skill = ACTIVE_SKILL_ORDER[slot];
  if (!skill) return null;
  const lv = state.levels[skill];
  const cfg = skillLevelCfg(skill, lv);
  if (state.cooldowns[slot] > 0) return null;
  if (player.energy < cfg.energyCost) return null;
  player.energy -= cfg.energyCost;
  state.cooldowns[slot] = cfg.cooldownMs;
  state.lastCastAt[skill] = nowMs;

  // 时间扭曲：立即激活
  if (skill === "s3_timewarp") {
    state.timeWarpUntilMs = nowMs + (cfg.durationMs || 5_000);
    state.timeWarpScale = cfg.timeScale ?? 0.5;
  }
  return { ok: true, skill, level: lv, cfg };
}

/**
 * 巡航导弹释放：锁定最近的 N 个敌人，生成导弹实体。
 * 返回生成的导弹列表，由调用方加入游戏循环。
 */
export function spawnMissiles(
  state: SkillRuntimeState,
  player: PlayerRuntime,
  enemies: Array<{ id: number; x: number; y: number; alive: boolean }>,
): MissileRuntime[] {
  const lv = state.levels.s1_missile;
  const cfg = skillLevelCfg("s1_missile", lv);
  const count = cfg.missileCount ?? 3;
  const dmg = cfg.missileDmg ?? 60;
  const speed = 600;
  const turnRate = 4.0; // 弧度/秒

  // 选择最近的 alive 敌人
  const aliveEnemies = enemies.filter((e) => e.alive);
  aliveEnemies.sort((a, b) => {
    const da = Math.hypot(a.x - player.x, a.y - player.y);
    const db = Math.hypot(b.x - player.x, b.y - player.y);
    return da - db;
  });
  const targets = aliveEnemies.slice(0, count);

  const missiles: MissileRuntime[] = [];
  for (let i = 0; i < count; i++) {
    const target = targets[i % Math.max(1, targets.length)];
    const targetId = target ? target.id : -1;
    const angle = -Math.PI / 2 + (i - (count - 1) / 2) * 0.3; // 扇形发射
    missiles.push({
      id: __missileId++,
      x: player.x, y: player.y - 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      targetId,
      dmg, speed, turnRate,
      lifeMs: 6_000,
      alive: true,
      trail: [],
    });
  }
  return missiles;
}

/**
 * 导弹每帧更新：追踪目标、移动、碰撞检测。
 * 返回：命中事件列表（{ missileId, targetId, x, y, dmg }）。
 */
export function tickMissiles(
  missiles: MissileRuntime[],
  enemies: Array<{ id: number; x: number; y: number; alive: boolean }>,
  dtMs: number,
): Array<{ missileId: number; targetId: number; x: number; y: number; dmg: number }> {
  const dt = dtMs / 1000;
  const hits: Array<{ missileId: number; targetId: number; x: number; y: number; dmg: number }> = [];

  for (const m of missiles) {
    if (!m.alive) continue;
    m.lifeMs -= dtMs;
    if (m.lifeMs <= 0) { m.alive = false; continue; }

    // 查找目标
    let target: { id: number; x: number; y: number; alive: boolean } | undefined;
    if (m.targetId >= 0) {
      target = enemies.find((e) => e.id === m.targetId && e.alive);
    }
    if (!target) {
      // 目标已死，找最近的活敌人
      const alive = enemies.filter((e) => e.alive);
      if (alive.length > 0) {
        alive.sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y));
        target = alive[0];
        m.targetId = target.id;
      }
    }

    // 追踪转向
    if (target) {
      const desiredAngle = Math.atan2(target.y - m.y, target.x - m.x);
      const currentAngle = Math.atan2(m.vy, m.vx);
      let diff = desiredAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const maxTurn = m.turnRate * dt;
      const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
      const newAngle = currentAngle + turn;
      m.vx = Math.cos(newAngle) * m.speed;
      m.vy = Math.sin(newAngle) * m.speed;
    }

    // 移动
    m.x += m.vx * dt;
    m.y += m.vy * dt;

    // 尾迹
    m.trail.push({ x: m.x, y: m.y, alpha: 1 });
    if (m.trail.length > 12) m.trail.shift();
    for (const t of m.trail) t.alpha *= 0.88;

    // 碰撞检测
    if (target) {
      const dist = Math.hypot(target.x - m.x, target.y - m.y);
      if (dist < 32) {
        hits.push({ missileId: m.id, targetId: target.id, x: m.x, y: m.y, dmg: m.dmg });
        m.alive = false;
      }
    }

    // 出界
    if (m.x < -50 || m.x > 2000 || m.y < -50 || m.y > 2000) m.alive = false;
  }
  return hits;
}

/**
 * EMP 释放：对范围内敌人施加眩晕 + 护盾失效。
 * 返回受影响的敌人 ID 列表（供视觉特效使用）。
 */
export function applyEmp(
  state: SkillRuntimeState,
  player: PlayerRuntime,
  enemies: Array<{ id: number; x: number; y: number; alive: boolean; stunnedUntilMs?: number; shieldDisabledUntilMs?: number; shieldHp?: number }>,
  nowMs: number,
): { hitIds: number[]; radius: number; x: number; y: number } {
  const lv = state.levels.s2_emp;
  const cfg = skillLevelCfg("s2_emp", lv);
  const radius = cfg.empRadius ?? 320;
  const stunMs = cfg.empStunMs ?? 3_000;
  const shieldBreakMs = cfg.empShieldBreakMs ?? 5_000;

  const hitIds: number[] = [];
  for (const e of enemies) {
    if (!e.alive) continue;
    const dist = Math.hypot(e.x - player.x, e.y - player.y);
    if (dist <= radius) {
      if (e.stunnedUntilMs !== undefined) e.stunnedUntilMs = nowMs + stunMs;
      if (e.shieldDisabledUntilMs !== undefined) e.shieldDisabledUntilMs = nowMs + shieldBreakMs;
      if (e.shieldHp !== undefined && e.shieldHp > 0) e.shieldHp = 0; // 立即击碎护盾
      hitIds.push(e.id);
    }
  }
  return { hitIds, radius, x: player.x, y: player.y };
}

/**
 * 判断敌人是否被眩晕（不能移动/开火）。
 */
export function isEnemyStunned(stunnedUntilMs: number, nowMs: number): boolean {
  return stunnedUntilMs > nowMs;
}

/**
 * 判断敌人护盾是否被 EMP 失效。
 */
export function isEnemyShieldDisabled(shieldDisabledUntilMs: number, nowMs: number): boolean {
  return shieldDisabledUntilMs > nowMs;
}

/**
 * 计算时间扭曲系数：当前是否激活，以及敌人/弹幕的时间缩放。
 * 返回 1.0 表示正常，0.5 表示减速 50%。
 */
export function getEnemyTimeScale(state: SkillRuntimeState, nowMs: number): number {
  if (state.timeWarpUntilMs > nowMs) {
    return state.timeWarpScale;
  }
  return 1.0;
}

/**
 * 计算主武器最终伤害（含 p1_power 攻击强化 + p5_crit 暴击判定）。
 * 返回 { damage, isCrit } 供调用方显示暴击特效。
 */
export function computePlayerBulletDamage(
  state: SkillRuntimeState,
): { damage: number; isCrit: boolean } {
  const lv = state.levels.p1_power;
  const cfg = skillLevelCfg("p1_power", lv);
  const bonus = cfg.dmgBonusPct || 0;
  let damage = BALANCE.PLAYER_BULLET_DMG * (1 + bonus);

  // 暴击判定
  const critCfg = skillLevelCfg("p5_crit", state.levels.p5_crit);
  const critRate = critCfg.critRate ?? 0;
  const critMul = critCfg.critMul ?? 2.0;
  const isCrit = Math.random() < critRate;
  if (isCrit) {
    damage *= critMul;
  }
  return { damage, isCrit };
}

/**
 * 吸血处理：将造成伤害的一定比例转化为生命值。
 */
export function applyLifesteal(
  state: SkillRuntimeState,
  player: PlayerRuntime,
  damageDealt: number,
): number {
  const lv = state.levels.p6_lifesteal;
  const cfg = skillLevelCfg("p6_lifesteal", lv);
  const pct = cfg.lifestealPct ?? 0;
  if (pct <= 0) return 0;
  const heal = damageDealt * pct;
  player.hp = Math.min(player.maxHp, player.hp + heal);
  return heal;
}

/**
 * 护甲减伤：计算实际受到的伤害（扣除护甲减免）。
 */
export function applyArmorReduction(
  state: SkillRuntimeState,
  rawDamage: number,
): number {
  const lv = state.levels.p7_armor;
  const cfg = skillLevelCfg("p7_armor", lv);
  const reduction = cfg.armorPct ?? 0;
  return Math.max(1, Math.round(rawDamage * (1 - reduction)));
}
