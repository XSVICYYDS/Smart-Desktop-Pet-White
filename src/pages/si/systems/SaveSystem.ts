/** 3 存档槽系统（localStorage + 校验和 + 槽预览/删除）。 */
import type { QualityTier } from "../engine/HardwareDetect";
import type { SaveSlot, ShopMissiles, ShopUpgrades, SkillId, SkillLevel } from "../types";

const PREFIX = "si_save_v1_";
const SKILLS_ALL: SkillId[] = [
  "s1_missile", "s2_emp", "s3_timewarp", "s4_shield",
  "p1_power", "p2_regen", "p3_maxhp", "p4_maxenergy", "p5_crit", "p6_lifesteal", "p7_armor",
  "p8_homing", "p9_wingman", "p10_revive", "p11_shiplevel",
];

const zeroSkills = (): Record<SkillId, SkillLevel> => ({
  s1_missile: 0, s2_emp: 0, s3_timewarp: 0, s4_shield: 0,
  p1_power: 0, p2_regen: 0, p3_maxhp: 0, p4_maxenergy: 0, p5_crit: 0, p6_lifesteal: 0, p7_armor: 0,
  p8_homing: 0, p9_wingman: 0, p10_revive: 0, p11_shiplevel: 0,
});

/** 默认商店升级等级（全部 Lv0）。 */
const zeroShopUpgrades = (): ShopUpgrades => ({ mainGun: 0, subGun: 0, defense: 0, engine: 0, radar: 0 });
/** 默认商店导弹持有数（全部 0 枚）。 */
const zeroShopMissiles = (): ShopMissiles => ({ normal: 0, cruise: 0, explosion: 0, pierce: 0, cluster: 0 });

export function emptySlot(slot: 0 | 1 | 2): SaveSlot {
  return {
    version: 1, slot, name: `存档 ${slot + 1}`, savedAtMs: 0,
    level: 1, totalScore: 0, bestScore: 0,
    skills: zeroSkills(), skillPoints: 0, clearedLevels: 0,
    unlockedAchievements: [],
    settings: { sfx: 0.8, bgm: 0.6, quality: "auto", input: "keyboard" },
    // 商店系统默认值：金币 0、所有升级 Lv0、无导弹
    gold: 0,
    shopUpgrades: zeroShopUpgrades(),
    shopMissiles: zeroShopMissiles(),
  };
}

function checksum(s: SaveSlot): number {
  // 校验和纳入商店字段，保证存档完整性
  const su = s.shopUpgrades || zeroShopUpgrades();
  const sm = s.shopMissiles || zeroShopMissiles();
  const core =
    `${s.version}:${s.slot}:${s.level}:${s.totalScore}:${s.bestScore}:` +
    `${s.skillPoints}:${s.clearedLevels}:${SKILLS_ALL.map((k) => s.skills[k]).join(",")}:` +
    s.unlockedAchievements.length + ":" +
    `${s.gold || 0}:${su.mainGun},${su.subGun},${su.defense},${su.engine},${su.radar}:` +
    `${sm.normal},${sm.cruise},${sm.explosion},${sm.pierce},${sm.cluster}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < core.length; i++) {
    h ^= core.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function loadSlot(slot: 0 | 1 | 2): SaveSlot {
  try {
    const raw = localStorage.getItem(PREFIX + slot);
    if (!raw) return emptySlot(slot);
    const parsed = JSON.parse(raw) as { data: SaveSlot; check: number };
    if (!parsed || !parsed.data || parsed.check !== checksum(parsed.data)) return emptySlot(slot);
    // 旧存档兼容：若缺少商店字段，自动补齐默认值
    const base = emptySlot(slot);
    const data = parsed.data;
    return {
      ...base,
      ...data,
      skills: { ...zeroSkills(), ...(data.skills || {}) },
      shopUpgrades: { ...zeroShopUpgrades(), ...(data.shopUpgrades || {}) },
      shopMissiles: { ...zeroShopMissiles(), ...(data.shopMissiles || {}) },
      gold: typeof data.gold === "number" ? data.gold : 0,
    };
  } catch {
    return emptySlot(slot);
  }
}

export function saveSlot(slot: SaveSlot): void {
  slot.savedAtMs = Date.now();
  const payload = { data: slot, check: checksum(slot) };
  localStorage.setItem(PREFIX + slot.slot, JSON.stringify(payload));
}

export function deleteSlot(slot: 0 | 1 | 2): void {
  localStorage.removeItem(PREFIX + slot);
}

export type { SaveSlot };
export type { SkillLevel, SkillId };

export function previewSlots(): Array<SaveSlot & { exists: boolean }> {
  return [0, 1, 2].map((i) => {
    const s = loadSlot(i as 0 | 1 | 2);
    return { ...s, exists: s.savedAtMs > 0 };
  });
}

export type { QualityTier };
