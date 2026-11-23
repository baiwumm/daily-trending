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
│   └── api/<platform>/route.ts   # 尚未迁移 Edge Functions 的榜单 API（第二批 6 个 HTML 解析路由；数量以 hotItemsConfig 与 edge-functions/api 为准）
├── components/             # PascalCase 目录 + index.tsx；核心：HotCard（含 HotListVirtual）/ HotSettings / HotSearch / Sortable，其余为布局与功能组件
├── config/
│   ├── hot-list.tsx        # HOT_ITEMS：全部榜单配置唯一数据源（分类/平台数量以此为准）
│   └── response.ts         # 响应码 + 缓存窗口（API_CACHE_SECONDS 服务端 / CLIENT_COOLDOWN_SECONDS 客户端冷却）
├── hooks/                  # use-request.ts（自研 useRequest）、use-is-mobile 等
├── lib/
│   ├── request.ts          # 上游请求公共层（Next 版路由用）：fetchJson / fetchText / fetchBuffer（统一 UA、15s 超时、revalidate）
│   ├── author.ts           # 作者身份单一来源：仓库地址取 GitHub 用户名，bio/头像走 GitHub API（缓存一天）
│   ├── response.ts         # successResponse / errorResponse（Next 版路由用：统一 IResponse + CDN 缓存头 + 出口数据消毒）
│   ├── client-cache.ts     # 客户端门控缓存（localStorage 按源缓存，服务端窗口内重复访问零请求）
│   ├── utils.ts            # fromNow / formatNumber 等纯工具
│   └── weread.ts / miyoushe.ts 等  # 特殊平台算法（Next 版路由用；Edge Functions 版在 edge-functions/_lib.js 有对等实现）
├── store/useAppStore.ts    # zustand 全局状态（更新时间/心跳/显隐/排序/常看收藏/趋势快照，persist）
├── styles/fonts.css        # Maple Mono CN 自托管 @font-face（字体文件在 public/fonts/）
└── types/index.ts          # HotListConfig / HotListItem / IResponse 共享类型
edge-functions/             # Edge Functions（V8 运行时）：API 主力运行时
├── _lib.js                 # 共享库：请求封装（UA/超时/GBK/POST）/ IResponse 契约 / withCache 门控 / handleHotList / 纯 JS MD5 / 米游社与 CSDN 抓取
└── api/<platform>.js       # 榜单函数路由（文件名 = 榜单 value，映射到 /api/<platform>）
scripts/                    # Node 工具脚本（release-it 钩子、健康巡检、gen-ef-routes 路由生成器、verify-ef-routes 端到端验证）
.agents/skills/             # Agent Skills（见根 AGENTS.md「AI Agent 代码生成规范」）
.github/workflows/          # CI：Release 一键发版（手动触发）+ 上游健康巡检（定时）
.heroui-docs/               # HeroUI 本地文档（工具生成，gitignore）
docs/                       # 项目文档分册（本目录）
```

## 数据流（单向）

```text
上游平台接口
  → edge-functions/api/<value>.js      （fetchUpstreamJson/Text：统一 Chrome UA + 15s 超时；Node 版路由仍走 src/lib/request.ts）
  → 映射为 HotListItem[]               （id/title/url/mobileUrl/hot/desc…）
  → handleHotList → withCache 门控     （KV → Cache API → isolate 内存；每源每窗口只回源一次）
  → successResponse                     （统一 IResponse + CDN 头 s-maxage=API_CACHE_SECONDS + X-Cache 标记）
  → 客户端 useRequest → HotCard        （localStorage 门控命中即零请求；useInView 进入视口才请求；手动刷新 ?t= 绕过全部缓存层）
```

## 架构要点

- **新增一个榜单 = 两步**：① `src/config/hot-list.tsx` 的 `hotItemsConfig` 在对应分类的 `children` 里加一行；② 新建 `src/app/api/<value>/route.ts`。完整步骤与上游抓取规范见 [add-hotlist.md](./add-hotlist.md)。
- **缓存分层**：客户端门控（localStorage，`src/lib/client-cache.ts`，TTL = 服务端窗口）→ 函数内缓存（Edge Functions 的 `withCache`：KV → Cache API → isolate 内存）→ CDN `s-maxage`，窗口同取 `API_CACHE_SECONDS`（`src/config/response.ts`，代码默认 300 秒、仓库 `.env` 设 1800 秒，可用 `NEXT_PUBLIC_HOT_CACHE_SECONDS` 覆盖）；客户端刷新冷却另取 `CLIENT_COOLDOWN_SECONDS`（固定 300 秒），只管「多久能再手动强刷」。手动强刷走 `?t=` 绕过全部三层缓存，始终拿最新数据。
- **运行时分布（2026-11-23 起）**：榜单 API 主力运行时是 **Edge Functions**（`edge-functions/api/*.js`，V8，按 CPU-ms 计费且 I/O 等待不计入）——41/47 已迁移；`src/app/api/*/route.ts` 只剩第二批 6 个 HTML 解析路由（douban-movie/gp/jjwxc/smzdm/yjwujian/github-trending，仍走 Cloud Functions）。迁移背景：Cloud Functions 按「内存 × 墙钟时长」计费（免费版 5 万 GB·s/月，2026-12-12 起按套餐严格执行），抓取等待全额计费；页面 SSR 同样跑在 CF 上但被 CDN 长期缓存，占比极小。**新增榜单默认写 Edge Functions 路由**（模板见 `scripts/gen-ef-routes.mjs` 与既有 `edge-functions/api/*.js`）。
- **响应契约**：HTTP 层恒为 200，业务结果以 body 的 `code` 区分；`IResponse { code, msg, data?, timestamp }` 固定，成功 `code=200`（按服务端窗口缓存），失败 `code=500` 与空数据置 60s 短缓存（故障期保 CDN 命中、恢复后快速自愈）。前端依赖 `timestamp` 显示更新时间，勿改语义。Edge Functions 侧的同构实现在 `edge-functions/_lib.js`（`successResponse`/`errorResponse`/`sanitizeHotList`），缓存命中时 `timestamp` 回传数据真实抓取时间。
- **不要新建 `edgeone.json`**（2026-11-16 实测）：哪怕只配 `headers` 收敛 `Vary`，Makers 也会切换 `/api/*` 的缓存策略——普通 query 变体（`?foo=1`）与带 `RSC: 1` 的请求从「独立对象可缓存」变为完全不缓存，每次请求都穿透回源，配额消耗不降反升；且 `Vary` 覆写不影响边缘缓存键控，属表面收益。
- **客户端状态**：`useAppStore`（zustand persist）。改持久化结构必须递增 `version` 并补 `migrate`；`now/tick` 心跳是派生基准，不持久化。相对时间与刷新冷却共用同一时钟保证自洽。
- **动画约束**：首页卡片网格的 FLIP 重排动画由**子级** `motion.div` 的 `layout` 承担；父级 grid 容器只承载 variants，**不要开启 `layout`**——父级变换补偿会在网格重排时叠加错位（见 `page.tsx` 注释）。
- **SEO**：`layout.tsx` metadata 的 keywords 由 `HOT_ITEMS` 派生；sitemap / robots / manifest / opengraph-image 均为 App Router 文件约定。
- **SSR hydration**：`src/app/page.tsx` 用 `mounted` 状态先渲染骨架再挂载内容，规避 SSR hydration 不匹配；客户端含随机性 / 读 localStorage 的 UI 需沿用此模式。
- **图片**：`next.config.ts` 中 `images.unoptimized: true`（禁用 Next 图片优化），外链封面图直接原图输出。
