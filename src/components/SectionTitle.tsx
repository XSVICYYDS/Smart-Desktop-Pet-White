import type { ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  center?: boolean;
  /** 可选：标题左侧小图标（lucide-react 图标或任何 ReactNode） */
  icon?: ReactNode;
}

export default function SectionTitle({ title, subtitle, center = true, icon }: SectionTitleProps) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`reveal ${isVisible ? "is-visible" : ""} ${center ? "text-center" : ""} mb-12`}
    >
      <h2 className={`font-serif text-3xl md:text-4xl font-bold text-brand-dark mb-3 ${icon ? "inline-flex items-center gap-2 justify-center" : ""}`}>
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{title}</span>
      </h2>
      {subtitle && (
        <p className="text-brand-gray text-base md:text-lg max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
      <div className={`h-1 w-20 bg-gradient-to-r from-brand-pink to-brand-pink-light rounded-full mt-4 ${center ? "mx-auto" : ""}`} />
    </div>
  );
}
