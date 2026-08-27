/**
 * 神龙殿商店系统：4 条升级路径（主炮/副炮/防御/引擎）× 5 级 + 4 种导弹购买。
 * 弹窗形式，0.5s 弹出动画，深色主题，与 SkillTree 视觉风格一致。
 */
import React from "react";
import { SHOP_UPGRADE_CONFIG, SHOP_MISSILE_CONFIG, SHOP_MISSILE_MAX } from "../config";
import type { MissileType, ShopMissiles, ShopUpgrades, UpgradeType } from "../types";

/** 升级路径渲染顺序：飞船四件套 + 雷达。 */
const UPGRADE_ORDER: UpgradeType[] = ["mainGun", "subGun", "defense", "engine", "radar"];
/** 导弹类型渲染顺序。 */
const MISSILE_ORDER: MissileType[] = ["normal", "cruise", "explosion", "pierce"];

export interface ShopProps {
  open: boolean;
  gold: number;
  upgrades: ShopUpgrades;        // 当前各升级项等级（0..5）
  missiles: ShopMissiles;        // 当前各导弹类型持有数量
  onBuyUpgrade: (type: UpgradeType) => void;
  onBuyMissile: (type: MissileType) => void;
  onSkip: () => void;            // 跳过商店
  onClose: () => void;
}

/**
 * 计算某升级路径从当前等级升至下一级所需金币。
 * 价格随等级递增 50%：basePrice × 1.5^currentLevel，结果四舍五入。
 */
const calcUpgradePrice = (basePrice: number, currentLevel: number): number =>
  Math.round(basePrice * Math.pow(1.5, currentLevel));

/** 统计当前已持有导弹总数（所有类型合计）。 */
const totalMissiles = (m: ShopMissiles): number =>
  m.normal + m.cruise + m.explosion + m.pierce;

/** 商店主组件：神龙殿。 */
export const Shop: React.FC<ShopProps> = ({ open, gold, upgrades, missiles, onBuyUpgrade, onBuyMissile, onSkip, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* 0.5s 弹出动画：缩放 + 透明度过渡 */}
      <style>{`
        @keyframes si-shop-pop {
          0%   { opacity: 0; transform: scale(0.92) translateY(8px); }
          100% { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .si-shop-pop { animation: si-shop-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>
      <div className="si-shop-pop w-full max-w-4xl rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* 顶部栏：标题 + 金币（右上角） + 关闭 */}
        <header className="flex-shrink-0 bg-slate-900/95 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-xl font-black">🐉 神龙殿</div>
            <p className="text-xs text-slate-300/80 mt-1">升级战机装备 / 采购弹药，强化后出击。</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 金币显示在右上角 */}
            <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 px-3 py-2 text-sm font-bold text-amber-200">
              🪙 {gold}
            </div>
            <button className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm transition" onClick={onClose}>关闭 ✕</button>
          </div>
        </header>

        {/* 可滚动内容区：升级卡片 + 导弹采购 */}
        <div className="flex-1 overflow-y-auto si-shop-scroll p-5" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <style>{`.si-shop-scroll::-webkit-scrollbar{display:none}`}</style>
          <div className="space-y-6">
            {/* 升级系统：4 条路径 × 5 级 */}
            <section>
              <div className="flex items-baseline gap-3 mb-3">
                <h3 className="text-base md:text-lg font-black bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">装备升级</h3>
                <span className="text-xs text-slate-300/80">每级价格递增 50%，满级 Lv5</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                {UPGRADE_ORDER.map((type) => {
                  const cfg = SHOP_UPGRADE_CONFIG[type];
                  const lv = upgrades[type];
                  return (
                    <UpgradeCard
                      key={type}
                      type={type}
                      icon={cfg.icon}
                      name={cfg.name}
                      effects={cfg.effects}
                      level={lv}
                      maxLevel={cfg.maxLevel}
                      price={calcUpgradePrice(cfg.basePrice, lv)}
                      gold={gold}
                      onBuy={onBuyUpgrade}
                    />
                  );
                })}
              </div>
            </section>

            {/* 导弹采购系统：4 种导弹，总容量上限 8 枚 */}
            <section>
              <div className="flex items-baseline gap-3 mb-3">
                <h3 className="text-base md:text-lg font-black bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">弹药采购</h3>
                <span className="text-xs text-slate-300/80">总容量 {totalMissiles(missiles)}/{SHOP_MISSILE_MAX} 枚</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                {MISSILE_ORDER.map((type) => {
                  const cfg = SHOP_MISSILE_CONFIG[type];
                  return (
                    <MissileCard
                      key={type}
                      type={type}
                      icon={cfg.icon}
                      name={cfg.name}
                      dmg={cfg.dmg}
                      price={cfg.price}
                      desc={cfg.desc}
                      held={missiles[type]}
                      capacityFull={totalMissiles(missiles) >= SHOP_MISSILE_MAX}
                      gold={gold}
                      onBuy={onBuyMissile}
                    />
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* 底部操作栏：跳过商店（0.3s 过渡动画） */}
        <footer className="flex-shrink-0 border-t border-white/10 bg-slate-900/95 px-5 py-4 flex items-center justify-between">
          <span className="text-xs text-slate-300/80">升级与弹药将立即生效，准备出击。</span>
          <button
            onClick={onSkip}
            className="rounded-xl px-5 py-2.5 text-sm font-bold transition duration-300 bg-white/10 hover:bg-rose-500/30 hover:text-rose-200 border border-white/10 hover:border-rose-400/40"
          >
            ⏭ 跳过商店
          </button>
        </footer>
      </div>
    </div>
  );
};

/** 升级路径卡片：展示图标、名称、当前等级、效果列表、下一级预览与升级按钮。 */
const UpgradeCard: React.FC<{
  type: UpgradeType;
  icon: string;
  name: string;
  effects: string[];
  level: number;
  maxLevel: number;
  price: number;
  gold: number;
  onBuy: (type: UpgradeType) => void;
}> = ({ type, icon, name, effects, level, maxLevel, price, gold, onBuy }) => {
  const maxed = level >= maxLevel;
  const insufficient = gold < price;
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/10 grid place-items-center text-2xl">{icon}</div>
        <div className="flex-1">
          <div className="font-bold">{name} · Lv{level}</div>
          <div className="text-[11px] text-slate-300/80">升级以永久强化该装备</div>
        </div>
      </div>
      {/* 等级进度条：5 段对应 Lv1..Lv5 */}
      <UpgradeLevelBar level={level} maxLevel={maxLevel} />
      {/* 当前等级效果预览 */}
      <ul className="mt-3 space-y-1 text-xs text-slate-200/90">
        {effects.map((e, i) => <li key={i}>• {e}</li>)}
      </ul>
      {/* 下一级预览 / 满级提示 */}
      <div className="mt-2 text-[11px] text-cyan-300/90">
        {maxed ? `✓ 已达满级（Lv${maxLevel}），无法继续升级` : `下一级 Lv${level + 1}：${effects.join(" / ")}`}
      </div>
      <button
        onClick={() => onBuy(type)}
        disabled={maxed || insufficient}
        className={
          "mt-3 rounded-xl px-3 py-2 text-sm font-bold transition " +
          (maxed ? "bg-amber-500/20 text-amber-200/90 border border-amber-400/40" :
            insufficient ? "bg-white/5 text-slate-400 border border-white/10 cursor-not-allowed" :
            "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-110 text-white shadow")
        }
      >
        {maxed ? "✓ 已满级" : insufficient ? "金币不足" : `升级（${price} 🪙）`}
      </button>
    </div>
  );
};

/** 升级等级条：按 maxLevel 渲染分段，已达成段填充渐变色。 */
const UpgradeLevelBar: React.FC<{ level: number; maxLevel: number }> = ({ level, maxLevel }) => (
  <div className="mt-3 flex items-center gap-2">
    {Array.from({ length: maxLevel }, (_, i) => (
      <div
        key={i}
        className={
          "flex-1 h-2 rounded-full transition " +
          (i < level ? "bg-gradient-to-r from-emerald-400 to-cyan-400" : "bg-white/10")
        }
      />
    ))}
  </div>
);

/** 导弹采购卡片：展示图标、名称、伤害、价格、持有数量（图标形式）与购买按钮。 */
const MissileCard: React.FC<{
  type: MissileType;
  icon: string;
  name: string;
  dmg: number;
  price: number;
  desc: string;
  held: number;
  capacityFull: boolean;
  gold: number;
  onBuy: (type: MissileType) => void;
}> = ({ type, icon, name, dmg, price, desc, held, capacityFull, gold, onBuy }) => {
  const insufficient = gold < price;
  const blocked = capacityFull || insufficient;
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/10 grid place-items-center text-2xl">{icon}</div>
        <div className="flex-1">
          <div className="font-bold">{name}</div>
          <div className="text-[11px] text-slate-300/80">{desc}</div>
        </div>
      </div>
      {/* 属性行：伤害 + 价格 */}
      <div className="mt-3 flex items-center gap-4 text-xs">
        <span className="text-rose-300/90">💥 伤害 {dmg}</span>
        <span className="text-amber-200/90">🪙 {price}/枚</span>
      </div>
      {/* 持有数量：图标形式（点亮 = 已持有 1 枚） */}
      <div className="mt-3 flex items-center gap-1.5">
        <span className="text-[11px] text-slate-300/80 mr-1">持有</span>
        {Array.from({ length: SHOP_MISSILE_MAX }, (_, i) => (
          <span key={i} className={i < held ? "text-cyan-300" : "text-white/15"}>●</span>
        ))}
        <span className="ml-2 text-[11px] text-cyan-300/90 font-bold">×{held}</span>
      </div>
      <button
        onClick={() => onBuy(type)}
        disabled={blocked}
        className={
          "mt-3 rounded-xl px-3 py-2 text-sm font-bold transition " +
          (capacityFull ? "bg-white/5 text-slate-400 border border-white/10 cursor-not-allowed" :
            insufficient ? "bg-white/5 text-slate-400 border border-white/10 cursor-not-allowed" :
            "bg-gradient-to-r from-amber-500 to-rose-500 hover:brightness-110 text-white shadow")
        }
      >
        {capacityFull ? "容量已满" : insufficient ? "金币不足" : `购买 1 枚（${price} 🪙）`}
      </button>
    </div>
  );
};
