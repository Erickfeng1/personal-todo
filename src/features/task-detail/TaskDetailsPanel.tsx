import { useState } from 'react'
import { taskService } from '../../app/services'
import { CloseIcon } from '../../components/icons'
import type {
  Task,
  TaskImportance,
  TaskUrgency
} from '../../domain/task/task.types'

interface TaskDetailsPanelProps {
  task: Task | null
  onClose: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function TaskDetailsPanel({ task, onClose }: TaskDetailsPanelProps) {
  const [importance, setImportance] = useState<TaskImportance | null>(
    task?.importance ?? null
  )
  const [urgency, setUrgency] = useState<TaskUrgency | null>(
    task?.urgency ?? null
  )
  const [saveState, setSaveState] = useState<SaveState>('idle')

  if (!task) return null

  const saveClassification = async (
    nextImportance: TaskImportance | null,
    nextUrgency: TaskUrgency | null
  ) => {
    setImportance(nextImportance)
    setUrgency(nextUrgency)
    setSaveState('saving')
    try {
      await taskService.updateClassification(task.id, {
        importance: nextImportance,
        urgency: nextUrgency
      })
      setSaveState('saved')
    } catch {
      setImportance(task.importance)
      setUrgency(task.urgency)
      setSaveState('error')
    }
  }

  return (
    <aside className="detail-panel" aria-label={`任务详情：${task.title}`}>
      <div className="detail-header">
        <span className="detail-eyebrow">任务分类</span>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="关闭详情"
        >
          <CloseIcon />
        </button>
      </div>
      <h2>{task.title}</h2>
      <p className="detail-intro">
        分别判断重要性与紧急性。两个维度相互独立，不会变成普通标签。
      </p>

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
              className={importance === value ? 'is-active' : ''}
              aria-pressed={importance === value}
              onClick={() => void saveClassification(value, urgency)}
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
              className={urgency === value ? 'is-active' : ''}
              aria-pressed={urgency === value}
              onClick={() => void saveClassification(importance, value)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className={`save-status save-${saveState}`} role="status">
        {saveState === 'saving' ? '正在保存…' : null}
        {saveState === 'saved' ? '已保存在本设备' : null}
        {saveState === 'error' ? '保存失败，原分类未改变，请重试' : null}
        {saveState === 'idle' ? '选择后自动保存' : null}
      </div>

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
    </aside>
  )
}
