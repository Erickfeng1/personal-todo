# 数据模型与业务规则

> 文档状态：MVP 基线
> Schema 版本：1
> 存储目标：浏览器 IndexedDB
> 原则：领域模型不依赖具体 UI；日期语义明确；所有引用可校验

## 1. 建模原则

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

时区不持久化为任务日期的一部分。`plannedDate` 和 `deadline` 是用户输入的本地自然日；Today 和 Upcoming 使用运行时设备时区计算。未来云同步时必须重新评估跨时区语义。

## 7. 数据库元数据

```ts
interface DatabaseMeta {
  key: 'schemaVersion' | 'createdAt' | 'lastSuccessfulMigrationAt'
  value: string | number
}
```

## 8. IndexedDB 表与索引

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
- 云同步需要 `revision`、设备标识、冲突策略和删除墓碑；不能直接同步当前 Dexie 表。
- 子任务需决定是独立 Task 还是 ChecklistItem。MVP 暂不预留含糊字段。
