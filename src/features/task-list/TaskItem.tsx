import { ClassificationBadges } from './ClassificationBadges'
import type { Task } from '../../domain/task/task.types'

interface TaskItemProps {
  task: Task
  selected: boolean
  onSelect: (task: Task) => void
  onToggle: (task: Task) => Promise<void>
}

export function TaskItem({
  task,
  selected,
  onSelect,
  onToggle
}: TaskItemProps) {
  const isCompleted = task.status === 'completed'

  return (
    <li className={`task-item${selected ? ' is-selected' : ''}`}>
      <button
        type="button"
        className={`complete-toggle${isCompleted ? ' is-completed' : ''}`}
        aria-label={`${isCompleted ? '恢复' : '完成'}任务：${task.title}`}
        onClick={() => void onToggle(task)}
      >
        <span aria-hidden="true">{isCompleted ? '✓' : ''}</span>
      </button>
      <button
        type="button"
        className="task-content"
        onClick={() => onSelect(task)}
      >
        <span className={`task-title${isCompleted ? ' is-completed' : ''}`}>
          {task.title}
        </span>
        <span className="task-meta">
          <ClassificationBadges task={task} />
          {task.plannedDate ? <span>计划 {task.plannedDate}</span> : null}
          {task.deadline ? <span>截止 {task.deadline}</span> : null}
        </span>
      </button>
      <span className="task-arrow" aria-hidden="true">
        ›
      </span>
    </li>
  )
}
