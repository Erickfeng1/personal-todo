import { SearchIcon, SlidersIcon } from '../../components/icons'
import type { Project } from '../../domain/project/project.types'
import type { Tag } from '../../domain/tag/tag.types'
import type { TaskSort } from '../../domain/task/task.types'
import { DEFAULT_TASK_FILTERS, type TaskFilterState } from './task-filter.types'

interface TaskFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  filters: TaskFilterState
  onFiltersChange: (filters: TaskFilterState) => void
  projects: Project[]
  tags: Tag[]
}

export function TaskFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  projects,
  tags
}: TaskFiltersProps) {
  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.importance !== 'all' ||
    filters.urgency !== 'all' ||
    filters.quadrant !== 'all' ||
    filters.projectId !== 'all' ||
    filters.tagId !== 'all' ||
    filters.sort !== 'created' ||
    filters.includeCompleted
  const hasAnyConditions = hasActiveFilters || search.trim().length > 0

  const update = <Key extends keyof TaskFilterState>(
    key: Key,
    value: TaskFilterState[Key]
  ) => onFiltersChange({ ...filters, [key]: value })

  return (
    <div className="task-filter-area">
      <div className="task-filters">
        <div className="search-field">
          <SearchIcon />
          <label className="sr-only" htmlFor="task-search">
            搜索任务
          </label>
          <input
            id="task-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索标题和备注  /"
          />
        </div>
        <details className="filter-panel">
          <summary>
            <SlidersIcon />
            <span>{hasActiveFilters ? '筛选已启用' : '筛选与排序'}</span>
          </summary>
          <div className="filter-grid">
            <label>
              <span>状态</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  update(
                    'status',
                    event.target.value as TaskFilterState['status']
                  )
                }
              >
                <option value="all">全部状态</option>
                <option value="todo">未完成</option>
                <option value="completed">已完成</option>
              </select>
            </label>
            <label>
              <span>重要性</span>
              <select
                value={filters.importance}
                onChange={(event) =>
                  update(
                    'importance',
                    event.target.value as TaskFilterState['importance']
                  )
                }
              >
                <option value="all">全部</option>
                <option value="important">重要</option>
                <option value="not-important">不重要</option>
              </select>
            </label>
            <label>
              <span>紧急性</span>
              <select
                value={filters.urgency}
                onChange={(event) =>
                  update(
                    'urgency',
                    event.target.value as TaskFilterState['urgency']
                  )
                }
              >
                <option value="all">全部</option>
                <option value="urgent">紧急</option>
                <option value="not-urgent">不紧急</option>
              </select>
            </label>
            <label>
              <span>四象限</span>
              <select
                value={filters.quadrant}
                onChange={(event) =>
                  update(
                    'quadrant',
                    event.target.value as TaskFilterState['quadrant']
                  )
                }
              >
                <option value="all">全部象限</option>
                <option value="important-urgent">重要且紧急</option>
                <option value="important-not-urgent">重要但不紧急</option>
                <option value="not-important-urgent">不重要但紧急</option>
                <option value="not-important-not-urgent">不重要且不紧急</option>
                <option value="unclassified">未分类</option>
              </select>
            </label>
            <label>
              <span>项目</span>
              <select
                value={filters.projectId}
                onChange={(event) => update('projectId', event.target.value)}
              >
                <option value="all">全部项目</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                    {project.archivedAt ? '（归档）' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>标签</span>
              <select
                value={filters.tagId}
                onChange={(event) => update('tagId', event.target.value)}
              >
                <option value="all">全部标签</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    # {tag.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>排序</span>
              <select
                value={filters.sort}
                onChange={(event) =>
                  update('sort', event.target.value as TaskSort)
                }
              >
                <option value="created">创建时间</option>
                <option value="planned">计划日期</option>
                <option value="deadline">截止日期</option>
                <option value="quadrant">四象限</option>
              </select>
            </label>
          </div>
          <div className="filter-footer">
            <label className="include-completed">
              <input
                type="checkbox"
                checked={filters.includeCompleted}
                onChange={(event) =>
                  update('includeCompleted', event.target.checked)
                }
              />
              搜索时包含已完成任务
            </label>
            <button
              type="button"
              onClick={() => {
                onSearchChange('')
                onFiltersChange(DEFAULT_TASK_FILTERS)
              }}
              disabled={!hasAnyConditions}
            >
              清除全部
            </button>
          </div>
        </details>
      </div>
    </div>
  )
}
