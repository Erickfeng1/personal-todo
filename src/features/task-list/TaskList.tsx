import type { Task } from '../../domain/task/task.types'
import { TaskItem } from './TaskItem'

interface TaskListProps {
  tasks: Task[]
  selectedTaskId: string | null
  onSelect: (task: Task) => void
  onToggle: (task: Task) => Promise<void>
  emptyTitle: string
  emptyDescription: string
}

export function TaskList({
  tasks,
  selectedTaskId,
  onSelect,
  onToggle,
  emptyTitle,
  emptyDescription
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-mark" aria-hidden="true">
          ✓
        </span>
        <h2>{emptyTitle}</h2>
        <p>{emptyDescription}</p>
      </div>
    )
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          selected={selectedTaskId === task.id}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </ul>
  )
}
