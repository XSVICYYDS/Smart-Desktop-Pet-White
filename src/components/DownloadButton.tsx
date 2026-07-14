import { Link } from "react-router-dom";
import { Download, ExternalLink } from "lucide-react";
import { siteConfig } from "@/data/content";

interface DownloadButtonProps {
  variant?: "primary" | "secondary";
  size?: "default" | "large";
  label?: string;
  href?: string;
  internalLink?: string;
}

export default function DownloadButton({
  variant = "primary",
  size = "default",
  label = "立即下载",
  href,
  internalLink,
}: DownloadButtonProps) {
  const baseClasses = "inline-flex items-center gap-2 rounded-full font-medium transition-all duration-300 hover:scale-105";
  const variantClasses = {
    primary: "bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white shadow-lg shadow-pink-200/50 hover:shadow-xl hover:shadow-pink-300/50",
    secondary: "bg-white text-brand-pink border-2 border-brand-pink hover:bg-brand-pink hover:text-white",
  };
  const sizeClasses = {
    default: "px-6 py-3 text-sm",
    large: "px-8 py-4 text-base",
  };

  const className = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;

  if (internalLink) {
    return (
      <Link to={internalLink} className={className}>
        {variant === "primary" && <Download size={size === "large" ? 20 : 18} />}
        {label}
      </Link>
    );
  }

  return (
    <a
      href={href || siteConfig.githubReleases}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {variant === "primary" ? <Download size={size === "large" ? 20 : 18} /> : <ExternalLink size={size === "large" ? 20 : 18} />}
      {label}
    </a>
  );
}
