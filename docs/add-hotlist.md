# 新增榜单指南

> **何时读**：新增或修改榜单数据源（平台）时。两步接入、上游抓取与反爬规范、错误处理、健康巡检都在这里。

---

## 两步接入

**第一步：注册榜单配置** —— 在 `src/config/hot-list.tsx` 的 `hotItemsConfig` 对应分类的 `children` 里加一行（`value` / `label` / `tip`，可选 `prefix` / `suffix`，见 `HotListConfig` 类型）。`value` 即 API 路由目录名，**两处必须一致**（开发期仅有配置内重复 value 断言；与路由目录名的一致性无自动校验，新增后本地请求一次 `/api/<value>` 确认）。平台不属于任何现有分类时，在 `hotItemsConfig` 数组中新增分类对象（`category` + `children`）——分类顺序即展示顺序。

**第二步：实现 API 路由** —— 新建 `src/app/api/<value>/route.ts`，用 `fetchJson` / `fetchText` 抓取上游，把结果映射为 `HotListItem[]` 后经 `successResponse()` 返回。

`HotListItem` 字段（`src/types/index.ts`）：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | ✅ | 唯一 key |
| `title` | ✅ | 标题 |
| `url` | ✅ | 详情地址 |
| `mobileUrl` | ✅ | 移动端地址 |
| `hot` | 可选 | 热度值 |
| `desc` | 可选 | 描述 |
| `pic` | 可选 | 封面图 |
| `tip` | 可选 | 不显示热度时展示的其他信息 |
| `label` | 可选 | 标签（微博） |

> 注意：上表 `tip` / `label` 是**条目级**字段，与 `HotListConfig` 的同名配置字段（平台提示文案 / 平台显示名）同名不同义。

特殊算法（签名、书籍 ID 换算等）：Next 版路由放 `src/lib/` 独立模块，参考已有的 `weread.ts`、`miyoushe.ts`；**Edge Functions 版没有模块系统，同类算法放 `edge-functions/_lib.js`**（已有纯 JS MD5、weread ID 换算、米游社抓取、CSDN WAF 退避重试）。

## 上游抓取规范

- **新增榜单默认写 Edge Functions 路由**（主力运行时，CPU-ms 计费且 I/O 等待不计入）：
  ① `src/config/hot-list.tsx` 的 `hotItemsConfig` 在对应分类的 `children` 里加一行；② 新建 `edge-functions/api/<value>.js`（模板参考同类型既有路由，公共能力从 `../_lib.js` 引入）。
  典型形态：

  ```javascript
  import { fetchUpstreamJson, handleHotList, sanitizeHotList } from '../_lib.js'

  export async function onRequestGet(context) {
    return handleHotList(context, {
      cacheKey: 'https://example.com/hot/list', // 上游真实 URL：同时作为 KV/Cache 缓存键
      loader: async () => {
        const responseBody = await fetchUpstreamJson('https://example.com/hot/list')

        return sanitizeHotList(responseBody.data.list.map((v) => ({ id: v.id, title: v.title, url: v.url, mobileUrl: v.url })))
      },
    })
  }
  ```

- **Edge Functions 运行时约束（V8）**：无 npm 包与 Node 内置模块（cheerio / node:crypto 不可用）——HTML 解析用正则（参考 `ithome.js`，注意数字/十六进制实体解码）、MD5 用 `_lib.js` 的 `md5Hex`、SHA-1 用 `sha1Hex`（Web Crypto，异步）；GBK/GB18030 页面用 `fetchUpstreamText(url, { encoding: 'gbk' })`；包体上限 5MB、CPU 200ms/次。
- **上游请求一律走请求封装**：Next 版走 `src/lib/request.ts` 的 `fetchJson` / `fetchText`；Edge Functions 版走 `edge-functions/_lib.js` 的 `fetchUpstreamJson` / `fetchUpstreamText`（统一 Chrome UA、15s 超时；显式传 `'User-Agent': ''` 可移除 UA 应对反爬）。
- **上游反爬应对**：
  - 微博等需额外 `Referer`；
  - 个别站点对桌面 UA 返回反爬页，传 `'User-Agent': ''` 显式移除 UA（虎扑）；
  - CSDN 的 WAF 挑战（521）退避重试已在 `_lib.js` 的 `getCsdnHotRank` 内实现，直接调用。
- **页面编码**：默认按 UTF-8 解码；GBK / GB18030 等非 UTF-8 页面显式传 `encoding`（参考 `gp`、`jjwxc` 的 Next 版实现），否则中文乱码。
- **上游挂掉属常态**：`handleHotList` 统一兜底，前端已处理空数据与错误态；失败/空数据响应置 60s 短缓存（`s-maxage=60`）——故障期间仍有 CDN 保护、上游恢复后最多 1 分钟自愈，保持该语义。
- 改缓存窗口须评估服务端窗口（`API_CACHE_SECONDS`）与客户端冷却（`CLIENT_COOLDOWN_SECONDS`）的分层影响（定义见 [architecture.md](./architecture.md) 架构要点）。

## 上游健康巡检

新榜单接入后自动纳入巡检，无需额外注册：`.github/workflows/health-check.yml` 每日 4 次（UTC 0/6/12/18）在 runner 上构建并启动生产服务，逐个请求本地回源的全部榜单 API。

- 判定：HTTP 200 + `code=200` + `data` 非空数组；异常时自动创建/更新 tracking issue（label: `upstream-health`），全部恢复后自动关闭。
- 巡检**不直连线上域名**——线上多层缓存（CDN 边缘 / Next Data Cache）命中会返回旧数据，掩盖上游真实故障（调试环境说明见 [development.md](./development.md)）。
