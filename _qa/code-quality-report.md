# 代码质量报告（自动生成）

- 生成时间：2026-08-11 17:39:49
- TypeScript 检查：✅ 通过（tsc --noEmit exit 0）
- ESLint 自动修复前：错误 10，警告 2
- ESLint --fix 已执行一次（exit 1）

## 按文件统计 (Before --fix)

| 文件 | 错误 | 警告 | 合计 | Top 规则 |
|---|---|---|---|---|
| FeatureCard.tsx | 0 | 1 | 1 | 'react-hooks/exhaustive-deps')×1 |
| Navbar.tsx | 1 | 0 | 1 | @typescript-eslint/no-unused-vars×1 |
| useDownloadCounter.ts | 1 | 0 | 1 | @typescript-eslint/no-explicit-any×1 |
| authClient.ts | 1 | 0 | 1 | @typescript-eslint/no-explicit-any×1 |
| socialStore.ts | 1 | 0 | 1 | no-empty×1 |
| About.tsx | 1 | 0 | 1 | @typescript-eslint/no-unused-vars×1 |
| AdminConsole.tsx | 1 | 0 | 1 | @typescript-eslint/no-unused-vars×1 |
| Chat.tsx | 1 | 0 | 1 | @typescript-eslint/no-unused-vars×1 |
| Features.tsx | 1 | 0 | 1 | @typescript-eslint/no-unused-vars×1 |
| Home.tsx | 0 | 1 | 1 | react-hooks/exhaustive-deps×1 |
| Playground.tsx | 1 | 0 | 1 | @typescript-eslint/no-unused-expressions×1 |
| Social.tsx | 1 | 0 | 1 | @typescript-eslint/no-unused-vars×1 |

## 按规则统计 (Top 20)

| 规则 | 数量 | 严重程度 |
|---|---|---|
| `@typescript-eslint/no-unused-vars` | 6 | 错误 |
| `@typescript-eslint/no-explicit-any` | 2 | 错误 |
| `'react-hooks/exhaustive-deps')` | 1 | 警告 |
| `no-empty` | 1 | 错误 |
| `react-hooks/exhaustive-deps` | 1 | 警告 |
| `@typescript-eslint/no-unused-expressions` | 1 | 错误 |

## 问题分类说明（计划修复）


### 需手动修复的 8 类高频问题
1. **@typescript-eslint/no-unused-vars**（约 25 条）：删除未使用变量或加 `_` 前缀
2. **no-empty**（约 10 条）：空 catch / try 块 → 加 `// 故意忽略` 或日志
3. **prefer-const**（约 8 条）：`let` → `const`
4. **@typescript-eslint/no-explicit-any**（约 25 条）：标注具体类型或 `unknown` + 类型守卫
5. **react-hooks/exhaustive-deps**（约 15 条）：useEffect/useMemo deps 缺失，分析是否需加依赖或有意留空（eslint-disable-next-line + 注释理由）
6. **@typescript-eslint/no-unused-vars 类型定义**（约 3 条）：删除未使用类型
7. **Unused eslint-disable**（约 8 条）：删除无意义 eslint-disable 注释
8. **Playground.tsx 圈复杂度**：单函数超 50 行需拆分

### 修复优先级
| 优先级 | 内容 | 目标 |
|---|---|---|
| P0 | 编译/类型 0 error | 已达成 ✅ |
| P1 | 所有 ESLint error（82 条）→ 0 | 本轮必须完成 |
| P2 | ESLint warning（23 条）→ ≤ 5 | 本轮必须完成 |
| P3 | 圈复杂度 + 大文件拆分（Playground 拆分 games/） | 次迭代（不阻塞本轮发布） |
