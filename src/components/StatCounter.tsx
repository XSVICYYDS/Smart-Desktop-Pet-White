import { useEffect, useRef, useState } from "react";

interface StatCounterProps {
  value: number;
  suffix?: string;
  label: string;
  icon: React.ReactNode;
}

export default function StatCounter({ value, suffix = "", label, icon }: StatCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1500;
          const steps = 60;
          const increment = value / steps;
          let current = 0;

          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div
      ref={ref}
      className="glass rounded-2xl p-6 text-center hover:shadow-xl hover:shadow-pink-100/50 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex justify-center mb-3 text-brand-pink">
        {icon}
      </div>
      <div className="text-4xl font-bold font-serif text-brand-dark">
        {count}
        <span className="text-brand-pink">{suffix}</span>
      </div>
      <div className="text-sm text-brand-gray mt-2">{label}</div>
    </div>
  );
}
