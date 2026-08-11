import type { Task } from '../../domain/task/task.types'
import { TaskItem } from './TaskItem'
import type { Project } from '../../domain/project/project.types'
import type { Tag } from '../../domain/tag/tag.types'
import { useMemo } from 'react'

interface TaskListProps {
  tasks: Task[]
  sections?: TaskSection[]
  selectedTaskId: string | null
  onSelect: (task: Task) => void
  onToggle: (task: Task) => Promise<void>
  projects: Project[]
  tags: Tag[]
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
  projects,
  tags,
  emptyTitle,
  emptyDescription
}: TaskListProps) {
  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  )
  const tagMap = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag])),
    [tags]
  )

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
          project={projectMap.get(task.projectId ?? '') ?? null}
          taskTags={task.tagIds.flatMap((tagId) => {
            const tag = tagMap.get(tagId)
            return tag ? [tag] : []
          })}
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
