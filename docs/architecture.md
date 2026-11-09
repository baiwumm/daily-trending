# 架构与数据流

> **何时读**：改动页面结构、数据流、缓存策略、全局状态或 SEO 相关代码前，先通读本文。
> 框架与依赖版本一律以根 `package.json` 为准，本文不写死版本号，避免文档漂移。

---

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Next.js（App Router + Turbopack）、React、TypeScript strict |
| UI | HeroUI（`@heroui/react`）+ Tailwind CSS（`@tailwindcss/postcss`） |
| 动画 | motion（`motion/react`）、next-themes 明暗主题 |
| 状态 | zustand（`persist` 中间件 → localStorage） |
| 请求 | 服务端原生 `fetch`（经 `src/lib/request.ts` 封装）；客户端自研 `useRequest`（`src/hooks/use-request.ts`，**无** axios/SWR/ahooks） |
| 解析/工具 | cheerio（HTML 解析）、lunar-typescript（农历）、@tanstack/react-virtual（长列表虚拟滚动）、@dnd-kit（卡片拖拽排序） |
| 统计 | 百度统计 + Google Analytics + Clarity（`src/components/Analytics`） |
| 工程 | pnpm、ESLint（flat config）+ Prettier、release-it 发版（GitHub Actions 一键发版，见 [release.md](./release.md)） |

无测试框架；`pnpm build` 内含类型检查；发版 workflow 内置 lint + build 门禁，但无 PR 级 CI——提交前仍需自查 `pnpm lint` + `pnpm build`。

## 目录结构

```text
src/
├── app/
│   ├── layout.tsx          # 根布局：metadata / 主题 / 全局组件挂载
│   ├── page.tsx            # 首页（唯一业务页面，'use client'）
│   ├── globals.css         # Tailwind v4 入口 + HeroUI 主题变量
│   ├── sitemap.ts / robots.ts / manifest.json / opengraph-image.tsx / not-found.tsx  # SEO/PWA/404
│   └── api/<platform>/route.ts   # 各榜单 API（目录名 = 榜单 value，数量以 hotItemsConfig 为准）
├── components/             # PascalCase 目录 + index.tsx；核心：HotCard（含 HotListVirtual）/ HotSettings / HotSearch / Sortable，其余为布局与功能组件
├── config/
│   ├── hot-list.tsx        # HOT_ITEMS：全部榜单配置唯一数据源（分类/平台数量以此为准）
│   └── response.ts         # 响应码 + API_CACHE_SECONDS 缓存窗口
├── hooks/                  # use-request.ts（自研 useRequest）、use-is-mobile 等
├── lib/
│   ├── request.ts          # 上游请求公共层：fetchJson / fetchText / fetchBuffer（统一 UA、15s 超时、revalidate）
│   ├── author.ts           # 作者身份单一来源：仓库地址取 GitHub 用户名，bio/头像走 GitHub API（缓存一天）
│   ├── response.ts         # successResponse / errorResponse（统一 IResponse + CDN 缓存头 + 出口数据消毒）
│   ├── utils.ts            # fromNow / formatNumber 等纯工具
│   └── weread.ts / miyoushe.ts 等  # 特殊平台算法（微信读书书籍 ID、米游社等），新算法也放这里
├── store/useAppStore.ts    # zustand 全局状态（更新时间/心跳/显隐/排序/常看收藏/趋势快照，persist）
├── styles/fonts.css        # Maple Mono CN 自托管 @font-face（字体文件在 public/fonts/）
└── types/index.ts          # HotListConfig / HotListItem / IResponse 共享类型
.agents/skills/             # Agent Skills（见根 AGENTS.md「AI Agent 代码生成规范」）
.github/workflows/          # CI：Release 一键发版（手动触发）+ 上游健康巡检（定时）
.heroui-docs/               # HeroUI 本地文档（工具生成，gitignore）
docs/                       # 项目文档分册（本目录）
scripts/                    # Node 工具脚本（release-it 钩子、健康巡检等）
```

## 数据流（单向）

```text
上游平台接口
  → src/app/api/<value>/route.ts   （fetchJson：统一 Chrome UA + 15s 超时 + next.revalidate）
  → 映射为 HotListItem[]            （id/title/url/mobileUrl/hot/desc…）
  → successResponse()               （统一 IResponse + CDN 头 s-maxage=API_CACHE_SECONDS, stale-while-revalidate=60 固定）
  → 客户端 useRequest → HotCard     （useInView 进入视口才请求；手动刷新 URL 加时间戳绕过 CDN）
```

## 架构要点

- **新增一个榜单 = 两步**：① `src/config/hot-list.tsx` 的 `hotItemsConfig` 在对应分类的 `children` 里加一行；② 新建 `src/app/api/<value>/route.ts`。完整步骤与上游抓取规范见 [add-hotlist.md](./add-hotlist.md)。
- **缓存三层同源**：服务端 fetch `revalidate` = CDN `s-maxage` = 客户端刷新冷却，全部取自 `API_CACHE_SECONDS`（`src/config/response.ts`，默认 300 秒，可用 `NEXT_PUBLIC_HOT_CACHE_SECONDS` 覆盖）；改动缓存策略须三层一起评估。
- **响应契约**：HTTP 层恒为 200，业务结果以 body 的 `code` 区分；`IResponse { code, msg, data?, timestamp }` 固定，成功 `code=200`（可缓存），失败 `code=500` 且 `no-store`（避免错误被缓存）。前端依赖 `timestamp` 显示更新时间，勿改语义。
- **客户端状态**：`useAppStore`（zustand persist）。改持久化结构必须递增 `version` 并补 `migrate`；`now/tick` 心跳是派生基准，不持久化。相对时间与刷新冷却共用同一时钟保证自洽。
- **动画约束**：首页卡片网格的 FLIP 重排动画由**子级** `motion.div` 的 `layout` 承担；父级 grid 容器只承载 variants，**不要开启 `layout`**——父级变换补偿会在网格重排时叠加错位（见 `page.tsx` 注释）。
- **SEO**：`layout.tsx` metadata 的 keywords 由 `HOT_ITEMS` 派生；sitemap / robots / manifest / opengraph-image 均为 App Router 文件约定。
- **SSR hydration**：`src/app/page.tsx` 用 `mounted` 状态先渲染骨架再挂载内容，规避 SSR hydration 不匹配；客户端含随机性 / 读 localStorage 的 UI 需沿用此模式。
- **图片**：`next.config.ts` 中 `images.unoptimized: true`（禁用 Next 图片优化），外链封面图直接原图输出。
