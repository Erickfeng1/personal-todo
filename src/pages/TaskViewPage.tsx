import { useCallback, useMemo, useState } from 'react'
import { taskService } from '../app/services'
import { matchesClassificationFilter } from '../domain/task/task.rules'
import type {
  ClassificationFilter,
  CreateTaskContext,
  Task
} from '../domain/task/task.types'
import { QuickAdd } from '../features/task-create/QuickAdd'
import { TaskDetailsPanel } from '../features/task-detail/TaskDetailsPanel'
import { TaskFilters } from '../features/search-filter/TaskFilters'
import { TaskList } from '../features/task-list/TaskList'
import {
  useTaskCollection,
  type TaskCollection
} from '../hooks/useTaskCollection'
import { useTaskKeyboard } from '../hooks/useTaskKeyboard'

interface TaskViewPageProps {
  collection: TaskCollection
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
}

export function TaskViewPage({
  collection,
  eyebrow,
  title,
  description,
  emptyTitle,
  emptyDescription,
  quickAdd
}: TaskViewPageProps) {
  const tasks = useTaskCollection(collection)
  const [search, setSearch] = useState('')
  const [classification, setClassification] =
    useState<ClassificationFilter>('all')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)

  const closeDetails = useCallback(() => setSelectedTaskId(null), [])
  useTaskKeyboard({ onEscape: closeDetails, canCreate: quickAdd !== undefined })

  const filteredTasks = useMemo(() => {
    if (!tasks) return []
    const normalizedSearch = search.trim().toLocaleLowerCase()
    return tasks.filter((task) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        task.title.toLocaleLowerCase().includes(normalizedSearch) ||
        task.notes.toLocaleLowerCase().includes(normalizedSearch)
      return matchesSearch && matchesClassificationFilter(task, classification)
    })
  }, [classification, search, tasks])

  const selectedTask = tasks?.find((task) => task.id === selectedTaskId) ?? null

  const handleToggle = async (task: Task) => {
    setOperationError(null)
    try {
      if (task.status === 'completed') {
        await taskService.reopen(task.id)
        setFeedback({ message: `“${task.title}”已恢复` })
      } else {
        await taskService.complete(task.id)
        setFeedback({ message: `“${task.title}”已完成`, undoTaskId: task.id })
      }
      if (selectedTaskId === task.id) setSelectedTaskId(null)
    } catch {
      setOperationError('操作没有保存，任务状态未改变，请重试。')
    }
  }

  const handleUndo = async () => {
    if (!feedback?.undoTaskId) return
    try {
      await taskService.reopen(feedback.undoTaskId)
      setFeedback({ message: '已撤销完成' })
    } catch {
      setOperationError('撤销失败，请前往“已完成”恢复任务。')
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
          classification={classification}
          onClassificationChange={setClassification}
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
            selectedTaskId={selectedTaskId}
            onSelect={(task) => setSelectedTaskId(task.id)}
            onToggle={handleToggle}
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
