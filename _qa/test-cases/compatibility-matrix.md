# 兼容性测试矩阵
**版本**: v1.0   **日期**: 2026-08-11 18:16   **网站**: 小白官网桌面版 + 移动版

## 浏览器 × 操作系统
> 主流浏览器最新 2 个大版本；设备覆盖 3 级尺寸

| \ 浏览器 / OS | Chrome 最新-1 & 最新 | Edge 最新-1 & 最新 | Firefox 最新-1 & 最新 | Safari 最新-1 & 最新 |
|---|---|---|---|---|
| Windows 11 64 位 (桌面 1920×1080) | ☐ | ☐ | ☐ | N/A |
| Windows 10 64 位 (桌面 1366×768) | ☐ | ☐ | ☐ | N/A |
| macOS 14 Sonoma (MacBook 1440×900) | ☐ | N/A | ☐ | ☐ |
| iPadOS 17 (iPad Pro 1024×768) | ☐ | ☐ | N/A | ☐ |
| iOS 17 (iPhone 14 390×844) | ☐ (Chrome for iOS) | N/A | N/A | ☐ |
| Android 14 (Pixel 7 412×915) | ☐ (Chrome) | ☐ (Edge) | N/A | N/A |
| HarmonyOS 4 (Mate 60) | ☐ | ☐ | N/A | N/A |

## 响应式布局断点测试 (Tailwind 断点)
| 断点 | 宽度 | 期望行为 | 实测通过 |
|---|---|---|---|
| sm | ≥ 640px | 卡片从 1 列 → 2 列 | ☐ |
| md | ≥ 768px | 导航显示完整 6 项，不出现汉堡 | ☐ |
| lg | ≥ 1024px | Features 3 列布局 | ☐ |
| xl | ≥ 1280px | Hero 图 + 文案左右分栏 | ☐ |
| 2xl | ≥ 1536px | 最大容器居中，两侧留白 | ☐ |

## 专项检查 (每设备)
- [ ] 所有按钮 min 44×44 px 可点
- [ ] prefers-reduced-motion 用户动画关闭
- [ ] ESC 可关闭 Modal / GameResultOverlay
- [ ] 首屏滚动无水平溢出条
- [ ] 外链 target="_blank" 都有 rel="noreferrer noopener"
- [ ] 字体不小于 12px（正文 14+ px）
- [ ] 输入框虚拟键盘不会遮挡提交按钮

## 发现问题 → 提交到 `_qa/issues/` 目录
问题编号格式: `ISSUE-COMPAT-YYYYMMDD-XX`
