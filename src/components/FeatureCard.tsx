import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Play, Sparkles, ArrowRight, Star, ThumbsUp, Heart } from "lucide-react";
import type { FeatureMeta } from "../data/playgroundData";
import { FeatureDetailModal } from "./FeatureDetailModal";
import {
  getFeatureLikes,
  toggleThumbsUp,
  toggleHeart,
  subscribeSocial,
  getCurrentActor,
  type FeatureLikes,
} from "@/lib/socialStore";

/**
 * 通用功能卡片组件
 *
 * 展示一个功能模块（游戏 / 工具 / AI）：
 *  - 顶部图标 + 名称 + 简要描述 + 是否精选（⭐）
 *  - 底部三按钮：「进入」(查看说明弹窗)、「试玩」(跳转在线试玩)、「试用」(跳转在线试用)
 *  - 按钮是否出现由 meta.actions 动态控制
 *
 * 对外 props：
 *  - meta：来自 playgroundData 的完整功能元信息
 *  - Icon：要渲染的 lucide-react 图标组件
 *  - iconMap：名称→图标 的映射（由 Features 页面注入）
 *  - featured：是否精选卡片（在 Features 页面会传）
 *  - onNavigate：点击「试玩 / 试用」跳转路由时的回调，Features 页面一般用 navigate(`/playground/${meta.id}`)
 */

interface FeatureCardProps {
  meta: FeatureMeta;
  Icon: LucideIcon;
  featured?: boolean;
  onNavigatePlayground?: (id: string) => void;
}

/**
 * 点赞/喜欢 子按钮：根据自己是否点过给出不同配色 + hover 提示
 */
function LikesButton(props: {
  type: "up" | "heart";
  likes: FeatureLikes;
  myId: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  const { type, likes, myId, onClick } = props;
  const voted =
    type === "up" ? likes.upVoters.includes(myId) : likes.heartVoters.includes(myId);
  const count = type === "up" ? likes.thumbsUp : likes.hearts;
  const Icon = type === "up" ? ThumbsUp : Heart;
  const activeCls =
    type === "up"
      ? "bg-rose-50 text-rose-600 border-rose-200"
      : "bg-pink-50 text-pink-600 border-pink-200";
  const fillCls =
    type === "up"
      ? voted
        ? "fill-rose-500 stroke-rose-600"
        : "stroke-slate-500"
      : voted
      ? "fill-pink-500 stroke-pink-600"
      : "stroke-slate-500";
  const titleText = voted
    ? `再次点击取消${type === "up" ? "赞" : "喜欢"}`
    : `点个${type === "up" ? "赞👍" : "喜欢❤️"}，${type === "up" ? "可上首页推荐" : "获得更优先推荐"}`;

  return (
    <button
      onClick={onClick}
      title={titleText}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg transition-all hover:scale-105 border ${
        voted ? `${activeCls} font-semibold` : "bg-white border-slate-200"
      }`}
    >
      <Icon className={`w-3.5 h-3.5 ${fillCls}`} />
      <span>{count}</span>
    </button>
  );
}

export function FeatureCard({
  meta,
  Icon,
  featured,
  onNavigatePlayground,
}: FeatureCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [likes, setLikes] = useState<FeatureLikes>(() => getFeatureLikes(meta.id));

  /**
   * 订阅社交数据变更（其它标签页点赞/取消时，这里会同步刷新显示）
   */
  useEffect(() => {
    const off = subscribeSocial(() => setLikes(getFeatureLikes(meta.id)));
    return off;
     
  }, [meta.id]);

  /**
   * 点赞按钮切换（👍）—— 阻止冒泡避免被父层误认为"卡片点击"
   */
  const onToggleUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const { like } = toggleThumbsUp(meta.id);
    setLikes(like);
  };

  /**
   * 喜欢按钮切换（❤️）
   */
  const onToggleHeart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const { like } = toggleHeart(meta.id);
    setLikes(like);
  };

  const handleEnter = () => setShowDetail(true);
  const handlePlay = () => {
    setShowDetail(false);
    if (onNavigatePlayground) onNavigatePlayground(meta.id);
  };
  const handleTry = () => {
    setShowDetail(false);
    if (onNavigatePlayground) onNavigatePlayground(meta.id);
  };

  // 渐变底色：根据 actions.play 决定配色，保持视觉区分
  const primaryGrad =
    meta.category === "game"
      ? "from-pink-500 to-rose-500"
      : meta.category === "tool"
      ? "from-sky-500 to-indigo-500"
      : "from-violet-500 to-fuchsia-500";

  return (
    <>
      <div className="group relative rounded-3xl p-[1px] bg-gradient-to-br from-white/80 via-pink-100/60 to-rose-100/60 shadow-xl/50 hover:shadow-2xl/70 transition-all duration-500 hover:-translate-y-1 animate-fade-in-up">
        <div className="relative h-full rounded-[calc(1.5rem-1px)] bg-white/80 backdrop-blur-xl overflow-hidden flex flex-col border border-white/60">
          {/* 顶部色条 */}
          <div
            className={`h-2 w-full bg-gradient-to-r ${meta.colorScheme}`}
            aria-hidden
          />

          {/* 头部：图标 + 精选标 */}
          <div className="p-5 pb-2 flex items-start justify-between">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${primaryGrad} shadow-lg shadow-pink-200/60 flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-2 transition-all duration-500`}
            >
              <Icon className="w-7 h-7" strokeWidth={2} />
            </div>
            {featured && (
              <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold px-2.5 py-1 shadow-md shadow-amber-200/60">
                <Star className="w-3 h-3 fill-white stroke-white" />
                精选
              </div>
            )}
          </div>

          {/* 名称 + 描述 */}
          <div className="px-5 pt-1 pb-2 flex-1">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {meta.name}
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3 min-h-[3.75rem]">
              {meta.summary}
            </p>
          </div>

          {/* 点赞 & 喜欢统计条 */}
          <div className="px-5 pb-2 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <LikesButton
                type="up"
                likes={likes}
                myId={getCurrentActor().userId}
                onClick={onToggleUp}
              />
              <LikesButton
                type="heart"
                likes={likes}
                myId={getCurrentActor().userId}
                onClick={onToggleHeart}
              />
            </div>
            <div className="text-[11px] opacity-80">
              热度 {likes.thumbsUp * 2 + likes.hearts * 3}
            </div>
          </div>

          {/* 底部按钮组 */}
          <div className="px-5 pb-5 pt-1">
            <div className="grid grid-cols-3 gap-2">
              {/* 「进入」按钮 —— 打开说明弹窗，永远存在 */}
              <button
                onClick={handleEnter}
                title="进入：查看功能说明"
                className="group/btn relative overflow-hidden rounded-xl bg-white border border-pink-200/80 text-pink-600 text-sm font-semibold px-2 py-2.5 shadow-sm hover:border-pink-400 hover:shadow-md hover:shadow-pink-200/60 hover:text-pink-700 transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
                进入
              </button>

              {/* 「试玩」按钮 —— 游戏类 / 部分 AI */}
              {meta.actions.play ? (
                <button
                  onClick={handlePlay}
                  title="试玩：在线试玩此游戏"
                  className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${primaryGrad} text-white text-sm font-semibold px-2 py-2.5 shadow-md shadow-pink-200/60 hover:shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-1.5`}
                >
                  <Play className="w-4 h-4 fill-white/90" />
                  试玩
                </button>
              ) : (
                <div className="rounded-xl bg-slate-100/70 text-slate-400 text-xs font-medium border border-slate-200 flex items-center justify-center text-center px-1 leading-tight">
                  暂无试玩
                </div>
              )}

              {/* 「试用」按钮 —— 工具 / AI */}
              {meta.actions.try ? (
                <button
                  onClick={handleTry}
                  title="试用：在线体验此工具/AI"
                  className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm font-semibold px-2 py-2.5 shadow-md shadow-emerald-200/60 hover:shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-1.5`}
                >
                  <Sparkles className="w-4 h-4" />
                  试用
                </button>
              ) : (
                <div className="rounded-xl bg-slate-100/70 text-slate-400 text-xs font-medium border border-slate-200 flex items-center justify-center text-center px-1 leading-tight">
                  暂无试用
                </div>
              )}
            </div>
          </div>

          {/* 装饰光晕 */}
          <div
            className={`pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${meta.colorScheme} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}
            aria-hidden
          />
        </div>
      </div>

      <FeatureDetailModal
        open={showDetail}
        feature={meta}
        onClose={() => setShowDetail(false)}
        onPlay={handlePlay}
        onTry={handleTry}
      />
    </>
  );
}
