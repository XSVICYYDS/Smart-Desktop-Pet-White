/** 太空侵略者终极版顶层 Container：把 28 模块组合起来对外以单组件暴露。 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACHIEVEMENTS, BALANCE, ENEMY_STATS, ENEMY_GOLD_REWARD, LEVELS, RADAR_LEVEL_CONFIG,
  SHOP_MISSILE_CONFIG, SHOP_MISSILE_MAX, SHOP_UPGRADE_CONFIG, WORLD,
} from "./config";
import { useGameLoop } from "./game/useGameLoop";
import {
  computeDynamicMul, finalizeClear, startLevel, bossKindOfLevel, type LevelRuntime,
} from "./game/LevelSystem";
import { applyBossDamage, createBoss, resetBossBulletIds, tickBoss } from "./game/BossSystem";
import {
  clampLv, computePlayerBulletDamage, createInitialSkillState, tickSkills, tryCastActive,
  applyPassiveSkills, spawnMissiles, tickMissiles, applyEmp, applyLifesteal, applyArmorReduction,
  getEnemyTimeScale, isEnemyStunned, isEnemyInEmpField, isEnemyInTimeWarpField,
  tickHomingBullets, createWingmen, tickWingmen, tryRevive, isSuperShieldActive,
} from "./game/SkillSystem";
import { resetEnemyIds, spawnEnemy, stepEnemy } from "./game/EnemyFactory";

import { BatchRenderer } from "./engine/BatchRenderer";
import { detectHardware, selectQualityProfile, type QualityProfile } from "./engine/HardwareDetect";
import { intersectsAABB, SpatialHash, type Bounded } from "./engine/SpatialHash";

import { drawParallax, createParallax, tickParallax, type ParallaxState } from "./render/ParallaxBackground";
import { addLight, createLighting, drawLighting, type LightingState } from "./render/DynamicLighting";
import {
  drawBoss, drawEnemy, drawPlayer,
  createFloatTexts, createParticleSystem, drawFloats, drawParticles, spawnBurst, spawnFloatText, stepFloats, stepParticles,
  type FloatText, type Particle,
} from "./render/UIAssets";

import { MainMenu } from "./ui/MainMenu";
import { HUD } from "./ui/HUD";
import { SettingsPanel } from "./ui/SettingsPanel";
import { SkillTree } from "./ui/SkillTree";
import { SaveSlots } from "./ui/SaveSlots";
import { AchievementBoard } from "./ui/AchievementBoard";
import { TransitionOverlay, type TransitionKind } from "./ui/TransitionOverlay";
import { TouchControls } from "./ui/TouchControls";
import { GameOverScreen } from "./ui/GameOverScreen";
import { LevelSelect } from "./ui/LevelSelect";
import { Shop } from "./ui/Shop";
import { RadarMiniMap } from "./ui/RadarMiniMap";

import type { InputMode, LevelClearResult, PlayerRuntime, ScreenState, SkillId, SkillLevel, SkillRuntimeState } from "./types";
import type { BossRuntime, BulletRuntime, EnemyRuntime, MissileRuntime, WingmanRuntime } from "./types";
import type { MissileType, ShopMissileRuntime, ShopMissiles, ShopUpgrades, UpgradeType } from "./types";

import {
  createAchievementState, onAchievementUnlock, unlockAchievement,
  tryClearLevelAchievements, tryScoreAchievements, type AchievementState,
} from "./systems/AchievementSystem";
import {
  ensureAudio, playBGM, playSFX, setBgmVolume, setSfxVolume,
} from "./systems/AudioSystem";
import { emptySlot, loadSlot, saveSlot, type SaveSlot } from "./systems/SaveSystem";
import type { QualityTier } from "./engine/HardwareDetect";

let BULLET_ID = 1;
/** 商店导弹实体 ID 计数器（独立于 BULLET_ID 与 s1 主动技能导弹）。 */
let SHOP_MISSILE_ID = 1;

export interface ContainerProps {
  onFinalize?: (finalScore: number, isNewRecordHint: boolean) => void;
  initialGameId?: string;
}

type TabId = "play" | "settings" | "skills" | "leaderboard" | "help";

function bossTitle(k: NonNullable<BossRuntime>["kind"]): string {
  switch (k) {
    case "guardian": return "外星护卫者";
    case "corruptor": return "腐蚀者";
    case "mothership": return "元首母舰";
    case "fuhrer": return "元首本体";
  }
}

/**
 * 护盾格挡判定：当玩家护盾处于激活状态且剩余次数 > 0 时，消耗一次格挡并返回 true。
 * 当前技能系统未提供护盾技能，此函数保留作为未来扩展接入点（如掉落物/道具）。
 */
function tryBlock(p: PlayerRuntime, nowMs: number): boolean {
  if (p.shieldUntilMs > nowMs && p.shieldHits > 0) {
    p.shieldHits -= 1;
    if (p.shieldHits <= 0) p.shieldUntilMs = 0;
    return true;
  }
  return false;
}

/** 顶层组件：组合 si/* 下所有模块，完成单组件封装。 */
export const Container: React.FC<ContainerProps> = (props) => {
  void props.initialGameId;
  const [tab, setTab] = useState<TabId>("play");

  // ===== 硬件/画质（一次检测，允许设置覆盖）=====
  const [quality, setQuality] = useState<QualityTier | "auto">("auto");
  const [hardware] = useState(() => detectHardware());
  const profile: QualityProfile = useMemo(() => selectQualityProfile(hardware, quality === "auto" ? null : quality), [hardware, quality]);

  // ===== 存档 / 全局进度 =====
  const [, setSlotIndex] = useState<0 | 1 | 2>(0);
  const [saveTick, setSaveTick] = useState(0);
  const [save, setSave] = useState<SaveSlot>(() => loadSlot(0));
  const applySave = (s: SaveSlot) => { setSave(s); setSlotIndex(s.slot); setSaveTick((x) => x + 1); };

  // ===== 设置 =====
  const [inputMode, setInputMode] = useState<InputMode>(save.settings.input || (hardware.isMobile ? "touch" : "keyboard"));
  const [sfxVol, setSfxVolState] = useState<number>(save.settings.sfx);
  const [bgmVol, setBgmVolState] = useState<number>(save.settings.bgm);
  useEffect(() => { setSfxVolume(sfxVol); }, [sfxVol]);
  useEffect(() => { setBgmVolume(bgmVol); }, [bgmVol]);

  // ===== 面板开关 =====
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [savesOpen, setSavesOpen] = useState(false);
  const [achOpen, setAchOpen] = useState(false);
  const [levelSelectOpen, setLevelSelectOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);   // 神龙殿商店开关（关卡完成后弹出）
  const [goldTick, setGoldTick] = useState(0);        // 金币 UI 刷新触发器（数字平滑过渡用）
  const [screen, setScreen] = useState<ScreenState>("menu");
  const paused = screen === "paused";

  // ===== 游戏内浮层 / 过渡动画 =====
  const [transTick, setTransTick] = useState(0);
  const [transKind, setTransKind] = useState<TransitionKind>("level-start");
  const [transTitle, setTransTitle] = useState<string | undefined>(undefined);
  const [transSub, setTransSub] = useState<string | undefined>(undefined);
  const fireTransition = (k: TransitionKind, title?: string, sub?: string) => {
    setTransKind(k); setTransTitle(title); setTransSub(sub); setTransTick((x) => x + 1);
  };

  // ===== 成就 =====
  const achStateRef = useRef<AchievementState>(createAchievementState(save.unlockedAchievements));
  useEffect(() => {
    achStateRef.current = createAchievementState(save.unlockedAchievements);
  }, [save.unlockedAchievements, saveTick]);
  const [toastAch, setToastAch] = useState<string | null>(null);
  useEffect(() => {
    return onAchievementUnlock(achStateRef.current, (_id, a) => {
      setToastAch(`${a.icon} ${a.name}`);
      playSFX("achievement");
      window.setTimeout(() => setToastAch((cur) => (cur === `${a.icon} ${a.name}` ? null : cur)), 2200);
    });
  }, []);

  // ===== 画布 =====
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ===== 玩家 & 运行时 =====
  const makePlayer = (): PlayerRuntime => ({
    x: WORLD.WIDTH / 2,
    y: WORLD.PLAYER_Y,
    vx: 0, baseSpeed: BALANCE.PLAYER_BASE_SPEED,
    hp: BALANCE.BASE_HP, maxHp: BALANCE.BASE_HP,
    energy: BALANCE.BASE_ENERGY, maxEnergy: BALANCE.BASE_ENERGY,
    shieldHits: 0, shieldUntilMs: 0, speedBoostUntilMs: 0,
    fireCooldownMs: 0, invulnUntilMs: 0,
    critRate: 0, critMul: 2.0, lifestealPct: 0, armorPct: 0,
    homingTurnRate: 0, wingmanCount: 0, reviveCount: 0, reviveUsedCount: 0,
    superShieldUntilMs: 0, shipLevelDmgPct: 0, shipLevelBullets: 1,
  });

  const makeSkills = (s: SaveSlot): SkillRuntimeState => ({
    ...createInitialSkillState(),
    levels: { ...s.skills },
  });

  /** 从存档构造商店升级等级副本（避免直接改存档引用）。 */
  const makeShopUpgrades = (s: SaveSlot): ShopUpgrades => ({
    mainGun: s.shopUpgrades?.mainGun ?? 0,
    subGun: s.shopUpgrades?.subGun ?? 0,
    defense: s.shopUpgrades?.defense ?? 0,
    engine: s.shopUpgrades?.engine ?? 0,
    radar: s.shopUpgrades?.radar ?? 0,
  });
  /** 从存档构造商店导弹持有数副本。 */
  const makeShopMissiles = (s: SaveSlot): ShopMissiles => ({
    normal: s.shopMissiles?.normal ?? 0,
    cruise: s.shopMissiles?.cruise ?? 0,
    explosion: s.shopMissiles?.explosion ?? 0,
    pierce: s.shopMissiles?.pierce ?? 0,
    cluster: s.shopMissiles?.cluster ?? 0,
  });

  const playerRef = useRef<PlayerRuntime>(makePlayer());
  const skillsRef = useRef<SkillRuntimeState>(makeSkills(save));
  const bulletsRef = useRef<BulletRuntime[]>([]);
  const missilesRef = useRef<MissileRuntime[]>([]);
  const wingmenRef = useRef<WingmanRuntime[]>([]);
  // ===== 商店系统运行时状态 =====
  const shopMissileRuntimeRef = useRef<ShopMissileRuntime[]>([]);   // 商店导弹运行时实体
  const lockedTargetsRef = useRef<Array<{ id: number; x: number; y: number; enemyType: number }>>([]); // 雷达锁定目标列表
  const goldRef = useRef<number>(save.gold ?? 0);                   // 当前持有金币（运行时）
  const shopUpgradesRef = useRef<ShopUpgrades>(makeShopUpgrades(save));   // 商店升级等级（运行时）
  const shopMissilesRef = useRef<ShopMissiles>(makeShopMissiles(save));   // 商店导弹持有数（运行时）
  const levelRuntimeRef = useRef<LevelRuntime | null>(null);
  const bossRef = useRef<BossRuntime | null>(null);
  const scoreRef = useRef<number>(0);
  const statsRef = useRef<{ killed: number; skillsUsed: number; totalDamageTaken: number }>({ killed: 0, skillsUsed: 0, totalDamageTaken: 0 });
  const clearResultRef = useRef<LevelClearResult | null>(null);
  const particlesRef = useRef<Particle[]>(createParticleSystem());
  const floatsRef = useRef<FloatText[]>(createFloatTexts());
  const parallaxRef = useRef<ParallaxState>(createParallax(profile.maxParticles >= 240 ? 260 : 140));
  const lightingRef = useRef<LightingState>(createLighting());
  const hashRef = useRef<SpatialHash<Bounded & { id?: number; ref?: unknown }>>(new SpatialHash(96));
  const batchRef = useRef<BatchRenderer>(new BatchRenderer());

  const keysRef = useRef<Record<string, boolean>>({});
  const inputDirRef = useRef<-1 | 0 | 1>(0);
  const inputDirYRef = useRef<-1 | 0 | 1>(0);
  const shootBtnRef = useRef(false);
  const mouseXRef = useRef<number | null>(null);
  const mouseYRef = useRef<number | null>(null);
  const mouseDownRef = useRef(false);
  const shootHoldRef = useRef(false);
  void shootHoldRef;
  void inputDirYRef;

  const [currentLevelIndex, setCurrentLevelIndex] = useState(Math.max(0, save.level - 1));
  const [hudTick, setHudTick] = useState(0);
  const hudThrottleRef = useRef(0);

  /** 成就辅助：单 id 解锁（已在 import 直接拿到 unlockAchievement）。 */
  const unlockSingle = (st: AchievementState, id: string) => unlockAchievement(st, id);
  const unlockAchs = (ids: string[]) => {
    const st = achStateRef.current;
    for (const id of ids) unlockSingle(st, id);
  };

  /**
   * 应用商店升级到玩家运行时属性。
   * - 主炮：+20% 激光伤害 / +15% 充能速度 / +10% 射程（影响 PLAYER_BULLET_DMG 与 FIRE_INTERVAL）
   * - 副炮：+15% 伤害 / +10% 射速 / +1 弹道（影响 shipLevelBullets 与伤害）
   * - 防御：+20% 生命 / +5% 减伤（影响 maxHp 与 armorPct）
   * - 引擎：+15% 移速 / +10% 机动性（影响 baseSpeed）
   * 升级叠加：每级按比例线性累加，与被动技能叠加。
   */
  function applyShopUpgrades(p: PlayerRuntime, su: ShopUpgrades): void {
    // 主炮：每级 +20% 伤害（叠加到 shipLevelDmgPct），同时缩短开火 CD
    const mainGunDmgPct = su.mainGun * 0.20;
    p.shipLevelDmgPct = Math.min(2.0, p.shipLevelDmgPct + mainGunDmgPct);
    // 主炮充能速度：每级 +15%（缩短开火间隔）
    const fireIntervalScale = Math.pow(0.85, su.mainGun);
    p.fireCooldownMs *= fireIntervalScale; // 当前 CD 同步缩短
    // 副炮：每级 +1 弹道（叠加到 shipLevelBullets，上限 5）
    p.shipLevelBullets = Math.min(5, p.shipLevelBullets + su.subGun);
    // 副炮伤害：每级 +15%（叠加到 shipLevelDmgPct）
    p.shipLevelDmgPct = Math.min(2.0, p.shipLevelDmgPct + su.subGun * 0.15);
    // 防御：每级 +20% 生命（叠加 maxHp），同步恢复满血
    const defHpPct = su.defense * 0.20;
    p.maxHp = Math.round(p.maxHp * (1 + defHpPct));
    p.hp = p.maxHp;
    // 防御：每级 +5% 减伤（叠加到 armorPct，上限 0.80）
    p.armorPct = Math.min(0.80, p.armorPct + su.defense * 0.05);
    // 引擎：每级 +15% 移速
    p.baseSpeed = Math.round(p.baseSpeed * Math.pow(1.15, su.engine));
  }

  /** 启动一关。 */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bootLevel = useCallback((idx: number) => {
    const safe = Math.max(0, Math.min(LEVELS.length - 1, idx));
    setCurrentLevelIndex(safe);
    const now = performance.now();
    const lv = startLevel(safe, now);
    skillsRef.current = makeSkills(save);
    playerRef.current = makePlayer();
    applyPassiveSkills(skillsRef.current, playerRef.current);
    // 应用商店升级：在被动技能之上叠加主炮/副炮/防御/引擎效果
    shopUpgradesRef.current = makeShopUpgrades(save);
    applyShopUpgrades(playerRef.current, shopUpgradesRef.current);
    // 同步金币/导弹持有数到存档运行时副本
    goldRef.current = save.gold ?? 0;
    shopMissilesRef.current = makeShopMissiles(save);
    shopMissileRuntimeRef.current = [];
    lockedTargetsRef.current = [];
    const bossKind = bossKindOfLevel(safe);
    if (bossKind) {
      resetBossBulletIds();
      bossRef.current = createBoss(bossKind);
      lv.enemies = [];
    } else {
      bossRef.current = null;
    }
    bulletsRef.current = [];
    missilesRef.current = [];
    wingmenRef.current = createWingmen(skillsRef.current, playerRef.current);
    levelRuntimeRef.current = lv;
    clearResultRef.current = null;
    statsRef.current = { killed: 0, skillsUsed: 0, totalDamageTaken: 0 };
    scoreRef.current = 0;
    particlesRef.current = createParticleSystem();
    floatsRef.current = createFloatTexts();
    resetEnemyIds();
    const def = LEVELS[safe];
    playBGM(def?.isBoss ? "boss" : "battle");
    setScreen("playing");
    fireTransition("level-start", `${safe + 1}. ${def?.name ?? "未知关卡"}`, def?.isBoss ? "BOSS 战 · 集中火力攻击弱点！" : "消灭所有外星单位即可过关");
  }, [save]);

  /** 从主菜单点击存档槽开始。 */
  const handleStartSlot = (s: 0 | 1 | 2) => {
    ensureAudio();
    playSFX("click");
    const loaded = loadSlot(s);
    applySave(loaded.savedAtMs ? loaded : { ...emptySlot(s) });
    setQuality(loaded.settings.quality || "auto");
    setInputMode(loaded.settings.input || (hardware.isMobile ? "touch" : "keyboard"));
    setSfxVolState(loaded.settings.sfx);
    setBgmVolState(loaded.settings.bgm);
    const startIdx = Math.max(0, (loaded.level || 1) - 1);
    playBGM("menu");
    // 状态更新滞后一次，用 setTimeout 保证 save 已生效
    window.setTimeout(() => bootLevel(startIdx), 10);
  };

  // ===== 键盘事件 =====
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) e.preventDefault();
      if (k === "p" || k === "escape") {
        e.preventDefault();
        if (screen === "playing") {
          setScreen("paused");
          playBGM("menu");
          fireTransition("pause");
        } else if (screen === "paused") {
          const def = LEVELS[currentLevelIndex];
          playBGM(def?.isBoss ? "boss" : "battle");
          setScreen("playing");
        }
      }
      if (screen !== "playing") return;
      if (k === "q") castSlot(0);
      if (k === "e") castSlot(1);
      if (k === "shift") castSlot(2);
      if (k === "r") castSlot(3);
      // 商店导弹发射：1/5=普通, 2/6=巡航, 3/7=爆炸, 4/8=穿刺, 9=子母弹
      if (k === "1" || k === "5") launchShopMissile("normal");
      if (k === "2" || k === "6") launchShopMissile("cruise");
      if (k === "3" || k === "7") launchShopMissile("explosion");
      if (k === "4" || k === "8") launchShopMissile("pierce");
      if (k === "9") launchShopMissile("cluster");
    };
    const onUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, currentLevelIndex]);

  // ===== 鼠标事件 =====
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const toLogicalX = (clientX: number) => {
      const r = c.getBoundingClientRect();
      return ((clientX - r.left) / r.width) * WORLD.WIDTH;
    };
    const toLogicalY = (clientY: number) => {
      const r = c.getBoundingClientRect();
      return ((clientY - r.top) / r.height) * WORLD.HEIGHT;
    };
    const onMouseMove = (e: MouseEvent) => {
      mouseXRef.current = toLogicalX(e.clientX);
      mouseYRef.current = toLogicalY(e.clientY);
    };
    const onDown = (e: MouseEvent) => { if (e.button === 0) mouseDownRef.current = true; ensureAudio(); };
    const onUp = (e: MouseEvent) => { if (e.button === 0) mouseDownRef.current = false; };
    const onWheel = (e: WheelEvent) => {
      if (screen !== "playing") return;
      e.preventDefault();
      castSlot(e.deltaY >= 0 ? 0 : 2);
    };
    c.addEventListener("mousemove", onMouseMove);
    c.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      c.removeEventListener("mousemove", onMouseMove);
      c.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      c.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, currentLevelIndex]);

  /** 主动技能释放。 */
  function castSlot(slot: 0 | 1 | 2 | 3): void {
    if (screen !== "playing") return;
    const now = performance.now();
    const r = tryCastActive(skillsRef.current, slot, playerRef.current, now);
    if (!r) return;
    const lr = levelRuntimeRef.current;
    if (lr) lr.skillsUsed += 1;
    statsRef.current.skillsUsed += 1;
    const p = playerRef.current;

    if (r.skill === "s1_missile") {
      // 巡航导弹：生成追踪导弹实体
      playSFX("nuke");
      const enemies = lr?.enemies || [];
      const newMissiles = spawnMissiles(skillsRef.current, p, enemies);
      missilesRef.current.push(...newMissiles);
      fireTransition("skill-nuke", "巡航导弹发射", `锁定 ${r.cfg.missileCount ?? 3} 个目标`);
    } else if (r.skill === "s2_emp") {
      // 电磁脉冲（增强版）：10 秒持续场地 + 50% 当前 HP 伤害 + 移动禁止
      playSFX("shield");
      const empResult = applyEmp(skillsRef.current, p, lr?.enemies || [], now);
      // EMP 脉冲波纹视觉特效
      spawnBurst(particlesRef.current, empResult.x, empResult.y, 40, ["#22d3ee", "#67e8f9", "#a5f3fc", "#06b6d4"], 8, 5, 800);
      if (profile.enableLighting) addLight(lightingRef.current, empResult.x, empResult.y, empResult.radius * 2, "#22d3ee", 0.7);
      // 为每个受击敌人显示伤害飘字
      for (const dd of empResult.damageDealt) {
        const enemy = lr?.enemies.find((e) => e.id === dd.id);
        if (enemy) {
          spawnFloatText(floatsRef.current, enemy.x, enemy.y - 20, `-${dd.dmg}`, "#a5f3fc", 20, 800);
        }
      }
      fireTransition("skill-shield", "电磁脉冲", `50% HP 伤害 · 禁止移动 10s · 命中 ${empResult.hitIds.length} 敌人`);
    } else if (r.skill === "s3_timewarp") {
      // 时间扭曲：减缓敌人时间流速
      playSFX("haste");
      fireTransition("skill-haste", "时间扭曲", `时间流速 ×${r.cfg.timeScale ?? 0.5}，持续 ${((r.cfg.durationMs || 0) / 1000).toFixed(1)} 秒`);
    } else if (r.skill === "s4_shield") {
      // 超级防御盾：30 秒无视所有伤害
      playSFX("shield");
      spawnBurst(particlesRef.current, p.x, p.y - 20, 60, ["#a5f3fc", "#67e8f9", "#22d3ee", "#0e7490", "#dbeafe"], 8, 5, 900);
      if (profile.enableLighting) addLight(lightingRef.current, p.x, p.y - 20, 220, "#a5f3fc", 0.8);
      fireTransition("skill-shield", "超级防御盾", `无敌 ${((r.cfg.durationMs || 30_000) / 1000).toFixed(0)} 秒 · 无视所有伤害`);
    }
    if (statsRef.current.skillsUsed >= 10) unlockAchs(["skill_master"]);
  }

  /**
   * 商店导弹发射：键盘 1-9 触发，按 MissileType 生成对应行为实体。
   *  按键映射：1/5=普通, 2/6=巡航, 3/7=爆炸, 4/8=穿刺, 9=子母弹（5-8 为备用快捷键）
   *  行为：
   *   - normal：直线向上飞行，命中即爆（单目标 100 伤害）
   *   - cruise：追踪锁定目标（turnRate 4 rad/s，150 伤害）
   *   - explosion：命中后范围 AOE（半径 100px，200 伤害）
   *   - pierce：穿透 3 目标，每穿透一次伤害衰减 20%（180 伤害）
   *   - cluster：母弹碰到第一个障碍物不造成伤害，原地分裂 5~10 枚子子弹，子子弹命中造成 120 伤害
   *  响应延迟 < 50ms（直接同步生成实体，无异步队列）。
   */
  function launchShopMissile(type: MissileType): void {
    if (screen !== "playing") return;
    // 持有数检查：不足则不发射
    if (shopMissilesRef.current[type] <= 0) return;
    const p = playerRef.current;
    const lr = levelRuntimeRef.current;
    const cfg = SHOP_MISSILE_CONFIG[type];
    // 锁定最近目标（巡航导弹追踪用）
    let targetId = -1;
    if (lr && lr.enemies.length > 0) {
      let bestDist = Infinity;
      for (const e of lr.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < bestDist) { bestDist = d; targetId = e.id; }
      }
    }
    // 生成导弹实体（不同类型参数差异）
    const speed = 700;
    const missile: ShopMissileRuntime = {
      id: SHOP_MISSILE_ID++,
      type,
      x: p.x, y: p.y - 30,
      vx: 0, vy: -speed,
      targetId,
      dmg: cfg.dmg,
      speed,
      turnRate: type === "cruise" ? 4.0 : 0,   // 仅巡航导弹追踪
      pierceLeft: type === "pierce" ? 3 : 0,   // 穿刺导弹可穿透 3 个目标
      hitIds: new Set<number>(),
      lifeMs: 5000,
      alive: true,
      trail: [],
      isChild: false,                          // 母弹：非子子弹
    };
    shopMissileRuntimeRef.current.push(missile);
    // 扣减持有数 + 同步存档
    shopMissilesRef.current = { ...shopMissilesRef.current, [type]: shopMissilesRef.current[type] - 1 };
    save.shopMissiles = { ...shopMissilesRef.current };
    saveSlot(save);
    playSFX("nuke");
    // 发射特效
    spawnBurst(particlesRef.current, p.x, p.y - 30, 8, ["#f97316", "#fdba74", "#fef3c7"], 3, 2, 400);
  }

  /**
   * 商店导弹 tick：5 种类型独立行为。
   *  - 巡航导弹：转向追踪目标（转向速率 4 rad/s，限制角度变化）
   *  - 爆炸导弹：命中后 AOE 半径 100px，范围内所有敌人受 200 伤害
   *  - 穿刺导弹：穿透 3 目标，每穿透一次伤害衰减 20%
   *  - 普通导弹：命中即爆，单目标 100 伤害
   *  - 子母弹母弹：碰到第一个障碍物不造成伤害，原地分裂 5~10 枚子子弹
   *  - 子母弹子子弹：向四周发散飞行，命中任意目标造成 120 伤害
   *  尾迹用 trail 数组记录最近 8 个位置，alpha 衰减。
   */
  function tickShopMissiles(missiles: ShopMissileRuntime[], enemies: EnemyRuntime[], dtMs: number, _nowMs: number): void {
    const dt = dtMs / 1000;
    for (const m of missiles) {
      if (!m.alive) continue;

      // 巡航导弹追踪：转向目标
      if (m.type === "cruise" && m.targetId >= 0) {
        const target = enemies.find((e) => e.id === m.targetId && e.alive);
        if (target) {
          const dx = target.x - m.x;
          const dy = target.y - m.y;
          const targetAngle = Math.atan2(dy, dx);
          const currentAngle = Math.atan2(m.vy, m.vx);
          // 角度差归一化到 [-π, π]
          let diff = targetAngle - currentAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          // 限制转向速率（不超过 turnRate × dt）
          const maxTurn = m.turnRate * dt;
          const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
          const newAngle = currentAngle + turn;
          m.vx = Math.cos(newAngle) * m.speed;
          m.vy = Math.sin(newAngle) * m.speed;
        } else {
          // 目标已死，重新选最近敌人
          let bestDist = Infinity;
          let bestId = -1;
          for (const e of enemies) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x - m.x, e.y - m.y);
            if (d < bestDist) { bestDist = d; bestId = e.id; }
          }
          m.targetId = bestId;
        }
      }

      // 移动 + 尾迹
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.lifeMs -= dtMs;
      m.trail.push({ x: m.x, y: m.y, alpha: 1 });
      if (m.trail.length > 8) m.trail.shift();
      for (const t of m.trail) t.alpha *= 0.85;

      // 超出屏幕或寿命到期
      if (m.lifeMs <= 0 || m.y < -40 || m.y > WORLD.HEIGHT + 40 || m.x < -40 || m.x > WORLD.WIDTH + 40) {
        m.alive = false;
        continue;
      }

      // 碰撞检测：命中半径 32px
      for (const e of enemies) {
        if (!e.alive) continue;
        if (m.hitIds.has(e.id)) continue;
        const dist = Math.hypot(e.x - m.x, e.y - m.y);
        if (dist > 32) continue;

        if (m.type === "cluster" && !m.isChild) {
          // 子母弹母弹：碰到第一个障碍物不造成伤害，原地分裂 5~10 枚子子弹
          const childCount = 5 + Math.floor(Math.random() * 6); // 5~10 枚
          const childSpeed = 500;
          for (let i = 0; i < childCount; i++) {
            // 均匀分布 + 随机扰动，确保子子弹向四周发散
            const baseAngle = (Math.PI * 2 * i) / childCount;
            const jitter = (Math.random() - 0.5) * 0.4;
            const angle = baseAngle + jitter;
            const child: ShopMissileRuntime = {
              id: SHOP_MISSILE_ID++,
              type: "cluster",
              x: m.x, y: m.y,
              vx: Math.cos(angle) * childSpeed,
              vy: Math.sin(angle) * childSpeed,
              targetId: -1,
              dmg: m.dmg,                 // 子子弹继承母弹伤害（120）
              speed: childSpeed,
              turnRate: 0,
              pierceLeft: 0,
              hitIds: new Set<number>(),
              lifeMs: 2500,               // 子子弹寿命较短
              alive: true,
              trail: [],
              isChild: true,              // 标记为子子弹
            };
            shopMissileRuntimeRef.current.push(child);
          }
          // 分裂视觉特效（金色爆裂）
          spawnBurst(particlesRef.current, m.x, m.y, 20, ["#fbbf24", "#fde047", "#fef3c7", "#f97316"], 4, 3, 600);
          if (profile.enableLighting) addLight(lightingRef.current, m.x, m.y, 120, "#fbbf24", 0.6);
          m.alive = false;                // 母弹消失
          break;
        } else if (m.type === "explosion") {
          // 爆炸导弹：AOE 半径 100px，范围内所有敌人受 200 伤害
          const aoeRadius = 100;
          for (const aoe of enemies) {
            if (!aoe.alive) continue;
            const aoeDist = Math.hypot(aoe.x - m.x, aoe.y - m.y);
            if (aoeDist <= aoeRadius) {
              applyEnemyDamage(aoe, m.dmg, m.x, m.y);
            }
          }
          // 爆炸视觉特效（橙红色范围爆破）
          spawnBurst(particlesRef.current, m.x, m.y, 30, ["#ef4444", "#f97316", "#fbbf24", "#fde047"], 5, 4, 700);
          if (profile.enableLighting) addLight(lightingRef.current, m.x, m.y, 200, "#f97316", 0.7);
          m.alive = false;
          break;
        } else if (m.type === "pierce") {
          // 穿刺导弹：穿透 3 目标，每穿透一次伤害衰减 20%
          applyEnemyDamage(e, m.dmg, m.x, m.y);
          m.hitIds.add(e.id);
          m.pierceLeft -= 1;
          m.dmg = Math.round(m.dmg * 0.8); // 衰减 20%
          // 命中视觉（紫色穿刺线）
          spawnBurst(particlesRef.current, m.x, m.y, 8, ["#a78bfa", "#c4b5fd", "#f0abfc"], 3, 2, 400);
          if (m.pierceLeft <= 0) {
            m.alive = false;
            break;
          }
        } else if (m.type === "cluster" && m.isChild) {
          // 子母弹子子弹：命中任意目标造成伤害（单目标）
          applyEnemyDamage(e, m.dmg, m.x, m.y);
          spawnBurst(particlesRef.current, m.x, m.y, 10, ["#fbbf24", "#fde047", "#fef3c7"], 3, 2, 400);
          m.alive = false;
          break;
        } else {
          // 普通导弹 + 巡航导弹：命中即爆，单目标伤害
          applyEnemyDamage(e, m.dmg, m.x, m.y);
          spawnBurst(particlesRef.current, m.x, m.y, 14, ["#f97316", "#fb923c", "#fdba74"], 4, 3, 500);
          if (profile.enableLighting) addLight(lightingRef.current, m.x, m.y, 100, "#f97316", 0.5);
          m.alive = false;
          break;
        }
      }
    }
  }

  /**
   * 雷达锁定逻辑：根据雷达等级（LV0..LV4）自动锁定最近目标。
   *  - LV0：1 个最近目标，范围 150%
   *  - LV1：3 个，范围 175%
   *  - LV2：5 个，范围 200%
   *  - LV3：10 个，范围 225%
   *  - LV4：所有可见目标，范围 250%
   * 优先级排序：威胁度（按敌机类型 8>7>6>2>4>3>5>1>0）+ 距离（近优先）+ 攻击状态。
   * 锁定结果写入 lockedTargetsRef，供小地图与锁定框渲染使用。
   */
  function updateRadarLock(p: PlayerRuntime, enemies: EnemyRuntime[], _now: number): void {
    const radarLevel = shopUpgradesRef.current.radar;
    if (radarLevel < 0 || radarLevel > 4) return; // 雷达未升级时不锁定
    const cfg = RADAR_LEVEL_CONFIG[radarLevel];
    if (!cfg) return;
    const lockRange = WORLD.WIDTH * cfg.rangeRatio; // 锁定范围（像素）
    // 候选目标：在锁定范围内的活着的敌人
    const candidates = enemies
      .filter((e) => e.alive)
      .map((e) => ({
        id: e.id, x: e.x, y: e.y, enemyType: e.kind,
        dist: Math.hypot(e.x - p.x, e.y - p.y),
        threat: [0, 1, 5, 3, 4, 2, 6, 7, 8][e.kind] ?? 0, // 类型威胁度：治疗兵 8 > 冲锋 7 > 激光 6 > 重装 5 > 护盾 4 > 分裂 3 > 狙击 2 > 快速 1 > 普通 0
      }))
      .filter((c) => c.dist <= lockRange);
    // 排序：威胁度高优先 → 距离近优先
    candidates.sort((a, b) => {
      if (b.threat !== a.threat) return b.threat - a.threat;
      return a.dist - b.dist;
    });
    // 选取前 N 个（LV4 全选）
    const lockCount = cfg.lockCount < 0 ? candidates.length : Math.min(cfg.lockCount, candidates.length);
    lockedTargetsRef.current = candidates.slice(0, lockCount).map((c) => ({
      id: c.id, x: c.x, y: c.y, enemyType: c.enemyType,
    }));
  }

  /** 对敌人施加伤害（先扣护盾，EMP 期间护盾失效），处理死亡/分裂/治疗。 */
  function applyEnemyDamage(e: EnemyRuntime, dmg: number, hx: number, hy: number): void {
    if (!e.alive) return;
    const now = performance.now();
    let d = Math.max(1, Math.round(dmg));
    // EMP 护盾失效期间，护盾不参与吸收
    if (e.shieldHp > 0 && e.shieldDisabledUntilMs <= now) {
      const absorb = Math.min(e.shieldHp, d);
      e.shieldHp -= absorb; d -= absorb;
    }
    if (d > 0) e.hp -= d;
    spawnFloatText(floatsRef.current, hx, hy - 18, `-${Math.max(1, Math.round(dmg))}`, "#fecaca", 16, 520);
    if (e.hp <= 0) {
      e.alive = false;
      scoreRef.current += e.scoreValue;
      statsRef.current.killed += 1;
      // 商店系统：击落敌机按 ENEMY_GOLD_REWARD 发放金币（0.8s 飘字动画）
      const goldReward = ENEMY_GOLD_REWARD[e.kind] ?? 10;
      goldRef.current += goldReward;
      spawnFloatText(floatsRef.current, e.x, e.y - 36, `+${goldReward}🪙`, "#fde047", 18, 800);
      setGoldTick((x) => x + 1);
      const colors = ["#f87171", "#fde047", "#60a5fa", "#34d399", "#c4b5fd", "#f0abfc"];
      spawnBurst(particlesRef.current, e.x, e.y, 14, colors, 4.5, 3, 600);
      playSFX("boom");
      unlockSingle(achStateRef.current, "first_blood");
      if (e.kind === 3 && levelRuntimeRef.current) {
        const mul = levelRuntimeRef.current.dynamicMul;
        const splitSpawn = (sx: number) => {
          const child = spawnEnemy(1, sx, e.y + 12, mul);
          const baseHp = Math.round(ENEMY_STATS[1].hp * mul.hp * 0.7);
          child.maxHp = Math.max(1, baseHp);
          child.hp = child.maxHp;
          child.scoreValue = 8;
          levelRuntimeRef.current?.enemies.push(child);
        };
        splitSpawn(e.x - 28); splitSpawn(e.x + 28);
      }
      if (e.kind === 8 && levelRuntimeRef.current) {
        for (const o of levelRuntimeRef.current.enemies) {
          if (o.id !== e.id && o.alive) {
            const dd = Math.hypot(o.x - e.x, o.y - e.y);
            if (dd < 260) {
              o.hp = Math.min(o.maxHp, o.hp + 10);
              spawnFloatText(floatsRef.current, o.x, o.y - 20, "+10", "#5eead4", 14, 520);
            }
          }
        }
        playSFX("heal");
      }
    } else {
      playSFX("hit");
      spawnBurst(particlesRef.current, hx, hy, 5, ["#fde68a", "#fca5a5"], 2, 2, 350);
    }
  }

  /** 按玩家操作开火；isCrit 控制暴击弹道颜色与尺寸，homingTurnRate 启用追踪。
   *  p11_shiplevel 战机等级 ≥2 时按散射角度发射多发子弹。 */
  function firePlayerBullet(dmg: number, isCrit: boolean): void {
    const p = playerRef.current;
    const skills = skillsRef.current;
    const count = Math.max(1, p.shipLevelBullets || 1);
    // 散射角度：1 发=0°，2 发=±8°，3 发=-12°/0°/+12°
    const angles: number[] = [];
    if (count === 1) angles.push(0);
    else if (count === 2) { angles.push(-8, 8); }
    else { angles.push(-12, 0, 12); }
    for (const deg of angles) {
      const rad = (deg * Math.PI) / 180;
      const vx = Math.sin(rad) * BALANCE.PLAYER_BULLET_SPEED;
      const vy = -Math.cos(rad) * BALANCE.PLAYER_BULLET_SPEED;
      bulletsRef.current.push({
        id: BULLET_ID++, x: p.x, y: p.y - 44,
        vx, vy, dmg,
        from: "player", kind: isCrit ? "big" : "normal", lifeMs: 3500, alive: true,
        homingTurnRate: p.homingTurnRate > 0 ? p.homingTurnRate : undefined,
        targetId: -1,
      });
    }
    playSFX("shoot");
    if (isCrit) {
      spawnBurst(particlesRef.current, p.x, p.y - 44, 6, ["#fde047", "#facc15"], 2.5, 2, 300);
    }
  }

  const onTouchMove = useCallback((dx: -1 | 0 | 1, dy: -1 | 0 | 1) => {
    void dx; void dy;
    inputDirRef.current = dx;
    inputDirYRef.current = dy;
  }, []);
  const onTouchBtn = useCallback((which: "shoot" | "s1" | "s2" | "s3" | "s4", pressed: boolean) => {
    if (which === "shoot") { shootBtnRef.current = pressed; return; }
    if (pressed) {
      ensureAudio();
      if (which === "s1") castSlot(0);
      if (which === "s2") castSlot(1);
      if (which === "s3") castSlot(2);
      if (which === "s4") castSlot(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 主逻辑 tick =====
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onTick = useCallback((dtMs: number) => {
    if (screen !== "playing") return;
    const now = performance.now();
    const p = playerRef.current;
    const skills = skillsRef.current;
    const lr = levelRuntimeRef.current;
    if (!lr) return;

    lr.dynamicMul = computeDynamicMul(p, now - lr.startedAtMs, lr.index);

    // ===== 多波次触发：若有剩余波次且场上敌人清空，则放出下一波 =====
    if (!lr.spawnedAll && lr.wavesRemaining > 0 && lr.enemies.every((e) => !e.alive)) {
      const def = LEVELS[lr.index];
      if (def) {
        const waveIndex = def.waves.length - lr.wavesRemaining;
        const nextWave = def.waves[waveIndex];
        if (nextWave && nextWave.length) {
          const mul = lr.dynamicMul;
          for (const w of nextWave) lr.enemies.push(spawnEnemy(w.kind, w.x, w.y, mul));
        }
      }
      lr.wavesRemaining -= 1;
      if (lr.wavesRemaining <= 0) lr.spawnedAll = true;
    }

    // 速度加成：当前技能系统未提供速度技能，保留 speedBoostUntilMs 作为未来道具接入点
    const baseSpd = p.baseSpeed * (p.speedBoostUntilMs > now ? 1.5 : 1);
    let dirX: -1 | 0 | 1 = 0;
    let dirY: -1 | 0 | 1 = 0;
    if (inputMode !== "mouse") {
      const k = keysRef.current;
      if (k["arrowleft"] || k["a"]) dirX = -1;
      else if (k["arrowright"] || k["d"]) dirX = 1;
      if (k["arrowup"] || k["w"]) dirY = -1;
      else if (k["arrowdown"] || k["s"]) dirY = 1;
      if (dirX === 0) dirX = inputDirRef.current;
      if (dirY === 0) dirY = inputDirYRef.current;
    }
    const stepPx = baseSpd * (dtMs / 1000);
    if (inputMode === "mouse" && mouseXRef.current != null) {
      const tX = mouseXRef.current;
      const tY = mouseYRef.current ?? p.y;
      const dX = tX - p.x;
      const dY = tY - p.y;
      // 双轴同步移动：直接朝目标点按步进逼近
      const dist = Math.hypot(dX, dY);
      if (dist <= stepPx) {
        p.x = tX;
        p.y = tY;
      } else {
        p.x += (dX / dist) * stepPx;
        p.y += (dY / dist) * stepPx;
      }
    } else {
      // 斜向速度归一化
      const len = (dirX === 0 || dirY === 0) ? 1 : Math.SQRT2;
      p.x += (dirX / len) * stepPx;
      p.y += (dirY / len) * stepPx;
    }
    // X/Y 轴边界钳制：底部保留玩家活动空间，顶部避开出生区
    p.x = Math.max(56, Math.min(WORLD.WIDTH - 56, p.x));
    p.y = Math.max(WORLD.HEIGHT * 0.50, Math.min(WORLD.HEIGHT - 90, p.y));

    tickSkills(skills, p, dtMs, now);

    // ===== 追踪弹道更新：自动锁定最近敌人并转向 =====
    tickHomingBullets(bulletsRef.current, lr.enemies, dtMs);

    // ===== 僚机更新：跟随玩家 + 自动开火 =====
    const wingmanShots = tickWingmen(wingmenRef.current, p, skills, dtMs, now);
    for (const ws of wingmanShots) {
      bulletsRef.current.push({
        id: BULLET_ID++, x: ws.x, y: ws.y,
        vx: 0, vy: -BALANCE.PLAYER_BULLET_SPEED, dmg: ws.dmg,
        from: "player", kind: ws.isCrit ? "big" : "normal",
        lifeMs: 3500, alive: true,
        homingTurnRate: p.homingTurnRate > 0 ? p.homingTurnRate : undefined,
        targetId: -1,
      });
      if (ws.isCrit) {
        spawnBurst(particlesRef.current, ws.x, ws.y, 4, ["#fde047", "#facc15"], 2, 1.5, 250);
      }
    }

    p.fireCooldownMs -= dtMs;
    const k2 = keysRef.current;
    const actuallyShoot =
      k2[" "] || k2["j"] || k2["k"] || k2["r"] || k2["enter"] ||
      mouseDownRef.current || shootBtnRef.current;
    if (actuallyShoot && p.fireCooldownMs <= 0) {
      p.fireCooldownMs = BALANCE.FIRE_INTERVAL_MS;
      const shot = computePlayerBulletDamage(skills);
      firePlayerBullet(shot.damage, shot.isCrit);
    }

    // ===== 敌人更新：应用时间扭曲（dt 缩放）+ EMP 眩晕（跳过） =====
    const enemyTimeScale = getEnemyTimeScale(skills, now);
    const fireEnemyBullet = (enemy: EnemyRuntime) => {
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const kind = enemy.kind;
      const speed =
        kind === 7 ? 580 :
          kind === 6 ? 640 :
            kind === 5 ? 700 : 420;
      const dmgCfg = ENEMY_STATS[kind];
      const vxRatio = (kind === 7 || kind === 6) ? 0.35 : 0.05;
      const fromEnemy: BulletRuntime = {
        id: BULLET_ID++,
        x: enemy.x, y: enemy.y + 12,
        vx: (dx / len) * speed * vxRatio,
        vy: speed,
        dmg: dmgCfg.dmg,
        from: "enemy",
        kind: kind === 6 ? "laser" : "normal",
        lifeMs: 4000, alive: true,
      };
      bulletsRef.current.push(fromEnemy);
    };
    // 内联敌人 tick：时间扭曲缩放 dt，眩晕敌人跳过，EMP/时间扭曲场地内敌人移动禁止
    for (const enemy of lr.enemies) {
      if (!enemy.alive) continue;
      // 全局眩晕（向后兼容旧 EMP stun）→ 完全跳过
      if (isEnemyStunned(enemy.stunnedUntilMs, now)) continue;
      // 时间扭曲场地内：移动禁止 + 攻击禁止
      const inTWField = isEnemyInTimeWarpField(skills, enemy.x, enemy.y, now);
      if (inTWField) continue; // 完全跳过移动和攻击
      // EMP 场地内：移动禁止，但可以攻击
      const inEmpField = isEnemyInEmpField(skills, enemy.x, enemy.y, now);
      // stepEnemy 内部处理移动+开火冷却；EMP 场地内敌人跳过移动但保留开火
      const shouldFire = stepEnemy(enemy, inEmpField ? 0 : dtMs * enemyTimeScale, lr.dynamicMul);
      if (shouldFire) fireEnemyBullet(enemy);
    }
    const boss = bossRef.current;
    if (boss && boss.alive) {
      const bShots = tickBoss(boss, dtMs * enemyTimeScale, p.x, p.y);
      if (bShots.length) bulletsRef.current.push(...bShots);
    }

    const bullets = bulletsRef.current;
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      if (!b.alive) continue;
      b.x += b.vx * (dtMs / 1000);
      b.y += b.vy * (dtMs / 1000);
      b.lifeMs -= dtMs;
      if (b.lifeMs <= 0 || b.y < -40 || b.y > WORLD.HEIGHT + 40 || b.x < -40 || b.x > WORLD.WIDTH + 40) b.alive = false;
    }
    const hash = hashRef.current;
    hash.clear();
    const aabbs: { b: Bounded; e?: EnemyRuntime; boss?: BossRuntime; type: "enemy" | "boss" }[] = [];
    for (const en of lr.enemies) {
      if (!en.alive) continue;
      const bb: Bounded = { x: en.x, y: en.y, w: 56, h: 48 };
      aabbs.push({ b: bb, e: en, type: "enemy" });
      hash.insert(bb);
    }
    if (boss && boss.alive) {
      const w = boss.kind === "mothership" ? 680 : boss.kind === "fuhrer" ? 420 : boss.kind === "corruptor" ? 360 : 300;
      const h = boss.kind === "mothership" ? 240 : boss.kind === "fuhrer" ? 400 : boss.kind === "corruptor" ? 220 : 180;
      const bb: Bounded = { x: boss.x, y: boss.y, w, h };
      aabbs.push({ b: bb, boss, type: "boss" });
      hash.insert(bb);
    }
    const pBox: Bounded = { x: p.x, y: p.y, w: 70, h: 54 };
    const candi: Bounded[] = [];
    for (let i = 0; i < bullets.length; i++) {
      const bl = bullets[i]; if (!bl.alive) continue;
      const bw = bl.kind === "big" ? 22 : bl.kind === "laser" ? 6 : 8;
      const bh = bl.kind === "laser" ? 40 : 24;
      const bulletBox: Bounded = { x: bl.x, y: bl.y, w: bw, h: bh };
      if (bl.from === "player") {
        hash.query(bulletBox, candi);
        for (let c = 0; c < candi.length; c++) {
          const cb = candi[c];
          const match = aabbs.find((x) => x.b === cb);
          if (!match) continue;
          if (!intersectsAABB(bulletBox, cb)) continue;
          bl.alive = false;
          if (match.e) {
            applyEnemyDamage(match.e, bl.dmg, bl.x, bl.y);
            // 吸血：将伤害按比例转化为生命值
            const heal = applyLifesteal(skills, p, bl.dmg);
            if (heal > 0) {
              spawnFloatText(floatsRef.current, p.x, p.y - 50, `+${Math.round(heal)}`, "#34d399", 14, 480);
            }
          } else if (match.boss) {
            const dealt = applyBossDamage(match.boss, bl.dmg, bl.x, bl.y);
            spawnFloatText(floatsRef.current, bl.x, bl.y - 20, `-${dealt}`, "#fde047", 20, 620);
            spawnBurst(particlesRef.current, bl.x, bl.y, 10, ["#fde047", "#f59e0b", "#ef4444"], 3, 3, 520);
            playSFX("hit");
            // BOSS 也触发吸血
            const heal = applyLifesteal(skills, p, bl.dmg);
            if (heal > 0) {
              spawnFloatText(floatsRef.current, p.x, p.y - 50, `+${Math.round(heal)}`, "#34d399", 14, 480);
            }
          }
          break;
        }
      } else {
        if (intersectsAABB(bulletBox, pBox) && p.invulnUntilMs <= now) {
          bl.alive = false;
          // s4_shield 超级防御盾：激活期间无视所有伤害
          if (isSuperShieldActive(p, now)) {
            spawnBurst(particlesRef.current, p.x, p.y - 20, 8, ["#a5f3fc", "#67e8f9", "#22d3ee"], 4, 3, 400);
            continue;
          }
          if (tryBlock(p, now)) {
            spawnFloatText(floatsRef.current, p.x, p.y - 60, "格挡!", "#93c5fd", 22, 700);
            spawnBurst(particlesRef.current, p.x, p.y - 18, 10, ["#93c5fd", "#dbeafe"], 3.4, 3, 500);
            playSFX("shield");
            continue;
          }
          // 护甲减伤：p7_armor 按比例降低受到的伤害
          const reducedDmg = applyArmorReduction(skills, bl.dmg);
          p.hp = Math.max(0, p.hp - reducedDmg);
          p.invulnUntilMs = now + 260;
          statsRef.current.totalDamageTaken += reducedDmg;
          spawnFloatText(floatsRef.current, p.x, p.y - 60, `-${reducedDmg}`, "#fecaca", 22, 680);
          spawnBurst(particlesRef.current, p.x, p.y - 18, 18, ["#ef4444", "#f97316", "#fbbf24"], 5, 3.5, 650);
          playSFX("boom");
        }
      }
    }
    for (let i = bullets.length - 1; i >= 0; i--) if (!bullets[i].alive) bullets.splice(i, 1);
    if (bullets.length > 800) bullets.splice(0, bullets.length - 800);

    for (const en of lr.enemies) {
      if (!en.alive) continue;
      if (en.y > WORLD.HEIGHT - 90) {
        en.alive = false;
        // s4_shield 超级防御盾：突破防线时也无视伤害
        if (isSuperShieldActive(p, now)) {
          spawnBurst(particlesRef.current, p.x, p.y - 20, 8, ["#a5f3fc", "#67e8f9", "#22d3ee"], 4, 3, 400);
          continue;
        }
        if (p.invulnUntilMs <= now && !tryBlock(p, now)) {
          // 突破防线伤害也应用护甲减伤
          const breakDmg = applyArmorReduction(skills, 18);
          p.hp = Math.max(0, p.hp - breakDmg);
          statsRef.current.totalDamageTaken += breakDmg;
          spawnFloatText(floatsRef.current, p.x, p.y - 70, `-${breakDmg} 突破防线!`, "#fecaca", 20, 800);
          p.invulnUntilMs = now + 400;
        }
      }
    }

    // ===== 巡航导弹更新：追踪、碰撞、爆炸 =====
    const missileHits = tickMissiles(missilesRef.current, lr.enemies, dtMs);
    for (const hit of missileHits) {
      const enemy = lr.enemies.find((e) => e.id === hit.targetId);
      if (enemy) {
        applyEnemyDamage(enemy, hit.dmg, hit.x, hit.y);
        // 导弹吸血
        const heal = applyLifesteal(skills, p, hit.dmg);
        if (heal > 0) {
          spawnFloatText(floatsRef.current, p.x, p.y - 50, `+${Math.round(heal)}`, "#34d399", 14, 480);
        }
      }
      // 爆炸视觉特效
      spawnBurst(particlesRef.current, hit.x, hit.y, 20, ["#f97316", "#fb923c", "#fdba74", "#ffedd5"], 4, 3, 600);
      if (profile.enableLighting) addLight(lightingRef.current, hit.x, hit.y, 120, "#f97316", 0.6);
    }
    missilesRef.current = missilesRef.current.filter((m) => m.alive);

    // ===== 商店导弹更新：4 种类型独立行为（追踪/穿透/AOE/单点） =====
    tickShopMissiles(shopMissileRuntimeRef.current, lr.enemies, dtMs, now);
    shopMissileRuntimeRef.current = shopMissileRuntimeRef.current.filter((m) => m.alive);

    // ===== 雷达系统：按雷达等级自动锁定最近目标（优先级：距离 > 类型 > 攻击状态） =====
    updateRadarLock(p, lr.enemies, now);

    stepParticles(particlesRef.current, dtMs, profile.maxParticles);
    stepFloats(floatsRef.current, dtMs);
    tickParallax(parallaxRef.current, dtMs, 1.0);

    tryScoreAchievements(achStateRef.current, scoreRef.current);

    const clr = finalizeClear(lr, p, skills, now, boss);
    if (clr) {
      clearResultRef.current = clr;
      if (scoreRef.current > save.bestScore) save.bestScore = scoreRef.current;
      save.totalScore += scoreRef.current;
      save.clearedLevels = Math.max(save.clearedLevels, clr.level);
      save.level = Math.min(LEVELS.length, Math.max(save.level, clr.level + (clr.level < LEVELS.length ? 1 : 0)));
      save.skillPoints += clr.skillPointReward;
      // 商店系统：结算时把运行时金币写回存档
      save.gold = goldRef.current;
      save.shopUpgrades = { ...shopUpgradesRef.current };
      save.shopMissiles = { ...shopMissilesRef.current };
      save.unlockedAchievements = Array.from(achStateRef.current.unlocked);
      saveSlot(save);
      const clrIsBoss = !!LEVELS[clr.level - 1]?.isBoss;
      tryClearLevelAchievements(achStateRef.current, clr.level, clr.hpLeftPct, clr.skillsUsed, statsRef.current.totalDamageTaken, clrIsBoss);
      save.unlockedAchievements = Array.from(achStateRef.current.unlocked);
      saveSlot(save);
      playSFX("levelup");
      playBGM("menu");
      fireTransition("level-clear", `第 ${clr.level} 关通过 · 评级 ${clr.grade}`, `技能点 +${clr.skillPointReward}`);
      props.onFinalize?.(save.bestScore, save.bestScore === scoreRef.current);
      if (clr.level >= LEVELS.length) {
        // 通关终局：直接进入胜利界面，不再弹商店
        setScreen("victory");
      } else {
        // 普通关卡：弹出商店（0.5s 动画由 Shop 组件 CSS 提供）
        setScreen("cleared");
        setShopOpen(true);
      }
    }

    if (p.hp <= 0 && screen === "playing") {
      // ===== 凤凰复活判定：若仍有复活次数，自动复活 =====
      const reviveResult = tryRevive(skills, p, now);
      if (reviveResult.revived) {
        spawnBurst(particlesRef.current, p.x, p.y - 20, 50, ["#fbbf24", "#f97316", "#ef4444", "#fde047"], 6, 5, 900);
        spawnFloatText(floatsRef.current, p.x, p.y - 60, `凤凰复活 +${reviveResult.hpRestored}`, "#fbbf24", 22, 1000);
        playSFX("nuke"); // 复活音效借用大招音
        if (profile.enableLighting) addLight(lightingRef.current, p.x, p.y - 20, 200, "#fbbf24", 0.8);
      } else {
        // 复活次数用尽，真正阵亡
        spawnBurst(particlesRef.current, p.x, p.y - 10, 60, ["#ef4444", "#f97316", "#fbbf24", "#f87171"], 6, 5, 1000);
        playSFX("boom");
        if (scoreRef.current > save.bestScore) save.bestScore = scoreRef.current;
        save.unlockedAchievements = Array.from(achStateRef.current.unlocked);
        saveSlot(save);
        props.onFinalize?.(save.bestScore, save.bestScore === scoreRef.current);
        setScreen("gameover");
      }
    }

    hudThrottleRef.current += dtMs;
    if (hudThrottleRef.current > 100) {
      hudThrottleRef.current = 0;
      setHudTick((x) => x + 1);
    }
  }, [screen, currentLevelIndex, inputMode, profile, save, props]);

  // ===== 渲染 =====
  const onRender = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const cssW = c.clientWidth || 1;
    const cssH = c.clientHeight || 1;
    const dpr = profile.targetDPR || 1;
    const w = Math.max(1, Math.floor(cssW * dpr));
    const h = Math.max(1, Math.floor(cssH * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(w / WORLD.WIDTH, h / WORLD.HEIGHT);
    const lr = levelRuntimeRef.current;
    const def = LEVELS[currentLevelIndex];
    drawParallax(ctx, parallaxRef.current, profile, def?.theme || "void");
    if (def && !def.isBoss) {
      for (const bk of def.blocks) {
        batchRef.current.drawRect(bk.x, bk.y, bk.w, bk.h, "#475569");
        batchRef.current.drawRect(bk.x + 4, bk.y + 4, bk.w - 8, bk.h - 8, "#334155");
      }
    }
    batchRef.current.flush(ctx);
    batchRef.current.reset();

    if (lr) for (const e of lr.enemies) drawEnemy(ctx, e, performance.now());
    const bs = bossRef.current;
    if (bs) drawBoss(ctx, bs, performance.now());
    drawPlayer(ctx, playerRef.current, performance.now(), 1);

    // ===== 渲染辅助：玩家引用 + 当前时间戳（供后续多个特效共用） =====
    const _p = playerRef.current;
    const _now = performance.now();

    // ===== 雷达锁定框渲染：红色方框 + 2Hz 脉冲（0.5s 一周期，每秒 2 次） =====
    const _lockedTargets = lockedTargetsRef.current;
    if (_lockedTargets.length > 0) {
      const lockPulse = 0.5 + 0.5 * Math.sin(_now / 250); // 2Hz 脉冲（250ms 半周期）
      const lockAlpha = 0.6 + lockPulse * 0.4;
      const lockSize = 56 + lockPulse * 4; // 锁定框尺寸随脉冲微变
      ctx.save();
      ctx.strokeStyle = `rgba(248, 113, 113, ${lockAlpha})`;
      ctx.lineWidth = 2;
      for (const t of _lockedTargets) {
        // 锁定框：四角括号样式（不是完整矩形，更像瞄准镜）
        const hx = t.x, hy = t.y;
        const half = lockSize / 2;
        const cornerLen = 12; // 角括号长度
        // 左上角
        ctx.beginPath();
        ctx.moveTo(hx - half, hy - half + cornerLen);
        ctx.lineTo(hx - half, hy - half);
        ctx.lineTo(hx - half + cornerLen, hy - half);
        ctx.stroke();
        // 右上角
        ctx.beginPath();
        ctx.moveTo(hx + half - cornerLen, hy - half);
        ctx.lineTo(hx + half, hy - half);
        ctx.lineTo(hx + half, hy - half + cornerLen);
        ctx.stroke();
        // 左下角
        ctx.beginPath();
        ctx.moveTo(hx - half, hy + half - cornerLen);
        ctx.lineTo(hx - half, hy + half);
        ctx.lineTo(hx - half + cornerLen, hy + half);
        ctx.stroke();
        // 右下角
        ctx.beginPath();
        ctx.moveTo(hx + half - cornerLen, hy + half);
        ctx.lineTo(hx + half, hy + half);
        ctx.lineTo(hx + half, hy + half - cornerLen);
        ctx.stroke();
        // 中心十字
        ctx.strokeStyle = `rgba(248, 113, 113, ${lockAlpha * 0.6})`;
        ctx.beginPath();
        ctx.moveTo(hx - 8, hy); ctx.lineTo(hx + 8, hy);
        ctx.moveTo(hx, hy - 8); ctx.lineTo(hx, hy + 8);
        ctx.stroke();
        ctx.strokeStyle = `rgba(248, 113, 113, ${lockAlpha})`;
      }
      ctx.restore();
    }

    // ===== s4_shield 超级防御盾渲染：激活时围绕玩家绘制脉冲护盾环 =====
    if (_p.superShieldUntilMs > _now) {
      const remainMs = _p.superShieldUntilMs - _now;
      const pulse = 0.5 + 0.5 * Math.sin(_now / 120);
      const alpha = Math.min(0.85, 0.35 + pulse * 0.3 + (remainMs < 3000 ? 0.3 : 0));
      const r = 56 + pulse * 4;
      ctx.save();
      ctx.translate(_p.x, _p.y - 20);
      // 外环
      ctx.strokeStyle = `rgba(165, 243, 252, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      // 内环（六边形网格效果）
      ctx.strokeStyle = `rgba(103, 232, 249, ${alpha * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + _now / 600;
        const x = Math.cos(a) * (r - 8);
        const y = Math.sin(a) * (r - 8);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
      // 光晕
      const grad = ctx.createRadialGradient(0, 0, r - 14, 0, 0, r + 12);
      grad.addColorStop(0, "rgba(165, 243, 252, 0)");
      grad.addColorStop(0.6, `rgba(103, 232, 249, ${alpha * 0.18})`);
      grad.addColorStop(1, "rgba(34, 211, 238, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, r + 12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (profile.enableLighting) addLight(lightingRef.current, _p.x, _p.y - 20, 140, "#a5f3fc", 0.5);
    }

    // ===== s2_emp 电磁脉冲场地渲染：蓝色脉冲波纹 + 半透明范围指示器 =====
    if (skills.empFieldUntilMs > _now) {
      const remainMs = skills.empFieldUntilMs - _now;
      const pulse = 0.5 + 0.5 * Math.sin(_now / 200);
      const alpha = 0.4; // 40% 透明度
      const r = skills.empFieldRadius;
      const fx = skills.empFieldX;
      const fy = skills.empFieldY;
      ctx.save();
      // 半透明圆形范围指示器（40% 透明度）
      ctx.fillStyle = `rgba(34, 211, 238, ${alpha * 0.3})`;
      ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill();
      // 蓝色脉冲波纹（从中心向外扩散，100px/s）
      const waveProgress = ((_now / 1000) % (r / 100)) / (r / 100);
      const waveR = waveProgress * r;
      ctx.strokeStyle = `rgba(34, 211, 238, ${(1 - waveProgress) * 0.6})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(fx, fy, waveR, 0, Math.PI * 2); ctx.stroke();
      // 外环
      ctx.strokeStyle = `rgba(103, 232, 249, ${0.4 + pulse * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.stroke();
      // 电流粒子（6 个围绕场地旋转）
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + _now / 300;
        const px = fx + Math.cos(a) * r * 0.8;
        const py = fy + Math.sin(a) * r * 0.8;
        ctx.fillStyle = `rgba(165, 243, 252, ${0.6 + pulse * 0.3})`;
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // 电磁干扰特效：场地内敌人添加电流环绕
      if (lr) {
        for (const e of lr.enemies) {
          if (!e.alive) continue;
          const dist = Math.hypot(e.x - fx, e.y - fy);
          if (dist <= r) {
            ctx.save();
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.5 + pulse * 0.3})`;
            ctx.lineWidth = 2;
            // 电流环绕（4 段弧线）
            for (let i = 0; i < 4; i++) {
              const a0 = (i / 4) * Math.PI * 2 + _now / 100;
              ctx.beginPath();
              ctx.arc(e.x, e.y, 24, a0, a0 + 0.6);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }
      if (profile.enableLighting) addLight(lightingRef.current, fx, fy, r * 1.5, "#22d3ee", 0.4);
    }

    // ===== s3_timewarp 时间扭曲场地渲染：模糊波纹 + 顺时针旋转指示器 =====
    if (skills.twFieldUntilMs > _now) {
      const remainMs = skills.twFieldUntilMs - _now;
      const pulse = 0.5 + 0.5 * Math.sin(_now / 250);
      const r = skills.twFieldRadius;
      const tx = skills.twFieldX;
      const ty = skills.twFieldY;
      ctx.save();
      // 场地内模糊波纹（多层同心圆）
      for (let i = 0; i < 3; i++) {
        const waveR = r * (0.4 + i * 0.3 + pulse * 0.1);
        const alpha = 0.15 - i * 0.04;
        ctx.strokeStyle = `rgba(59, 130, 246, ${alpha + pulse * 0.05})`;
        ctx.lineWidth = 4 - i;
        ctx.beginPath(); ctx.arc(tx, ty, waveR, 0, Math.PI * 2); ctx.stroke();
      }
      // 半透明范围指示器
      ctx.fillStyle = `rgba(59, 130, 246, 0.08)`;
      ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.fill();
      // 蓝色时间流动指示器（顺时针旋转弧线）
      const rotAngle = (_now / 1000) * Math.PI * 1.5; // 顺时针旋转
      ctx.strokeStyle = `rgba(96, 165, 250, ${0.6 + pulse * 0.2})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tx, ty, r * 0.85, rotAngle, rotAngle + Math.PI * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tx, ty, r * 0.85, rotAngle + Math.PI, rotAngle + Math.PI + Math.PI * 0.4);
      ctx.stroke();
      // 外环
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.35 + pulse * 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      if (profile.enableLighting) addLight(lightingRef.current, tx, ty, r * 1.5, "#3b82f6", 0.4);
    }

    // ===== 僚机渲染：小型青色三角形 + 引擎光 =====
    const wingmen = wingmenRef.current;
    for (let wi = 0; wi < wingmen.length; wi++) {
      const w = wingmen[wi];
      if (!w.alive) continue;
      ctx.save();
      ctx.translate(w.x, w.y);
      // 引擎尾焰
      ctx.fillStyle = "rgba(34, 211, 238, 0.6)";
      ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(0, 22); ctx.lineTo(6, 10); ctx.fill();
      // 机身（小型三角形）
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-10, 10); ctx.lineTo(10, 10); ctx.fill();
      ctx.fillStyle = "#0e7490";
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-6, 6); ctx.lineTo(6, 6); ctx.fill();
      // 驾驶舱
      ctx.fillStyle = "#a5f3fc";
      ctx.beginPath(); ctx.arc(0, -2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    const bullets = bulletsRef.current;
    for (let i = 0; i < bullets.length; i++) {
      const bl = bullets[i];
      if (!bl.alive) continue;
      if (bl.from === "player") {
        // 暴击子弹使用 bigger 黄色弹道
        if (bl.kind === "big") {
          ctx.fillStyle = "#fde047";
          ctx.fillRect(bl.x - 5, bl.y - 14, 10, 28);
          ctx.fillStyle = "#fef9c3";
          ctx.fillRect(bl.x - 2, bl.y - 18, 4, 32);
        } else {
          ctx.fillStyle = "#f87171";
          ctx.fillRect(bl.x - 3, bl.y - 10, 6, 20);
          ctx.fillStyle = "#fecaca";
          ctx.fillRect(bl.x - 1, bl.y - 14, 2, 22);
        }
      } else if (bl.from === "boss") {
        if (bl.kind === "big") {
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath(); ctx.arc(bl.x, bl.y, 10, 0, Math.PI * 2); ctx.fill();
        } else if (bl.kind === "laser") {
          ctx.fillStyle = "#fb7185"; ctx.fillRect(bl.x - 3, bl.y - 16, 6, 32);
        } else if (bl.kind === "spread") {
          ctx.fillStyle = "#f472b6"; ctx.beginPath(); ctx.arc(bl.x, bl.y, 7, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = "#a78bfa"; ctx.fillRect(bl.x - 4, bl.y - 8, 8, 16);
        }
      } else {
        ctx.fillStyle = bl.kind === "laser" ? "#fb7185" : "#a78bfa";
        ctx.fillRect(bl.x - 3, bl.y - 8, 6, 16);
      }
    }

    // ===== 巡航导弹渲染：尾迹 + 弹体 =====
    const missiles = missilesRef.current;
    for (let i = 0; i < missiles.length; i++) {
      const m = missiles[i];
      if (!m.alive) continue;
      // 尾迹
      for (let t = 0; t < m.trail.length; t++) {
        const tr = m.trail[t];
        ctx.fillStyle = `rgba(251, 146, 60, ${tr.alpha * 0.6})`;
        ctx.beginPath(); ctx.arc(tr.x, tr.y, 4 * tr.alpha, 0, Math.PI * 2); ctx.fill();
      }
      // 弹体
      const angle = Math.atan2(m.vy, m.vx);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(angle);
      ctx.fillStyle = "#f97316";
      ctx.fillRect(-8, -3, 16, 6);
      ctx.fillStyle = "#fdba74";
      ctx.fillRect(-4, -2, 10, 4);
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(4, -1, 4, 2);
      ctx.restore();
    }

    // ===== 商店导弹渲染：5 种类型不同颜色尾迹 + 弹体 =====
    const shopMissiles = shopMissileRuntimeRef.current;
    for (let i = 0; i < shopMissiles.length; i++) {
      const m = shopMissiles[i];
      if (!m.alive) continue;
      // 按类型选择尾迹颜色
      const trailColor = m.type === "normal" ? "251, 146, 60" :
                         m.type === "cruise" ? "167, 139, 250" :
                         m.type === "explosion" ? "239, 68, 68" :
                         m.type === "pierce" ? "196, 181, 253" :
                         "251, 191, 36"; // cluster 金色
      // 尾迹
      for (let t = 0; t < m.trail.length; t++) {
        const tr = m.trail[t];
        ctx.fillStyle = `rgba(${trailColor}, ${tr.alpha * 0.6})`;
        ctx.beginPath(); ctx.arc(tr.x, tr.y, 4 * tr.alpha, 0, Math.PI * 2); ctx.fill();
      }
      // 弹体（按类型差异化形状/颜色）
      const angle = Math.atan2(m.vy, m.vx);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(angle);
      if (m.type === "normal") {
        // 普通导弹：橙色细长
        ctx.fillStyle = "#f97316";
        ctx.fillRect(-8, -3, 16, 6);
        ctx.fillStyle = "#fdba74";
        ctx.fillRect(-4, -2, 10, 4);
      } else if (m.type === "cruise") {
        // 巡航导弹：紫色尖头
        ctx.fillStyle = "#a78bfa";
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-8, -4); ctx.lineTo(-6, 0); ctx.lineTo(-8, 4); ctx.fill();
        ctx.fillStyle = "#c4b5fd";
        ctx.fillRect(-6, -2, 8, 4);
      } else if (m.type === "explosion") {
        // 爆炸导弹：红色圆头
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      } else if (m.type === "pierce") {
        // 穿刺导弹：紫色锐利三角
        ctx.fillStyle = "#c4b5fd";
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, -3); ctx.lineTo(-8, 3); ctx.fill();
        ctx.fillStyle = "#a78bfa";
        ctx.fillRect(-6, -2, 4, 4);
      } else if (m.type === "cluster") {
        // 子母弹：母弹金色胶囊+子子弹金色小球
        if (m.isChild) {
          // 子子弹：小金色圆
          ctx.fillStyle = "#fde047";
          ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
        } else {
          // 母弹：金色胶囊带核心
          ctx.fillStyle = "#fbbf24";
          ctx.fillRect(-9, -4, 18, 8);
          ctx.fillStyle = "#fde047";
          ctx.fillRect(-5, -3, 12, 6);
          ctx.fillStyle = "#fef3c7";
          ctx.fillRect(5, -2, 4, 4);
        }
      }
      ctx.restore();
    }

    // ===== 时间扭曲全屏滤镜：蓝色色调 + 边缘晕染 =====
    if (skills.timeWarpUntilMs > performance.now()) {
      ctx.fillStyle = "rgba(34, 211, 238, 0.12)";
      ctx.fillRect(0, 0, WORLD.WIDTH, WORLD.HEIGHT);
      // 边缘渐变
      const grad = ctx.createRadialGradient(
        WORLD.WIDTH / 2, WORLD.HEIGHT / 2, WORLD.WIDTH * 0.3,
        WORLD.WIDTH / 2, WORLD.HEIGHT / 2, WORLD.WIDTH * 0.7,
      );
      grad.addColorStop(0, "rgba(34, 211, 238, 0)");
      grad.addColorStop(1, "rgba(6, 182, 212, 0.35)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WORLD.WIDTH, WORLD.HEIGHT);
    }

    drawParticles(ctx, particlesRef.current);
    drawFloats(ctx, floatsRef.current);
    if (profile.enableLighting) drawLighting(ctx, lightingRef.current);

    if (screen === "paused") {
      ctx.fillStyle = "rgba(15,23,42,0.58)";
      ctx.fillRect(0, 0, WORLD.WIDTH, WORLD.HEIGHT);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 80px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("⏸ 已暂停", WORLD.WIDTH / 2, WORLD.HEIGHT / 2 - 10);
      ctx.font = "26px system-ui";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("按 P / ESC 继续，或点击右上角菜单返回主菜单 / 重开本关", WORLD.WIDTH / 2, WORLD.HEIGHT / 2 + 50);
    }
  }, [currentLevelIndex, profile, screen]);

  useGameLoop(
    screen === "playing" || screen === "paused" || screen === "cleared" || screen === "gameover" || screen === "victory",
    onTick, onRender,
  );

  const handleUpgrade = (id: SkillId): void => {
    const cur = save.skills[id];
    if (cur >= 3 || save.skillPoints <= 0) return;
    save.skills[id] = clampLv(cur + 1) as SkillLevel;
    save.skillPoints -= 1;
    saveSlot(save);
    setSaveTick((x) => x + 1);
    playSFX("levelup");
    unlockSingle(achStateRef.current, "upgrade_any");
    const allMax = (Object.keys(save.skills) as SkillId[]).every((k) => save.skills[k] >= 3);
    if (allMax) unlockSingle(achStateRef.current, "all_upgrade_max");
  };

  /**
   * 商店购买升级：扣金币、提升等级、同步存档与运行时副本。
   * 价格按 basePrice × 1.5^currentLevel 递增 50%。
   */
  const handleBuyUpgrade = (type: UpgradeType): void => {
    const cfg = SHOP_UPGRADE_CONFIG[type];
    const curLevel = shopUpgradesRef.current[type];
    if (curLevel >= cfg.maxLevel) return;
    const price = Math.round(cfg.basePrice * Math.pow(1.5, curLevel));
    if (goldRef.current < price) return;
    // 扣金币 + 升级
    goldRef.current -= price;
    shopUpgradesRef.current = { ...shopUpgradesRef.current, [type]: curLevel + 1 };
    // 同步到存档
    save.gold = goldRef.current;
    save.shopUpgrades = { ...shopUpgradesRef.current };
    saveSlot(save);
    setGoldTick((x) => x + 1);
    setSaveTick((x) => x + 1);
    playSFX("levelup");
  };

  /**
   * 商店购买导弹：扣金币、增加持有数（受总容量上限 8 枚约束）。
   */
  const handleBuyMissile = (type: MissileType): void => {
    const cfg = SHOP_MISSILE_CONFIG[type];
    const total = shopMissilesRef.current.normal + shopMissilesRef.current.cruise +
                  shopMissilesRef.current.explosion + shopMissilesRef.current.pierce +
                  shopMissilesRef.current.cluster;
    if (total >= SHOP_MISSILE_MAX) return;
    if (goldRef.current < cfg.price) return;
    // 扣金币 + 增加导弹
    goldRef.current -= cfg.price;
    shopMissilesRef.current = { ...shopMissilesRef.current, [type]: shopMissilesRef.current[type] + 1 };
    // 同步到存档
    save.gold = goldRef.current;
    save.shopMissiles = { ...shopMissilesRef.current };
    saveSlot(save);
    setGoldTick((x) => x + 1);
    setSaveTick((x) => x + 1);
    playSFX("click");
  };

  /** 商店跳过/关闭：0.3s 过渡后关闭商店，进入下一关流程由 GameOverScreen 接管。 */
  const handleShopClose = (): void => {
    setShopOpen(false);
    playSFX("click");
  };

  const onMenuBack = () => {
    setScreen("menu");
    playBGM("menu");
    save.unlockedAchievements = Array.from(achStateRef.current.unlocked);
    saveSlot(save);
  };

  const restart = (): void => {
    ensureAudio();
    bootLevel(currentLevelIndex);
  };

  const nextLevel = (): void => {
    const nxt = Math.min(LEVELS.length - 1, currentLevelIndex + 1);
    bootLevel(nxt);
  };

  const p = playerRef.current;
  const skills = skillsRef.current;
  const enemiesLeft = levelRuntimeRef.current ? (levelRuntimeRef.current.enemies.filter((e) => e.alive).length + (bossRef.current?.alive ? 1 : 0)) : 0;
  void hudTick;

  return (
    <div ref={wrapRef} className="w-full relative">
      <div className="w-full">
        {screen === "menu" && (
          <MainMenu tab={tab} onTab={setTab} onStart={handleStartSlot}
            onOpenLevelSelect={() => { ensureAudio(); playSFX("click"); setLevelSelectOpen(true); }}
            highScore={save.bestScore}
            skillPoints={save.skillPoints}
            unlockedAchievements={save.unlockedAchievements.length}
            totalAchievements={ACHIEVEMENTS.length}
            unlockedLevel={save.level}
            totalLevels={LEVELS.length} />
        )}

        {screen !== "menu" && (
          <div className="relative mx-auto w-full max-w-[900px] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 bg-black">
            <canvas
              ref={canvasRef}
              width={WORLD.WIDTH}
              height={WORLD.HEIGHT}
              className="w-full h-auto block"
              style={{ aspectRatio: `${WORLD.WIDTH} / ${WORLD.HEIGHT}` }}
            />
            <HUD
              score={scoreRef.current}
              hp={p.hp} maxHp={p.maxHp}
              energy={p.energy} maxEnergy={p.maxEnergy}
              level={currentLevelIndex + 1} levelName={LEVELS[currentLevelIndex]?.name ?? ""}
              enemiesLeft={enemiesLeft}
              bossHpPct={bossRef.current?.alive ? (bossRef.current.hp / bossRef.current.maxHp) : null}
              bossName={bossRef.current ? bossTitle(bossRef.current.kind) : null}
              skills={skills}
              reviveCount={p.reviveCount - p.reviveUsedCount}
              wingmanCount={wingmenRef.current.filter((w) => w.alive).length}
              superShieldMs={p.superShieldUntilMs > performance.now() ? (p.superShieldUntilMs - performance.now()) : 0}
              shipLevelBullets={p.shipLevelBullets}
              paused={paused}
              onTogglePause={() => {
                if (screen === "playing") { setScreen("paused"); playBGM("menu"); fireTransition("pause"); }
                else if (screen === "paused") {
                  const def = LEVELS[currentLevelIndex];
                  playBGM(def?.isBoss ? "boss" : "battle");
                  setScreen("playing");
                }
              }}
              onOpenMenu={() => {
                setScreen("paused");
                playBGM("menu");
                setSavesOpen(true);
              }}
              onCast={(s) => { ensureAudio(); castSlot(s); }}
            />
            <TransitionOverlay trigger={transTick} kind={transKind} title={transTitle} subtitle={transSub} />
            {inputMode === "touch" && (
              <TouchControls onMove={onTouchMove} onButton={onTouchBtn} />
            )}
            {/* 雷达小地图：仅游戏中显示，120×120 固定右下角，显示锁定目标位置 */}
            {screen === "playing" && shopUpgradesRef.current.radar >= 0 && (
              <RadarMiniMap
                radarLevel={shopUpgradesRef.current.radar}
                lockedTargets={lockedTargetsRef.current}
                playerX={p.x}
                playerY={p.y}
                worldWidth={WORLD.WIDTH}
                worldHeight={WORLD.HEIGHT}
              />
            )}
          </div>
        )}
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)}
        sfx={sfxVol} bgm={bgmVol} quality={quality} input={inputMode}
        onChange={(patch) => {
          if (typeof patch.sfx === "number") setSfxVolState(patch.sfx);
          if (typeof patch.bgm === "number") setBgmVolState(patch.bgm);
          if (patch.quality) { setQuality(patch.quality); save.settings.quality = patch.quality; saveSlot(save); }
          if (patch.input) { setInputMode(patch.input); save.settings.input = patch.input; saveSlot(save); }
        }}
      />
      <SkillTree open={skillsOpen} onClose={() => setSkillsOpen(false)}
        levels={save.skills} skillPoints={save.skillPoints} onUpgrade={handleUpgrade} />
      <SaveSlots open={savesOpen} refreshTick={saveTick} onClose={() => setSavesOpen(false)}
        onLoad={(i) => { const loaded = loadSlot(i); applySave(loaded); }}
        onNew={(i) => { applySave(emptySlot(i)); }} />
      <AchievementBoard open={achOpen} onClose={() => setAchOpen(false)} unlocked={achStateRef.current.unlocked} />

      {/* 神龙殿商店：关卡完成时弹出，关闭后才显示 GameOverScreen */}
      <Shop
        open={shopOpen}
        gold={goldRef.current}
        upgrades={shopUpgradesRef.current}
        missiles={shopMissilesRef.current}
        onBuyUpgrade={handleBuyUpgrade}
        onBuyMissile={handleBuyMissile}
        onSkip={handleShopClose}
        onClose={handleShopClose}
      />

      <GameOverScreen
        open={(screen === "cleared" || screen === "gameover" || screen === "victory") && !shopOpen}
        victory={screen === "cleared" || screen === "victory"}
        score={scoreRef.current}
        level={currentLevelIndex + 1}
        totalLevels={LEVELS.length}
        cleared={clearResultRef.current}
        stats={{ ...statsRef.current }}
        onRestartLevel={restart}
        onNextLevel={nextLevel}
        onSelectLevel={() => { ensureAudio(); playSFX("click"); setLevelSelectOpen(true); }}
        onBackToMenu={onMenuBack}
        onOpenSkillTree={() => setSkillsOpen(true)}
      />

      <LevelSelect
        open={levelSelectOpen}
        unlockedLevel={save.level}
        currentLevel={currentLevelIndex + 1}
        onPick={(idx) => { setLevelSelectOpen(false); bootLevel(idx); }}
        onClose={() => setLevelSelectOpen(false)}
      />

      {screen !== "menu" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 justify-center">
          <GamePill onClick={() => { ensureAudio(); playSFX("click"); setSettingsOpen(true); }}>⚙️ 设置</GamePill>
          <GamePill onClick={() => { ensureAudio(); playSFX("click"); setSkillsOpen(true); }}>🎯 技能</GamePill>
          <GamePill onClick={() => { ensureAudio(); playSFX("click"); setSavesOpen(true); }}>💾 存档</GamePill>
          <GamePill onClick={() => { ensureAudio(); playSFX("click"); setAchOpen(true); }}>🏅 成就</GamePill>
          <GamePill onClick={() => { ensureAudio(); playSFX("click"); setLevelSelectOpen(true); }}>🗺️ 选关</GamePill>
          {(screen === "playing" || screen === "paused") && (
            <GamePill onClick={() => { ensureAudio(); playSFX("click"); restart(); }}>🔁 重玩</GamePill>
          )}
          <GamePill onClick={() => { ensureAudio(); playSFX("click"); onMenuBack(); }}>🏠 主菜单</GamePill>
        </div>
      )}

      {toastAch && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-4 py-2 shadow-lg animate-bounce">
          🏆 成就解锁：{toastAch}
        </div>
      )}
    </div>
  );
};

const GamePill: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (p) => (
  <button {...p}
    className={
      "rounded-xl bg-white border border-slate-200 text-slate-700 px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50 " +
      (p.className || "")
    } />
);
