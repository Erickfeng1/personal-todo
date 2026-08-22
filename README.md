# 序 Todo

一个面向个人使用的私人云端待办工具。前端使用 React、TypeScript 和 Vite，Vercel Functions 保护业务 API，Neon PostgreSQL 是任务数据的唯一持久事实来源。

## 当前开发状态

当前分支保留 Phase 0–4 的全部任务管理功能，并正在把持久化切换到 Phase 5 单用户云端架构：

- Inbox、Today、Upcoming、Completed 四个基础视图。
- 只输入标题即可快速创建任务。
- Today 创建时自动设置当天计划日期。
- Neon 云端持久化，刷新、换浏览器或换设备后读取同一份数据。
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
- 替换恢复在单一 Neon 事务内完成；任一写入失败会整体回滚。
- 旧 IndexedDB 只用于一次性迁移；迁移前确认，失败或成功都不自动删除旧数据。
- 离线可打开应用壳，但业务修改不会写入本地或显示为已保存。
- 详情打开自动聚焦、Esc 关闭后焦点归还，以及任务列表大数据渲染优化。
- 响应式桌面/移动端布局和基础键盘快捷键。
- PWA Manifest、Service Worker 更新提示和 Vercel SPA 回退配置。

Phase 4 已完成 Chromium 生产 PWA 离线、360px 移动端、导出—恢复和基础无障碍验收。正式发布前仍建议在真实 Safari/Firefox 与个人手机上各抽测一次，并用真实长期数据观察性能。

当前 Phase 5 已发布到 `https://personal-todo-mauve.vercel.app`，包含单用户访问密码、scrypt 哈希、HttpOnly 会话、数据库级登录限流、受保护的云端 CRUD、实体 revision 冲突保护、云端备份/事务恢复，以及旧 IndexedDB 的显式一次性迁移。Clerk 和旧的本地优先同步运行路径已移除。

## 本地运行

要求 Node.js 22 或兼容版本。

```bash
npm ci
npm run dev
```

打开终端显示的本地地址。纯 `vite` 开发服务器不承载 Vercel Functions，因此会安全显示“无法连接云端”；完整登录和数据流程需要配置服务端环境变量并通过 Vercel Functions 环境运行。

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

- 未建立有效密码会话时，业务 API 不返回任务数据。
- 新建和修改的数据直接写入私人 Neon；浏览器只保留当前会话内存。
- 旧 IndexedDB 数据只有在设置页展示摘要并由用户确认后才会迁移。
- 清除浏览器站点数据不会删除 Neon 数据；仍建议定期导出 JSON 完整备份。

## Phase 5 单用户云端基础设施

复制 `.env.example` 为不会提交的 `.env.local`，填入隔离的单用户访问配置和 Neon 测试/Preview 分支变量。`DATABASE_ENVIRONMENT` 必须是 `development`、`test` 或 `preview`，数据库修改脚本才会运行。

```bash
npm run auth:check
npm run db:migrate
npm run db:check
npm run test:integration
npm run functions:check
```

Vercel Functions 提供 `GET /api/health`、单用户密码会话 `/api/auth/session`，以及受 HttpOnly 会话保护的 `/api/data/*`。Neon 是任务、项目、标签和设置的唯一持久事实来源；IndexedDB 只用于把旧版本数据显式迁移到空云端。

### 单用户云端模式配置

先在本机生成一次访问密码、scrypt 哈希和会话密钥：

```bash
npm run auth:generate
```

把输出的 `ACCESS_PASSWORD` 保存到密码管理器，不要配置到 Vercel。只把 `SINGLE_USER_PASSWORD_HASH`、`SINGLE_USER_SESSION_SECRET` 和 `SINGLE_USER_ID=single-user` 配置为服务端环境变量，并为各环境配置精确的 `APP_ORIGINS`。Development、Preview、Production 必须使用彼此独立的密码哈希、会话密钥和 Neon 数据库。

部署前先在对应隔离数据库执行 migration；`0002_single_user_cloud_mode.sql` 增加数据库级登录限流表。不要提交 `.env.local`，也不要把上述服务端变量加上 `VITE_` 前缀。

## Git 与部署

- 功能分支推送到 GitHub 后由 Vercel生成 Preview。
- `main` 对应 Production。
- 当前项目的 SPA 路由与安全响应头位于 `vercel.json`。

产品范围、数据规则和验收场景以 [`docs/`](docs/) 为准。
