import { SearchIcon, SlidersIcon } from '../../components/icons'
import type { ClassificationFilter } from '../../domain/task/task.types'

interface TaskFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  classification: ClassificationFilter
  onClassificationChange: (value: ClassificationFilter) => void
}

const options: Array<{ value: ClassificationFilter; label: string }> = [
  { value: 'all', label: '全部分类' },
  { value: 'important', label: '重要' },
  { value: 'not-important', label: '不重要' },
  { value: 'urgent', label: '紧急' },
  { value: 'not-urgent', label: '不紧急' },
  { value: 'important-urgent', label: '重要且紧急' },
  { value: 'important-not-urgent', label: '重要但不紧急' },
  { value: 'not-important-urgent', label: '不重要但紧急' },
  { value: 'not-important-not-urgent', label: '不重要且不紧急' },
  { value: 'unclassified', label: '未分类' }
]

export function TaskFilters({
  search,
  onSearchChange,
  classification,
  onClassificationChange
}: TaskFiltersProps) {
  return (
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
          placeholder="搜索任务  /"
        />
      </div>
      <div className="filter-select">
        <SlidersIcon />
        <label className="sr-only" htmlFor="classification-filter">
          按重要性和紧急性筛选
        </label>
        <select
          id="classification-filter"
          value={classification}
          onChange={(event) =>
            onClassificationChange(event.target.value as ClassificationFilter)
          }
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
