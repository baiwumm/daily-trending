# SEO 优化计划（临时文档，完成后删除）

> **⚠️ 这是临时计划文档。四个阶段全部完成并验证后，删除本文件并提交（见「完成清单」）。
> 执行会话无需其他上下文——本文档自包含：背景、审计结论、执行规格、验收标准都在里面。**

---

## 0. 背景与硬性约束

### 项目状态（2026-11-23）

- **分支拓扑**：`main` 冻结于 `587ab16`（还原点 tag `backup/main-587ab16`，勿动）；生产环境跑 `feat/cf-quota-optimization`，**push = 自动部署**
- **本地未推送提交**：`97b4179`（虎扑新版页面适配，等用户验证）——本计划推进时若需 push，会把它一并推上线，**推送前向用户说明**
- **架构现状**：47 个榜单 API 全部在 Edge Functions（`edge-functions/api/*.js`，共享库 `edge-functions/_lib.js`，KV 缓存）；页面 SSR 跑 Cloud Functions 但被 CDN 缓存（实测 Age≈3 天）

### 硬性约束（不可违反）

1. **不得增加 EdgeOne 免费额度消耗**：只允许构建期静态能力（`generateStaticParams`/`force-static`/静态注入 JSON-LD/`public/` 静态文件）。**禁止任何请求期数据获取的新页面或新 API**（落地页不含实时数据，实时数据仍走既有 EF 路由）
2. **不新增依赖**（AGENTS.md：新增依赖需克制，本项目历史零新增）
3. 遵守 AGENTS.md 与 docs/development.md 全部规范（见 §6）

---

## 1. 审计结论摘要（问题清单，按严重程度）

证据来自本地代码通读 + 线上实抓（2026-11-23）。

| # | 严重度 | 问题 | 证据 | 对应阶段 |
|---|---|---|---|---|
| 1 | **P0** | 无可收录内容页面：全站唯一 URL（首页）且 SSR 只有骨架 | `sitemap.xml` 仅 1 条 URL；首页 SSR body 去标签后仅「今日热榜看看全网都在聊什么」13 字；`page.tsx` 是 client component，47 平台数据全靠浏览器拉 | 阶段二 |
| 2 | **P0** | 零结构化数据 | 全站 grep `ld+json` = 0 | 阶段一/二 |
| 3 | P1 | 缺失 canonical | 首页 canonical = 0；且 EdgeOne 对 query 变体/RSC 请求生成独立缓存对象（多 URL 形态客观存在） | 阶段一 |
| 4 | P1 | meta description 过短（9 字符）且与 title 自重复 | `<meta name="description" content="看看全网都在聊什么"/>` | 阶段一 |
| 5 | P1 | title 与 og:title 不一致，title 缺品类词 | title「看看全网都在聊什么 - 今日热榜」vs og:title「今日热榜」；「热榜/聚合」未入 title | 阶段一 |
| 6 | P2 | 无 AI 可发现层 | 无 `llms.txt` | 阶段三 |
| 7 | P2 | keywords meta 堆砌 47 个平台名（约 500 字符） | `layout.tsx` 的 keywords 由 HOT_ITEMS 全量拼接 | 阶段一 |
| 8 | P2 | robots.txt 无意义 disallow `/private/`（路径不存在） | `src/app/robots.ts` | 阶段一 |
| 9 | P3 | sitemap `lastModified: new Date()` 每次构建都变（lastmod 噪声） | `src/app/sitemap.ts` | 阶段一/二 |
| 10 | P3 | E-E-A-T 偏弱：无 About/联系方式页、内容无更新时间声明 | 页脚有备案号+作者链接（已有好信号） | 阶段二（落地页含更新机制说明）+ 长期 |

**战略判断**：热榜站的核心搜索意图是「平台名+热榜」（微博热榜/知乎热榜/B站热榜…），当前站点对这些词零覆盖——阶段二是唯一能带来新流量入口的改动，是本次优化的重点。

---

## 2. 阶段一：元数据与结构化数据（约 0.5 天）

### 2.1 `src/app/layout.tsx` 元数据重写

```
title:        今日热榜 - 全网热榜聚合平台 | 微博·知乎·B站·抖音实时热点
description:  今日热榜聚合微博、知乎、B 站、抖音、GitHub 等 47 个全网热门平台实时热榜，按分类浏览、支持全局搜索与排名趋势标记，看看全网都在聊什么。
```

- `alternates: { canonical: '/' }`（metadataBase 已配 `new URL(APP_URL)`，无需重复）
- `keywords` 收敛为 5–8 个核心词（如：今日热榜、全网热榜、微博热榜、知乎热榜、B站热榜、抖音热榜、热榜聚合），**不再拼接 47 个平台名**
- `openGraph.title` 与 `twitter.title` 统一为新 title（消除 og:title 不一致）
- description 用环境变量时保持 `NEXT_PUBLIC_APP_DESC` 兜底逻辑不变，只改默认值来源——注意 `.env` 里 `NEXT_PUBLIC_APP_DESC = '看看全网都在聊什么'` 会覆盖代码默认值，**需同步更新 `.env`** 或调整优先级（改 `.env` 即可，代码保持 env 优先）

### 2.2 首页 JSON-LD（新增，构建期静态）

新增 `src/components/JsonLd.tsx`（或直接在 `page.tsx`/`layout.tsx` 内联 `<script type="application/ld+json" dangerouslySetInnerHTML>`），内容为 `@graph`：

```jsonc
[
  {
    "@type": "WebSite",
    "name": "今日热榜",
    "url": "https://hot.baiwumm.com",
    "inLanguage": "zh-CN",
    "description": "<同 meta description>"
  },
  {
    "@type": "Organization",
    "name": "今日热榜",
    "url": "https://hot.baiwumm.com",
    "logo": "https://hot.baiwumm.com/logo.png",
    "sameAs": ["https://github.com/baiwumm/daily-trending"]
  },
  {
    "@type": "ItemList",
    "name": "热榜平台列表",
    "numberOfItems": 47,
    "itemListElement": [
      // 构建期从 HOT_ITEMS 生成：{ "@type": "ListItem", "position": 1, "name": "微博热搜榜", "url": "https://hot.baiwumm.com/hot/weibo" }
      // 注意：url 指向阶段二的落地页；阶段一先落地时可暂时省略 url 字段或仅放 name
    ]
  }
]
```

要求：数据从 `HOT_ITEMS`（`src/config/hot-list.tsx`，唯一数据源）构建期生成，**不请求任何外部数据**；JSON 序列化注意转义（用 `JSON.stringify`）。

### 2.3 `src/app/robots.ts` 与 `src/app/sitemap.ts`

- robots：删除 `disallow: '/private/'`（无意义路径）；保留 `sitemap` 引用；**保持 allow-all**（ai-seo 规范：勿盲目屏蔽 AI 发现类爬虫，OAI-SearchBot/PerplexityBot/Claude-SearchBot 需可达）
- sitemap：`lastModified` 从 `new Date()` 改为构建期常量（如 `process.env.NEXT_PUBLIC_BUILD_TIME` 或模块级 `new Date()` 在构建时求值一次——Next 的 metadata route 在构建期为静态路由时天然只求值一次，确认产物为 `○ Static` 即可；若仍动态则显式加 `export const dynamic = 'force-static'`）

---

## 3. 阶段二：47 个平台落地页（约 2–3 天，核心改动）

### 3.1 路由设计

- 路径：`src/app/hot/[platform]/page.tsx`（动态路由 + 构建期枚举）
- `generateStaticParams()`：从 `HOT_ITEMS.items` 取全部 `value`（47 个）
- `export const dynamic = 'force-static'` + `export const dynamicParams = false`
- **落地页零请求期数据**：页面只含静态内容（平台介绍、FAQ、相关平台内链、CTA）。**明确禁止**在落地页里 fetch 实时榜单（会烧 CF 内存时长/EF 执行）
- 构建产物校验：`pnpm build` 输出中 `/hot/[platform]` 必须是 `○ (Static)`，不能是 `ƒ (Dynamic)`

### 3.2 内容数据源（新增 `src/content/platforms.ts`）

每个平台一条：`{ intro: string; faqs: Array<{ q: string; a: string }> }`。要求：

- intro 200–400 字：平台定位 + 榜单说明 + 数据更新机制（「本页为平台介绍，实时热榜请点击下方按钮查看，数据约每 30 分钟自动更新」）
- FAQs 3–5 条：围绕真实搜索意图（「微博热榜多久更新一次」「XX热榜怎么看」），答案 40–80 字/条
- **防 thin content**：47 页每页必须有实质差异（不同平台不同内容），照抄模板属违规
- 文档附 4 个完整范例（见 §3.6），其余 43 个按范例风格生成

### 3.3 页面结构

```
<Header/>
<main>
  <Breadcrumb> 首页 / <分类名> / <平台名>          <!-- 同时输出 BreadcrumbList JSON-LD -->
  <h1>微博热搜榜 - 今日热榜</h1>                    <!-- title 模式：${label}${tip} - 今日热榜 -->
  <p class="intro">{intro}</p>
  <section> <h2>常见问题</h2> <FAQ 问答列表> </section>   <!-- 语义 FAQPage 标记（注意：Google 2026-05 已退役 FAQ 富结果，只做语义不追求富结果） -->
  <section> <h2>同类平台</h2> <同分类其他平台内链卡片/> </section>
  <CTA> 查看实时热榜 → /#card-{value} </CTA>        <!-- 跳首页锚点，需配合 3.5 的 HotCard id -->
</main>
<Footer/>
```

- 元数据：`generateMetadata` 生成 title（上示模式）/description（`${label}${tip}实时热度排行。今日热榜聚合…`）
- 内链：同分类平台（从 `CATEGORY_GROUPS` 构建期取）+ 返回首页；防孤岛页面
- 样式：复用 HeroUI 组件，与全站一致；暗色模式兼容（用 theme 变量，勿写死颜色）

### 3.4 每页 JSON-LD

`@graph`：`WebPage`（name/description/inLanguage）+ `BreadcrumbList`（首页→分类→平台）+ `ItemList`（该平台条目名静态列表，**非实时数据**）+ `FAQPage`（可见 FAQ 的语义镜像）。

### 3.5 配套小改动

- `src/components/HotCard/index.tsx`：Card 根元素加 `id={`card-${value}`}`（一行，支撑落地页 CTA 锚点跳转，同时提升深链能力）
- `src/app/sitemap.ts`：追加 47 个 `/hot/<value>` URL（从 HOT_ITEMS 构建期生成）

### 3.6 内容范例（4 个，执行时照此风格补全 43 个）

```ts
// src/content/platforms.ts
export const PLATFORM_CONTENT: Record<string, { intro: string; faqs: Array<{ q: string; a: string }> }> = {
  weibo: {
    intro:
      '微博热搜榜是微博平台实时热度最高的话题聚合，由今日热榜每约 30 分钟自动抓取一次。榜单按热度值排序，涵盖社会热点、娱乐八卦、科技财经等各类话题，点击标题可跳转微博搜索查看原帖。本页为平台介绍页，实时榜单请点击下方按钮查看。',
    faqs: [
      { q: '微博热榜多久更新一次？', a: '今日热榜单约每 30 分钟自动抓取一次微博热搜，也可点击首页卡片右上角刷新按钮立即获取最新数据。' },
      { q: '微博热榜的排名依据是什么？', a: '排名依据微博官方热搜的热度值，数值越高排名越靠前，爆/沸/新等标签为微博官方标记。' },
      { q: '为什么有的话题点击后没有内容？', a: '个别话题可能已被发布者删除或限流，可刷新页面获取最新榜单后重试。' },
    ],
  },
  zhihu: {
    intro:
      '知乎热榜聚合知乎平台当前热度最高的问题与回答，由今日热榜每约 30 分钟自动抓取。榜单覆盖科技、商业、时事、生活等各领域热议问题，点击标题可跳转知乎查看完整讨论。本页为平台介绍页，实时榜单请点击下方按钮查看。',
    faqs: [
      { q: '知乎热榜多久更新一次？', a: '今日热榜单约每 30 分钟自动抓取一次知乎热榜，首页卡片支持手动刷新立即获取最新数据。' },
      { q: '知乎热榜的热度值是怎么计算的？', a: '热度值来自知乎官方对问题讨论量的综合评估，今日热榜按原始数值展示，未做换算。' },
    ],
  },
  bilibili: {
    intro:
      'B 站热门榜聚合哔哩哔哩全站综合热度最高的视频，由今日热榜每约 30 分钟自动抓取。榜单覆盖动画、游戏、知识、生活等各分区热门内容，点击标题可跳转 B 站播放。本页为平台介绍页，实时榜单请点击下方按钮查看。',
    faqs: [
      { q: 'B 站热门榜多久更新一次？', a: '今日热榜单约每 30 分钟自动抓取一次，首页卡片可手动刷新立即获取最新排名。' },
      { q: '榜单里的热度值代表什么？', a: '热度值为 B 站官方统计的播放量相关数据，排名越靠前代表当前越热门。' },
    ],
  },
  'github-trending': {
    intro:
      'GitHub Trending 聚合 GitHub 上当前star增长最快的开源仓库，由今日热榜每约 30 分钟自动抓取。榜单覆盖各类编程语言与领域的活跃项目，是开发者发现热门开源项目的便捷入口。本页为平台介绍页，实时榜单请点击下方按钮查看。',
    faqs: [
      { q: 'GitHub Trending 多久更新一次？', a: '今日热榜单约每 30 分钟自动抓取一次，首页卡片可手动刷新立即获取最新榜单。' },
      { q: '榜单上的 star 数为什么是缩写？', a: '为保持排版紧凑，star 数超过一千会以 K/M 缩写展示，点击进入仓库可查看精确数值。' },
    ],
  },
}
```

---

## 4. 阶段三：AI 可发现层（约 0.5 天）

新增 `public/llms.txt`（静态文件，零运行时成本），格式遵循 llmstxt.org：

```markdown
# 今日热榜

> 全网热榜聚合平台：聚合微博、知乎、B 站、抖音、GitHub 等 47 个热门平台实时热榜，按分类浏览，支持全局搜索与排名趋势。数据约每 30 分钟自动更新，支持手动刷新。

- 站点: https://hot.baiwumm.com
- 源码: https://github.com/baiwumm/daily-trending
- 语言: 简体中文

## 页面

- [首页·全部热榜](https://hot.baiwumm.com/)
- [微博热搜榜](https://hot.baiwumm.com/hot/weibo)
- ...（47 个落地页全量列出，从 HOT_ITEMS 生成）
```

 robots.txt 维持 allow-all（不屏蔽任何 AI 爬虫——发现类爬虫如 OAI-SearchBot/PerplexityBot/Claude-SearchBot 必须可达）。

---

## 5. 阶段四：运营动作（非代码，用户执行）

- [ ] 百度搜索资源平台提交 sitemap（已有验证 codeva-kYzuuOyYCZ，确认所有权即可提交）
- [ ] Google Search Console 提交 sitemap + 开启「Search generative AI features」设置
- [ ] Bing Webmaster Tools 提交（同时喂 ChatGPT/Copilot 的 Bing 索引）
- [ ] 上线两周后：Rich Results Test 抽查首页+落地页 JSON-LD；每月做一次 ai-seo DIY 抽检（20 个核心 query × ChatGPT/Perplexity/Google，各跑 3–5 次记引用率）

---

## 6. 执行规范（AGENTS.md 摘要，必须遵守）

- **包管理**：仅 pnpm；**提交前自查** `pnpm lint`（0 error）+ `pnpm build`（含类型检查）——本项目无 CI 门禁
- **提交**：Conventional Commits + 中文描述；推送到 `feat/cf-quota-optimization`（push = 部署，**推送前向用户说明，特别是会把未推送的 97b4179 一并推上线**）
- **代码风格**：Prettier 单引号/无分号/printWidth 120；中文 JSDoc，注释说明「为什么」而非「做什么」
- **数据源**：`hotItemsConfig`（`src/config/hot-list.tsx`）是平台列表唯一数据源，落地页/sitemap/JSON-LD 全部从它构建期派生，**不得硬编码第二份平台清单**
- **UI**：HeroUI v3（勿凭 v2 记忆写 API）；React 19 规则（禁 forwardRef）
- **额度红线**：任何新代码不得引入请求期数据获取；落地页构建产物必须是 `○ Static`

---

## 7. 验证清单（每个阶段完成后逐项打勾）

### 阶段一

- [ ] `pnpm lint` 0 error / `pnpm build` 通过
- [ ] 本地 `npx next start -p 3100`，curl 首页：title/description/canonical/og:title 符合 §2.1；`ld+json` 存在且 JSON 合法（node -e JSON.parse 验证）
- [ ] `curl /robots.txt` 无 `/private/`；`/sitemap.xml` lastmod 稳定（两次构建不变）
- [ ] 线上部署后：view-source 复核上述项

### 阶段二

- [ ] `pnpm build` 输出 `/hot/[platform]` 为 `○ (Static)`（47 页）
- [ ] 本地抽查 5 个落地页（weibo/zhihu/bilibili/github-trending + 1 个随机）：HTTP 200、含 h1、含 JSON-LD 且合法、含 FAQ、含同分类内链、无 fetch 调用
- [ ] `/sitemap.xml` 含 48 条 URL
- [ ] 落地页点击 CTA 跳转到首页对应卡片（HotCard id 生效）
- [ ] 暗色/亮色主题下落地页无视觉断裂
- [ ] 部署后：curl 线上落地页确认 `EO-Cache-Status` 命中/静态服务；**监控套餐消耗页 CF/EF 计数无异常上涨**（落地页应为零函数执行）

### 阶段三

- [ ] `public/llms.txt` 线上可访问且内容完整（47 页链接）
- [ ] robots.txt 仍 allow-all

---

## 8. 完成清单（全部完成后才可删除本文档）

- [ ] 四个阶段全部完成且 §7 验证清单全绿
- [ ] 已向用户汇报各阶段结果
- [ ] **删除 `docs/seo-optimization-plan.md`**（git rm），提交一条 `docs: 移除 SEO 优化临时计划文档（已完成）`
- [ ] （可选）若执行中沉淀了对架构的长期变更（如落地页机制），同步更新 `docs/architecture.md`——注意是更新既有文档而非新建

---

*创建于 2026-11-23，审计基于当日线上实抓与代码通读。*
