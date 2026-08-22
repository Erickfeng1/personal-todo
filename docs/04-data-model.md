# 数据模型与业务规则

> 文档状态：MVP 基线 + Phase 5 已批准范围
> 本地业务 Schema 版本：1（Phase 5 实现时递增）
> 存储目标：Neon PostgreSQL 是业务数据唯一事实来源；IndexedDB 仅作为旧数据迁移输入
> 原则：领域模型不依赖具体 UI；日期语义明确；所有引用可校验

## 1. 建模原则

当前持久化原则（D-020）：

- `Task`、`Project`、`Tag`、`AppSettings` 只由服务端 API 持久化到 Neon。
- 客户端可以维护当前会话内存快照，但不得把它作为持久业务数据源。
- 每个云端实体具有服务端 `revision`；该字段是存储信封元数据，不进入领域对象 payload。
- 所有行使用固定服务端 owner `single-user`，客户端不得提交或选择 owner。
- 第 8、16、18、19 节中的 IndexedDB 日常写入/outbox/同步规则是历史设计，由 D-020 取代；仅第 20 节的一次性迁移读取仍适用。
- `single_user_login_attempts` 只保存由会话密钥 HMAC 后的请求来源指纹、失败次数、窗口起点和锁定到期时间；不保存访问密码或原始 IP，并用于 15 分钟窗口内的服务端限流。

1. 一项任务只存一份，页面视图由查询得到。
2. “计划日期”与“截止日期”是不同业务概念。
3. 本地自然日使用 `YYYY-MM-DD`，时间戳使用 UTC ISO 8601。
4. 一项任务最多属于一个项目，可以有多个标签。
5. 完成与删除是独立状态；删除采用软删除。
6. 导出格式带 schema 版本，为以后迁移留出空间。
7. UI 不直接读写数据库表，通过 Repository 和领域服务访问。

## 2. 基础类型

```ts
type UUID = string
type LocalDate = `${number}-${number}-${number}` // 运行时仍需严格校验 YYYY-MM-DD
type UTCDateTime = string // ISO 8601，例如 2026-08-11T09:30:00.000Z

type TaskStatus = 'todo' | 'completed'
type TaskImportance = 'important' | 'not-important'
type TaskUrgency = 'urgent' | 'not-urgent'
type EisenhowerQuadrant =
  | 'important-urgent'
  | 'important-not-urgent'
  | 'not-important-urgent'
  | 'not-important-not-urgent'
type ThemePreference = 'system' | 'light' | 'dark'
type WeekStartsOn = 0 | 1 // 0 = Sunday, 1 = Monday
```

不把 `overdue` 作为持久化状态；它由 `deadline`、当前本地日期和任务状态计算。

## 3. Task

```ts
interface Task {
  id: UUID
  title: string
  notes: string
  status: TaskStatus
  /** 重要性与紧急性均允许未设置，避免阻塞快速创建 */
  importance: TaskImportance | null
  urgency: TaskUrgency | null

  /** 准备在哪一天处理；不代表硬性期限 */
  plannedDate: LocalDate | null

  /** 最晚必须完成的自然日 */
  deadline: LocalDate | null

  /** 是否仍处于未整理收集箱 */
  inbox: boolean

  projectId: UUID | null
  tagIds: UUID[]

  /** 同一视图内的稳定顺序；MVP 可先按创建时间生成 */
  sortOrder: number

  createdAt: UTCDateTime
  updatedAt: UTCDateTime
  completedAt: UTCDateTime | null
  deletedAt: UTCDateTime | null
}
```

### 3.1 Task 不变量

- `id` 在数据库内唯一且不可修改。
- `title.trim()` 长度必须为 1–300 字符。
- `notes` 最长 20,000 字符，按纯文本存储。
- `tagIds` 去重；每个 ID 必须引用存在的 Tag。
- `projectId` 非空时必须引用存在的 Project。
- `importance` 只能是 `important`、`not-important` 或 `null`。
- `urgency` 只能是 `urgent`、`not-urgent` 或 `null`。
- 四象限是由 `importance` 与 `urgency` 派生的查询结果，不持久化为普通标签或第三个状态字段。
- `status = 'completed'` 时 `completedAt` 必须非空。
- `status = 'todo'` 时 `completedAt` 必须为空。
- `deletedAt` 非空的任务不进入普通查询。
- `updatedAt >= createdAt`。
- `sortOrder` 必须是有限数值。
- 允许 `plannedDate > deadline`，但保存前必须警告用户；MVP 不强制拦截，因为现实中可能是数据录入错误，也可能需要用户自行确认。

### 3.2 Inbox 规则

- 从 Inbox 快速创建：`inbox = true`。
- 从 Today 创建：`inbox = false` 且 `plannedDate = today`。
- 从项目页创建：`inbox = false` 且设置当前 `projectId`。
- 设置项目或计划日期时，默认 `inbox = false`。
- 仅增加备注、重要性、紧急性、截止日期或标签，不自动移出 Inbox；用户仍可能需要后续决定归属和行动日期。
- 用户可显式设置 `inbox = true`，此操作不清除其他字段。

### 3.3 完成与恢复

完成：

```ts
status = 'completed'
completedAt = nowUtc
updatedAt = nowUtc
```

恢复：

```ts
status = 'todo'
completedAt = null
updatedAt = nowUtc
```

完成和恢复不修改 `plannedDate`、`deadline`、`projectId`、`tagIds` 或 `inbox`。

### 3.4 删除与撤销

删除：设置 `deletedAt = nowUtc`，不改变完成状态。
撤销删除：设置 `deletedAt = null` 并更新 `updatedAt`。

MVP 不做自动永久清理。以后增加回收站时，应在独立决策中定义保留周期。

## 4. Project

```ts
interface Project {
  id: UUID
  name: string
  color: string | null
  sortOrder: number
  archivedAt: UTCDateTime | null
  createdAt: UTCDateTime
  updatedAt: UTCDateTime
}
```

不变量：

- `name.trim()` 长度为 1–100 字符。
- 项目名比较时忽略首尾空格；是否允许同名由实现统一决定，MVP 推荐同名拦截以减少误选。
- 归档不删除任务，也不清除任务的 `projectId`。
- 已归档项目默认不出现在创建和编辑选择器中。

## 5. Tag

```ts
interface Tag {
  id: UUID
  name: string
  color: string | null
  createdAt: UTCDateTime
  updatedAt: UTCDateTime
}
```

不变量：

- `name.trim()` 长度为 1–50 字符。
- 标签名在大小写不敏感比较下唯一。
- 删除标签必须在同一事务中从所有 Task 的 `tagIds` 中移除。
- 删除标签不能删除关联任务。

## 6. AppSettings

```ts
interface AppSettings {
  id: 'singleton'
  theme: ThemePreference
  weekStartsOn: WeekStartsOn
  locale: string
  updatedAt: UTCDateTime
}
```

MVP 默认值：

```ts
{
  id: 'singleton',
  theme: 'system',
  weekStartsOn: 1,
  locale: navigator.language || 'zh-CN'
}
```

时区不持久化为任务日期的一部分。`plannedDate` 和 `deadline` 是用户输入的本地自然日；Today 和 Upcoming 使用运行时设备时区计算。Phase 5 跨设备同步日期字符串本身，不按设备时区转换；用户旅行或两台设备处于不同时区时，各设备仍按自己的本地“今天”派生视图。

## 7. 数据库元数据

```ts
interface DatabaseMeta {
  key: 'schemaVersion' | 'createdAt' | 'lastSuccessfulMigrationAt'
  value: string | number
}
```

## 8. IndexedDB 表与索引（历史数据与一次性迁移）

建议使用 Dexie 管理 IndexedDB。

```text
tasks:
  id,
  status,
  inbox,
  importance,
  urgency,
  plannedDate,
  deadline,
  projectId,
  *tagIds,
  completedAt,
  deletedAt,
  createdAt,
  updatedAt

projects:
  id,
  name,
  archivedAt,
  sortOrder,
  updatedAt

tags:
  id,
  &nameNormalized,
  updatedAt

settings:
  id

meta:
  key
```

说明：

- `*tagIds` 表示多值索引。
- 若需要大小写不敏感唯一标签名，可以在存储模型增加 `nameNormalized`；该字段属于持久化适配层，不必暴露给领域 UI。
- Today 组合查询可以先利用单字段索引分别查询再在内存合并去重；不应为了视图创建重复任务表。

## 9. 派生状态与查询规则

所有规则仅考虑：`status = 'todo'` 且 `deletedAt = null`，除非查询明确指定 Completed。

### 9.1 日期辅助函数

```ts
getTodayLocal(): LocalDate
compareLocalDate(a: LocalDate, b: LocalDate): -1 | 0 | 1
addLocalDays(date: LocalDate, days: number): LocalDate
```

不要通过 `new Date('YYYY-MM-DD')` 隐式解析后直接比较，因为不同环境可能引入 UTC/本地时区歧义。使用显式的本地日期工具函数。

### 9.2 Today

归组优先级：

```ts
function getTodayGroup(task: Task, today: LocalDate) {
  if (task.deadline && task.deadline < today) return 'overdue-deadline'
  if (task.deadline === today) return 'due-today'
  if (task.plannedDate && task.plannedDate < today) return 'carry-over'
  if (task.plannedDate === today) return 'planned-today'
  return null
}
```

同一任务只属于第一个命中的组。

### 9.3 Upcoming

- 窗口为 `[tomorrow, today + 7 days]`，共 7 个未来自然日。
- `plannedDate` 或 `deadline` 落在窗口中即进入。
- 同一任务在同一天只呈现一次。
- 如果计划日期和截止日期是不同的未来日期，产品决定是分别在两天呈现还是只按最近日期呈现。MVP 决策：只在最早相关日期呈现，并同时在任务元信息显示另一个日期，避免重复；该决定在实测后复核。

### 9.4 Overdue

```ts
isOverdue = status === 'todo' && deadline !== null && deadline < today
```

计划日期早于今天不称为“逾期”，称为“未完成结转”。

### 9.5 Completed

- `status = 'completed'`
- `deletedAt = null`
- 默认按 `completedAt` 倒序

### 9.6 重要性、紧急性与四象限

```ts
function getEisenhowerQuadrant(task: Task): EisenhowerQuadrant | null {
  if (task.importance === null || task.urgency === null) return null

  if (task.importance === 'important' && task.urgency === 'urgent') {
    return 'important-urgent'
  }
  if (task.importance === 'important' && task.urgency === 'not-urgent') {
    return 'important-not-urgent'
  }
  if (task.importance === 'not-important' && task.urgency === 'urgent') {
    return 'not-important-urgent'
  }
  return 'not-important-not-urgent'
}
```

查询规则：

- “重要”筛选：`importance = important`，不限制 `urgency`。
- “紧急”筛选：`urgency = urgent`，不限制 `importance`。
- 单一维度筛选组合时使用 AND，例如“重要”+“不紧急”。
- 四象限筛选要求两个维度都已设置并精确匹配。
- “未分类”筛选：`importance = null OR urgency = null`。
- `importance` 与 `urgency` 是系统字段，不写入 `tagIds`，普通标签的增删改不影响它们。
- 四象限排序的固定顺序为：重要且紧急、重要但不紧急、不重要但紧急、不重要且不紧急、未分类；这只是展示顺序，不自动改写任务。

## 10. 命令与服务接口

推荐领域服务接口：

```ts
interface TaskService {
  create(input: CreateTaskInput, context: CreateContext): Promise<Task>
  update(id: UUID, patch: UpdateTaskInput): Promise<Task>
  complete(id: UUID): Promise<Task>
  reopen(id: UUID): Promise<Task>
  softDelete(id: UUID): Promise<void>
  restoreDeleted(id: UUID): Promise<Task>
  addToToday(id: UUID, today: LocalDate): Promise<Task>
  removeFromToday(id: UUID, today: LocalDate): Promise<Task>
  moveToInbox(id: UUID): Promise<Task>
}
```

```ts
interface TaskRepository {
  getById(id: UUID): Promise<Task | undefined>
  save(task: Task): Promise<void>
  queryInbox(): Promise<Task[]>
  queryToday(today: LocalDate): Promise<Task[]>
  queryUpcoming(today: LocalDate, days: number): Promise<Task[]>
  queryByProject(projectId: UUID): Promise<Task[]>
  queryByTag(tagId: UUID): Promise<Task[]>
  queryCompleted(): Promise<Task[]>
  search(query: TaskSearchQuery): Promise<Task[]>
}
```

`TaskSearchQuery` 应分别包含 `importance`、`urgency`、`quadrant` 与 `classificationStatus` 条件，禁止把系统分类编码为普通 Tag 名称。

## 11. 导出格式

```ts
interface BackupEnvelopeV1 {
  schemaVersion: 1
  appVersion: string
  exportedAt: UTCDateTime
  data: {
    tasks: Task[]
    projects: Project[]
    tags: Tag[]
    settings: AppSettings
  }
  summary: {
    taskCount: number
    projectCount: number
    tagCount: number
  }
}
```

文件名建议：

```text
personal-todo-backup-YYYY-MM-DD-HHmm.json
```

导出包含软删除任务，以保证备份完整；恢复后普通视图仍隐藏它们。导出文件不得包含浏览器标识、设备指纹或无关缓存。

## 12. 导入校验与事务

导入顺序：

1. 检查文件大小上限。
2. JSON 解析。
3. 校验 `schemaVersion`。
4. 校验实体字段、枚举、日期和长度。
5. 校验 ID 唯一性。
6. 校验 `projectId` 和 `tagIds` 引用。
7. 生成数据摘要。
8. 用户确认“替换恢复”。
9. 在单一读写事务中清空并写入所有业务表。
10. 写入 schema 元数据并刷新查询。

任一步失败都不得修改现有数据。MVP 不支持合并导入，因此不存在重复 ID 合并规则。

## 13. 数据库迁移

- 每次持久化结构变更增加 Dexie version。
- 迁移函数必须可重复测试，但不要求可重复执行。
- 迁移前后记录 schema 版本。
- 迁移失败时停止应用写入，提示用户导出可读取数据或恢复旧版本备份。
- 不允许为了修复迁移直接清空用户数据库。

## 14. 未来模型扩展注意事项

- 周期任务需要 `RecurrenceRule`、系列主任务和实例策略，不能只给 Task 加一个字符串。
- 提醒需要 `reminderAt`、权限状态、触发渠道和错过提醒策略。
- Phase 5 云同步使用独立同步元数据、版本检查和删除墓碑；不能直接把当前 Dexie 表暴露给云端，详见第 15～20 节。
- 子任务需决定是独立 Task 还是 ChecklistItem。MVP 暂不预留含糊字段。

## 15. Phase 5 建模边界（当前云端权威模式）

当前模式不再维护本地/云端双副本。云表沿用 `cloud_tasks`、`cloud_projects`、`cloud_tags`、`cloud_settings`，固定 `user_id = 'single-user'`；`payload` 继续使用本文件定义的领域对象，`revision` 由服务端单调递增。`sync_deleted_at`、`sync_changes`、`processed_mutations` 和本地同步元数据仅为历史兼容结构，不参与新客户端运行路径。

JSON 替换恢复与旧 IndexedDB 首次迁移都必须在一个服务端事务中完成：先完整校验，再替换固定 owner 的四类业务数据；失败时回滚全部写入。

Phase 5 不修改第 3～6 节的领域实体语义，也不把 `userId`、网络错误或队列状态塞进 `Task`、`Project`、`Tag`。同步信息属于持久化适配层，原因是：

- 未登录的本地模式不需要所有者字段。
- 业务规则测试不应依赖网络或身份提供商。
- 同一实体在不同设备有各自的本地同步状态，但共享同一云端版本。
- JSON 业务备份默认保持可读，不包含登录令牌、设备标识、队列和冲突内部数据。

云端表使用与本地相同的客户端生成 UUID。`plannedDate`、`deadline` 仍按 `YYYY-MM-DD` 保存；事件时间仍使用 UTC。

## 16. 本地同步元数据（历史，D-020 已取代）

Phase 5 增加以下 IndexedDB 适配层表；具体 Dexie schema 版本由实现提交确定并配套迁移测试。

```ts
type SyncEntityType = 'task' | 'project' | 'tag' | 'settings'
type SyncOperation = 'upsert' | 'delete'
type SyncState =
  | 'local-only'
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'conflict'

interface SyncRecord {
  entityType: SyncEntityType
  entityId: UUID
  accountSubject: string | null
  serverRevision: number | null
  state: SyncState
  lastAttemptAt: UTCDateTime | null
  lastSyncedAt: UTCDateTime | null
  lastErrorCode: string | null
}

interface SyncOutboxItem {
  mutationId: UUID
  accountSubject: string
  entityType: SyncEntityType
  entityId: UUID
  operation: SyncOperation
  /** 创建操作为 null；更新/删除为客户端最后确认的服务端版本 */
  baseRevision: number | null
  /** 由应用服务生成的版本化、已校验业务快照；delete 可为空 */
  payload: unknown | null
  createdAt: UTCDateTime
  attemptCount: number
  nextAttemptAt: UTCDateTime | null
}

interface SyncConflict {
  id: UUID
  accountSubject: string
  entityType: SyncEntityType
  entityId: UUID
  localPayload: unknown | null
  serverPayload: unknown | null
  baseRevision: number | null
  serverRevision: number
  detectedAt: UTCDateTime
  resolvedAt: UTCDateTime | null
}

interface SyncCursor {
  accountSubject: string
  cursor: string | null
  updatedAt: UTCDateTime
}

interface SyncProfile {
  id: 'singleton'
  accountSubject: string | null
  enabled: boolean
  installationId: UUID
  bootstrapState: 'not-started' | 'uploading' | 'ready' | 'failed'
  lastSuccessfulSyncAt: UTCDateTime | null
}
```

约束：

- `installationId` 是随机安装标识，只用于幂等和诊断，不作为浏览器指纹，也不写入业务备份。
- `accountSubject` 使用认证后端提供的稳定主体 ID；UI 不可修改。
- 未启用同步的本地修改不创建 outbox，首次 bootstrap 直接读取一致业务快照；启用同步后的 outbox 项必须绑定最后确认的账号。重新登录不同账号时必须停止并隔离队列，不能改写其归属。
- 业务写入和对应 `SyncOutboxItem` 必须在同一个 IndexedDB 事务中提交。
- `SyncOutboxItem.payload` 在出队前必须再次通过当前同步协议 schema 校验。
- 退出登录不删除以上数据；切换到不同账号时不得复用前一账号的游标、版本或队列。Phase 5 首版不支持在同一浏览器无缝切换多个账号，检测到不一致时必须停止同步。

## 17. 云端关系模型

所有云端业务表均包含以下同步列：

```ts
interface CloudColumns {
  userId: string
  id: UUID
  revision: number // 从 1 开始，每次接受写入 +1
  serverUpdatedAt: UTCDateTime
  deletedAt: UTCDateTime | null // 同步墓碑；不等同于 Task 业务软删除字段
}
```

为避免 Task 本身已有 `deletedAt` 产生歧义，实际 SQL 推荐把同步墓碑命名为 `sync_deleted_at`；Task 业务快照中的 `deletedAt` 仍按原语义保留。云端表建议如下：

```text
cloud_tasks
  user_id, id, payload, revision, server_updated_at, sync_deleted_at

cloud_projects
  user_id, id, payload, revision, server_updated_at, sync_deleted_at

cloud_tags
  user_id, id, payload, revision, server_updated_at, sync_deleted_at

cloud_settings
  user_id, id='singleton', payload, revision, server_updated_at, sync_deleted_at

processed_mutations
  user_id, mutation_id, installation_id, result_revision, processed_at

sync_changes
  sequence, user_id, entity_type, entity_id, revision,
  server_updated_at, sync_deleted_at

sync_bootstraps
  user_id, bootstrap_id, status, expected_counts, received_counts,
  created_at, completed_at
```

说明：

- 业务 payload 可以先用 JSONB 保存与本地 schema 对齐的受验证快照；常用查询或完整服务端查询成为需求后，再把字段正规化。不得把未校验 JSON 直接回传客户端。
- 所有主键或唯一约束必须包含 `user_id`；`processed_mutations` 对 `(user_id, mutation_id)` 唯一。
- `sync_changes.sequence` 是服务端生成的单调游标来源，客户端不得构造。
- 服务端在同一事务中写业务表、幂等记录和变更日志。
- 服务端校验 Task 的项目/标签引用属于同一用户；不得只验证 ID 存在。
- Task 的普通“删除”仍映射为业务 payload 中的 `Task.deletedAt`；服务端可同时保留最后快照和同步墓碑，客户端恢复时仍能还原该任务。Tag 等真正移除本地实体的操作使用仅表示实体消失的同步墓碑，并在同一事务中清理引用。

## 18. 同步写入规则（历史，D-020 已取代）

一次本地修改：

1. 应用服务生成新业务实体与稳定 `mutationId`。
2. 在同一 Dexie 事务中写业务实体、`SyncRecord(state='pending')` 和 `SyncOutboxItem`。
3. 同步器提交 `mutationId`、`installationId`、实体类型、操作、`baseRevision` 和 payload。
4. 服务端验证会话、用户边界、协议版本、引用和字段不变量。
5. 若 `mutationId` 已处理，返回原结果，不重复写入。
6. 若 `baseRevision` 与当前 revision 一致，服务端事务性接受并递增 revision。
7. 若版本不一致，返回冲突及当前服务端快照；客户端创建 `SyncConflict`，不得删除原 outbox 内容。
8. 接受后客户端更新 `serverRevision`、移除对应 outbox，并标记 `synced`。

同一实体的多次未发送本地修改可以在客户端压缩，但必须保持最终操作、首次 `baseRevision` 和删除语义正确；实现前需用单元测试证明压缩规则。

## 19. 增量拉取与删除墓碑（历史，D-020 已取代）

- 客户端以 `SyncCursor.cursor` 拉取该用户在游标之后的有序变更。
- 服务端返回变更快照或墓碑，以及只有服务端能够签发/解释的下一游标。
- 客户端在单一 Dexie 事务中应用一个拉取页，再推进游标；应用失败时游标不得前进。
- 无本地待提交修改时，较新 revision 覆盖本地业务快照并更新 `SyncRecord`。
- 存在本地待提交修改且服务端 revision 前进时，进入冲突，不自动覆盖。
- 墓碑使离线旧设备能够得知删除。Task 墓碑在保留期内携带最后一个受验证快照，以支持现有软删除/撤销语义；Tag 墓碑可不携带 payload。墓碑保留策略在上线前按最长支持离线周期确定；没有完成全量重建机制前不得硬删除墓碑。

## 20. 首次迁移与 JSON 恢复（当前）

首次迁移：

1. 读取一致的本地业务快照并生成摘要。
2. 查询云端是否为空；“为空”表示没有业务实体、墓碑、未完成 bootstrap 或同步历史，只有该状态才进入自动 bootstrap。
3. 用户确认后创建 `bootstrapId`，按有界批次上传。
4. 服务端校验预期数量、实体引用和每批幂等性。
5. 所有批次完成后，服务端在事务边界内把 bootstrap 标为完成并返回初始游标。
6. 客户端收到完成确认后设置 `bootstrapState='ready'`；整个过程中不清空本地业务表。

JSON 业务备份继续使用第 11 节格式，不包含认证和同步内部表。已启用同步时执行“替换恢复”必须先暂停同步，并在事务前取得恢复前业务快照：备份中新增或变化的实体生成 upsert；恢复前存在但备份中不存在的已同步实体生成 delete；已有实体沿用已知 `serverRevision`。业务表替换、同步元数据重建和 outbox 生成必须在同一个本地事务中完成。用户再次明确确认后才推送，服务端仍执行版本检查；因此恢复不能绕过冲突保护直接覆盖云端。
