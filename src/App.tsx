import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Features from "@/pages/Features";
import Download from "@/pages/Download";
import About from "@/pages/About";
import Auth from "@/pages/Auth";
import Playground from "@/pages/Playground";
import AdminConsole from "@/pages/AdminConsole";
import Social from "@/pages/Social";
import Chat from "@/pages/Chat";
import { useTheme } from "@/hooks/useTheme";

/**
 * 全站应用壳：挂载路由、Navbar、Footer、回到顶部浮动按钮、主题初始化钩子
 */
export default function App() {
  // 保证主题在首屏立即应用（useEffect 内会把 <html> 加 .dark / .light class）
  useTheme();

  /* =================== 回到顶部按钮（长页面友好） =================== */
  const [showBackTop, setShowBackTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-brand-cream">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/download" element={<Download />} />
            <Route path="/about" element={<About />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/social" element={<Social />} />
            <Route path="/chat/:conversationId" element={<Chat />} />
            <Route path="/playground/:id" element={<Playground />} />
            <Route path="/admin" element={<AdminConsole />} />
          </Routes>
        </main>
        <Footer />

        {/* 回到顶部浮动按钮 */}
        <button
          type="button"
          onClick={handleBackToTop}
          aria-label="回到顶部"
          className={`fixed right-5 bottom-5 z-40 w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition-all duration-300
            bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white
            hover:scale-110 active:scale-95
            ${showBackTop ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"}`}
        >
          <ArrowUp size={18} />
        </button>
      </div>
    </Router>
  );
}
