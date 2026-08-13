# 🧭 UX / 无障碍专项审计报告 (Smart-Desktop-Pet-White)
日期: 2025-Q1-Release  审计类型: QA 阶段3 自动审计 + 手工修复

## 1. 触控尺寸（Target Size AA）
> WCAG 2.2 要求：移动端触控目标最小 24×24 CSS px（推荐 44×44）。
- ✅ 新增全局工具类 `.btn-touchable { min-width:44px; min-height:44px }` (移动端 48×48)。
- ✅ Auth 注册 / 登录主按钮已附加 `.btn-touchable`。
- 📝 P3 迭代：批量扫描 Navbar / Footer / Playground 的所有图标按钮，统一 className。

## 2. 减少动态效果（prefers-reduced-motion）
> 对弱视/前庭障碍用户至关重要。
- ✅ `index.css` 追加 `@media (prefers-reduced-motion: reduce)` 块：
  - 全局所有动画/过渡时长降为 0.001ms
  - 禁用 backdrop-blur（毛玻璃对 GPU 负担重且可能引发眩晕）
  - 禁用所有 `animate-*` Tailwind 动画
- 📝 P2 迭代：Canvas 游戏（Playground 25 款）也应检测该媒体查询，关闭粒子爆炸、浮动分数、连击特效等。

## 3. ESC 关闭浮层（键盘可访问性）
> 符合 WCAG 2.1 SC 2.1.1 / 2.4.3，让键盘用户能"退出当前交互"。
- ✅ `GameResultOverlay` 已绑定 `keydown Escape` -> 触发重新开始按钮 click。
- 📝 P2 迭代：所有 Modal / Dialog / Drawer 组件（如 FeatureCard Lightbox）也应在 Header 加 ESC 关闭回调。

## 4. 外链安全（target="_blank" 安全）
> 防止 window.opener 钓鱼 / 跨域污染。
- ✅ 全仓库扫描 `<a target="_blank">`，自动补齐 `rel="noreferrer noopener"`。
- ✅ 未发现遗漏项。

## 5. 密码强度可视化 + 规则清单（Auth 页面）
> 面向零基础小白用户：降低账号创建时的"密码不符合要求重试次数"，提升注册转化率。
- ✅ Auth `mode="register"` 模式下：
  - 密码输入框下方展示 5 段式强度条（红/橙/黄/浅绿/深绿），文字提示：极弱 → 非常强
  - 列出 5 条可满足规则（长度/大写/小写/数字/特殊字符），满足的勾选打绿勾
  - 实时显示 N / 5 符合项计数
- ✅ PBKDF2 10 万轮哈希已在 `authClient.ts` 内实现（与桌面端对齐），可离线验证。

## 6. 密码校验最小规则（后端对齐）
前端预检规则清单：
```
长度:  8  ~  64  字符  (拒绝过短 / 超长)
必须包含:  至少 1 位大写字母 + 至少 1 位小写字母
必须包含:  至少 1 位数字 (0-9)
可选加分:  至少 1 位非字母数字特殊字符
禁止:    不能匹配 "password / 123456 / admin / qwerty / 用户邮箱本身 等 100 个常见弱密码"
```
> 📝 P1 迭代：后端必须做同等校验，不能只信任前端。

## 7. Demo 管理员账号生产禁用（安全 P0）
> 审计发现 `authClient.ts` 内置 demo 账号 `admin@example.com / Admin123!`。
- ✅ 已用条件开关包裹：
  ```ts
  ...((import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true')
    ? [{ email: "admin@example.com", ... role: "admin" }]
    : []),
  ```
- ✅ 生产 `npm run build` 默认不包含该账号。
- ✅ `.env.example` 已提供 `VITE_ENABLE_DEMO_ACCOUNTS` 字段，默认留空即禁用。

## 8. 未完成项 / 后续迭代
| 优先级 | 事项 | 说明 |
|---|---|---|
| P1 | 密码常见弱词黑名单 | 使用 zxcvbn / 自建 Top100 弱词表拦截 |
| P1 | Auth 图形验证码（人机校验） | 防止注册撞库；前端已提供滑块 UI 槽位 |
| P2 | 所有 Modal ESC 关闭 + Tab 焦点陷阱 | 焦点不能溢出模态 |
| P2 | Canvas 游戏 `prefers-reduced-motion` 降级 | 粒子/爆炸特效默认关闭 |
| P2 | 全站键盘焦点可见环 `:focus-visible` | 默认 Tailwind outline 需保留 |
| P3 | Navbar / Footer / Playground 图标按钮全部应用 `.btn-touchable` | 确保移动端可点 |

— 报告结束 —
