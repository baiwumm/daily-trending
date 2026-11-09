# Changelog

## [3.13.3](https://github.com/baiwumm/daily-trending/compare/v3.13.2...v3.13.3) (2026-11-09)

### 🎫 Chores | 其他更新

* **deps:** 升级 motion 至 14.10.1、release-it 至 21.1.2 ([8599c53](https://github.com/baiwumm/daily-trending/commit/8599c5383154a16d2bfea5fe44e2d203780aa7b3))

### 📝 Documentation | 文档

* 同步 lib 目录说明（fetchBuffer / author） ([5c01aa4](https://github.com/baiwumm/daily-trending/commit/5c01aa4241fe8700dc9d31223680689f857e5aa5))

### ♻ Code Refactoring | 代码重构

* Footer 改为服务端组件并将三列断点移至 xl ([eeec095](https://github.com/baiwumm/daily-trending/commit/eeec0953365218a496f4cded3e3107a3a84f9003))
* 作者信息改为从 package.json 与 GitHub 账户自动获取 ([9dd3113](https://github.com/baiwumm/daily-trending/commit/9dd311377ff588c10fdc29ea18788069016067eb))

## [3.13.2](https://github.com/baiwumm/daily-trending/compare/v3.13.1...v3.13.2) (2026-11-09)

### 🐛 Bug Fixes | Bug 修复

* 429 限流响应不再自动重试，避免前端重试放大请求 ([f1c2062](https://github.com/baiwumm/daily-trending/commit/f1c206207d9552c9a4bb789ce947ae7e824d5b99))

### 🎫 Chores | 其他更新

* **deps:** 升级 next 至 16.4.5 ([#42](https://github.com/baiwumm/daily-trending/issues/42)) ([037c483](https://github.com/baiwumm/daily-trending/commit/037c4837e715dcbf07e27479b3b447401f765832))
* 删除 pnpm-workspace.yaml 已失效的配置条目 ([130d44f](https://github.com/baiwumm/daily-trending/commit/130d44fe870751b6400fffb7ce31857f2a521eb7))
* 批量升级依赖到最新兼容版本 ([f66f4ee](https://github.com/baiwumm/daily-trending/commit/f66f4ee54105dfa97684dc73d5e8766ad3227a03))
* 清理 Vercel 遗留配置与埋点，文档同步 EdgeOne Makers 部署 ([2beaf3b](https://github.com/baiwumm/daily-trending/commit/2beaf3b2ed7520fb46a86dce8d2e3b5e6992c189))

### 📝 Documentation | 文档

* AGENTS.md 硬性规则改正面表述，修复悬空指针与「三层同源」术语漂移 ([733e383](https://github.com/baiwumm/daily-trending/commit/733e383e9ca8b5c603d83e4c38c0ff25877a8035))
* AGENTS.md 精简为入口索引，开发规范拆分至 docs/ 任务分册 ([eb1f35b](https://github.com/baiwumm/daily-trending/commit/eb1f35b110fb13d67fc95e9dc4605a3fd5b1810c))
* 精简 README 宣传片字幕与开放 API 冗余段落 ([520344c](https://github.com/baiwumm/daily-trending/commit/520344c589aeac6cf3cbee2f54da3758d9c92f96))
* 规范 README 与 docs 文档体系，修正发版版本规则等过时表述 ([b03b7dd](https://github.com/baiwumm/daily-trending/commit/b03b7dd5d62569fa8245c03d4a628871fb736afa))

### ♻ Code Refactoring | 代码重构

* 修正 hotLableColor 变量拼写（Lable → Label） ([df5b3ed](https://github.com/baiwumm/daily-trending/commit/df5b3ed5fb052bce8de863946b7bb928a3dcb815))

### 🔧 Continuous Integration | CI 配置

* GitHub Actions 升级到 Node 24 运行时版本 ([5023868](https://github.com/baiwumm/daily-trending/commit/5023868a42c63a6fb2a551f7448a4491c77d68fa))

## [3.13.1](https://github.com/baiwumm/daily-trending/compare/v3.13.0...v3.13.1) (2026-10-10)

### 🐛 Bug Fixes | Bug 修复

* **HotSearch:** 移出搜索列表时清除 hover 高亮，activeIndex 置 -1 表示无激活项 ([69a8916](https://github.com/baiwumm/daily-trending/commit/69a89162c26e3d8bc8b85c126142026ebb8ddeb2))
* **HotSearch:** 超长标题按关键词锚定切片展示，保证命中词必然可见 ([2320b0b](https://github.com/baiwumm/daily-trending/commit/2320b0bbc8454a2644c9dc6c40de9d12dcd092db))
* **Sortable:** 拖拽投影改用 drop-shadow，贴合圆角轮廓消除方形底色 ([682e8d2](https://github.com/baiwumm/daily-trending/commit/682e8d22a9e173e7a366c56069a489a16ab67299))

### 💄 Styles | 风格

* **HotSettings:** 分类显隐计数接入 NumberFlow 数字滚动动画 ([59064f3](https://github.com/baiwumm/daily-trending/commit/59064f392aab230070e300b79e983373e1c3664e))
* **HotSettings:** 常看条目补 layout FLIP 动画，收藏/移除时与分类块一致平滑滑动 ([817f8c4](https://github.com/baiwumm/daily-trending/commit/817f8c439bf1e7b25c10839b6b9697a31d643a8b))
* **HotSettings:** 常看计数接入 NumberFlow，分类计数固定分母退回纯文本 ([fe24533](https://github.com/baiwumm/daily-trending/commit/fe245335805ef48755ffb1c91a9feb5249ede9bc))
* **HotSettings:** 平台行星标按钮移至勾选框旁成组右对齐 ([0a12eab](https://github.com/baiwumm/daily-trending/commit/0a12eab9cac000753f283b6154d3ed89c637f7f4))
* 修改网页标题 ([06166ab](https://github.com/baiwumm/daily-trending/commit/06166ab927134f9ea627e936c2037b92e29c58a7))
* 样式微调 ([930957e](https://github.com/baiwumm/daily-trending/commit/930957e9405b4e47b044815cee4452dd27e144d8))

## [3.13.0](https://github.com/baiwumm/daily-trending/compare/v3.12.0...v3.13.0) (2026-10-10)

### ✨ Features | 新功能

* 收藏策略改为「收藏即从原分类移入常看」，设置面板支持行内星标收藏 ([3328ea8](https://github.com/baiwumm/daily-trending/commit/3328ea8fdef7fabb7d8923ed4498d8cdd2689837))

### 🐛 Bug Fixes | Bug 修复

* **components:** 平台图标改用原生 img，根除非正方形 SVG 的 next/image 尺寸警告 ([8db38ae](https://github.com/baiwumm/daily-trending/commit/8db38aeaf603957780a5359c8ecaf05d084ec3cc))
* **components:** 弹窗滚动容器加 overscroll-contain，阻断滚到边界后的滚动链穿透 ([f631879](https://github.com/baiwumm/daily-trending/commit/f631879e894d69fea5cc7f43944016430e02d6dd))
* **HotCard:** 请求未触发的卡片保持骨架态，不再误显加载失败文案 ([af91838](https://github.com/baiwumm/daily-trending/commit/af91838c2b43b0c699cc8c01aef45097f2047924))
* **HotSearch:** scrollIntoView 仅跟随键盘导航，消除 hover 激活与滚动的自激励跳动 ([253c2e8](https://github.com/baiwumm/daily-trending/commit/253c2e8a59b9ba088a9710b4d91e089fefd80e4e))
* **lib:** successResponse 出口集中消毒，拦截上游异常条目保护客户端渲染 ([060cdfd](https://github.com/baiwumm/daily-trending/commit/060cdfd5c5e712bd924e9bc97a46ceb5dd9327e4))

### 🎫 Chores | 其他更新

* 删除 README 改用内联播放器后不再引用的 video-poster.png ([b820cc0](https://github.com/baiwumm/daily-trending/commit/b820cc045ab5247f95a76d0b7df7d69ca43bb9fe))
* 删除预览区改用宣传片后不再引用的 dark.png ([3d4d6c9](https://github.com/baiwumm/daily-trending/commit/3d4d6c91e37b5dea40be84dacdbacd7eb2a5b8da))

### 📝 Documentation | 文档

* AGENTS.md 去掉组件数量硬编码 ([5829c22](https://github.com/baiwumm/daily-trending/commit/5829c224d122bcd2df0f619885f1d5800f0857b7))
* README 宣传片改用 GitHub 原生内联播放器 ([27dc7fd](https://github.com/baiwumm/daily-trending/commit/27dc7fd122e2fc4d920916d5ba4a257122eaeda7)), closes [#20](https://github.com/baiwumm/daily-trending/issues/20)

### 💄 Styles | 风格

* **HotSearch:** 搜索列表恢复显示原生滚动条，保留滚动阴影 ([74ec854](https://github.com/baiwumm/daily-trending/commit/74ec8543d9f1478548d61751284e4f4a62fdd418))
* **HotSearch:** 搜索结果列表改用 ScrollShadow，阴影提示可滚动方向 ([a10e78f](https://github.com/baiwumm/daily-trending/commit/a10e78fb43416f592aa0e9c7db4bb5e4f10c2084))

### ♻ Code Refactoring | 代码重构

* enums 目录更名 config，主配置文件改名 hot-list.tsx ([4a6b4c3](https://github.com/baiwumm/daily-trending/commit/4a6b4c36665f991cda5c25a730db4dacf69573ba))
* **HotCard:** RowComponent 改名 HotListRow，名称表意化且与 HotListVirtual 风格一致 ([1638191](https://github.com/baiwumm/daily-trending/commit/16381914856c5de90d45506e2c0312e41f66f27f))
* **page:** 挂载前整页骨架与分类分节布局同构，消除挂载跳动 ([042ddd7](https://github.com/baiwumm/daily-trending/commit/042ddd75354762ea1e4baa31675bb82e03742f60))

### ⚡ Performance Improvements | 性能优化

* **HotSearch:** 搜索索引写入 sessionStorage 会话缓存，窗口内免重复拉取 ([39035ea](https://github.com/baiwumm/daily-trending/commit/39035ea17cd819b29a07442b6ed7c14ab7857d11))

## [3.12.0](https://github.com/baiwumm/daily-trending/compare/v3.11.0...v3.12.0) (2026-10-09)

### ✨ Features | 新功能

* **HotSettings:** 使用Surface组件替代motion.section提升UI表现 ([9aa98ee](https://github.com/baiwumm/daily-trending/commit/9aa98ee70316e542ba884cf648ec4f916d7f067d))
* 平台收藏常看功能——星标跨分类置顶聚合，支持设置内排序管理与搜索跳转定位 ([9da123a](https://github.com/baiwumm/daily-trending/commit/9da123a4ffb95be7f5fee24648de81ced5bc20d5))
* 新增新浪新闻/同花顺/什么值得买/Steam 四个榜单源，调整分类默认排序 ([adf2c84](https://github.com/baiwumm/daily-trending/commit/adf2c84ad339e29da0389e02d0142a6cd6047b0d))
* 新增游戏分类，接入英雄联盟/和平精英/永劫无间/原神/绝区零/明日方舟 ([a4dce1a](https://github.com/baiwumm/daily-trending/commit/a4dce1a735e825b9250d1256b56c7595602ab529))
* 新增财经分类与华尔街见闻/金十数据/QQ音乐/少数派/AcFun 五个榜单源 ([db4dd0e](https://github.com/baiwumm/daily-trending/commit/db4dd0e6994d1619887a4d953f27fc9b3e5d2b44))
* 财经接入财联社/东方财富，阅读接入豆瓣读书/晋江文学城，调整分类默认排序 ([87ccb8e](https://github.com/baiwumm/daily-trending/commit/87ccb8e518c998ba64f37b1180f3ee096a4d5af1))

### 🐛 Bug Fixes | Bug 修复

* **CategoryIndicator:** 修复分类指示器中tooltip触发器的包装问题 ([37af999](https://github.com/baiwumm/daily-trending/commit/37af9994581e98ded65dd954af922bb86846a3d1))
* **HotSettings:** 常看空态提示文案同步星标新位置（底部刷新按钮旁） ([ef69cc5](https://github.com/baiwumm/daily-trending/commit/ef69cc50ead15c03fa7a9162dcfdddfacee2f8fc))
* 发版名称配置项笔误，releaseNameTemplate 为无效 key，改用 releaseName ([fd6ba49](https://github.com/baiwumm/daily-trending/commit/fd6ba499496ccb25f241e98fcb8f042113147e7d))
* 排名趋势标记降噪——平台标签去重、tip 型榜单不显示、基准时效与新条目占比熔断 ([34797f4](https://github.com/baiwumm/daily-trending/commit/34797f4c4c7fe6b961a675b265789aa95fe68093))
* 豆瓣电影端点更正拼写 douban-movic → douban-movie ([e325bba](https://github.com/baiwumm/daily-trending/commit/e325bbaf4c12f9b6233ef504f36b2f7bb0b2b469))

### 🎫 Chores | 其他更新

* 仓库更名 daily-trending，副标题改为「看看全网都在聊什么」 ([3032711](https://github.com/baiwumm/daily-trending/commit/3032711db17bde56e792e3d3a07875fdc2da0d7f))
* 升级 Next 16.4.0、HeroUI 3.2.6、theme-switch-animation 0.5.1 ([3653444](https://github.com/baiwumm/daily-trending/commit/3653444e5405537913c3873c83249063593c1a1a))

### 📝 Documentation | 文档

* README 响应示例的 msg 更正为实际值「请求成功」 ([60d2311](https://github.com/baiwumm/daily-trending/commit/60d23115473273168c309c75d68194235dbcfd22))
* README 宣传片改用可点击封面图 ([d4ea080](https://github.com/baiwumm/daily-trending/commit/d4ea080b4b091fc539f118ad817baad0a7e4ca9e))
* README 补齐特性列表与开放 API 章节 ([0d98fa8](https://github.com/baiwumm/daily-trending/commit/0d98fa80f901182de49adfc067e95d6687749a02))
* README 预览改用产品宣传片 ([f492bcb](https://github.com/baiwumm/daily-trending/commit/f492bcb168642742049401aff4aa0dcd877e5ee7))
* 去掉分类与榜单数量的硬编码表述，避免平台增减时文档漂移 ([9ee590e](https://github.com/baiwumm/daily-trending/commit/9ee590e6f1549b3eea47367385432e243742a634))
* 平台数量 44→48，特性列表补充常看收藏 ([d40ee2e](https://github.com/baiwumm/daily-trending/commit/d40ee2e936446a84bf171373f8707bd8eaef008e))
* 新增产品路线图；fix: Release 名称补 v 前缀与 tag 风格一致 ([24bb95e](https://github.com/baiwumm/daily-trending/commit/24bb95e100cf6b90db0f9c7d610b995b62068983))

### ♻ Code Refactoring | 代码重构

* **components:** 移除多余的Tooltip.Trigger包装组件 ([0e5855d](https://github.com/baiwumm/daily-trending/commit/0e5855df82b5f43c279e7e5bf859cdb96fee856e))

## [3.11.0](https://github.com/baiwumm/next-daily-hot/compare/v3.10.1...v3.11.0) (2026-10-07)

### ✨ Features | 新功能

* **theme-switch-animation:** 升级到 v0.2.0 版本 ([608fea4](https://github.com/baiwumm/next-daily-hot/commit/608fea4eda407ca53e6f830b8e86d805ec5b455d))
* 新增 Ctrl/⌘+K 全局搜索，支持跨卡片条目定位与标题高亮 ([dbb8bb7](https://github.com/baiwumm/next-daily-hot/commit/dbb8bb7a603a55c57b95592588ea23a191661494))
* 新增分类筛选视图，配置重构为按分类分组嵌套结构 ([48a1963](https://github.com/baiwumm/next-daily-hot/commit/48a19631b068cf6e33eff8cacfc49980238ad810))
* 热榜条目新增排名趋势标记（上升/下降/新上榜） ([107e61e](https://github.com/baiwumm/next-daily-hot/commit/107e61e39ef0cbf4c36265fe50c4ce007637ad46))
* 首页重构为分类分节布局，设置支持分类/平台两层排序与显隐 ([d1341e1](https://github.com/baiwumm/next-daily-hot/commit/d1341e1fe20ada053e7620a47c13f7aeee6a7353))

### 🐛 Bug Fixes | Bug 修复

* **dongchedi:** 热搜榜已下线登录墙，数据源切换为首页今日要闻 ([d86e193](https://github.com/baiwumm/next-daily-hot/commit/d86e193a8cd696cdfb5d5eae5d47b1c133962da9))
* **health-check:** 分批限流加失败重试，消除并发突发触发上游风控的误报 ([7f0f690](https://github.com/baiwumm/next-daily-hot/commit/7f0f690db737713e9d541afad130f30cce6df610))

### 🎫 Chores | 其他更新

* 历史 tag 迁移 v 前缀，修正 CHANGELOG 链接 ([7b8fc51](https://github.com/baiwumm/next-daily-hot/commit/7b8fc51c14c010dcc5bd6e375cc8439e345f0aa5))

### 🔧 Continuous Integration | CI 配置

* 升级 theme-switch-animation 到 0.4.0 版本 ([b405263](https://github.com/baiwumm/next-daily-hot/commit/b405263129c6dace1d6a154d8c0e854d26ff6a48))
* 新增 GitHub Actions 一键发版 workflow，tag 改用 v 前缀 ([4b172f2](https://github.com/baiwumm/next-daily-hot/commit/4b172f26ddd8428c72dfb98d73a576ccabe7fb1f))
* 新增上游源健康巡检 workflow，异常自动开 issue 跟踪 ([d8299a8](https://github.com/baiwumm/next-daily-hot/commit/d8299a81a2bed8585457c5fd5e9cf9c423ad9dd3))

## [3.10.1](https://github.com/baiwumm/next-daily-hot/compare/v3.10.0...v3.10.1) (2026-09-15)

### ✨ Features | 新功能

* 添加 theme-switch-animation 依赖包 ([fe8ed3c](https://github.com/baiwumm/next-daily-hot/commit/fe8ed3cbf3d984c06c1e76adaec3fdbfb6904b61))
* **ThemeSwitcher:** 替换自定义主题切换动画为第三方库 ([dbcbac6](https://github.com/baiwumm/next-daily-hot/commit/dbcbac66f41b10abca05669e7ed9715012df204a))

### 🐛 Bug Fixes | Bug 修复

* 固定 packageManager 为 pnpm@11.24.0，修复 Vercel 构建时 pnpm 版本误判 ([735bf70](https://github.com/baiwumm/next-daily-hot/commit/735bf7092019bb7f05674b2c469ee873b4057ace))

## [3.10.0](https://github.com/baiwumm/next-daily-hot/compare/v3.9.2...v3.10.0) (2026-09-12)

### 🐛 Bug Fixes | Bug 修复

* 手动刷新真正回源、服务端按东八区取数并统一缓存三层同源 ([371889e](https://github.com/baiwumm/next-daily-hot/commit/371889ee5008cdefd24dba64e9680944da3aeb69))

### 🎫 Chores | 其他更新

* 常规依赖更新（semver 范围内最新） ([2542d27](https://github.com/baiwumm/next-daily-hot/commit/2542d2737fe90ebfe61487b19513aea601a22abb))
* 切换 ESLint 至 better-admin/react 体系，新增 .prettierrc 并统一格式化 ([4508a97](https://github.com/baiwumm/next-daily-hot/commit/4508a97aa613842a1ee064a46c04d034d5821de0))
* HeroUI 升级至 3.2.5 ([5327374](https://github.com/baiwumm/next-daily-hot/commit/5327374f40be2b3e57211d8476d2ff3e1406f03e))
* Next.js 升级至 16.3.4 ([7b8ce0b](https://github.com/baiwumm/next-daily-hot/commit/7b8ce0bad7d3d1bee320b807f80caf7328a4e539))
* pnpm.overrides 迁移至 pnpm-workspace.yaml ([ffd9bb4](https://github.com/baiwumm/next-daily-hot/commit/ffd9bb4de58ad489271dabb195a311986537d49f))
* React 升级至 19.3.0 ([fc34087](https://github.com/baiwumm/next-daily-hot/commit/fc34087c85983bdc48311a58f79d694426596baf))

### 📝 Documentation | 文档

* 新增 AGENTS.md 开发指南并安装 Vercel React Skills ([2fb22e7](https://github.com/baiwumm/next-daily-hot/commit/2fb22e744b711b92e6de6cff8d1e80308b55e172))

### ♻ Code Refactoring | 代码重构

* 按 Vercel React 最佳实践做等价逻辑优化，行为不变 ([51fbe05](https://github.com/baiwumm/next-daily-hot/commit/51fbe058b59f80c7124cbc4fe4b2beabe8dcf0af))
* 微信读书 ID 算法改用 node:crypto，移除已废弃的 crypto-js ([2a44bba](https://github.com/baiwumm/next-daily-hot/commit/2a44bbaaa3f167a40e0cb4accb8aff902f3d1d18))

### ⚡ Performance Improvements | 性能优化

* 字体改为自托管 [@font-face](https://github.com/font-face)，移除第三方字体 CSS 外链 ([73fcb3a](https://github.com/baiwumm/next-daily-hot/commit/73fcb3ae8156644ce5cf87feed8d6e3b8f232fcc))

## [3.9.2](https://github.com/baiwumm/next-daily-hot/compare/v3.9.1...v3.9.2) (2026-08-12)

### 🐛 Bug Fixes | Bug 修复

* 热榜卡片空数据误显示更新时间并触发刷新冷却 ([7307940](https://github.com/baiwumm/next-daily-hot/commit/7307940537a6b91f6a7593a4ee4a28d00334eff4))

## [3.9.1](https://github.com/baiwumm/next-daily-hot/compare/v3.9.0...v3.9.1) (2026-08-12)

### 🎫 Chores | 其他更新

* 升级 eslint 10.8.1 与 @antfu/eslint-config 9.3.0 ([db75f20](https://github.com/baiwumm/next-daily-hot/commit/db75f209e259b7ca5bf095ab539fd9d3d2b2da46))
* 升级 HeroUI 依赖与文档到最新版 ([1e45680](https://github.com/baiwumm/next-daily-hot/commit/1e456802fa0ce2038df8e963a4be3b229701b865))
* 升级 Next.js 16.3.0 及配套依赖 ([0aff218](https://github.com/baiwumm/next-daily-hot/commit/0aff218168fd752d51b7101bf0800ea7a80a51ea))

## [3.9.0](https://github.com/baiwumm/next-daily-hot/compare/v3.8.2...v3.9.0) (2026-08-11)

### ✨ Features | 新功能

* 缓存窗口可配置化，相对时间与刷新冷却同源自洽 ([b93e81b](https://github.com/baiwumm/next-daily-hot/commit/b93e81b9d0c4ecdc247d2c77e331ca6230c3e23f))
* 手动刷新绕过 CDN 缓存，获取最新热榜 ([f42fc3f](https://github.com/baiwumm/next-daily-hot/commit/f42fc3f3e8659dcf5a47ded461f72850a7fd9635))

### 🐛 Bug Fixes | Bug 修复

* 修复热榜设置弹窗内 hover 误触发 Tooltip ([9b2ed2f](https://github.com/baiwumm/next-daily-hot/commit/9b2ed2fd9a81e102f108f93221931de4a467bfd6))

### 💄 Styles | 风格

* 精简 eslint ignores，仅保留 .reasonix 排除 ([0c8e5ab](https://github.com/baiwumm/next-daily-hot/commit/0c8e5ab6bbb3b238afaa948d3ec2221d8ee57522))
* 清理 eslint 警告，忽略 .reasonix 等工具目录 ([dfb1ccf](https://github.com/baiwumm/next-daily-hot/commit/dfb1ccf44fa7c68c61ace763c4ff15ccce1ec728))

### ⚡ Performance Improvements | 性能优化

* 拆分 bundle 依赖，隔离 crypto-js 与 RESPONSE 常量 ([f33fff5](https://github.com/baiwumm/next-daily-hot/commit/f33fff587c8b82a0f07df7405aab9768f3064d5a))
* 抽取上游请求公共层，补齐超时与错误日志 ([c08a95a](https://github.com/baiwumm/next-daily-hot/commit/c08a95a58b2836ea625920c7b7c2757708bc6b74))
* 服务器 fetch 缓存 + 刷新按钮冷却 ([8910ff5](https://github.com/baiwumm/next-daily-hot/commit/8910ff513ae284a1c5dc301aade5410eec230f6b))
* 响应统一加 CDN 缓存头，修复错误时间戳恒定 ([57484d6](https://github.com/baiwumm/next-daily-hot/commit/57484d6d50fe76bf31d6ab7b1535ab2d79729604))

## [3.8.2](https://github.com/baiwumm/next-daily-hot/compare/v3.8.1...v3.8.2) (2026-08-10)

### 📝 Documentation | 文档

* 预览图改用 dark/light 双图，移除未使用的 snapshots 图片 ([1810280](https://github.com/baiwumm/next-daily-hot/commit/1810280e192e7c2925a8ec9fa48905671e462619))

### 💄 Styles | 风格

* 重制 OG 分享图，适配站点主题与视觉规范 ([0118c5e](https://github.com/baiwumm/next-daily-hot/commit/0118c5ea7485accd91947b45d86a0dbc45ba251a))

## [3.8.1](https://github.com/baiwumm/next-daily-hot/compare/v3.8.0...v3.8.1) (2026-08-10)

### 🐛 Bug Fixes | Bug 修复

* 请求失败时不再误显示"刚刚更新" ([6b6e209](https://github.com/baiwumm/next-daily-hot/commit/6b6e209e63f1b431cc4f29642ff2425825bbb0e5))
* 优化 UI 细节与可访问性 ([10b0281](https://github.com/baiwumm/next-daily-hot/commit/10b02813acd7aef3b8e888467531096223394748))
* 优化热榜卡片滚动体验与刷新反馈 ([2431ca2](https://github.com/baiwumm/next-daily-hot/commit/2431ca25ec4bc34d2fece5e9ec825d5d4dd1dab5))
* 优化重试退避与时长格式化，全面启用类型检查 ([7a1f488](https://github.com/baiwumm/next-daily-hot/commit/7a1f4882a143e0a6c1548430c535935b0676bb25))

### 🎫 Chores | 其他更新

* 移除 enum-plus 依赖，改用 as const 枚举配置 ([73c1e3a](https://github.com/baiwumm/next-daily-hot/commit/73c1e3a6ae8f01967c5dc7e2b30a32e96acc3f72))

### ⚡ Performance Improvements | 性能优化

* 依据 Vercel 最佳实践优化性能与 bundle 体积 ([573e938](https://github.com/baiwumm/next-daily-hot/commit/573e93894bdc8463b4087ea712fd6d135fd00899))

## [3.8.0](https://github.com/baiwumm/next-daily-hot/compare/v3.7.2...v3.8.0) (2026-08-07)

### ✨ Features | 新功能

* 新增动态 OG 分享图并调整字体源 ([bff48af](https://github.com/baiwumm/next-daily-hot/commit/bff48af7483d0c75f1a05b2d6dafb1d2d5f8fdef))

### 🎫 Chores | 其他更新

* 添加 HeroUI React 文档和 Agent Skills ([799bb4d](https://github.com/baiwumm/next-daily-hot/commit/799bb4d4fc5ee8e33098b092f7429910b8cc44a1))
* 移除 @radix-ui/react-slot 依赖 ([ba8d138](https://github.com/baiwumm/next-daily-hot/commit/ba8d138e3c6da774024b58d4794ac79638acdc13))
* 移除 ahooks 依赖，改用原生 hooks 实现 useRequest ([ca955a9](https://github.com/baiwumm/next-daily-hot/commit/ca955a92e56c954592d57850651c08fe93eb348b))
* 移除 dayjs 依赖，改用原生 API 实现 ([2fd640e](https://github.com/baiwumm/next-daily-hot/commit/2fd640ef785ba73d67be4dff45c372bae12a782d))
* 移除未使用的依赖 @dnd-kit/modifiers ([53d88ee](https://github.com/baiwumm/next-daily-hot/commit/53d88ee697832944c2f3f5d3b91278253357edd6))

### 💄 Styles | 风格

* 优化 motion 动画体验并支持 reducedMotion ([707418a](https://github.com/baiwumm/next-daily-hot/commit/707418ab859911ecff42a6538140f4dc676edbac))

### ♻ Code Refactoring | 代码重构

* 优化主题切换动画的清理逻辑与健壮性 ([77eb48a](https://github.com/baiwumm/next-daily-hot/commit/77eb48adf4158736ad606db608e365f3f465751c))

## [3.7.2](https://github.com/baiwumm/next-daily-hot/compare/v3.7.1...v3.7.2) (2026-08-03)

### 🎫 Chores | 其他更新

* 去掉 .env.example 文件 ([2690e3a](https://github.com/baiwumm/next-daily-hot/commit/2690e3a1c4299a46c248e8dae23066fb5bdbb9eb))

## [3.7.1](https://github.com/baiwumm/next-daily-hot/compare/v3.7.0...v3.7.1) (2026-08-03)

### ✨ Features | 新功能

* update README.md ([7139925](https://github.com/baiwumm/next-daily-hot/commit/713992598f0afe8e17710c4e37fcd2b5626b8b90))

## [3.7.0](https://github.com/baiwumm/next-daily-hot/compare/v3.6.10...v3.7.0) (2026-07-31)

### ✨ Features | 新功能

* **ThemeSwitcher:** 添加主题切换过渡动画 ([5d5c355](https://github.com/baiwumm/next-daily-hot/commit/5d5c35510c00253980a009506956d96dda61a2de))

### 🎫 Chores | 其他更新

* 完善应用配置信息 ([48973e0](https://github.com/baiwumm/next-daily-hot/commit/48973e0d6c9ac9dc46c88683e3f4b1f24f4395f9))

### 💄 Styles | 风格

* eslint 换成 @antfu/eslint-config，统一代码风格 ([1bc61c8](https://github.com/baiwumm/next-daily-hot/commit/1bc61c83a5940fe08623b10906e1e92b716f9eb0))

### ⚡ Performance Improvements | 性能优化

* 优化代码逻辑和结构 ([70a614c](https://github.com/baiwumm/next-daily-hot/commit/70a614c01bce752a7f6d32f06ed916516001ec25))

## [3.6.10](https://github.com/baiwumm/next-daily-hot/compare/v3.6.9...v3.6.10) (2026-07-22)

### ⚡ Performance Improvements | 性能优化

* 优化 env 文件配置和示例 ([055e0b2](https://github.com/baiwumm/next-daily-hot/commit/055e0b27ac08d4598a1ff13007270c3c0071bb20))

## [3.6.9](https://github.com/baiwumm/next-daily-hot/compare/v3.6.8...v3.6.9) (2026-07-22)

### ⚡ Performance Improvements | 性能优化

* **FullLoading:** 使用 useIsHydrated 代替 mounted ([8b3aa84](https://github.com/baiwumm/next-daily-hot/commit/8b3aa84ca051626281ad0db0088963bd54f5a121))

## [3.6.8](https://github.com/baiwumm/next-daily-hot/compare/v3.6.7...v3.6.8) (2026-07-17)

### ⚡ Performance Improvements | 性能优化

* 设置  Tooltip 的延迟为0 ([8211189](https://github.com/baiwumm/next-daily-hot/commit/8211189b0edeb1464a26c6da7fa7f0e53e12f6de))

## [3.6.7](https://github.com/baiwumm/next-daily-hot/compare/v3.6.6...v3.6.7) (2026-07-07)

### 💄 Styles | 风格

* UI 调整 ([c62c25f](https://github.com/baiwumm/next-daily-hot/commit/c62c25fdb15d0cde11b85bb9462c2c22bffe26d2))

## [3.6.6](https://github.com/baiwumm/next-daily-hot/compare/v3.6.5...v3.6.6) (2026-07-07)

### ⚡ Performance Improvements | 性能优化

* **BackTop:** 优化交互逻辑 ([e378863](https://github.com/baiwumm/next-daily-hot/commit/e3788630bf2c74b27726a5fadaa61d6bdbe63ddd))

## [3.6.5](https://github.com/baiwumm/next-daily-hot/compare/v3.6.4...v3.6.5) (2026-07-07)

### ⚡ Performance Improvements | 性能优化

* **ThemeSwitcher:** 优化主题切换逻辑 ([89e42a2](https://github.com/baiwumm/next-daily-hot/commit/89e42a25ab96be0b87ed3d0a4892f5f46bb4336b))

## [3.6.4](https://github.com/baiwumm/next-daily-hot/compare/v3.6.3...v3.6.4) (2026-07-07)

### 🔧 Continuous Integration | CI 配置

* 使用默认端口 ([ec2d9f6](https://github.com/baiwumm/next-daily-hot/commit/ec2d9f67b1ed7d5d3ae81a73250a4b0de22db0fe))

## [3.6.3](https://github.com/baiwumm/next-daily-hot/compare/v3.6.2...v3.6.3) (2026-07-06)

### ✨ Features | 新功能

* update README.md ([f378062](https://github.com/baiwumm/next-daily-hot/commit/f37806277ce294d435ef314bedc410a64d2abfd0))

## [3.6.2](https://github.com/baiwumm/next-daily-hot/compare/v3.6.1...v3.6.2) (2026-07-06)

### 💄 Styles | 风格

* 去除重复的样式 ([48594cf](https://github.com/baiwumm/next-daily-hot/commit/48594cf343e7cb6f083002cace8be3260d650462))

## [3.6.1](https://github.com/baiwumm/next-daily-hot/compare/v3.6.0...v3.6.1) (2026-07-03)

### ✨ Features | 新功能

* **public:** 整理图片文件 ([1dd7889](https://github.com/baiwumm/next-daily-hot/commit/1dd78894101c4fb187b792e4ef9e6145da7d020a))

## [3.6.0](https://github.com/baiwumm/next-daily-hot/compare/v3.5.6...v3.6.0) (2026-07-03)

### ✨ Features | 新功能

* 使用 @gravity-ui/icons 代替 lucide-react ([adaceb3](https://github.com/baiwumm/next-daily-hot/commit/adaceb38aedd879ee69516918c2a720645774297))
* **HotCard:** 使用 @tanstack/react-virtual 代替 react-window 实现虚拟列表 ([657377b](https://github.com/baiwumm/next-daily-hot/commit/657377b3a937f62495f198890d65085a3df6e65e))
* **TimeAndLunar:** 时间显示改用 NumberFlow 滚动，优化交互 ([23ef35e](https://github.com/baiwumm/next-daily-hot/commit/23ef35e0e553ac2003ee0d505c2bc19c34d34c5b))

### 🐛 Bug Fixes | Bug 修复

* 解决 github-trending tip 没数据的问题 ([8f44447](https://github.com/baiwumm/next-daily-hot/commit/8f4444796b3e6c0fed43036c7661431fe1591298))

### 💄 Styles | 风格

* 优化顶部和底部在小屏幕下的样式 ([241d3d7](https://github.com/baiwumm/next-daily-hot/commit/241d3d7eb7e42d26b859e56e78076c1fa7d6cad4))
* 优化首页背景和样式 ([b58ad61](https://github.com/baiwumm/next-daily-hot/commit/b58ad61dfca1ab53438f9474f8d9b916194c853e))
* Logo 给个圆角样式 ([b967952](https://github.com/baiwumm/next-daily-hot/commit/b9679526ae291291750ad5ac13a501655711c1f7))

### ⚡ Performance Improvements | 性能优化

* 删除没用的代码和依赖 ([15a4424](https://github.com/baiwumm/next-daily-hot/commit/15a442442cec325850ecc66db940c2bdbcdde179))
* 优化卡片加载样式 ([2535489](https://github.com/baiwumm/next-daily-hot/commit/253548967c232cf8a1b3e781b95d13d81ac0eefe))
* **Footer:** 使用 Chip 代替 Status 组件 ([380ef7a](https://github.com/baiwumm/next-daily-hot/commit/380ef7a11f0abd6838124a7a88bfc48950d24db2))

### 🔧 Continuous Integration | CI 配置

* 新增 @number-flow/react 包 ([a5caa1f](https://github.com/baiwumm/next-daily-hot/commit/a5caa1f048bd45aed24c03b2b59ae969cdcdd009))

## [3.5.6](https://github.com/baiwumm/next-daily-hot/compare/v3.5.5...v3.5.6) (2026-07-01)

### ✨ Features | 新功能

* 更新 demo 图 ([90195c9](https://github.com/baiwumm/next-daily-hot/commit/90195c9263757314e97f83e2e29a26025dbc541c))
* **Header:** 添加 Tooltip 显示 ([9d615e5](https://github.com/baiwumm/next-daily-hot/commit/9d615e512ed8cb8f0b63e69b3001a4bd6eacaf24))

### 💄 Styles | 风格

* 优化 UI 主题样式 ([6faa4fa](https://github.com/baiwumm/next-daily-hot/commit/6faa4fae27bd4f4287f592332b808346c001fa1a))

### 🔧 Continuous Integration | CI 配置

* 降低 eslint 到 v9 版本，优化 lint 语法 ([d02b5bf](https://github.com/baiwumm/next-daily-hot/commit/d02b5bfb48931f270926f20a3cd1ccbe75f0ee80))

## [3.5.5](https://github.com/baiwumm/next-daily-hot/compare/v3.5.4...v3.5.5) (2026-07-01)

### ✨ Features | 新功能

* 去除社交信息，优化底部版本 ([5fd6889](https://github.com/baiwumm/next-daily-hot/commit/5fd6889cd8ca200b916570133e272fe7f636cf8c))
* 删除 Umami 统计代码 ([aad3f86](https://github.com/baiwumm/next-daily-hot/commit/aad3f869c06e4b9e519d3e55f67c7059b3ba4e1a))

## [3.5.4](https://github.com/baiwumm/next-daily-hot/compare/v3.5.3...v3.5.4) (2026-06-26)

### 💄 Styles | 风格

* **components:** 更新 Status 组件 variant 样式 ([1a35542](https://github.com/baiwumm/next-daily-hot/commit/1a35542c5822682c16543bdef9d8b3208153b8d4))

### 🔧 Continuous Integration | CI 配置

* 更新 Hero UI 版本 ([9762d58](https://github.com/baiwumm/next-daily-hot/commit/9762d58a65c28b08cac2d6c88407277e626b19fb))
* 更新包版本 ([bdcbada](https://github.com/baiwumm/next-daily-hot/commit/bdcbada07e46e30c3ff8df6ecb93c707942b585c))

## [3.5.3](///compare/v3.5.2...v3.5.3) (2026-03-16)

### Performance Improvements

* 删除 ProgressCircle 组件 16e0142
* **BackTop:** 使用 Hero UI 的 ProgressCircle 组件，优化卡顿 a421747

## [3.5.2](///compare/v3.5.1...v3.5.2) (2026-03-11)

### Features

* **Footer:** 修改友情链接 286784f

### Performance Improvements

* 禁止 Image 图片优化 7e36173
* **OverflowDetector:** 优化页面主题切换卡顿的问题 68ff709

## [3.5.1](///compare/v3.5.0...v3.5.1) (2026-02-06)

### Performance Improvements

* **HotCard:** 优化暗黑主题过渡卡顿的问题 e65f42b
* TS 类型完善 32c56b5

## [3.5.0](///compare/v3.4.2...v3.5.0) (2026-01-26)

### Features

* 新增 36kr - 24小时热榜 64d6a6e
* 新增 爱范儿 - 快讯 ba71546
* 新增 虎嗅 - 最新资讯 1e09849
* 新增 知乎日报 - 推荐榜 b5e2088
* 新增 IT之家- 热榜 14c2d42

### Bug Fixes

* 修复 Modal 不能关闭的问题 df3d77c

### Performance Improvements

* 细节调整 22fdd08

## [3.4.2](///compare/v3.4.1...v3.4.2) (2026-01-26)

### Features

* 更新 Hero UI 版本，配置主题 03a7c3e

## [3.4.1](///compare/v3.4.0...v3.4.1) (2026-01-21)

### Features

* 新增 人人都是产品经理 - 热榜 79df423
* 新增 CSDN - 热榜 cd00515

### Performance Improvements

* 删除 console.log 3a452f6

## [3.4.0](///compare/v3.3.1...v3.4.0) (2026-01-20)

### Features

* 新增 Github - 热门仓库 8b90396
* 新增 HelloGithub - 精选 91ac5ac

### Performance Improvements

* **HotSettings:** 禁用 Modal 点击关闭 227bf46

## [3.3.1](///compare/v3.3.0...v3.3.1) (2026-01-15)

### Features

* **baidu:** 新增 label 标签字段 ba7d048
* **weibo:** 更改热度字段 1d81277

## [3.3.0](///compare/v3.2.1...v3.3.0) (2026-01-15)

### Features

* 新增 夸克-今日热点 80ff40f
* **HotSettings:** 添加“恢复默认设置”功能 361ed08

## [3.2.1](///compare/v3.2.0...v3.2.1) (2026-01-14)

### Features

* 新增 虎扑-步行街热帖 8fa301e

## [3.2.0](///compare/v3.1.1...v3.2.0) (2026-01-14)

### Features

* 新增 懂车帝-热搜榜 00c6b27
* 新增 小红书-实时热榜 b1b8c99
* **HotSettings:** 热榜支持拖拽排序显示 db6ce60

## [3.1.1](///compare/v3.1.0...v3.1.1) (2026-01-13)

### Performance Improvements

* 优化类型 05d9eab

## [3.1.0](///compare/v3.0.1...v3.1.0) (2026-01-12)

### Features

* **HotCard:** 更新时间逻辑优化，其它细节微调 8dc3cad
* **HotCard:** 新增列表虚拟滚动 1d7d5bf

## [3.0.1](///compare/v3.0.0...v3.0.1) (2026-01-05)

### Features

* update README.md 6e7d7d8

## [3.0.0](///compare/v2.1.0...v3.0.0) (2026-01-05)

### Bug Fixes

* 修复百度热搜榜接口异常的问题 d2f7e33

### Performance Improvements

* 优化 SEO 信息 e8ebfcb
* **eslint:** 优化 eslint 配置规则 be8d366

## [2.1.0](///compare/v2.0.0...v2.1.0) (2025-11-21)

### Features

* 安装配置 Hero UI a56d6ed
* 完成顶部和底部布局和相应交互逻辑 4ac9d70
* 完成热榜卡片内容的开发 fe8b370
* 完成主体内容、热榜卡片布局 308c32c
* 细节优化 087b0e0
* 新增 BackTop 回到顶部组件 74d7c77
* 新增 NotFound 页面 de91aa6
* 新增release-it @release-it/conventional-changelog 包 72d92bd
* **metadata:** 完善网站 Meta 信息 a498986
* update README.md a5d5168
* update README.md 86dca7c

## [2.0.0](///compare/v1.6.6...v2.0.0) (2025-11-19)
