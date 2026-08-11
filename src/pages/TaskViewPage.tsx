import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react'
import { taskService } from '../app/services'
import {
  getTodayGroup,
  getUpcomingDate,
  filterAndSortTasks,
  TODAY_GROUP_ORDER
} from '../domain/task/task.rules'
import {
  formatLocalDate,
  getTodayLocal,
  type LocalDate
} from '../domain/date/local-date'
import type { CreateTaskContext, Task } from '../domain/task/task.types'
import { QuickAdd } from '../features/task-create/QuickAdd'
import { TaskDetailsPanel } from '../features/task-detail/TaskDetailsPanel'
import { TaskFilters } from '../features/search-filter/TaskFilters'
import {
  DEFAULT_TASK_FILTERS,
  type TaskFilterState
} from '../features/search-filter/task-filter.types'
import { TaskList } from '../features/task-list/TaskList'
import type { TaskSection } from '../features/task-list/TaskList'
import {
  useTaskCollection,
  type TaskCollection
} from '../hooks/useTaskCollection'
import { useTaskKeyboard } from '../hooks/useTaskKeyboard'
import { useProjects, useTags } from '../hooks/useOrganization'

interface TaskViewPageProps {
  collection: TaskCollection
  entityId?: string
  eyebrow: string
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  quickAdd?: {
    context: CreateTaskContext
    placeholder: string
  }
}

interface Feedback {
  message: string
  undoTaskId?: string
  undoAction?: 'reopen' | 'restore-delete'
}

const TODAY_SECTION_DETAILS = {
  'overdue-deadline': {
    title: '逾期截止',
    description: '已经超过截止日期，需要重新判断或尽快处理。',
    tone: 'overdue'
  },
  'due-today': {
    title: '今日截止',
    description: '最晚需要在今天完成。',
    tone: 'due'
  },
  'carry-over': {
    title: '未完成结转',
    description: '之前计划处理，但尚未完成。',
    tone: 'carry'
  },
  'planned-today': {
    title: '今日计划',
    description: '你主动安排在今天处理。',
    tone: 'planned'
  }
} as const

export function TaskViewPage({
  collection,
  entityId,
  eyebrow,
  title,
  description,
  emptyTitle,
  emptyDescription,
  quickAdd
}: TaskViewPageProps) {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_TASK_FILTERS)
  const includeCompletedSearch =
    filters.includeCompleted && deferredSearch.trim().length > 0
  const tasks = useTaskCollection(collection, entityId)
  const allTasks = useTaskCollection(
    'all',
    undefined,
    true,
    includeCompletedSearch
  )
  const projects = useProjects(true)
  const tags = useTags()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const detailTriggerRef = useRef<HTMLElement | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)

  const closeDetails = useCallback(() => {
    setSelectedTaskId(null)
    window.setTimeout(() => detailTriggerRef.current?.focus(), 0)
  }, [])
  useTaskKeyboard({ onEscape: closeDetails, canCreate: quickAdd !== undefined })

  const filteredTasks = useMemo(() => {
    const sourceTasks = includeCompletedSearch ? allTasks : tasks
    if (!sourceTasks) return []

    return filterAndSortTasks(sourceTasks, {
      ...filters,
      search: deferredSearch
    })
  }, [allTasks, deferredSearch, filters, includeCompletedSearch, tasks])

  const sections = useMemo<TaskSection[] | undefined>(() => {
    const today = getTodayLocal()
    if (collection === 'today' && !includeCompletedSearch) {
      return TODAY_GROUP_ORDER.flatMap((group) => {
        const groupTasks = filteredTasks.filter(
          (task) => getTodayGroup(task, today) === group
        )
        if (groupTasks.length === 0) return []
        const details = TODAY_SECTION_DETAILS[group]
        return [
          {
            id: group,
            title: details.title,
            description: details.description,
            tone: details.tone,
            tasks: groupTasks
          }
        ]
      })
    }

    if (collection === 'upcoming' && !includeCompletedSearch) {
      const grouped = new Map<LocalDate, Task[]>()
      for (const task of filteredTasks) {
        const date = getUpcomingDate(task, today, 7)
        if (!date) continue
        const dateTasks = grouped.get(date) ?? []
        dateTasks.push(task)
        grouped.set(date, dateTasks)
      }
      return [...grouped.entries()]
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, dateTasks]) => {
          const plannedCount = dateTasks.filter(
            (task) => task.plannedDate === date
          ).length
          const deadlineCount = dateTasks.filter(
            (task) => task.deadline === date
          ).length
          return {
            id: date,
            title: formatLocalDate(date),
            description: `${date} · 计划 ${String(plannedCount)} · 截止 ${String(deadlineCount)}`,
            tone: 'upcoming' as const,
            tasks: dateTasks
          }
        })
    }

    if (collection === 'completed') {
      const grouped = new Map<LocalDate, Task[]>()
      for (const task of filteredTasks) {
        if (!task.completedAt) continue
        const date = getTodayLocal(new Date(task.completedAt))
        grouped.set(date, [...(grouped.get(date) ?? []), task])
      }
      return [...grouped.entries()]
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .map(([date, dateTasks]) => ({
          id: date,
          title: formatLocalDate(date),
          description: `${date} · 完成 ${String(dateTasks.length)}`,
          tone: 'planned' as const,
          tasks: dateTasks
        }))
    }

    return undefined
  }, [collection, filteredTasks, includeCompletedSearch])

  const selectedTask =
    filteredTasks.find((task) => task.id === selectedTaskId) ?? null

  const handleToggle = async (task: Task) => {
    setOperationError(null)
    try {
      if (task.status === 'completed') {
        await taskService.reopen(task.id)
        setFeedback({ message: `“${task.title}”已恢复` })
      } else {
        await taskService.complete(task.id)
        setFeedback({
          message: `“${task.title}”已完成`,
          undoTaskId: task.id,
          undoAction: 'reopen'
        })
      }
      if (selectedTaskId === task.id) setSelectedTaskId(null)
    } catch {
      setOperationError('操作没有保存，任务状态未改变，请重试。')
    }
  }

  const handleUndo = async () => {
    if (!feedback?.undoTaskId) return
    try {
      if (feedback.undoAction === 'restore-delete') {
        await taskService.restoreDeleted(feedback.undoTaskId)
        setFeedback({ message: '已撤销删除' })
      } else {
        await taskService.reopen(feedback.undoTaskId)
        setFeedback({ message: '已撤销完成' })
      }
    } catch {
      setOperationError('撤销失败，任务状态没有改变，请重试。')
    }
  }

  const handleDelete = async (task: Task) => {
    setOperationError(null)
    try {
      await taskService.softDelete(task.id)
      setSelectedTaskId(null)
      setFeedback({
        message: `“${task.title}”已删除`,
        undoTaskId: task.id,
        undoAction: 'restore-delete'
      })
    } catch {
      setOperationError('删除失败，任务仍然保留，请重试。')
    }
  }

  return (
    <div className={`task-page${selectedTask ? ' has-detail' : ''}`}>
      <section className="task-workspace">
        <header className="page-header">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div
            className="task-count"
            aria-label={`${String(tasks?.length ?? 0)} 项任务`}
          >
            <strong>{tasks?.length ?? '—'}</strong>
            <span>项任务</span>
          </div>
        </header>

        {quickAdd ? (
          <QuickAdd
            context={quickAdd.context}
            placeholder={quickAdd.placeholder}
          />
        ) : null}

        <TaskFilters
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          projects={projects ?? []}
          tags={tags ?? []}
        />

        {operationError ? (
          <div className="inline-error" role="alert">
            {operationError}
          </div>
        ) : null}

        {tasks === undefined ? (
          <div className="loading-list" aria-label="正在读取本地任务">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <TaskList
            tasks={filteredTasks}
            {...(sections ? { sections } : {})}
            selectedTaskId={selectedTaskId}
            onSelect={(task) => {
              detailTriggerRef.current =
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null
              setSelectedTaskId(task.id)
            }}
            onToggle={handleToggle}
            projects={projects ?? []}
            tags={tags ?? []}
            emptyTitle={
              tasks.length > 0 && filteredTasks.length === 0
                ? '没有符合条件的任务'
                : emptyTitle
            }
            emptyDescription={
              tasks.length > 0 && filteredTasks.length === 0
                ? '试试清除搜索词或切换分类筛选。'
                : emptyDescription
            }
          />
        )}
      </section>

      <TaskDetailsPanel
        key={selectedTask?.id ?? 'no-selection'}
        task={selectedTask}
        onClose={closeDetails}
        onDelete={handleDelete}
      />

      {feedback ? (
        <div className="feedback-toast" role="status">
          <span>{feedback.message}</span>
          {feedback.undoTaskId ? (
            <button type="button" onClick={() => void handleUndo()}>
              撤销
            </button>
          ) : null}
          <button
            type="button"
            className="feedback-close"
            onClick={() => setFeedback(null)}
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  )
}
