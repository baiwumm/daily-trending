# 发版流程

> **何时读**：发版或调整发版配置（版本号、CHANGELOG、tag 规则）前。

---

## 常规发版（GitHub Actions）

发版统一走 `.github/workflows/release.yml`（workflow_dispatch，在 main 上触发）：

1. 触发（二选一）：
   - 方式 A：Actions 页面 → Release → Run workflow，选 patch / minor / major，或直接填自定义版本号；
   - 方式 B：命令行 `gh workflow run release.yml -f bump=minor`（自定义版本号用 `-f version=v<版本号>`，填写后覆盖 bump）。
2. CI 先跑 `pnpm lint` + `pnpm build` 预检，**任一失败即中止、不产生任何提交**。
3. 通过后由 release-it 一次性完成：版本号 → CHANGELOG.md → `chore: Release v${version}` 提交 → tag → GitHub Release（提交作者为 github-actions[bot]）。
4. 发版提交推上 main 后 EdgeOne Makers 自动部署生产；本地 `git pull --ff-only` 同步 Release 提交。

## 版本规则

- **tag 统一使用 `v` 前缀**（`.release-it.json` 的 `git.tagName` 显式锁定）。历史 tag 已于 2026-10-07 全部迁移为 v 前缀，GitHub Release 指向与 CHANGELOG 链接同步修正（一次性迁移脚本用后已删除，逻辑见 `4b172f2` 提交）。
- **版本真源是 package.json**：release-it 从 main 上 package.json 的当前版本 bump（自定义版本号除外）；Release 提交会同步 bump package.json 并打 tag，二者保持一致，无需额外 tag 校验。发版前 `git tag` 看一眼最新 tag，确认当前版本水位即可。
- **bump 选择**：`fix` / `chore` 等选 patch，`feat` 选 minor，破坏性变更选 major（大版本升级须先沟通，见 AGENTS.md 硬性规则）。
- 权限仅 `contents: write`（最小化授权）；`.env` 已提交，build 无需注入密钥。

## 本地发版（备用）

`pnpm release` 需要本地 `GITHUB_TOKEN`，与 CI 共用 `.release-it.json`（含 `requireBranch: main` 限制），行为一致。常规发版优先走 Actions。

## 附：README 徽章同步

README 的 Next 徽章由 release-it `after:bump` 钩子（`scripts/sync-readme-badges.mjs`）按 package.json 中固定的 Next 版本自动同步，无需手工维护。
