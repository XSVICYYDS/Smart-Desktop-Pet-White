import { Link } from "react-router-dom";
import { Home, Gamepad2, Download } from "lucide-react";

/** 404 页面：路由兜底，访问不存在的路径时显示 */
export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[70vh] px-6">
      <div className="max-w-lg w-full text-center">
        {/* 大号 404 数字 */}
        <div className="relative inline-block mb-6">
          <span className="text-[120px] sm:text-[160px] font-black leading-none bg-gradient-to-br from-brand-pink via-fuchsia-400 to-purple-400 bg-clip-text text-transparent select-none">
            404
          </span>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm text-brand-gray whitespace-nowrap">
            页面走丢了…
          </span>
        </div>

        <p className="text-brand-gray mb-8 mt-4">
          你访问的页面不存在或已被移除，别担心，小白帮你找到回去的路。
        </p>

        {/* 快捷入口 */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white text-sm font-medium shadow-md hover:shadow-lg transition"
          >
            <Home size={16} />
            回到首页
          </Link>
          <Link
            to="/features"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-brand-pink-dark border border-pink-200 bg-white hover:bg-pink-50 transition"
          >
            <Gamepad2 size={16} />
            看看功能
          </Link>
          <Link
            to="/download"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-brand-pink-dark border border-pink-200 bg-white hover:bg-pink-50 transition"
          >
            <Download size={16} />
            下载应用
          </Link>
        </div>
      </div>
    </div>
  );
}
