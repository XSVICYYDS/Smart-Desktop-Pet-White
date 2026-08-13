# 部署 & 回滚方案
**版本**: v1.0   **日期**: 2026-08-11 18:19

## 1. 目标架构
- 前端: Vite 静态 SPA (dist/)
- 静态服务: Nginx + CDN (Cloudflare / 阿里云 CDN)
- 后端 API: 独立 Auth/Chat 服务 (VITE_API_BASE 指向)
- 监控: Sentry 前端错误 + Prometheus 后端指标 + Grafana 看板

## 2. 蓝绿部署流程
```
  Green v1.2 (旧)     Blue v1.3 (新)
       ↓                     ↓
      LB 100%               LB 0%
          \                  /
           Health Check (both OK)
                    ↓
          LB 0%       LB 100%    ← 切换完成
                    ↓
           观察 60 分钟 无告警
                    ↓
         Green v1.2 保留 1 周 → 清理
```

### 蓝绿环境变量要完全独立。
- `.env.prod.green`  → v1.2 旧
- `.env.prod.blue`   → v1.3 新

## 3. 金丝雀发布流程 (更适合高频迭代)
| 阶段 | 流量比例 | 观察窗口 | 判定条件 | 失败回滚 |
|---|---|---|---|---|
| Canary 1% | 内部员工 + QA 白名单 | 10min | 错误率 ≤ 0.1% | 回切 0% |
| Canary 5%  | 真实 5% 随机流量 | 20min | P95 LCP ≤ 基线 + 20% | 回切 0% |
| Canary 25% | 25% 用户 | 30min | 登录失败率 ≤ 基线 | 回切 0% |
| Canary 100% | 全量 | 60min | 核心 18 TC 在线 PASS | 结束 / 问题则回滚 |

## 4. 回滚操作手册（Runbook）
### 4.1 立即回滚（当 P0 级告警触发）
```bash
# 1. LB 回切到旧版本 (示例脚本)
./lb-traffic.sh --blue=0 --green=100
# 2. 清 CDN 缓存 (示例)
./cdn-purge.sh https://www.xiaobai-pet.com/index.html
# 3. 3x 冒烟 (http 200)
curl -I https://www.xiaobai-pet.com/
curl -I https://www.xiaobai-pet.com/#/features
curl -I https://www.xiaobai-pet.com/#/playground
```
### 4.2 回滚验证
- [ ] 首页 HTML 返回 200，且版本号=旧版 `<meta name="version">`
- [ ] 10 个核心 JS bundle 返回 200 (devtools Network)
- [ ] Auth 登录登出 PASS
- [ ] Sentry 错误率 10 分钟内回落到基线

## 5. 发布记录
| 版本 | 开始时间 | 结束时间 | 关键步骤 | 执行人 | 成功/失败 | 备注 |
|---|---|---|---|---|---|---|
| v1.0.0 | | | | | ☐  ☐ | 首发 |
