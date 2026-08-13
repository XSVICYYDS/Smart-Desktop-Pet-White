import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronRight, Sparkles, Gamepad2, Heart, MessageCircle, Download } from "lucide-react";

/**
 * 新手引导 Spotlight 组件（QA 阶段4-4.4）
 * - 仅对首次访问用户展示（localStorage `onboarding_done`）
 * - 覆盖 5 步入门：欢迎、下载宠物、功能亮点、娱乐区、社交/点赞
 * - 支持 ESC、点击遮罩外关闭、跳过
 */
type Step = {
  target?: string;              // CSS selector 指向被高亮的元素（可选）
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  place: "top" | "bottom" | "left" | "right";
};

const DEFAULT_STEPS: Step[] = [
  {
    title: "欢迎来到小白的世界 👋",
    desc: "你好！我是小白 —— 你的智能桌面宠物。接下来用 30 秒带你玩转本站，随时可以点击右上角跳过哦。",
    icon: Sparkles,
    place: "bottom",
  },
  {
    target: "#nav-download",
    title: "第一步：下载小白",
    desc: "先把小白安装到电脑，让她常驻桌面，学习、解压、摸鱼都能陪伴你～（Windows 版一键安装）",
    icon: Download,
    place: "bottom",
  },
  {
    target: "#nav-features",
    title: "第二步：看看小白能做什么",
    desc: "学习助手 / 解压小游戏 / AI 对话 / 便签提醒 / 截图取色… —— 都是为你量身定做的实用功能。",
    icon: Heart,
    place: "bottom",
  },
  {
    target: "#nav-playground",
    title: "第三步：来娱乐区放松一下",
    desc: "25+ 款网页小游戏：俄罗斯方块、2048、贪吃蛇、扫雷、五子棋… 全部免费打开即玩，支持最高分记录哦！",
    icon: Gamepad2,
    place: "bottom",
  },
  {
    target: "#nav-social",
    title: "第四步：点赞 · 分享 · 反馈",
    desc: "喜欢哪个功能？点个赞告诉我们！也可以留言反馈你想要的功能，我们会认真看每一条消息 💌",
    icon: MessageCircle,
    place: "bottom",
  },
];

type Props = {
  steps?: Step[];
  onDone?: () => void;
  storageKey?: string;
  neverAutoShow?: boolean;
};

export default function OnboardingSpotlight({
  steps = DEFAULT_STEPS,
  onDone,
  storageKey = "onboarding_done",
  neverAutoShow,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // 首次访问自动开启；neverAutoShow=true 就等手动开
  useEffect(() => {
    if (neverAutoShow) return;
    try {
      if (localStorage.getItem(storageKey) !== "1") {
        setOpen(true);
      }
    } catch {
      /* empty: localStorage 不可用则跳过 */
    }
  }, [storageKey, neverAutoShow]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, step]);

  const finish = useCallback(() => {
    try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    setOpen(false);
    onDone?.();
  }, [storageKey, onDone]);

  const next = useCallback(() => {
    setStep((s) => (s + 1 < steps.length ? s + 1 : (finish(), s)));
  }, [steps.length, finish]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  if (!open) return null;

  const s = steps[step];
  const Icon = s.icon;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="小白网站新手引导"
    >
      {/* 黑色遮罩（用 SVG 剪出高亮矩形） */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-[fadeIn_0.25s_ease-out]" onClick={finish} />

      {/* 浮层卡片 */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-white/50 p-6 md:p-8 animate-[fadeIn_0.25s_ease-out_0.05s_both]">
        <button
          onClick={finish}
          aria-label="跳过引导"
          className="absolute top-3 right-3 btn-touchable !min-w-9 !min-h-9 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-cyan-600 font-semibold mb-1">
              第 {step + 1} / {steps.length} 步
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">{s.title}</h3>
            <p className="text-slate-600 leading-relaxed">{s.desc}</p>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-6 flex items-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-gradient-to-r from-cyan-400 to-blue-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={finish}
            className="text-sm text-slate-400 hover:text-slate-600 transition btn-touchable !min-h-10"
          >
            跳过引导
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="btn-touchable rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm !min-h-10"
              >
                上一步
              </button>
            )}
            <button
              onClick={next}
              className="btn-touchable rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 active:scale-[0.98] transition !min-h-10"
            >
              {step + 1 === steps.length ? "完成 ✓" : "下一步"}
              {step + 1 !== steps.length && <ChevronRight className="w-4 h-4 inline -mr-1" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
