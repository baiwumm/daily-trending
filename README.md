<div align="center">
  <img src="./public/logo.svg" alt="logo" height="90" />
  <h1>今日热榜</h1>
  <p align="center">看看全网都在聊什么</p>
  <p align="center">
    <img src="https://img.shields.io/badge/Next-16.4.5-black?style=flat&logo=Next.js" alt="Next.js">
    <img src="https://img.shields.io/badge/HeroUI-3+-000000?style=flat&logo=HEROui&logoColor=white" alt="HeroUI"/>
    <img src="https://img.shields.io/github/stars/baiwumm/daily-trending?style=social" alt="GitHub stars" />
    <img src="https://img.shields.io/github/forks/baiwumm/daily-trending?style=social" alt="GitHub forks" />
    <img src="https://img.shields.io/github/license/baiwumm/daily-trending?style=flat" alt="License" />
  </p>
</div>

---

### 📺 宣传片

<div align="center">
  <video src="https://github.com/user-attachments/assets/0baa9203-9d6d-4ae1-8b43-e1dfcf36a7b4" width="90%" controls muted playsinline></video>
</div>

### 🚀 特性

- 🔥 聚合微博、知乎、B 站、抖音、GitHub、原神 等全网热门平台，按分类分节浏览
- 🗂️ 分类分节布局 + 锚点导航，分类 / 平台两级排序与显隐
- ⭐ 平台收藏常看：星标收藏后置顶聚合到首页，并从原分类移入常看
- 📈 排名趋势标记（↑ / ↓ / 新）
- ⌨️ Ctrl / ⌘ + K 全局搜索，跨卡片条目定位
- ⚡ 基于 Next.js + CDN 边缘缓存，快速加载
- 🎨 支持明暗主题切换
- 📱 响应式设计，适配移动端
- 🔍 SEO 优化，搜索友好
- 🧩 模块化架构，新增一个榜单只需两步

### 🛠️ 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/baiwumm/daily-trending.git

# 2. 进入项目目录
cd daily-trending

# 3. 安装依赖
pnpm install

# 4. 启动开发服务器
pnpm dev

# 5. 打开浏览器访问
http://localhost:3000
```

开发规范、架构说明与新增榜单指南见 [AGENTS.md](./AGENTS.md) 与 [docs/](./docs)。

### 🔌 开放 API

各榜单数据通过统一模式的端点暴露：`GET /api/<value>`（`value` 为平台标识），返回结构：

```json
{
  "code": 200,
  "msg": "请求成功",
  "data": [
    {
      "id": "唯一标识",
      "title": "标题",
      "url": "详情地址",
      "mobileUrl": "移动端地址",
      "hot": 12345,
      "desc": "描述（可选）",
      "pic": "封面图（可选）",
      "tip": "替代热度的信息（可选）",
      "label": "标签（可选）"
    }
  ],
  "timestamp": 1791500000000
}
```

### 🚀 部署（EdgeOne Makers）

站点部署在腾讯云 **EdgeOne Makers**：控制台导入 GitHub 仓库后零配置识别 Next.js 构建，推送到 `main` 即自动发布生产；也可用 `edgeone` CLI 本地部署。

默认使用仓库内已提交的 `.env` 构建；仅当需自定义站点信息或缓存窗口时，才在 **EdgeOne Makers 控制台 → 项目设置 → 环境变量** 中覆盖配置。环境变量参考：[.env](./.env)

### ⭐ 支持项目
<div align="center">
  <p>如果这个项目对你有帮助，请给它一个 ⭐️</p>
  <p>Made with ❤️ by <a href="https://github.com/baiwumm">@baiwumm</a></p>
  <p>© 2025-至今 今日热榜. All rights reserved.</p>
</div>
