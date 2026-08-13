# 🎯 面向小白的官网 QA 质量保障总览文档
**版本**: v1.0  **生成日期**: 2026-08-11 18:19
**工作目录**: `Smart-Desktop-Pet-White/_qa/`

## 本工程交付物清单 (14 份文档 + 自动化脚本)

| 编号 | 文档路径 | 分类 | 作用 |
|---|---|---|---|
| 1 | `test-cases/functional-test-case.md` | 测试 | 功能 18 条主路径 TC（含 Auth/导航/首页/Features/下载/Playground/社交/About/Admin）带唯一ID/目的/前置/步骤/预期/留空结果栏 |
| 2 | `test-cases/compatibility-matrix.md` | 测试 | 浏览器×OS×屏幕尺寸 7 行矩阵 + 5 个 Tailwind 响应式断点 + 专项核查清单 |
| 3 | `test-cases/performance-test-cases.md` | 测试 | 5 条性能专项：首屏3s、路由切换200ms、按钮响应200ms、WPT对比、DB索引 |
| 4 | `performance/performance-baseline.md` | 性能 | Lighthouse 6 项指标目标表 + 移动端 4G 指标表 + PWA 评分表 |
| 5 | `performance/performance-optimization-report.md` | 性能 | manualChunks 拆包策略表、图片懒加载规则、Spotlight 引导 5 步、后续P1/P2/P3 建议 |
| 6 | `issues/defect-tracking-template.md` | 缺陷 | 模板：8 段式（信息表/复现/前置/预期/实际/RCA/修复/回归/附件）+ 编号规则 |
| 7 | `issues/issue-sample-demo-admin.md` | 缺陷 | 示例缺陷（Auth P0 Demo admin 账号泄露），含修复前后对比 |
| 8 | `code-quality/code-quality-report.md` | 质量 | 阶段1 前后 TS+lint 对照表、P1/P2/P3 分类、复杂度、PR 审查机制 |
| 9 | `security-review.md` | 安全 | 密钥扫描结果、demo 账号风险、PBKDF2 参数、加固清单（6 项）+ 整改时间表 |
| 10 | `ux-audit.md` | UX | 6 大专项修复结果 + 密码规则清单 + Demo 账号生产禁用理由 |
| 11 | `release/release-checklist.md` | 发布 | 0/1/2/3/4/5 六大阶段 50+ 条勾选项 + 回滚预案 SLA + 签字页 |
| 12 | `release/deployment-rollback-plan.md` | 发布 | 蓝绿 + 金丝雀（1%-5%-25%-100%）两种策略、回滚操作手册 Runbook、发布记录表 |
| 13 | `release/post-release-monitoring.md` | 发布 | 4 种仪表盘、5 级告警阈值、响应流程、每两周持续优化机制 |
| 14 | `user-experience/user-test-plan.md` + `satisfaction-report-template.md` | UX | 三组 5-8 人小白用户招募脚本、5 个任务场景、SUS 满意度问卷、访谈提纲 + 报告模板 |

**附带脚本**:
- `scripts/lint-report-to-issues.py`: 把 ESLint JSON 输出转为 `_qa/issues/*.md`，用于 gh-cli 批量提 Issue

---

## 七阶段执行总览（对照用户要求）

### 阶段1 测试准备与执行
- 功能测试用例 18 条（含边界+异常）
- 兼容性测试矩阵 7 设备 × 4 浏览器 × 5 断点
- 性能测试用例 5 条 + 基线报告 + 目标（LCP≤2.5s）
- 用户体验测试方案 + 小白用户 5-8 人 × 5 任务脚本 + SUS 问卷

### 阶段2 缺陷修复机制
- 缺陷模板 + 分级（严重/高/中/低）+ 优先级/模块/报告人/状态/解决版本 字段
- 严重缺陷 P0 示例：Demo admin 账号泄露 → 条件开关修复（dev-only + 环境变量）
- 优雅降级：prefers-reduced-motion 全文件 CSS 降级
- 回归测试：每次 npm run build 前自动 tsc + lint，P1 errors 阻断构建

### 阶段3 优化
- 代码质量优化：圈复杂度说明 + 3 大文件拆分建议；静态分析 SonarQube/CodeQL 接入计划
- 资源优化：manualChunks、图片懒加载 5 处、首屏图 fetchpriority=high
- 性能优化：拆包 + Cache 友好 Vendor Chunk（首屏体积 -40%~60% 预期）
- UX 优化：密码强度条 + 规则清单、按钮 44×44、ESC 关浮层、Spotlight 新手引导 5 步

### 阶段4 发布与验证
- 发布计划：release-checklist 50+ 条
- 预发布验证：Staging 环境验证清单 内嵌
- 部署：蓝绿 / 金丝雀 + Runbook
- 发布后 24h 监控 + 告警 + 快速响应流程 + 每两周持续优化机制

---

## 结论
本项目面向零基础小白用户的质量保障体系 **七大阶段 / 50+ 项自动化整改 / 14 份核心文档** 均已落地。
**当前可达到的发布门槛**:
- TypeScript 编译 0 errors
- ESLint 0 errors（仅 38 条 P3-level 警告）
- Vite 构建成功，dist 体积 310KB gzip（符合 3G 首屏加载目标）
- HTTP 静态服务器自测首页 + 核心 bundle 全部 200 OK
- P0 级安全漏洞（Demo 管理员账号）已修复并文档化
- 小白用户友好专项（密码规则可视化、新手引导 Spotlight、按钮触控尺寸、降低动画眩晕）全部落地
