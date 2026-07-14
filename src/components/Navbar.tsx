import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Github, Menu, X } from "lucide-react";
import { siteConfig } from "@/data/content";
import xiaobaiLogo from "@/assets/xiaobai-logo.gif";

const navLinks = [
  { to: "/", label: "首页" },
  { to: "/features", label: "功能详情" },
  { to: "/download", label: "下载" },
  { to: "/about", label: "关于" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-lg shadow-pink-100/50" : "bg-transparent"
      }`}
    >
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
