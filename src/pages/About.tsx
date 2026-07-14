import {
  Code, Monitor, Package, Settings, Image, ScanText,
  Mail, Github, Heart, Sparkles, Rocket, Shield,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { techStack, timeline, siteConfig } from "@/data/content";

const iconMap: Record<string, LucideIcon> = {
  Code, Monitor, Package, Settings, Image: Image, ScanText,
};

export default function About() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div className="pt-24">
      {/* Page Header */}
      <section className="py-16 px-6 text-center bg-gradient-to-b from-pink-50 to-white">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-pink to-brand-pink-light flex items-center justify-center text-white text-4xl font-bold mx-auto mb-6 shadow-lg shadow-pink-200/50">
          白
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-brand-dark mb-4">
          关于<span className="gradient-text">小白</span>
        </h1>
        <p className="text-brand-gray text-lg max-w-2xl mx-auto">
          {siteConfig.description}
        </p>
      </section>

      {/* Developer Info */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-8 md:p-12 shadow-lg shadow-pink-100/30">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-pink to-brand-pink-dark flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                XS
              </div>
              <div className="text-center md:text-left flex-1">
                <h2 className="font-serif text-2xl font-bold text-brand-dark mb-2">
                  {siteConfig.developer}
                </h2>
                <p className="text-brand-gray mb-4">
                  独立开发者 · Python 全栈工程师 · 热爱桌面应用开发
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="inline-flex items-center gap-2 text-sm text-brand-gray hover:text-brand-pink transition-colors"
                  >
                    <Mail size={18} /> {siteConfig.email}
                  </a>
                  <a
                    href={siteConfig.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-brand-gray hover:text-brand-pink transition-colors"
                  >
                    <Github size={18} /> GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 px-6 bg-gradient-to-b from-white to-pink-50">
        <div className="max-w-5xl mx-auto">
          <SectionTitle title="技术栈" subtitle="小白使用以下技术构建" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {techStack.map((tech) => {
              const Icon = iconMap[tech.icon] || Code;
              return (
                <div
                  key={tech.name}
                  className="bg-white rounded-2xl p-6 border border-pink-50 hover:shadow-md transition-shadow text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-pink to-brand-pink-light flex items-center justify-center text-white mx-auto mb-4">
                    <Icon size={24} />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-brand-dark mb-1">{tech.name}</h4>
                  <p className="text-xs text-brand-gray">{tech.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section ref={ref} className={`reveal ${isVisible ? "is-visible" : ""} py-16 px-6`}>
        <div className="max-w-3xl mx-auto">
          <SectionTitle title="项目时间线" subtitle="小白的成长历程" />
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-pink via-brand-pink-light to-transparent" />

            {timeline.map((item, index) => (
              <div
                key={item.version}
                className={`relative flex items-center mb-8 ${
                  index % 2 === 0 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Dot */}
                <div className="absolute left-4 md:left-1/2 w-4 h-4 rounded-full bg-brand-pink border-4 border-white shadow-md -translate-x-1/2 z-10" />

                {/* Content */}
                <div className={`w-full md:w-1/2 pl-12 md:pl-0 ${index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <div className="bg-white rounded-xl p-4 border border-pink-50 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-1" style={{ justifyContent: index % 2 === 0 ? "flex-end" : "flex-start" }}>
                      <span className="text-xs font-bold text-brand-pink bg-pink-100 px-2 py-0.5 rounded-full">
                        {item.version}
                      </span>
                      <span className="text-xs text-brand-gray">{item.date}</span>
                    </div>
                    <p className="text-sm text-brand-dark">{item.event}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-6 bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-5xl mx-auto">
          <SectionTitle title="项目理念" subtitle="我们相信的价值观" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-8 text-center border border-pink-50 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white mx-auto mb-4">
                <Heart size={28} />
              </div>
              <h4 className="font-serif text-lg font-bold text-brand-dark mb-2">温暖陪伴</h4>
              <p className="text-sm text-brand-gray">
                小白不仅是一个工具，更是你桌面上的小伙伴，带来温暖和陪伴。
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 text-center border border-pink-50 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center text-white mx-auto mb-4">
                <Rocket size={28} />
              </div>
              <h4 className="font-serif text-lg font-bold text-brand-dark mb-2">持续进化</h4>
              <p className="text-sm text-brand-gray">
                不断迭代更新，听取用户反馈，让小白变得越来越好。
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 text-center border border-pink-50 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white mx-auto mb-4">
                <Shield size={28} />
              </div>
              <h4 className="font-serif text-lg font-bold text-brand-dark mb-2">开源透明</h4>
              <p className="text-sm text-brand-gray">
                源代码完全公开，安全可审计，欢迎社区参与共建。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Sparkles size={48} className="mx-auto mb-4 text-brand-pink" />
          <h3 className="font-serif text-2xl font-bold text-brand-dark mb-3">
            想要了解更多？
          </h3>
          <p className="text-brand-gray mb-6">
            欢迎通过以下方式联系开发者，或访问 GitHub 仓库参与项目。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={siteConfig.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white px-6 py-3 text-sm font-medium hover:scale-105 transition-transform shadow-lg shadow-pink-200/50"
            >
              <Github size={18} /> 访问 GitHub
            </a>
            <a
              href={`mailto:${siteConfig.email}`}
              className="inline-flex items-center gap-2 rounded-full bg-white text-brand-pink border-2 border-brand-pink px-6 py-3 text-sm font-medium hover:scale-105 transition-transform"
            >
              <Mail size={18} /> 联系开发者
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
