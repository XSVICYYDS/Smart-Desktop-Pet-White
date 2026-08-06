/** 页面级骨架屏：在懒加载路由 fallback 时展示，替代简单的 spinner */
export default function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
      {/* 标题区骨架 */}
      <div className="text-center mb-10">
        <div className="h-10 w-64 mx-auto rounded-xl bg-brand-pink/10 mb-4" />
        <div className="h-4 w-48 mx-auto rounded-full bg-brand-pink/5" />
      </div>

      {/* 卡片网格骨架 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="glass rounded-2xl border border-pink-100/60 p-5 shadow-sm"
          >
            {/* 图标占位 */}
            <div className="w-12 h-12 rounded-xl bg-brand-pink/10 mb-4" />
            {/* 标题占位 */}
            <div className="h-5 w-3/4 rounded-full bg-brand-pink/10 mb-3" />
            {/* 描述行 */}
            <div className="h-3 w-full rounded-full bg-brand-pink/5 mb-2" />
            <div className="h-3 w-2/3 rounded-full bg-brand-pink/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
