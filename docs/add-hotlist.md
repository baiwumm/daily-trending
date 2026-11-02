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

特殊算法（签名、书籍 ID 换算等）放 `src/lib/` 独立模块，参考已有的 `weread.ts`、`miyoushe.ts`。

## 上游抓取规范

- **上游请求一律走 `src/lib/request.ts`**：`fetchJson` / `fetchText` 统一注入 Chrome UA、15s 超时、`next.revalidate` 缓存策略。
- **上游反爬应对**（`buildHeaders` 已支持）：
  - 微博等需额外 `Referer`；
  - 个别站点对桌面 UA 返回反爬页，传 `'User-Agent': ''` 显式移除 UA。
- **页面编码**：`fetchText` 默认按 UTF-8 解码；GBK / GB18030 等非 UTF-8 页面显式传 `encoding`（参考 `gp`、`jjwxc` 路由），否则中文乱码。
- **上游挂掉属常态**：走 `errorResponse()` 返回，前端已处理空数据与错误态；失败响应已由 `errorResponse` 置 `no-store`，保持该行为。
- 改缓存窗口须三层同源评估（定义见 [architecture.md](./architecture.md) 架构要点）。

## 上游健康巡检

新榜单接入后自动纳入巡检，无需额外注册：`.github/workflows/health-check.yml` 每日 4 次（UTC 0/6/12/18）在 runner 上构建并启动生产服务，逐个请求本地回源的全部榜单 API。

- 判定：HTTP 200 + `code=200` + `data` 非空数组；异常时自动创建/更新 tracking issue（label: `upstream-health`），全部恢复后自动关闭。
- 巡检**不直连线上域名**——线上多层缓存（CDN 边缘 / Next Data Cache）命中会返回旧数据，掩盖上游真实故障（调试环境说明见 [development.md](./development.md)）。
