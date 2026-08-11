import { useEffect, useRef, useState, type FormEvent } from 'react'
import { taskService } from '../../app/services'
import { CloseIcon } from '../../components/icons'
import { getTodayLocal, type LocalDate } from '../../domain/date/local-date'
import { AppError } from '../../domain/shared/app-error'
import { useProjects, useTags } from '../../hooks/useOrganization'
import type {
  Task,
  TaskImportance,
  TaskUrgency,
  UpdateTaskDetailsInput
} from '../../domain/task/task.types'

interface TaskDetailsPanelProps {
  task: Task | null
  onClose: () => void
  onDelete: (task: Task) => Promise<void>
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function TaskDetailsPanel({
  task,
  onClose,
  onDelete
}: TaskDetailsPanelProps) {
  const projects = useProjects(true)
  const tags = useTags()
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<UpdateTaskDetailsInput>(() => ({
    title: task?.title ?? '',
    notes: task?.notes ?? '',
    importance: task?.importance ?? null,
    urgency: task?.urgency ?? null,
    plannedDate: task?.plannedDate ?? null,
    deadline: task?.deadline ?? null,
    inbox: task?.inbox ?? false,
    projectId: task?.projectId ?? null,
    tagIds: task?.tagIds ?? []
  }))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (task) titleInputRef.current?.focus()
  }, [task])

  if (!task) return null

  const isDirty =
    draft.title !== task.title ||
    draft.notes !== task.notes ||
    draft.importance !== task.importance ||
    draft.urgency !== task.urgency ||
    draft.plannedDate !== task.plannedDate ||
    draft.deadline !== task.deadline ||
    draft.inbox !== task.inbox ||
    draft.projectId !== task.projectId ||
    draft.tagIds.join(',') !== task.tagIds.join(',')
  const dateOrderWarning =
    draft.plannedDate !== null &&
    draft.deadline !== null &&
    draft.plannedDate > draft.deadline

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaveState('saving')
    setError(null)
    try {
      await taskService.updateDetails(task.id, draft)
      setSaveState('saved')
    } catch (cause) {
      setSaveState('error')
      setError(
        cause instanceof AppError
          ? cause.message
          : '保存失败，草稿仍保留在表单中，请重试'
      )
    }
  }

  const updateImportance = (importance: TaskImportance | null) => {
    setDraft((current) => ({ ...current, importance }))
    setSaveState('idle')
    setError(null)
  }

  const updateUrgency = (urgency: TaskUrgency | null) => {
    setDraft((current) => ({ ...current, urgency }))
    setSaveState('idle')
    setError(null)
  }

  const updateDate = (field: 'plannedDate' | 'deadline', value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value.length === 0 ? null : (value as LocalDate),
      inbox: field === 'plannedDate' && value.length > 0 ? false : current.inbox
    }))
    setSaveState('idle')
    setError(null)
  }

  return (
    <aside className="detail-panel" aria-label={`任务详情：${task.title}`}>
      <div className="detail-header">
        <span className="detail-eyebrow">任务详情</span>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="关闭详情"
        >
          <CloseIcon />
        </button>
      </div>
      <h2>编辑任务</h2>
      <form
        className="detail-form"
        onSubmit={(event) => void handleSave(event)}
      >
        <div className="detail-field">
          <label htmlFor="task-title">标题</label>
          <input
            ref={titleInputRef}
            id="task-title"
            value={draft.title}
            maxLength={300}
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                title: event.target.value
              }))
              setSaveState('idle')
              setError(null)
            }}
            disabled={saveState === 'saving'}
          />
        </div>

        <div className="detail-field">
          <label htmlFor="task-notes">备注</label>
          <textarea
            id="task-notes"
            value={draft.notes}
            maxLength={20000}
            rows={5}
            placeholder="补充上下文、下一步或相关信息…"
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                notes: event.target.value
              }))
              setSaveState('idle')
              setError(null)
            }}
            disabled={saveState === 'saving'}
          />
        </div>

        <div className="detail-date-grid">
          <div className="detail-field">
            <label htmlFor="task-planned-date">计划日期</label>
            <input
              id="task-planned-date"
              type="date"
              value={draft.plannedDate ?? ''}
              onChange={(event) =>
                updateDate('plannedDate', event.target.value)
              }
              disabled={saveState === 'saving'}
            />
            <small>你准备在哪一天处理它。</small>
          </div>
          <div className="detail-field">
            <label htmlFor="task-deadline">截止日期</label>
            <input
              id="task-deadline"
              type="date"
              value={draft.deadline ?? ''}
              onChange={(event) => updateDate('deadline', event.target.value)}
              disabled={saveState === 'saving'}
            />
            <small>它最晚必须在哪一天完成。</small>
          </div>
        </div>

        <div className="date-shortcuts" aria-label="计划日期快捷操作">
          <button
            type="button"
            onClick={() => updateDate('plannedDate', getTodayLocal())}
          >
            安排到今天
          </button>
          <button type="button" onClick={() => updateDate('plannedDate', '')}>
            清除计划日期
          </button>
          <button type="button" onClick={() => updateDate('deadline', '')}>
            清除截止日期
          </button>
        </div>

        {dateOrderWarning ? (
          <p className="date-warning" role="status">
            计划日期晚于截止日期，请确认这符合你的实际安排。
          </p>
        ) : null}

        <fieldset className="segmented-field">
          <legend>重要性</legend>
          <div className="segmented-control">
            {(
              [
                [null, '未设置'],
                ['important', '重要'],
                ['not-important', '不重要']
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                type="button"
                className={draft.importance === value ? 'is-active' : ''}
                aria-pressed={draft.importance === value}
                onClick={() => updateImportance(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="segmented-field">
          <legend>紧急性</legend>
          <div className="segmented-control">
            {(
              [
                [null, '未设置'],
                ['urgent', '紧急'],
                ['not-urgent', '不紧急']
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                type="button"
                className={draft.urgency === value ? 'is-active' : ''}
                aria-pressed={draft.urgency === value}
                onClick={() => updateUrgency(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="detail-field">
          <label htmlFor="task-project">项目</label>
          <select
            id="task-project"
            value={draft.projectId ?? ''}
            onChange={(event) => {
              const projectId = event.target.value || null
              setDraft((current) => ({
                ...current,
                projectId,
                inbox: projectId === null ? current.inbox : false
              }))
              setSaveState('idle')
              setError(null)
            }}
          >
            <option value="">无项目</option>
            {projects?.map((project) => (
              <option
                key={project.id}
                value={project.id}
                disabled={
                  project.archivedAt !== null && project.id !== draft.projectId
                }
              >
                {project.name}
                {project.archivedAt ? '（已归档）' : ''}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="tag-picker">
          <legend>标签</legend>
          {tags && tags.length > 0 ? (
            <div>
              {tags.map((tag) => (
                <label key={tag.id}>
                  <input
                    type="checkbox"
                    checked={draft.tagIds.includes(tag.id)}
                    onChange={(event) => {
                      setDraft((current) => ({
                        ...current,
                        tagIds: event.target.checked
                          ? [...current.tagIds, tag.id]
                          : current.tagIds.filter((id) => id !== tag.id)
                      }))
                      setSaveState('idle')
                      setError(null)
                    }}
                  />
                  <span># {tag.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p>还没有标签，可在“标签”页面创建。</p>
          )}
        </fieldset>

        <label className="inbox-toggle">
          <input
            type="checkbox"
            checked={draft.inbox}
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                inbox: event.target.checked
              }))
              setSaveState('idle')
              setError(null)
            }}
          />
          <span>
            <strong>保留在收集箱</strong>
            <small>即使已有日期或项目，也可以手动移回 Inbox。</small>
          </span>
        </label>

        {error ? (
          <div className="inline-error detail-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className={`save-status save-${saveState}`} role="status">
          {saveState === 'saving' ? '正在保存…' : null}
          {saveState === 'saved' ? '已保存在本设备' : null}
          {saveState === 'error' ? '保存失败，草稿仍保留' : null}
          {saveState === 'idle' && isDirty ? '有尚未保存的修改' : null}
          {saveState === 'idle' && !isDirty ? '没有待保存的修改' : null}
        </div>

        <div className="detail-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={saveState === 'saving'}
          >
            取消
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={!isDirty || saveState === 'saving'}
          >
            {saveState === 'saving' ? '保存中…' : '保存修改'}
          </button>
        </div>
      </form>

      <dl className="task-facts">
        <div>
          <dt>创建时间</dt>
          <dd>{new Date(task.createdAt).toLocaleString('zh-CN')}</dd>
        </div>
        <div>
          <dt>数据位置</dt>
          <dd>此浏览器 IndexedDB</dd>
        </div>
      </dl>
      <button
        type="button"
        className="delete-task-button"
        onClick={() => void onDelete(task)}
      >
        删除任务
      </button>
    </aside>
  )
}
