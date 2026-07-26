import { useState, useEffect, useCallback } from "react";

/**
 * 下载计数器 Hook
 * - 本地点击计数：使用 localStorage 持久化存储用户的下载点击次数
 * - GitHub Release 真实下载量：通过 API 获取全局真实下载统计
 * @param assetKey - 下载文件标识，用于区分安装包/便携版的本地计数
 */
export function useDownloadCounter(assetKey: string) {
  const STORAGE_KEY = `xiaobai_download_count_${assetKey}`;
  const [localCount, setLocalCount] = useState<number>(0);
  const [githubDownloads, setGithubDownloads] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // 从 localStorage 读取本地点击计数
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setLocalCount(parseInt(saved, 10) || 0);
      }
    } catch (e) {
      console.warn("读取本地下载计数失败", e);
    }
    setLoading(false);
  }, [STORAGE_KEY]);

  // 从 GitHub API 获取真实下载次数
  useEffect(() => {
    const fetchGithubDownloads = async () => {
      try {
        const res = await fetch(
          "https://api.github.com/repos/XSVICYYDS/Smart-Desktop-Pet-White/releases/latest"
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.assets && data.assets.length > 0) {
          let total = 0;
          // 根据 assetKey 匹配对应文件的下载量
          const matched = data.assets.find((a: any) =>
            assetKey === "installer"
              ? a.name.toLowerCase().includes("setup") || a.name.toLowerCase().includes("installer")
              : a.name.toLowerCase().includes("portable")
          );
          if (matched) {
            total = matched.download_count || 0;
          }
          // 如果没匹配到，返回所有资产总下载量
          if (!matched) {
            total = data.assets.reduce((sum: number, a: any) => sum + (a.download_count || 0), 0);
          }
          setGithubDownloads(total);
        }
      } catch (e) {
        // GitHub API 请求失败是正常的（限流等），静默处理
      }
    };
    fetchGithubDownloads();
  }, [assetKey]);

  /**
   * 增加本地点击计数（用户点击下载按钮时调用）
   */
  const increment = useCallback(() => {
    setIsAnimating(true);
    setLocalCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch (e) {
        console.warn("保存本地下载计数失败", e);
      }
      return next;
    });
    setTimeout(() => setIsAnimating(false), 600);
  }, [STORAGE_KEY]);

  // 总显示次数：GitHub真实下载量 + 本地点击数
  // 如果 GitHub API 还没返回，就先显示本地计数
  const totalCount = (githubDownloads ?? 0) + localCount;

  return {
    localCount,          // 用户的本地点击次数
    githubDownloads,     // GitHub Release 真实下载量
    totalCount,          // 总显示次数
    loading,             // 加载状态
    isAnimating,         // 数字跳动动画
    increment,           // 增加计数方法
  };
}