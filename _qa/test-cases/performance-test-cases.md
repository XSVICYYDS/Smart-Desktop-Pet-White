# 性能专项测试用例
**版本**: v1.0

## TC-PERF-001 首屏加载 ≤ 3 秒 (3G Fast)
- 环境: Chrome DevTools, Slow 3G, CPU 6× slowdown
- 步骤: 无痕窗口打开首页；清空缓存
- 记录: FCP ___ LCP ___ CLS ___ TTI ___ 请求数 ___
- 通过: ☐ LCP ≤ 3s

## TC-PERF-002 路由切换响应时间 ≤ 200ms
- 步骤: 点击导航 首页 → Features → Download → Playground/2048 → Social → About
- 记录每次 click → DOM 稳定 时间 (ms): ______
- 通过: ☐ 所有 ≤ 200ms，其中有任何一条 ≤ 100ms 加分

## TC-PERF-003 交互按钮响应 ≤ 200ms
- 点击 Auth 密码切换、Features 点赞、Playground 暂停
- 记录按钮 click → 视觉状态变化 时间
- 通过: ☐ 全 ≤ 200ms

## TC-PERF-004 WebPageTest 对比基线
- 跑 WebPageTest Dulles VA, Chrome, Cable: TTFB, Start Render, Fully Loaded, LCP
- 与基线差值 ≤ 10%；否则开启性能分析（火焰图）

## TC-PERF-005 数据库查询优化 (后端)
- `SELECT * FROM users WHERE email = ?` 命中 users_email index?
- 点赞/评论查询 99 分位 ≤ 50ms
