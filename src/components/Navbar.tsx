import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Github,
  Menu,
  X,
  LogIn,
  LogOut,
  CloudUpload,
  User as UserIcon,
  CheckCircle,
  ChevronDown,
  ShieldCheck,
  MessageCircle,
  Users,
} from "lucide-react";
import { siteConfig } from "@/data/content";
import xiaobaiLogo from "@/assets/xiaobai-logo.gif";
import {
  getCurrentDisplayName,
  getCurrentUser,
  isLoggedIn,
  isCurrentAdmin,
  isCurrentSuperAdmin,
  logout,
  syncCloudPreview,
} from "@/lib/authClient";

const navLinks = [
  { to: "/", label: "首页" },
  { to: "/features", label: "功能详情" },
  { to: "/social", label: "社交中心" },
  { to: "/download", label: "下载" },
  { to: "/about", label: "关于" },
];

/**
 * 顶部导航栏（包含登录/注册入口与登录后菜单）
 *  - 桌面端（md以上）：右侧显示「登录/注册」按钮，登录后显示昵称下拉菜单
 *  - 移动端：汉堡菜单中同样包含登录入口
 *  - 会话读取基于 localStorage（与桌面端同规格数据结构）
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // 当前登录状态（每 500ms 轮询一次，因为页面间通过 localStorage 同步）
  const [loggedIn, setLoggedIn] = useState<boolean>(() => isLoggedIn());
  const [displayName, setDisplayName] = useState<string | null>(() =>
    getCurrentDisplayName()
  );

  // 头像菜单开关（桌面端）
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // 同步结果 Toast
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    msg: string;
  } | null>(null);

  /**
   * 监听滚动，切换玻璃态样式
   */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * 页面切换时关闭移动菜单
   */
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  /**
   * 定时刷新登录态（其它页面登出后这里会同步更新）
   */
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = isLoggedIn();
      const name = getCurrentDisplayName();
      setLoggedIn((prev) => prev !== now || displayName !== name ? now : prev);
      setDisplayName(name);
    }, 500);
    return () => window.clearInterval(t);
  }, [displayName]);

  /**
   * 点击菜单外部时关闭下拉
   */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  /**
   * 自动清理 Toast
   */
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  /**
   * 点击「登录/注册」按钮
   */
  const goAuth = () => navigate("/auth");

  /**
   * 退出登录（并刷新页面状态）
   */
  const handleLogout = () => {
    logout();
    setLoggedIn(false);
    setDisplayName(null);
    setMenuOpen(false);
    setToast({ type: "success", msg: "✅ 已退出登录，网站与桌面端会话均已清理。" });
  };

  /**
   * 同步数据（预览版：与桌面端托盘菜单「同步数据（预览）」一致）
   */
  const handleSync = () => {
    const r = syncCloudPreview();
    setToast({ type: "success", msg: `${r.msg}\n同步时间：${r.syncedAt}` });
    setMenuOpen(false);
  };

  const user = loggedIn ? getCurrentUser() : null;
  const adminBadge = (() => {
    if (!loggedIn) return null;
    if (isCurrentSuperAdmin()) return { level: "超级管理员", color: "from-pink-100 to-rose-100 text-pink-700 border-pink-200", icon: <ShieldCheck size={10} /> };
    if (isCurrentAdmin()) return { level: "管理员", color: "from-purple-100 to-fuchsia-100 text-purple-700 border-purple-200", icon: <ShieldCheck size={10} /> };
    return null;
  })();

  const goAdmin = () => {
    setMenuOpen(false);
    navigate("/admin");
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-lg shadow-pink-100/50" : "bg-transparent"
      }`}
    >
      {/* Toast */}
      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 top-20 animate-fade-in-up">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg text-sm backdrop-blur border ${
              toast.type === "success"
                ? "bg-green-50/90 text-green-700 border-green-200"
                : "bg-brand-cream/90 text-brand-dark border-pink-200"
            }`}
          >
            <span className="whitespace-pre-line">{toast.msg}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform border-2 border-brand-pink/20">
            <img src={xiaobaiLogo} alt="小白" className="w-full h-full object-contain" />
          </div>
          <span className="font-serif text-xl font-bold text-brand-dark">
            {siteConfig.shortName}
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors relative ${
                location.pathname === link.to
                  ? "text-brand-pink"
                  : "text-brand-dark hover:text-brand-pink"
              }`}
            >
              {link.label}
              {location.pathname === link.to && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-pink rounded-full" />
              )}
            </Link>
          ))}

          {/* 认证入口 */}
          <div className="flex items-center gap-4">
            {loggedIn && displayName ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-sm border border-pink-100 hover:border-brand-pink hover:shadow-md transition"
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white text-xs font-bold flex items-center justify-center">
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-brand-dark max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown size={14} className="text-brand-gray" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-12 w-64 glass rounded-2xl shadow-xl border border-pink-100 overflow-hidden animate-fade-in-up">
                    {/* 用户信息头 */}
                    <div className="px-4 py-3 bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                            {displayName.slice(0, 1).toUpperCase()}
                          </div>
                          {adminBadge && (
                            <span
                              className={`absolute -bottom-1 -right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-gradient-to-r border shadow ${adminBadge.color}`}
                              title={`当前身份：${adminBadge.level}`}
                            >
                              {adminBadge.icon}
                              {adminBadge.level}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {displayName}
                          </div>
                          <div className="text-[11px] opacity-90 truncate">
                            {user?.email}
                          </div>
                          <div className="text-[11px] opacity-80 flex items-center gap-1 mt-0.5">
                            <CheckCircle size={11} />
                            网站·桌面端 已同步登录
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="py-1 flex flex-col">
                      {adminBadge && (
                        <button
                          onClick={goAdmin}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-dark hover:bg-pink-50 transition border-b border-pink-50"
                        >
                          <ShieldCheck size={15} className="text-brand-pink" />
                          管理员控制台
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-brand-pink/10 text-brand-pink border border-pink-100">
                            管理账号/权限/版本
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate("/social");
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-dark hover:bg-pink-50 transition"
                      >
                        <Users size={15} className="text-fuchsia-500" />
                        社交中心
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">
                          好友 / 群聊
                        </span>
                      </button>
                      <button
                        onClick={handleSync}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-dark hover:bg-pink-50 transition"
                      >
                        <CloudUpload size={15} className="text-brand-pink" />
                        同步数据（预览）
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <LogOut size={15} />
                        退出登录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={goAuth}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  location.pathname === "/auth"
                    ? "bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white shadow-md shadow-brand-pink/30"
                    : "bg-white text-brand-pink border border-brand-pink hover:bg-pink-50 shadow-sm hover:shadow-md"
                }`}
              >
                <LogIn size={15} />
                登录 / 注册
              </button>
            )}

            <a
              href={siteConfig.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-brand-dark hover:text-brand-pink transition-colors"
            >
              <Github size={18} />
              GitHub
            </a>
          </div>
        </div>

        <button
          className="md:hidden p-2 text-brand-dark"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden glass border-t border-pink-100">
          <div className="px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium ${
                  location.pathname === link.to
                    ? "text-brand-pink"
                    : "text-brand-dark"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* 移动端认证区 */}
            <div className="pt-3 border-t border-pink-100 flex flex-col gap-3">
              {loggedIn && displayName ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white text-sm font-bold flex items-center justify-center">
                        {displayName.slice(0, 1).toUpperCase()}
                      </div>
                      {adminBadge && (
                        <span
                          className={`absolute -bottom-1 -right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-gradient-to-r border shadow ${adminBadge.color}`}
                        >
                          {adminBadge.icon}
                          {adminBadge.level}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-brand-dark truncate">
                        {displayName}
                      </div>
                      <div className="text-[11px] text-brand-gray truncate">
                        {user?.email}
                      </div>
                    </div>
                  </div>
                  {adminBadge && (
                    <button
                      onClick={goAdmin}
                      className="flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-brand-pink/10 to-fuchsia-100/60 text-brand-pink-dark border border-pink-200 text-sm font-medium"
                    >
                      <ShieldCheck size={15} />
                      管理员控制台（管理账号/权限/版本）
                    </button>
                  )}
                  <button
                    onClick={handleSync}
                    className="flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-brand-pink/10 to-brand-pink-light/20 text-brand-pink-dark border border-pink-100 text-sm font-medium"
                  >
                    <CloudUpload size={15} />
                    同步数据（预览）
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 py-2 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-medium"
                  >
                    <LogOut size={15} />
                    退出登录
                  </button>
                </>
              ) : (
                <button
                  onClick={goAuth}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white text-sm font-medium shadow-md shadow-brand-pink/30"
                >
                  <UserIcon size={15} />
                  登录 / 注册
                </button>
              )}
            </div>

            <a
              href={siteConfig.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-brand-dark"
            >
              <Github size={18} /> GitHub
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
