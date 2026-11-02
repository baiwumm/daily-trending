# AGENTS.md — 今日热榜（daily-trending）开发指南

> 入口文件：只保留项目定位、常用命令与硬性规则；详细规范按任务拆分在 `docs/`，动手前先按「文档索引」读对应分册。

## 项目概览

- **定位**：聚合微博、知乎、B 站、抖音、GitHub 等全网热门平台热榜的单页应用；纯聚合前端，无数据库、无自建后端，数据由 Next.js Route Handlers（`src/app/api/<platform>/route.ts`）在服务端抓取各平台上游接口，统一映射为 `HotListItem[]` 后返回客户端渲染
- **仓库**：<https://github.com/baiwumm/daily-trending>；线上：<https://hot.baiwumm.com>（EdgeOne Makers 部署）
- **页面**：唯一业务页面 `src/app/page.tsx`，一次渲染全部榜单卡片（数据进入视口后按需拉取）

## 常用命令

| 任务 | 命令 |
| --- | --- |
| 安装依赖（仅 pnpm） | `pnpm install` |
| 开发 / 构建 / 运行 | `pnpm dev`（localhost:3000）/ `pnpm build`（`.env` 已提交）/ `pnpm start` |
| Lint 单文件 | `pnpm eslint src/path/to/file.ts` |
| Lint 全量 / 自动修复 | `pnpm lint` / `pnpm lint:fix` |
| 类型检查（无独立 typecheck 脚本） | `npx tsc --noEmit` |
| 本地发版（备用，需本地 `GITHUB_TOKEN`） | `pnpm release` |

无测试框架，且 PR / push 无 CI 门禁——提交前必须自查 `pnpm lint` + `pnpm build`（build 内含类型检查，详见 `docs/architecture.md`）。

## 文档索引

| 需求 | 文件 |
| --- | --- |
| 架构 / 目录 / 数据流 / 缓存 / 状态 / 动画 / SEO | `docs/architecture.md` |
| 代码风格 / 命名 / 注释 / 提交规范 / UI / 环境变量 / 本地调试 | `docs/development.md` |
| 新增榜单 / 上游抓取与反爬 / 健康巡检 | `docs/add-hotlist.md` |
| 发版流程 / tag 规则 / README 徽章同步 | `docs/release.md` |
| 路线图 / 维护约定 | `docs/ROADMAP.md` |
| 部署 / 开放 API 契约 | `README.md` |

## AI Agent 代码生成规范

项目级 Skill 统一安装在 `.agents/skills/`，涉及对应技术产出前必须先读对应 `SKILL.md` 并遵循其规则：

- **`heroui-react`**：任何 HeroUI 组件任务（组件 API、主题与暗色模式、安装配置）先读它；仅适用 v3，勿凭 v2 记忆写 API
- **`vercel-react-best-practices`**：新建组件/页面、数据获取、重构、性能与 bundle 优化前读
- **`vercel-composition-patterns`**：组件设计与 API 设计、重构布尔 prop 泛滥 / prop drilling 前读（React 19 规则：禁 `forwardRef`，用 `use()` 替代 `useContext()`）

通用规则：

- **冲突裁决**：本文件、`docs/` 分册与既有代码架构 > Skill 规则；规则细节以 Skill 目录内文件为准（部分 Skill 为单文件，部分含 `rules/` 分册）
- **框架 API**：Next.js 框架行为以 `node_modules/next/dist/docs/` 内置文档为准（版本随依赖精确匹配），先查文档再写
- **不回退**：改造时保持既有代码同等水准（`useRequest` 竞态保护、zustand persist 版本化迁移、`fetchJson` 统一超时）

## 硬性规则

1. `IResponse` 契约与 `successResponse` / `errorResponse` 语义是前端全局依赖，保持原样；确需改动先与用户沟通。
2. 上游请求一律走 `src/lib/request.ts` 的 `fetchJson` / `fetchText`（UA、15s 超时、revalidate 已统一处理）。
3. `hotItemsConfig` 的 value 即路由路径：新增/改名时 `src/app/api/<value>/` 两处同步，改完本地请求一次验证。
4. 基础库固定：UI=HeroUI、状态=zustand、请求=原生 fetch + 自研 `useRequest`；换栈只在当次对话中经用户明确要求。
5. ESLint/Prettier 基线（`eslint.config.mjs` / `.prettierrc`）保持现状；新代码用 `pnpm lint:fix` 适配。
6. `.heroui-docs/` 是工具生成目录，只读；AGENTS.md 保持纯手写。
7. 私密变量只进 `.env.local`（已 gitignore），`.env` 仅公开变量；任何情况下不提交密钥。
8. Next/HeroUI/React 大版本升级先沟通，独立 `chore:` 提交并做回归验证。
9. Skill 只装 `.agents/skills/` 一处。
