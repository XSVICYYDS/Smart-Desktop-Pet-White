/** 太空侵略者终极版顶层 Container：把 28 模块组合起来对外以单组件暴露。 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ACHIEVEMENTS, BALANCE, ENEMY_STATS, LEVELS, WORLD } from "./config";
import { useGameLoop } from "./game/useGameLoop";
import {
  computeDynamicMul, finalizeClear, startLevel, bossKindOfLevel, type LevelRuntime,
} from "./game/LevelSystem";
import { applyBossDamage, createBoss, resetBossBulletIds, tickBoss } from "./game/BossSystem";
import {
  clampLv, computePlayerBulletDamage, createInitialSkillState, tickSkills, tryCastActive,
  applyPassiveSkills, spawnMissiles, tickMissiles, applyEmp, applyLifesteal, applyArmorReduction,
  getEnemyTimeScale, isEnemyStunned,
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

import type { InputMode, LevelClearResult, PlayerRuntime, ScreenState, SkillId, SkillLevel, SkillRuntimeState } from "./types";
import type { BossRuntime, BulletRuntime, EnemyRuntime, MissileRuntime, WingmanRuntime } from "./types";

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

  const playerRef = useRef<PlayerRuntime>(makePlayer());
  const skillsRef = useRef<SkillRuntimeState>(makeSkills(save));
  const bulletsRef = useRef<BulletRuntime[]>([]);
  const missilesRef = useRef<MissileRuntime[]>([]);
  const wingmenRef = useRef<WingmanRuntime[]>([]);
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
      // 电磁脉冲：范围眩晕 + 护盾失效
      playSFX("shield");
      const empResult = applyEmp(skillsRef.current, p, lr?.enemies || [], now);
      // EMP 视觉特效
      spawnBurst(particlesRef.current, empResult.x, empResult.y, 40, ["#22d3ee", "#67e8f9", "#a5f3fc", "#06b6d4"], 8, 5, 800);
      if (profile.enableLighting) addLight(lightingRef.current, empResult.x, empResult.y, empResult.radius * 2, "#22d3ee", 0.7);
      fireTransition("skill-shield", "电磁脉冲", `眩晕 ${empResult.hitIds.length} 个敌人 · 半径 ${empResult.radius}px`);
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
    // 内联敌人 tick：时间扭曲缩放 dt，眩晕敌人跳过移动与开火
    for (const enemy of lr.enemies) {
      if (!enemy.alive) continue;
      if (isEnemyStunned(enemy.stunnedUntilMs, now)) continue;
      const shouldFire = stepEnemy(enemy, dtMs * enemyTimeScale, lr.dynamicMul);
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
      if (clr.level >= LEVELS.length) setScreen("victory");
      else setScreen("cleared");
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

    // ===== s4_shield 超级防御盾渲染：激活时围绕玩家绘制脉冲护盾环 =====
    const _p = playerRef.current;
    const _now = performance.now();
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

      <GameOverScreen
        open={screen === "cleared" || screen === "gameover" || screen === "victory"}
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
