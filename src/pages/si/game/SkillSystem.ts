/** 技能系统核心：冷却/释放/升级/被动效果判定。 */
import { BALANCE, SKILLS, ACTIVE_SKILL_ORDER } from "../config";
import type { PlayerRuntime, SkillId, SkillLevel, SkillRuntimeState, SkillSlot } from "../types";

const LEVELS: SkillLevel[] = [0, 1, 2, 3];
const ALL_IDS: SkillId[] = ["s1_nuke", "s2_shield", "s3_haste", "s4_cruise", "s5_emp", "s6_timewarp", "p1_power", "p2_regen", "p3_maxhp", "p4_maxenergy", "p5_crit", "p6_lifesteal", "p7_armor"];

/** 初始化：默认全 Lv0。 */
export function createInitialSkillState(): SkillRuntimeState {
  const levels = {} as SkillRuntimeState["levels"];
  const lastCastAt = {} as SkillRuntimeState["lastCastAt"];
  (ALL_IDS as SkillId[]).forEach((id) => { levels[id] = 0; lastCastAt[id] = 0; });
  return { cooldowns: { 0: 0, 1: 0, 2: 0 }, levels, lastCastAt };
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

/** 每帧更新：冷却递减、被动（回血）、能量回复。 */
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
  // 被动：攻击强化由武器伤害处取 cfg().dmgBonusPct 直接乘，不用 tick。
  // 被动：生命恢复（每 10s x%），这里均匀积分按 dt 累计
  const p2Lv = state.levels.p2_regen;
  const p2Cfg = skillLevelCfg("p2_regen", p2Lv);
  if (p2Cfg.regenPctPer10s) {
    const healPerSec = (player.maxHp * p2Cfg.regenPctPer10s) / 10;
    player.hp = Math.min(player.maxHp, player.hp + healPerSec * dt);
  }
  // 被动：吸血在造成伤害时处理，无需 tick
  // 护盾/加速 到期自动清理
  if (player.shieldUntilMs && nowMs > player.shieldUntilMs) {
    player.shieldUntilMs = 0;
    player.shieldHits = 0;
  }
  if (player.speedBoostUntilMs && nowMs > player.speedBoostUntilMs) {
    player.speedBoostUntilMs = 0;
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
  if (skill === "s2_shield") {
    player.shieldUntilMs = nowMs + (cfg.durationMs || 0);
    player.shieldHits = Math.max(0, Math.round(cfg.valuePct));
  }
  if (skill === "s3_haste") {
    player.speedBoostUntilMs = nowMs + (cfg.durationMs || 0);
  }
  // s4_cruise/s5_emp/s6_timewarp 效果在 index.tsx 中处理
  return { ok: true, skill, level: lv, cfg };
}

/** 护盾判断：若护盾还在则抵挡 1 hit，返回 true。 */
export function tryBlock(player: PlayerRuntime, nowMs: number): boolean {
  if (player.shieldUntilMs > nowMs && player.shieldHits > 0) {
    player.shieldHits -= 1;
    if (player.shieldHits <= 0) player.shieldUntilMs = 0;
    return true;
  }
  return false;
}

/** 计算主武器最终伤害（计入 p1_power 被动）。 */
export function computePlayerBulletDamage(state: SkillRuntimeState): number {
  const lv = state.levels.p1_power;
  const cfg = skillLevelCfg("p1_power", lv);
  const bonus = cfg.dmgBonusPct || 0;
  return BALANCE.PLAYER_BULLET_DMG * (1 + bonus);
}
