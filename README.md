# 序 Todo

一个面向个人使用、本地优先的待办任务管理工具。MVP 使用 React、TypeScript、Vite 和 Dexie 构建，任务数据保存在当前浏览器的 IndexedDB 中。

## 当前开发状态

当前分支已完成 Phase 0–4 的 MVP 功能与数据安全闭环：

- Inbox、Today、Upcoming、Completed 四个基础视图。
- 只输入标题即可快速创建任务。
- Today 创建时自动设置当天计划日期。
- IndexedDB 本地持久化，刷新后数据保留。
- 完成、短时撤销和从 Completed 恢复。
- 编辑标题、备注、计划日期和截止日期，支持显式保存与取消。
- 计划日期与截止日期独立，计划晚于截止时提供非阻断警告。
- Today 按逾期截止、今日截止、未完成结转、今日计划去重分组。
- Upcoming 展示明日起未来 7 个自然日，并按最早相关日期分组。
- 重要 / 不重要、紧急 / 不紧急两个独立维度。
- 项目创建、重命名和归档；归档不会删除原任务。
- 标签创建、重命名和删除；删除标签只解除关联，不会删除任务。
- 任务可归属一个项目、关联多个标签，并从项目或标签详情快速创建。
- 标题与备注搜索，以及状态、重要性、紧急性、四象限、项目和标签的 AND 组合筛选。
- 按创建时间、计划日期、截止日期或四象限排序。
- 任务软删除与短时撤销；Completed 按本地完成日期分组。
- 设置页支持跟随系统、浅色、深色主题，以及周一/周日起始偏好。
- 设置页展示活动任务、已完成、项目、标签和软删除数据摘要。
- 导出版本化 JSON 完整备份，包含软删除任务、项目、标签和设置。
- 恢复前执行文件大小、schema、字段、ID 唯一性和跨实体引用校验，并展示摘要和二次确认。
- 替换恢复在单一 IndexedDB 事务内完成；任一写入失败会整体回滚。
- IndexedDB schema v3 迁移保留旧任务并增加设置与迁移元数据。
- 首次在线加载后可离线打开应用、创建和编辑本地任务，并显示离线提示。
- 详情打开自动聚焦、Esc 关闭后焦点归还，以及任务列表大数据渲染优化。
- 响应式桌面/移动端布局和基础键盘快捷键。
- PWA Manifest、Service Worker 更新提示和 Vercel SPA 回退配置。

Phase 4 已完成 Chromium 生产 PWA 离线、360px 移动端、导出—恢复和基础无障碍验收。正式发布前仍建议在真实 Safari/Firefox 与个人手机上各抽测一次，并用真实长期数据观察性能。

Phase 5A–5B 已完成可选云同步的基础设施与只读账号切片：设置页可登录/退出，服务端使用 Clerk 会话隔离 Neon 查询，并可读取云端摘要与首个增量页。登录不会自动上传本地任务，首次迁移、双向同步、冲突与删除安全仍属于 Phase 5C–5E；本地功能与 IndexedDB 数据路径保持不变。

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

- 账号登录是可选能力；未登录时全部 MVP 功能继续使用 IndexedDB。本阶段登录后只读取云端摘要，不代表已启用同步。
- 在后续阶段由用户明确登录、确认首次上传前，不会把任务标题、备注或分类上传到云端。
- 不同浏览器、设备和域名拥有相互独立的数据。
- 清除浏览器站点数据会删除本地任务；可在设置页定期导出 JSON 完整备份。

## Phase 5A–5B 本地基础设施

复制 `.env.example` 为不会提交的 `.env.local`，填入隔离的 Clerk 测试实例和 Neon 测试/Preview 分支变量。`DATABASE_ENVIRONMENT` 必须是 `development`、`test` 或 `preview`，数据库修改脚本才会运行。

```bash
npm run auth:check
npm run db:migrate
npm run db:check
npm run test:integration
npm run functions:check
```

Vercel Functions 提供 `GET /api/health`，以及受 Clerk 会话保护的 `GET /api/sync/state?protocolVersion=1` 和 `GET /api/sync/pull?protocolVersion=1`。`pull` 使用与服务端用户身份绑定的签名游标。首次上传、push、持续双向同步和冲突处理将在 Phase 5C～5E 按验收场景逐步实现。

## Git 与部署

- 功能分支推送到 GitHub 后由 Vercel生成 Preview。
- `main` 对应 Production。
- 当前项目的 SPA 路由与安全响应头位于 `vercel.json`。

产品范围、数据规则和验收场景以 [`docs/`](docs/) 为准。
