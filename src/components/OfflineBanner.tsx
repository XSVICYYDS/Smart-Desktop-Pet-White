import { useEffect, useState } from "react";
import { WifiOff, X } from "lucide-react";

/** 网络状态检测：断网时顶部显示提示横幅，恢复后自动消失 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };
    const goOnline = () => {
      setIsOffline(false);
      setDismissed(false);
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <div className="sticky top-0 z-[60] flex items-center justify-between gap-3 px-4 py-2 bg-amber-500 text-white text-sm shadow-md">
      <div className="flex items-center gap-2">
        <WifiOff size={16} className="shrink-0" />
        <span>网络已断开，部分功能可能不可用。请检查网络连接。</span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="关闭提示"
        className="shrink-0 w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center transition"
      >
        <X size={14} />
      </button>
    </div>
  );
}
