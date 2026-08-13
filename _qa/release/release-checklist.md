# 发布 Checklist (Release Runbook)
**文档版本**: v1.0  **适用**: 小白官网任意 vX.Y.Z 版本发布  **日期**: 2026-08-11 18:19

## 0. 版本号 & 分支
- 本次发布的语义化版本号: `v___.___.___`（参考 SemVer）
- 基础分支: `release/vX.Y`  或  `main`
- 最后一次 commit SHA: `git rev-parse --short HEAD` → `______`

## 1. 发布前 Pre-Flight
### 1.1 代码 & 质量
- [ ] `npm run check`  **0 TypeScript errors** (阶段1 ✅)
- [ ] `npm run lint`  **0 ESLint errors** (warnings 允许但要登记)
- [ ] 代码审查 CR: 至少 1 名 Reviewer Appr
- [ ] 无 P0 / P1 缺陷挂起（issues/ 目录 0 条 P0+P1 未解决）

### 1.2 环境变量
- [ ] `.env.example` 中所有占位项已在实际部署 `.env` 中填写
- [ ] **`VITE_ADMIN_INVITE_CODE` 已改为 32 位随机生产专用值**（禁止沿用 CHANGE_ME...）
- [ ] **`VITE_ENABLE_DEMO_ACCOUNTS=true` 行已删除或注释**（禁止生产启用 demo admin）
- [ ] `VITE_API_BASE` 为生产 HTTPS 域名，非 127.0.0.1
- [ ] 其它变量：`VITE_ANALYTICS_ID` / `VITE_SENTRY_DSN` 按需填写

### 1.3 构建 & 产物
- [ ] `npm run build` 成功
- [ ] `dist/index.html` 非空
- [ ] 主要 vendor chunk 存在：react-vendor / react-dom-vendor / playground-chunk（或名字不同，但代码分割已生效）
- [ ] gzip 总大小 ≤ 500KB（移动端关键阈值）
- [ ] dist 产物目录 `tar.gz` 备份归档（发布回滚用）：`dist-vX.Y.Z.tar.gz`

### 1.4 测试
- [ ] 功能冒烟 18 条主路径 TC 全部 PASS (test-cases/functional-test-case.md)
- [ ] 兼容性矩阵至少 3 个核心平台 PASS（Chrome-Windows / Safari-macOS / iOS Chrome）
- [ ] Lighthouse 性能 ≥ 90 分；LCP ≤ 2.5s；CLS ≤ 0.1
- [ ] 安全检查：硬编码密钥扫描无结果（security-review.md 已通过）

## 2. 预发布环境 (Staging) 验证
- [ ] 部署到 Staging 域名（e.g. https://staging.xiaobai-pet.example.com）
- [ ] 真实 Chrome / Safari / iPhone 真机冒烟走一遍（TC-AUTH-001 ~ TC-NAV-003 + TC-DOWN-001）
- [ ] Staging → 生产 API_BASE 是隔离的；测试数据不污染生产
- [ ] 预发布跑 Lighthouse → 和 baseline 差值 ≤ 5%（无明显退化）

## 3. 生产部署
### 策略选择（二选一，推荐蓝绿/金丝雀）
- [ ] **蓝绿部署**: 蓝集群老版本；绿集群新版本；健康检查通过后切 DNS / LB
- [ ] **金丝雀发布**: 先给 5% / 20% / 50% / 100% 流量，每步观察 15 分钟

### 部署步骤记录
| 步骤 | 时间戳 | 操作人 | 状态 |
|---|---|---|---|
| 备份 dist-vX.Y.Z.tar.gz | | | ☐ |
| 上传静态资源 CDN / 对象存储 | | | ☐ |
| 更新 index.html 引用新 hash 资源 | | | ☐ |
| 健康检查 /healthz HTTP 200 × 3 次 | | | ☐ |
| 冒烟首页 / /#/auth / /#/features | | | ☐ |
| 切换 100% 流量 | | | ☐ |
| 清理旧版本 (保留 1 个回滚版本) | | | ☐ |

## 4. 监控 & 回滚
### 4.1 发布后 24h 监控 (Dashboard 链接: ___ )
- [ ] 错误率 (Sentry) ≤ 0.1%
- [ ] 首屏 LCP 95 分位 ≤ 3.5s
- [ ] 服务器负载 CPU ≤ 70%  内存 ≤ 80%
- [ ] Auth 登录失败率 ≤ 5%（过高可能账号异常）
- [ ] Playground 游戏页 4xx/5xx 率 ≤ 0.5%
- [ ] 设置告警阈值（email / 钉钉 / 飞书）

### 4.2 回滚预案 (触发条件)
- 错误率 > 2% 或 LCP P95 > 6s 或 登录完全不可用 → **立即回滚**
- 回滚步骤:
  1. LB 切回上一版蓝集群（或恢复旧 index.html + tar.gz）
  2. 刷新 CDN 缓存 purge
  3. 5 分钟内主页 HTTP 200 OK 冒烟 3 次
  4. 邮件 / 群通知"已回滚 + 根因排查中"

## 5. 发布后动作
- [ ] 24h 监控报告归档到 `_qa/release/vX.Y.Z-monitoring.md`
- [ ] 收集真实用户反馈渠道（问卷 / 反馈表单 / 公众号）
- [ ] 每两周一次用户体验评估 + 性能再测
- [ ] 更新 CHANGELOG.md（用户可读：新增 / 修复 / 改进 三段）

## 6. 签字
| 角色 | 姓名 | 签字 | 日期 |
|---|---|---|---|
| 产品经理 (PO) | | | |
| 开发负责人 (Dev Lead) | | | |
| QA 负责人 | | | |
| 运维 / SRE | | | |
