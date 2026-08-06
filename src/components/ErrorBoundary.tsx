import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界：捕获子组件渲染异常，防止整个应用白屏
 * 支持懒加载 chunk 失败时的降级提示（点击重试 = 刷新页面）
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /** 捕获子组件抛出的错误 */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /** 错误日志（可扩展为上报到服务端） */
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  /** 重试：刷新当前页面（最简单可靠的恢复方式） */
  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isChunkError =
        this.state.error?.message?.includes("Loading chunk") ||
        this.state.error?.message?.includes("Failed to fetch dynamically imported module");

      return (
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="max-w-md w-full glass rounded-3xl border border-pink-100 shadow-xl shadow-pink-100/30 p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <AlertTriangle size={28} className="text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-brand-dark mb-2">
              {isChunkError ? "资源加载失败" : "页面出了点问题"}
            </h2>
            <p className="text-sm text-brand-gray mb-6">
              {isChunkError
                ? "可能是网络波动或应用已更新，请刷新页面重试。"
                : "抱歉，页面渲染时发生了错误。请尝试刷新或返回首页。"}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white text-sm font-medium shadow-md hover:shadow-lg transition"
              >
                <RefreshCw size={15} />
                刷新重试
              </button>
              <a
                href="#/"
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-brand-pink-dark border border-pink-200 bg-white hover:bg-pink-50 transition"
              >
                返回首页
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
