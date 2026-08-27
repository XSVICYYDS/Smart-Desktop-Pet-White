/**
 * 雷达小地图：120×120 像素，固定于屏幕右下角。
 * 将世界坐标按比例映射到小地图：玩家青色三角形、锁定目标红色点、超距目标边缘箭头指示。
 * 锁定框以 2Hz（0.5s 周期）红色脉冲动画呈现。
 */
import React from "react";

/** 雷达小地图尺寸（正方形边长，像素）。 */
const RADAR_SIZE = 120;
/** 标记距离边缘的内边距，避免贴边溢出。 */
const EDGE_PAD = 8;

export interface RadarMiniMapProps {
  radarLevel: number;  // 0-4，等级越高颜色越亮
  lockedTargets: Array<{ id: number; x: number; y: number; enemyType: number }>;
  playerX: number;
  playerY: number;
  worldWidth: number;
  worldHeight: number;
}

/** 雷达等级主题：LV0 灰 → LV1 绿 → LV2 蓝 → LV3 紫 → LV4 金。 */
interface RadarTheme { label: string; text: string; ring: string; sweep: string }
const RADAR_LEVEL_THEME: RadarTheme[] = [
  { label: "LV0", text: "text-slate-400",   ring: "border-slate-400/50",   sweep: "rgba(148,163,184,0.18)" },
  { label: "LV1", text: "text-emerald-400",  ring: "border-emerald-400/60", sweep: "rgba(52,211,153,0.20)" },
  { label: "LV2", text: "text-cyan-400",     ring: "border-cyan-400/60",    sweep: "rgba(34,211,238,0.20)" },
  { label: "LV3", text: "text-purple-400",   ring: "border-purple-400/60",  sweep: "rgba(167,139,250,0.22)" },
  { label: "LV4", text: "text-amber-400",    ring: "border-amber-400/70",    sweep: "rgba(251,191,36,0.24)" },
];

/** 数值钳制到 [min, max] 区间。 */
const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

/** 雷达小地图主组件。 */
export const RadarMiniMap: React.FC<RadarMiniMapProps> = ({ radarLevel, lockedTargets, playerX, playerY, worldWidth, worldHeight }) => {
  // 等级越界保护：仅保留 0..4
  const theme = RADAR_LEVEL_THEME[clamp(radarLevel, 0, 4)] ?? RADAR_LEVEL_THEME[0];

  /** 将世界 X 坐标按比例映射到小地图像素坐标。 */
  const mapX = (x: number): number => worldWidth > 0 ? (x / worldWidth) * RADAR_SIZE : RADAR_SIZE / 2;
  /** 将世界 Y 坐标按比例映射到小地图像素坐标。 */
  const mapY = (y: number): number => worldHeight > 0 ? (y / worldHeight) * RADAR_SIZE : RADAR_SIZE / 2;

  // 玩家位置映射并钳制到边界内（玩家始终可见于地图内）
  const px = clamp(mapX(playerX), EDGE_PAD, RADAR_SIZE - EDGE_PAD);
  const py = clamp(mapY(playerY), EDGE_PAD, RADAR_SIZE - EDGE_PAD);

  return (
    <div className="fixed bottom-4 right-4 z-40 select-none pointer-events-none">
      {/* 脉冲动画：锁定框 2Hz 红色脉冲（0.5s 一周期，每秒 2 次） */}
      <style>{`
        @keyframes si-radar-lock {
          0%, 100% { opacity: 0.95; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 0.15; transform: translate(-50%, -50%) scale(1.6); }
        }
        .si-radar-lock { animation: si-radar-lock 0.5s ease-in-out infinite; }
      `}</style>
      <div
        className={`relative rounded-xl border ${theme.ring} bg-black/60 backdrop-blur-sm overflow-hidden shadow-lg`}
        style={{ width: RADAR_SIZE, height: RADAR_SIZE }}
      >
        {/* 雷达等级标识（左上角） */}
        <div className={`absolute top-0.5 left-1.5 text-[9px] font-black ${theme.text}`}>{theme.label}</div>

        {/* 中心十字准星，辅助定位 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30">
          <div className="absolute left-1/2 -translate-x-1/2" style={{ width: 1, height: RADAR_SIZE, background: theme.sweep }} />
          <div className="absolute top-1/2 -translate-y-1/2" style={{ width: RADAR_SIZE, height: 1, background: theme.sweep }} />
        </div>

        {/* 锁定目标：红色点 + 脉冲锁定框；超出范围则边缘箭头指示方向 */}
        {lockedTargets.map((t) => {
          const tx = mapX(t.x);
          const ty = mapY(t.y);
          // 判断是否超出小地图可显示范围
          const off = tx < EDGE_PAD || tx > RADAR_SIZE - EDGE_PAD || ty < EDGE_PAD || ty > RADAR_SIZE - EDGE_PAD;
          // 钳制到边缘，箭头/点均绘制在地图内
          const cx = clamp(tx, EDGE_PAD, RADAR_SIZE - EDGE_PAD);
          const cy = clamp(ty, EDGE_PAD, RADAR_SIZE - EDGE_PAD);

          if (off) {
            // 计算相对地图中心的方向角，箭头朝向目标
            const angle = Math.atan2(ty - RADAR_SIZE / 2, tx - RADAR_SIZE / 2);
            return <EdgeArrow key={t.id} x={cx} y={cy} angle={angle} />;
          }
          return <TargetMarker key={t.id} x={tx} y={ty} />;
        })}

        {/* 玩家位置：青色三角形 */}
        <PlayerMarker x={px} y={py} />
      </div>
    </div>
  );
};

/** 锁定目标标记：红色实心点 + 2Hz 红色脉冲锁定框。 */
const TargetMarker: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div className="absolute" style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}>
    {/* 红色脉冲锁定框（边框方框） */}
    <div
      className="si-radar-lock absolute rounded-sm"
      style={{ width: 12, height: 12, border: "1.5px solid rgba(248,113,113,0.9)" }}
    />
    {/* 红色实心点 */}
    <div className="rounded-full" style={{ width: 6, height: 6, background: "#f87171", boxShadow: "0 0 4px rgba(248,113,113,0.9)" }} />
  </div>
);

/** 边缘方向箭头：目标超出小地图时，在边缘绘制指向目标的箭头。 */
const EdgeArrow: React.FC<{ x: number; y: number; angle: number }> = ({ x, y, angle }) => {
  // 箭头朝向目标：CSS rotate 角度（弧度→度）+ 90° 偏移，使三角形顶点指向目标
  const deg = (angle * 180) / Math.PI + 90;
  return (
    <div className="absolute" style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}>
      {/* 用 CSS 边框三角形绘制箭头 */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderBottom: "9px solid #f87171",
          transform: `rotate(${deg}deg)`,
          filter: "drop-shadow(0 0 3px rgba(248,113,113,0.8))",
        }}
      />
    </div>
  );
};

/** 玩家标记：青色三角形，顶点朝上表示战机朝向。 */
const PlayerMarker: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div className="absolute" style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}>
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderBottom: "11px solid #22d3ee",
        filter: "drop-shadow(0 0 4px rgba(34,211,238,0.9))",
      }}
    />
  </div>
);
