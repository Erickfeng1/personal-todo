import { ClassificationBadges } from './ClassificationBadges'
import type { Task } from '../../domain/task/task.types'
import type { Project } from '../../domain/project/project.types'
import type { Tag } from '../../domain/tag/tag.types'

interface TaskItemProps {
  task: Task
  selected: boolean
  onSelect: (task: Task) => void
  onToggle: (task: Task) => Promise<void>
  project: Project | null
  taskTags: Tag[]
}

export function TaskItem({
  task,
  selected,
  onSelect,
  onToggle,
  project,
  taskTags
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
          {project ? (
            <span className="project-meta">{project.name}</span>
          ) : null}
          {taskTags.slice(0, 2).map((tag) => (
            <span key={tag.id} className="tag-meta">
              # {tag.name}
            </span>
          ))}
          {taskTags.length > 2 ? <span>+{taskTags.length - 2}</span> : null}
        </span>
      </button>
      <span className="task-arrow" aria-hidden="true">
        ›
      </span>
    </li>
  )
}
