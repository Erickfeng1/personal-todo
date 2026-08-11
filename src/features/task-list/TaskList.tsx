import type { Task } from '../../domain/task/task.types'
import { TaskItem } from './TaskItem'

interface TaskListProps {
  tasks: Task[]
  sections?: TaskSection[]
  selectedTaskId: string | null
  onSelect: (task: Task) => void
  onToggle: (task: Task) => Promise<void>
  emptyTitle: string
  emptyDescription: string
}

export interface TaskSection {
  id: string
  title: string
  description?: string
  tone?: 'overdue' | 'due' | 'carry' | 'planned' | 'upcoming'
  tasks: Task[]
}

export function TaskList({
  tasks,
  sections,
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

  const renderTasks = (sectionTasks: Task[]) => (
    <ul className="task-list">
      {sectionTasks.map((task) => (
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

  if (sections) {
    return (
      <div className="task-sections">
        {sections.map((section) => (
          <section
            key={section.id}
            className={`task-section task-section-${section.tone ?? 'upcoming'}`}
          >
            <header className="task-section-header">
              <div>
                <h2>{section.title}</h2>
                {section.description ? <p>{section.description}</p> : null}
              </div>
              <span>{section.tasks.length}</span>
            </header>
            {renderTasks(section.tasks)}
          </section>
        ))}
      </div>
    )
  }

  return renderTasks(tasks)
}
