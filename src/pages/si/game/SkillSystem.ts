/**
 * 技能系统核心：3 主动（巡航导弹/电磁脉冲/时间扭曲）+ 10 被动（攻击强化/生命恢复/最大生命/最大能量/暴击/吸血/护甲/追踪弹道/僚机护航/凤凰复活）。
 * 负责冷却管理、释放判定、被动属性计算与每帧 tick。
 */
import { BALANCE, SKILLS, ACTIVE_SKILL_ORDER } from "../config";
import type { BulletRuntime, EnemyRuntime, MissileRuntime, PlayerRuntime, SkillId, SkillLevel, SkillRuntimeState, SkillSlot, WingmanRuntime } from "../types";

const LEVELS: SkillLevel[] = [0, 1, 2, 3];
const ALL_IDS: SkillId[] = [
  "s1_missile", "s2_emp", "s3_timewarp", "s4_shield",
  "p1_power", "p2_regen", "p3_maxhp", "p4_maxenergy", "p5_crit", "p6_lifesteal", "p7_armor",
  "p8_homing", "p9_wingman", "p10_revive", "p11_shiplevel",
];

let __wingmanId = 60_000;

let __missileId = 50_000;

/** 初始化：默认全 Lv0。 */
export function createInitialSkillState(): SkillRuntimeState {
  const levels = {} as SkillRuntimeState["levels"];
  const lastCastAt = {} as SkillRuntimeState["lastCastAt"];
  (ALL_IDS as SkillId[]).forEach((id) => { levels[id] = 0; lastCastAt[id] = 0; });
  return {
    cooldowns: { 0: 0, 1: 0, 2: 0, 3: 0 },
    levels, lastCastAt,
    timeWarpUntilMs: 0, timeWarpScale: 1,
    empFieldUntilMs: 0, empFieldX: 0, empFieldY: 0, empFieldRadius: 0,
    twFieldUntilMs: 0, twFieldX: 0, twFieldY: 0, twFieldRadius: 0,
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

  // p8_homing: 追踪弹道转向速率
  const homingCfg = skillLevelCfg("p8_homing", state.levels.p8_homing);
  player.homingTurnRate = homingCfg.homingTurnRate ?? 0;

  // p9_wingman: 僚机数量
  const wingmanCfg = skillLevelCfg("p9_wingman", state.levels.p9_wingman);
  player.wingmanCount = wingmanCfg.wingmanCount ?? 0;

  // p10_revive: 复活次数（每关重置已用次数）
  const reviveCfg = skillLevelCfg("p10_revive", state.levels.p10_revive);
  player.reviveCount = reviveCfg.reviveCount ?? 0;
  player.reviveUsedCount = 0;

  // p11_shiplevel: 战机等级伤害加成 + 单次开火子弹数
  const shipCfg = skillLevelCfg("p11_shiplevel", state.levels.p11_shiplevel);
  player.shipLevelDmgPct = shipCfg.shipLevelDmgPct ?? 0;
  player.shipLevelBullets = shipCfg.shipLevelBullets ?? 1;
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
  // 时间扭曲场地到期清理
  if (state.twFieldUntilMs && nowMs > state.twFieldUntilMs) {
    state.twFieldUntilMs = 0;
  }
  // EMP 场地到期清理
  if (state.empFieldUntilMs && nowMs > state.empFieldUntilMs) {
    state.empFieldUntilMs = 0;
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

  // 时间扭曲：立即激活（同时设置全局效果和区域场地）
  if (skill === "s3_timewarp") {
    const dur = cfg.durationMs || 10_000;
    state.timeWarpUntilMs = nowMs + dur;
    state.timeWarpScale = cfg.timeScale ?? 0.5;
    // 设置时间扭曲场地（半径 = 屏幕宽度 25%）
    state.twFieldUntilMs = nowMs + dur;
    state.twFieldX = player.x;
    state.twFieldY = player.y - 20;
    state.twFieldRadius = 1080 * 0.25; // WORLD.WIDTH * 25% = 270
  }
  // 超级防御盾：立即激活无敌状态
  if (skill === "s4_shield") {
    player.superShieldUntilMs = nowMs + (cfg.durationMs || 30_000);
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
 * EMP 释放（增强版）：
 * 1. 对范围内敌人立即造成 50% 当前生命值伤害（整数）
 * 2. 设置 10 秒持续场地，期间范围内敌人移动禁止（保留攻击）
 * 3. 护盾立即击碎 + 失效 10 秒
 * 返回受影响的敌人 ID 列表 + 场地信息（供视觉特效使用）。
 */
export function applyEmp(
  state: SkillRuntimeState,
  player: PlayerRuntime,
  enemies: Array<{ id: number; x: number; y: number; hp: number; alive: boolean; stunnedUntilMs?: number; shieldDisabledUntilMs?: number; shieldHp?: number; empFieldUntilMs?: number }>,
  nowMs: number,
): { hitIds: number[]; radius: number; x: number; y: number; damageDealt: Array<{ id: number; dmg: number }> } {
  const lv = state.levels.s2_emp;
  const cfg = skillLevelCfg("s2_emp", lv);
  const radius = cfg.empRadius ?? 324;
  const stunMs = cfg.empStunMs ?? 10_000;
  const shieldBreakMs = cfg.empShieldBreakMs ?? 10_000;
  const durationMs = cfg.durationMs ?? 10_000;

  // 设置 EMP 持续场地状态
  state.empFieldUntilMs = nowMs + durationMs;
  state.empFieldX = player.x;
  state.empFieldY = player.y - 20;
  state.empFieldRadius = radius;

  const hitIds: number[] = [];
  const damageDealt: Array<{ id: number; dmg: number }> = [];
  for (const e of enemies) {
    if (!e.alive) continue;
    const dist = Math.hypot(e.x - player.x, e.y - (player.y - 20));
    if (dist <= radius) {
      // 1. 立即造成 50% 当前生命值伤害（整数）
      const dmg = Math.floor(e.hp * 0.5);
      if (dmg > 0) {
        e.hp = Math.max(0, e.hp - dmg);
        damageDealt.push({ id: e.id, dmg });
      }
      // 2. 设置移动禁止（empFieldUntilMs）
      if (e.empFieldUntilMs !== undefined) e.empFieldUntilMs = nowMs + durationMs;
      // 3. 眩晕 + 护盾失效（保留向后兼容）
      if (e.stunnedUntilMs !== undefined) e.stunnedUntilMs = nowMs + stunMs;
      if (e.shieldDisabledUntilMs !== undefined) e.shieldDisabledUntilMs = nowMs + shieldBreakMs;
      // 4. 立即击碎护盾
      if (e.shieldHp !== undefined && e.shieldHp > 0) e.shieldHp = 0;
      hitIds.push(e.id);
    }
  }
  return { hitIds, radius, x: player.x, y: player.y - 20, damageDealt };
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
 * 判断敌人是否在 EMP 场地内（移动禁止，但可以攻击）。
 * 每帧实时检测敌人与场地中心的距离。
 */
export function isEnemyInEmpField(
  state: SkillRuntimeState,
  enemyX: number, enemyY: number,
  nowMs: number,
): boolean {
  if (state.empFieldUntilMs <= nowMs) return false;
  const dist = Math.hypot(enemyX - state.empFieldX, enemyY - state.empFieldY);
  return dist <= state.empFieldRadius;
}

/**
 * 判断敌人是否在时间扭曲场地内（移动禁止 + 攻击禁止 + 时间流速 50%）。
 * 每帧实时检测敌人与场地中心的距离。
 */
export function isEnemyInTimeWarpField(
  state: SkillRuntimeState,
  enemyX: number, enemyY: number,
  nowMs: number,
): boolean {
  if (state.twFieldUntilMs <= nowMs) return false;
  const dist = Math.hypot(enemyX - state.twFieldX, enemyY - state.twFieldY);
  return dist <= state.twFieldRadius;
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
 * 判断超级防御盾是否处于激活状态：激活期间无视所有伤害。
 */
export function isSuperShieldActive(player: PlayerRuntime, nowMs: number): boolean {
  return player.superShieldUntilMs > nowMs;
}

/**
 * 计算主武器最终伤害（含 p1_power 攻击强化 + p11_shiplevel 战机等级 + p5_crit 暴击判定）。
 * 返回 { damage, isCrit } 供调用方显示暴击特效。
 */
export function computePlayerBulletDamage(
  state: SkillRuntimeState,
): { damage: number; isCrit: boolean } {
  const lv = state.levels.p1_power;
  const cfg = skillLevelCfg("p1_power", lv);
  const bonus = cfg.dmgBonusPct || 0;
  // p11_shiplevel 战机等级额外伤害加成
  const shipCfg = skillLevelCfg("p11_shiplevel", state.levels.p11_shiplevel);
  const shipBonus = shipCfg.shipLevelDmgPct ?? 0;
  let damage = BALANCE.PLAYER_BULLET_DMG * (1 + bonus + shipBonus);

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

/**
 * 追踪子弹每帧更新：自动锁定最近敌人并转向。
 * 仅处理 from=player 且 homingTurnRate>0 的子弹。
 */
export function tickHomingBullets(
  bullets: BulletRuntime[],
  enemies: Array<{ id: number; x: number; y: number; alive: boolean }>,
  dtMs: number,
): void {
  const dt = dtMs / 1000;
  for (const bl of bullets) {
    if (!bl.alive || bl.from !== "player") continue;
    const turnRate = bl.homingTurnRate ?? 0;
    if (turnRate <= 0) continue;

    // 锁定目标：优先沿用已有目标，否则找最近敌人
    let target: { id: number; x: number; y: number; alive: boolean } | undefined;
    if (bl.targetId !== undefined && bl.targetId >= 0) {
      target = enemies.find((e) => e.id === bl.targetId && e.alive);
    }
    if (!target) {
      const alive = enemies.filter((e) => e.alive);
      if (alive.length > 0) {
        alive.sort((a, b) => Math.hypot(a.x - bl.x, a.y - bl.y) - Math.hypot(b.x - bl.x, b.y - bl.y));
        target = alive[0];
        bl.targetId = target.id;
      }
    }
    if (!target) continue;

    // 追踪转向（与导弹逻辑一致）
    const desiredAngle = Math.atan2(target.y - bl.y, target.x - bl.x);
    const currentAngle = Math.atan2(bl.vy, bl.vx);
    let diff = desiredAngle - currentAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const maxTurn = turnRate * dt;
    const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
    const newAngle = currentAngle + turn;
    const speed = Math.hypot(bl.vx, bl.vy);
    bl.vx = Math.cos(newAngle) * speed;
    bl.vy = Math.sin(newAngle) * speed;
  }
}

/**
 * 创建僚机实体：根据 p9_wingman 等级生成僚机列表。
 * 僚机位置：玩家左右两侧，offsetX = ±60。
 */
export function createWingmen(state: SkillRuntimeState, player: PlayerRuntime): WingmanRuntime[] {
  const count = player.wingmanCount;
  const out: WingmanRuntime[] = [];
  if (count <= 0) return out;
  const offsets = count === 1 ? [-60] : [-60, 60];
  for (const off of offsets) {
    out.push({
      id: __wingmanId++,
      x: player.x + off,
      y: player.y + 20,
      offsetX: off,
      fireCooldownMs: 0,
      alive: true,
    });
  }
  return out;
}

/**
 * 僚机每帧更新：跟随玩家位置 + 自动开火判定。
 * 返回：本帧僚机发射的子弹列表（调用方加入主弹幕池）。
 */
export function tickWingmen(
  wingmen: WingmanRuntime[],
  player: PlayerRuntime,
  state: SkillRuntimeState,
  dtMs: number,
  nowMs: number,
): Array<{ x: number; y: number; dmg: number; isCrit: boolean }> {
  const out: Array<{ x: number; y: number; dmg: number; isCrit: boolean }> = [];
  if (wingmen.length === 0) return out;
  const wingmanCfg = skillLevelCfg("p9_wingman", state.levels.p9_wingman);
  const dmgPct = wingmanCfg.wingmanDmgPct ?? 0;
  if (dmgPct <= 0) return out;

  // 僚机射击间隔：比主武器稍慢（240ms）
  const FIRE_INTERVAL = 240;

  for (const w of wingmen) {
    if (!w.alive) continue;
    // 跟随玩家位置（带轻微平滑）
    const targetX = player.x + w.offsetX;
    const targetY = player.y + 20;
    w.x += (targetX - w.x) * 0.15;
    w.y += (targetY - w.y) * 0.15;

    // 冷却递减
    if (w.fireCooldownMs > 0) w.fireCooldownMs = Math.max(0, w.fireCooldownMs - dtMs);
    if (w.fireCooldownMs > 0) continue;

    // 开火
    w.fireCooldownMs = FIRE_INTERVAL;
    // 僚机伤害 = 主武器基础伤害 × 比例 × (1+攻击强化+战机等级) × 暴击判定
    const baseDmg = BALANCE.PLAYER_BULLET_DMG * dmgPct;
    const powerCfg = skillLevelCfg("p1_power", state.levels.p1_power);
    const bonus = powerCfg.dmgBonusPct || 0;
    const shipCfg = skillLevelCfg("p11_shiplevel", state.levels.p11_shiplevel);
    const shipBonus = shipCfg.shipLevelDmgPct ?? 0;
    let dmg = baseDmg * (1 + bonus + shipBonus);

    // 暴击判定
    const critCfg = skillLevelCfg("p5_crit", state.levels.p5_crit);
    const critRate = critCfg.critRate ?? 0;
    const critMul = critCfg.critMul ?? 2.0;
    const isCrit = Math.random() < critRate;
    if (isCrit) dmg *= critMul;

    out.push({ x: w.x, y: w.y - 20, dmg, isCrit });
  }
  return out;
}

/**
 * 凤凰复活判定：玩家死亡时，若仍有复活次数，自动复活。
 * 成功复活返回 true 并设置 HP 和无敌时间。
 */
export function tryRevive(
  state: SkillRuntimeState,
  player: PlayerRuntime,
  nowMs: number,
): { revived: boolean; hpRestored: number } {
  if (player.reviveUsedCount >= player.reviveCount) {
    return { revived: false, hpRestored: 0 };
  }
  const cfg = skillLevelCfg("p10_revive", state.levels.p10_revive);
  const hpPct = cfg.reviveHpPct ?? 0.30;
  const hpRestored = Math.round(player.maxHp * hpPct);
  player.hp = hpRestored;
  player.reviveUsedCount += 1;
  // 复活后短暂无敌（1.5s）
  player.invulnUntilMs = nowMs + 1_500;
  return { revived: true, hpRestored };
}

