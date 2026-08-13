# 示例缺陷: 管理员 demo 账号 admin@example.com / Admin123! 在生产构建仍可用
> 此示例用于演示缺陷报告填写方式；QA 阶段已实际修复（可当对照模板）。

| 字段 | 内容 |
|---|---|
| 缺陷编号 | ISSUE-AUTH-20250000-00 (示例) |
| 标题 | 生产构建仍内置 demo 管理员账号 `admin@example.com / Admin123!` 可直接登录后台 |
| 严重性 | ☐ 严重 ☑ |
| 优先级 | P0 ☑ |
| 所属模块 | Auth / AdminConsole |
| 报告人 | QA 自动化脚本 |
| 报告时间 | 本次 QA 阶段2 |
| 处理状态 | ☐ 已关闭 |
| 解决版本 | v1.0-rc.1 |
| 指派给谁 | 前端 Auth 负责人 |

## 1. 复现步骤
1. 执行 `npm run build` 生产构建
2. 用任意浏览器打开 dist 静态资源，访问 /#/auth
3. 填 admin@example.com / Admin123! 点登录
4. 跳转到 /#/admin 控制台

## 2. 前置条件
- 生产构建 dist；未设置 `VITE_ENABLE_DEMO_ACCOUNTS=true`

## 3. 预期结果
生产构建中 demo 账号不可用；登录返回"账号或密码错误"。

## 4. 实际结果
demo 账号成功登录 Admin Console → 可管理用户 / 聊天消息等敏感数据 ⚠️。

## 5. 根因
`src/lib/authClient.ts` 的 SEED_USERS 数组直接写入了管理员 demo 账号，没有区分 dev / production。

## 6. 修复方案
把 demo 账号用条件展开：
```ts
...((import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true')
  ? [{ email: "admin@example.com", ... role: "admin" }]
  : []),
```
并在 `.env.example` 中说明生产**必须**留空或不设置。

## 7. 回归验证
| 时间 | 验证人 | 结果 | 备注 |
|---|---|---|---|
| 阶段2 | QA自动脚本 | PASS | 已通过 npm run build 检查构建产物中不再出现 Admin123! |
