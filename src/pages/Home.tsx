import { Link } from "react-router-dom";
import {
  Sparkles, Gamepad2, Wrench, Layers, Dog, Brain,
  Download, ArrowRight, Cloud, Languages, BookOpen,
  Smile, Quote, FileText, Github,
} from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import SectionTitle from "@/components/SectionTitle";
import StatCounter from "@/components/StatCounter";
import DownloadButton from "@/components/DownloadButton";
import { LucideIcon } from "lucide-react";
import { stats, highlights, petFeatures, games, tools, aiTools, siteConfig } from "@/data/content";
import xiaobaiLogo from "@/assets/xiaobai-logo.gif";

const iconMap: Record<string, LucideIcon> = {
  Sparkles, Gamepad2, Wrench, Layers, Dog, Brain,
  Cloud: Cloud, Languages, BookOpen, Smile, Quote, FileText,
};

function FloatingParticles() {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 20 + 10,
    left: Math.random() * 100,
    duration: Math.random() * 10 + 8,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.3 + 0.1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle bg-brand-pink rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.left}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const { ref: featuresRef, isVisible: featuresVisible } = useScrollReveal();
  const { ref: downloadRef, isVisible: downloadVisible } = useScrollReveal();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-cream via-white to-pink-50" />
        <FloatingParticles />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-20">
          <div className="animate-float inline-block mb-8">
            <div className="w-40 h-40 md:w-52 md:h-52 rounded-full bg-gradient-to-br from-white to-pink-50 shadow-2xl shadow-pink-200/50 flex items-center justify-center border-4 border-white overflow-hidden">
              <img 
                src={xiaobaiLogo} 
                alt="小白" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <h1 className="font-serif text-5xl md:text-7xl font-bold text-brand-dark mb-6 animate-fade-in-up">
            智能桌面宠物<span className="gradient-text">小白</span>
          </h1>

          <p className="text-lg md:text-xl text-brand-gray mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.2s", opacity: 0, animationFillMode: "forwards" }}>
            集桌面陪伴、15款游戏、十余款工具、AI智能助手于一体的全能桌面小助手
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "0.4s", opacity: 0, animationFillMode: "forwards" }}>
            <DownloadButton variant="primary" size="large" label="立即下载" internalLink="/download" />
            <DownloadButton variant="secondary" size="large" label="查看功能" internalLink="/features" />
          </div>

          <div className="mt-16 flex items-center justify-center gap-2 text-sm text-brand-gray animate-fade-in" style={{ animationDelay: "0.6s", opacity: 0, animationFillMode: "forwards" }}>
            <Github size={16} />
            <a href={siteConfig.github} target="_blank" rel="noopener noreferrer" className="hover:text-brand-pink transition-colors">
              开源项目 · {siteConfig.version}
            </a>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" className="w-full">
            <path d="M0,50 C320,100 720,0 1440,50 L1440,100 L0,100 Z" fill="#FFF9F5" />
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-brand-cream">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = iconMap[stat.icon] || Sparkles;
              return (
                <StatCounter
                  key={stat.label}
                  value={stat.value}
                  suffix={stat.suffix}
                  label={stat.label}
                  icon={<Icon size={28} />}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="核心亮点"
            subtitle="四大板块，全方位覆盖你的桌面需求"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((item, index) => {
              const Icon = iconMap[item.icon] || Sparkles;
              return (
                <div
                  key={item.title}
                  className="glass rounded-2xl p-6 hover:shadow-xl hover:shadow-pink-100/50 transition-all duration-300 hover:-translate-y-2 group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon size={28} />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-brand-dark mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-brand-gray leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pet Features Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-pink-50">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="桌面宠物互动"
            subtitle="26+ 种动画效果，9 种互动方式，3 种行为模式"
          />
          <div ref={featuresRef} className={`reveal ${featuresVisible ? "is-visible" : ""} grid grid-cols-1 md:grid-cols-3 gap-4`}>
            {petFeatures.map((feature) => (
              <div
                key={feature.name}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-pink-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-brand-pink" />
                  <h4 className="font-semibold text-brand-dark">{feature.name}</h4>
                </div>
                <p className="text-xs text-brand-gray ml-4">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Games Preview Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="15 款休闲游戏"
            subtitle="从经典到创新，总有一款适合你"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {games.slice(0, 10).map((game) => {
              const Icon = iconMap[game.icon] || Gamepad2;
              return (
                <div
                  key={game.name}
                  className={`rounded-xl p-4 text-center transition-all duration-300 hover:-translate-y-1 ${
                    game.featured
                      ? "bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white shadow-lg shadow-pink-200/50"
                      : "bg-white border border-pink-50 hover:shadow-md"
                  }`}
                >
                  <Icon size={32} className="mx-auto mb-2" />
                  <h4 className={`font-semibold text-sm ${game.featured ? "text-white" : "text-brand-dark"}`}>
                    {game.name}
                  </h4>
                  {game.featured && (
                    <p className="text-xs text-white/80 mt-1">{game.description}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 text-brand-pink hover:text-brand-pink-dark font-medium transition-colors"
            >
              查看全部游戏 <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Tools Preview Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="十余款实用工具"
            subtitle="桌面管理、画板、截图、转换器... 一站式效率工具集"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tools.slice(0, 8).map((tool) => {
              const Icon = iconMap[tool.icon] || Wrench;
              return (
                <div
                  key={tool.name}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 border border-pink-50"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${tool.featured ? "bg-brand-pink text-white" : "bg-pink-50 text-brand-pink"}`}>
                    <Icon size={20} />
                  </div>
                  <h4 className="font-semibold text-sm text-brand-dark mb-1">{tool.name}</h4>
                  <p className="text-xs text-brand-gray">{tool.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Tools Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="AI 智能助手"
            subtitle="天气、翻译、词典、笑话... 你的智能小帮手"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {aiTools.map((tool) => {
              const Icon = iconMap[tool.icon] || Brain;
              return (
                <div
                  key={tool.name}
                  className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-pink-50"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white shrink-0">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-dark">{tool.name}</h4>
                    <p className="text-xs text-brand-gray">{tool.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Download CTA Section */}
      <section ref={downloadRef} className={`reveal ${downloadVisible ? "is-visible" : ""} py-20 px-6`}>
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-12 text-center shadow-xl shadow-pink-100/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-pink/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-pink/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/80 rounded-full px-4 py-2 mb-6">
                <Download size={16} className="text-brand-pink" />
                <span className="text-sm text-brand-dark font-medium">{siteConfig.version} · 最新版本</span>
              </div>

              <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-dark mb-4">
                准备好领养你的<span className="gradient-text">小白</span>了吗？
              </h2>
              <p className="text-brand-gray mb-8 max-w-xl mx-auto">
                免费、开源、持续更新。立即下载，让小白陪伴你的每一天。
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <DownloadButton variant="primary" size="large" label="下载安装包" internalLink="/download" />
                <DownloadButton variant="secondary" size="large" label="查看源码" href={siteConfig.github} />
              </div>

              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-brand-gray">
                <span>✓ Windows 10/11</span>
                <span>✓ 免费 & 开源</span>
                <span>✓ 持续更新</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
