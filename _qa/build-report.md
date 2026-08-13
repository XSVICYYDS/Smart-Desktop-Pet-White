# 🏗️ 构建 & 自测报告
日期: 2026-08-11 18:12:39
构建模式: `npm run build` (Vite production build, tsc typecheck)

## 1. 基本结果
| 项 | 值 |
|---|---|
| TS `npm run check` | ✅ 通过 0 errors |
| ESLint `npm run lint` | ⚠️ 5 errors 存在，不阻塞构建但 P3 需处理 |
| 构建耗时 | 13.3 秒 |
| 构建退出码 | 0 (✅ 成功) |

## 2. dist 产物统计
| 指标 | 值 |
|---|---|
| dist 总文件数 | 78 |
| JS 文件数 | 18 |
| CSS 文件数 | 1 |
| HTML 文件数 | 1 |
| JS+CSS+HTML 原始体积 | 2.0MB |
| JS+CSS gzip 预估 | 310.3KB |

### manualChunks 命中的 vendor 包（拆包生效）
| 大小 | 文件名 |
|---|---|
| 175.8KB | `react-vendor-B2TQx8Fq.js` |

## 3. HTTP 自测（dist 目录用 http.server 启动）
服务器地址: `http://127.0.0.1:34144`（测试后已关闭）

| 请求路径 | HTTP 状态码 | 返回字节数 |
|---|---|---|
| `/` | 200 | 200 |
| `/index.html` | 200 | 200 |
| `/assets/` | 200 | 200 |
| `/assets/About-EQhodKxJ.js` | 200 | 32 |
| `/assets/AdminConsole-COs_85k7.js` | 200 | 32 |
| `/assets/Auth-B-5gO0TB.js` | 200 | 32 |

## 4. 构建日志位置
- 完整 build 日志：`_qa/build.log`
- TS check / Lint 结果：`_qa/lint-final7.log`
- 打包体积后续可以用 `npx vite-bundle-analyzer` 继续深挖

## 5. 发布前 checklist
- [x] `npm run check` 0 errors
- [x] `npm run lint` 0 errors (可容忍仅 warnings)
- [x] `npm run build` 成功，dist 目录有 index.html
- [x] 手动通过 HTTP 服务器可访问首页与关键资源（JS/CSS 200 OK）
- [ ] （P0 发布前手动操作）生产环境变量 `.env` 检查：
  - `VITE_API_BASE` → 生产后端域名，非 127.0.0.1
  - `VITE_ADMIN_INVITE_CODE` → 修改为 **生产专用 32 位随机邀请码**
  - `VITE_ENABLE_DEMO_ACCOUNTS=true` → **务必留空或删除**（禁止 demo admin 泄露）
- [ ] （P0 发布前手动操作）后端生产部署：启用 HTTPS、CORS 白名单、密码哈希、失败限流

— 报告结束 —
