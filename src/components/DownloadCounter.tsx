import { Download, TrendingUp, Loader2 } from "lucide-react";
import { useDownloadCounter } from "@/hooks/useDownloadCounter";

interface DownloadCounterProps {
  /** 下载文件标识：installer（安装包）或 portable（便携版） */
  assetKey: "installer" | "portable";
  /** 显示样式 */
  variant?: "card" | "inline";
}

/**
 * 下载次数计数器组件
 * - 显示 GitHub Release 真实下载量 + 用户本地点击次数
 * - 数字变化时带动画效果
 */
export default function DownloadCounter({ assetKey, variant = "card" }: DownloadCounterProps) {
  const { totalCount, loading, isAnimating } = useDownloadCounter(assetKey);

  // 格式化大数字（如 1,234 / 1.2万）
  const formatNumber = (n: number): string => {
    if (n >= 10000) {
      return (n / 10000).toFixed(1) + " 万";
    }
    return n.toLocaleString("zh-CN");
  };

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-brand-gray">
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Download size={12} className="text-brand-pink" />
        )}
        <span className={isAnimating ? "animate-pulse font-bold text-brand-pink" : ""}>
          {loading ? "--" : formatNumber(totalCount)}
        </span>
        <span>次下载</span>
      </span>
    );
  }

  // card 样式（默认）
  return (
    <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100">
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-pink to-brand-pink-dark flex items-center justify-center shadow-md shadow-pink-200/50">
          <TrendingUp size={20} className="text-white" />
        </div>
        {isAnimating && (
          <span className="absolute -top-1 -right-1 text-xs font-bold text-brand-pink animate-bounce">
            +1
          </span>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-brand-gray">累计下载</span>
        <span
          className={`font-serif text-xl font-bold gradient-text transition-all duration-500 ${
            isAnimating ? "scale-110" : "scale-100"
          }`}
        >
          {loading ? (
            <span className="inline-flex items-center gap-1 text-brand-gray">
              <Loader2 size={16} className="animate-spin" /> 统计中
            </span>
          ) : (
            formatNumber(totalCount)
          )}
        </span>
      </div>
    </div>
  );
}