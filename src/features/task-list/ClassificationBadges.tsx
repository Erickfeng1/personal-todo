import type { Task } from '../../domain/task/task.types'

export function ClassificationBadges({ task }: { task: Task }) {
  if (task.importance === null && task.urgency === null) {
    return <span className="classification-muted">未分类</span>
  }

  return (
    <span className="classification-badges" aria-label="任务分类">
      {task.importance ? (
        <span className={`badge badge-${task.importance}`}>
          {task.importance === 'important' ? '重要' : '不重要'}
        </span>
      ) : null}
      {task.urgency ? (
        <span className={`badge badge-${task.urgency}`}>
          {task.urgency === 'urgent' ? '紧急' : '不紧急'}
        </span>
      ) : null}
    </span>
  )
}
