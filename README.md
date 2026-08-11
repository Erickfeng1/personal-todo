# 序 Todo

一个面向个人使用、本地优先的待办任务管理工具。MVP 使用 React、TypeScript、Vite 和 Dexie 构建，任务数据保存在当前浏览器的 IndexedDB 中。

## 当前开发状态

当前分支完成了 Phase 0 工程骨架和 Phase 1 首个纵向闭环，并提前实现了重要性/紧急性分类的基础能力：

- Inbox、Today、Completed 三个基础视图。
- 只输入标题即可快速创建任务。
- Today 创建时自动设置当天计划日期。
- IndexedDB 本地持久化，刷新后数据保留。
- 完成、短时撤销和从 Completed 恢复。
- 重要 / 不重要、紧急 / 不紧急两个独立维度。
- 单维度、四象限和未分类筛选。
- 响应式桌面/移动端布局和基础键盘快捷键。
- PWA Manifest、Service Worker 更新提示和 Vercel SPA 回退配置。

项目、标签、任务完整编辑、Today 四分组、Upcoming、备份恢复等仍按 `docs/05-technical-design.md` 的后续阶段开发。

## 本地运行

要求 Node.js 22 或兼容版本。

```bash
npm ci
npm run dev
```

打开终端显示的本地地址。默认进入 `/today`。

## 质量检查

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
```

生产构建输出到 `dist/`。本地检查生产构建：

```bash
npm run preview
```

## 数据与隐私

- 没有账号、后端数据库或云同步。
- 不会把任务标题、备注或分类上传到 Vercel。
- 不同浏览器、设备和域名拥有相互独立的数据。
- 清除浏览器站点数据会删除本地任务；完整备份恢复将在后续阶段实现。

## Git 与部署

- 功能分支推送到 GitHub 后由 Vercel生成 Preview。
- `main` 对应 Production。
- 当前项目的 SPA 路由与安全响应头位于 `vercel.json`。

产品范围、数据规则和验收场景以 [`docs/`](docs/) 为准。
