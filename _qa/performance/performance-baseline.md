# 性能基线报告
**版本**: v1.0   **基准测试日期**: 2026-08-11 18:16   **方法**: Lighthouse 10.0 + WebPageTest 4G Fast

## 核心指标 (Desktop, Chrome, 有线 100Mbps)
| 指标 | 目标 | 本轮实测 | 评分 (LCP 权重) | 备注 |
|---|---|---|---|---|
| FCP 首次内容绘制 | ≤ 1.2 s |  ☐ ___ s | 15% | 首屏 <style> / <link> 有无阻塞 |
| LCP 最大内容绘制 | ≤ 2.5 s |  ☐ ___ s | 45% | Hero 主图 / Hero 标题 DOM |
| CLS 累积布局偏移 | ≤ 0.1 |  ☐ ___  | 25% | 图片 width/height 缺失？字体 FOIT？ |
| TBT 总阻塞时间 | ≤ 200 ms |  ☐ ___ ms | 25% | manualChunks 后 JS 主任务时长 |
| TTI 可交互时间 | ≤ 3.5 s |  ☐ ___ s | 综合 | - |
| Speed Index 速度指数 | ≤ 2.0 s |  ☐ ___ s | 综合 | - |

## 核心指标 (模拟 Moto G4, 4G Fast 1.6Mbps 下)
| 指标 | 目标 | 本轮实测 |
|---|---|---|
| FCP | ≤ 2.0 s | ☐ ___ |
| LCP | ≤ 3.0 s | ☐ ___ |
| TBT | ≤ 300 ms | ☐ ___ |
| 首屏请求数 | ≤ 25 | ☐ ___ |
| 首屏下载体积 (未压缩) | ≤ 500 KB | ☐ ___ KB |

## Lighthouse 综合评分
| 分类 | 权重 | 目标分 | 本轮 |
|---|---|---|---|
| 性能 Performance | 35% | 90+ | ☐ ___ |
| 无障碍 Accessibility | 15% | 90+ | ☐ ___ |
| 最佳实践 Best Practices | 10% | 100 | ☐ ___ |
| SEO SEO | 20% | 90+ | ☐ ___ |
| PWA 渐进 Web | 20% | 75+ | ☐ ___ |

## 关键资源瀑布分析
1. vendor-chunk (react-dom / react / router / icons) 是否 preload？
2. 首屏图片是否 WebP 格式？Hero 主图是否 fetchpriority=high？
3. 是否存在阻塞 CSS 的长字体加载？（建议 font-display: swap）

## 本轮结论
- ☐ 性能目标达成，可进入下一轮灰度
- ☐ 未达成，P0 瓶颈：______ ，建议动作：______
