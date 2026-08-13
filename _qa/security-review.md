# 🔐 安全审查报告（Smart-Desktop-Pet-White）
版本: v1.0  审查日期: 2026-08-11 18:00
审查范围: `Smart-Desktop-Pet-White/` 前端代码

## 1. 环境变量与密钥管理

### 1.1 `.env.example` 模板
已创建 `.env.example`，包含以下必需占位项（部署前必须替换为生产安全值）：
- `VITE_API_BASE`          后端 API 基址
- `VITE_ADMIN_INVITE_CODE` 管理员注册邀请码（**必须在生产部署时修改为 32 位随机值**）
- `VITE_ANALYTICS_ID`      统计分析 ID（可选）
- `VITE_SENTRY_DSN`        异常监控 DSN（可选）
- `VITE_IMG_CDN_ORIGIN`    图片 CDN 域名（可选）
- `VITE_WS_BASE`           WebSocket 服务器地址（可选）

**规则提醒：** 所有注入到前端的 `VITE_*` 变量均可在浏览器 DevTools 中被读取，绝不能包含
数据库密码、后端服务内联 Token、支付私钥等敏感信息。

### 1.2 硬编码密钥扫描结果
扫描正则 `(sk|api[_-]?key|access[_-]?token|secret|ghp_|Bearer\s+...)`
> 命中 0 条疑似
✅ 未发现硬编码密钥 / GitHub Token / Bearer Token。

## 2. 内置管理员账号 / 默认密码
> 搜索 `admin@ / xiaobai.admin / defaultPassword / DEFAULT_PASSWORD / 内置管理员` 命中 9 条
- `src\lib\authClient.ts:L1061` → `{ email: "admin@example.com", nickname: "系统管理员", password: "Admin123!", role: "admin" as RoleId },`
- `dist\assets\index-BAZk4Y4O.js:L666` → `*/const dD=[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14`
- `dist\assets\index-Bl2qKmVH.js:L521` → `*/const d0=[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14`
- `dist\assets\index-CgNnMIqv.js:L671` → `*/const DD=[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14`
- `dist\assets\index-CsNOgU_z.js:L521` → `*/const d0=[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14`
- `dist\assets\index-DHMAo8ae.js:L671` → `*/const DD=[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14`
- `dist\assets\index-Dj41dInw.js:L621` → `*/const GB=[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14`
- `dist\assets\index-dSUdF9f9.js:L621` → `*/const GB=[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14`
- `dist\assets\index-iqaYuxvV.js:L521` → `*/const du=[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14`

**安全建议（P1，必须）：**
1. 管理员注册通道仅限携带 `VITE_ADMIN_INVITE_CODE` 的邀请请求，后端校验通过后才允许创建 `role=admin`。
2. 生产环境必须执行首次启动引导（Setup Wizard）强制设置管理员密码，禁止任何固定默认密码。
3. 数据库内所有密码一律以 PBKDF2-SHA256 / Argon2id + 独立 salt 存储，严禁明文。

## 3. Auth 客户端安全参数
> 摘自 `src/lib/authClient.ts`
  - PBKDF2 L16: * 注意：当前为"前端离线模式"，使用 PBKDF2-SHA256 派生密码哈希，
  - PBKDF2 L138: // ================== 密码哈希（PBKDF2-SHA256，与桌面端对齐） ==================
  - PBKDF2 L141: * 派生 PBKDF2-SHA256 密码哈希
  - ITERATIONS L142: * 输出格式：salt_b64$iterations$derived_b64  （与桌面端 PBKDF2 可互相验证）
  - ITERATIONS L146: const iterations = 100_000; // 与常见生产配置一致，桌面端也用 10w 轮
  - ITERATIONS L159: iterations,
  - SALT L142: * 输出格式：salt_b64$iterations$derived_b64  （与桌面端 PBKDF2 可互相验证）
  - SALT L144: export async function hashPassword(password: string, saltIn?: string): Promise<string> {
  - SALT L145: const salt = saltIn ?? genMixedCaptcha(16);
  - HASH L28: password_hash: string;
  - HASH L144: export async function hashPassword(password: string, saltIn?: string): Promise<string> {
  - HASH L160: hash: "SHA-256",
  - JWT L8: *  4. 会话持久化（localStorage 存储 JWT 风格 token，remember_me=true 用 7 天）
  - JWT L531: // 一个简单 JWT 风格 token，payload 用 btoa 编码（开发模式够用；生产需签名）
  - LOCALSTORAGE L8: *  4. 会话持久化（localStorage 存储 JWT 风格 token，remember_me=true 用 7 天）

**加固清单（P1/P2）：**
| 项目 | 要求 | 当前状态 |
|---|---|---|
| 密码传输 | 仅 HTTPS，前端禁止明文落地日志 | ⚠️ 需在 Nginx / 服务器强制 HTTPS |
| 密码存储 | PBKDF2 ≥ 200k 次迭代或 Argon2id t≥3 m≥64MB | ⚠️ 后端实现 |
| Token 有效期 | Access Token ≤ 2h  + Refresh Token 轮换 | ⚠️ 后端实现 |
| XSS 防护 | CSP + HttpOnly Cookie 存储 Refresh Token | ⚠️ 如需高安全，迁移到 HttpOnly |
| CORS 白名单 | 生产环境仅允许配置的业务域名，不能 `*` | ⚠️ 后端实现 |
| 登录失败限流 | 10 次/IP/15min 锁定 10 分钟 | ⚠️ 后端实现 |
| 注册验证码 | 邮箱/手机验证码 + 图形人机验证 | ✅ 前端已提供输入槽位，后端必须校验 |

## 4. 其它风险项
- CSRF：使用 Cookie 认证时必须配备 `SameSite=Lax` + CSRF-Token 双提交通道
- Open Redirect：登录/登出后的 `redirect_url` 参数必须做域名白名单校验
- 第三方 `<iframe>`：登录注册页禁止被第三方嵌入（HTTP 响应头 `X-Frame-Options: SAMEORIGIN` 或 CSP `frame-ancestors 'self'`）
- SVG 上传：若支持用户头像 SVG，需做 XSS 清洗（禁用 `<script>`、`onload=` 等）

## 5. 整改计划
| 优先级 | 事项 | 所属模块 | 建议完成时间 |
|---|---|---|---|
| P0 | 生产邀请码 `VITE_ADMIN_INVITE_CODE` 改为 32 位随机 | 部署配置 | 发布前 |
| P1 | 后端启用 PBKDF2/Argon2id、登录限流、CORS 白名单 | 后端 auth | 发布前 |
| P1 | Refresh Token 迁移至 HttpOnly + Secure + SameSite=Lax Cookie | 前后端 auth | 两周内 |
| P2 | 登录页增加图形/滑块验证码；密码强度前端实时评分 | Auth 页 | 一周内 |
| P2 | 全站 HTTPS；CSP 启用 `script-src 'self'` 等 | 部署配置 | 两周内 |
| P3 | Sentry 接入线上错误监控，自动上报未捕获异常 | 运维 | 一个月内 |

— 报告结束 —
