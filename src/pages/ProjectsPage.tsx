import { useState, type FormEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { projectService } from '../app/services'
import { AppError } from '../domain/shared/app-error'
import { useProjects } from '../hooks/useOrganization'

export function ProjectsPage() {
  const projects = useProjects(true)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      await projectService.create({ name })
      setName('')
    } catch (cause) {
      setError(
        cause instanceof AppError ? cause.message : '项目创建失败，请重试'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleRename = async (id: string) => {
    setError(null)
    try {
      await projectService.rename(id, editingName)
      setEditingId(null)
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : '项目重命名失败')
    }
  }

  const handleArchive = async (id: string, projectName: string) => {
    if (
      !window.confirm(
        `归档“${projectName}”后，它会从默认选择器隐藏，但任务不会删除。`
      )
    ) {
      return
    }
    setError(null)
    try {
      await projectService.archive(id)
    } catch {
      setError('项目归档失败，任务没有被修改，请重试。')
    }
  }

  const activeProjects =
    projects?.filter((project) => !project.archivedAt) ?? []
  const archivedProjects =
    projects?.filter((project) => project.archivedAt) ?? []

  return (
    <section className="management-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">ORGANIZE</span>
          <h1>项目</h1>
          <p>用项目表达任务的主要归属，一项任务最多属于一个项目。</p>
        </div>
      </header>

      <form
        className="entity-create"
        onSubmit={(event) => void handleCreate(event)}
      >
        <label htmlFor="new-project">新项目名称</label>
        <div>
          <input
            id="new-project"
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：个人网站"
            disabled={isSaving}
          />
          <button type="submit" disabled={isSaving}>
            创建项目
          </button>
        </div>
      </form>

      {error ? (
        <div className="inline-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="entity-list" aria-label="活动项目">
        {activeProjects.map((project) => (
          <article key={project.id} className="entity-card">
            {editingId === project.id ? (
              <div className="entity-edit">
                <input
                  aria-label={`重命名项目 ${project.name}`}
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => void handleRename(project.id)}
                >
                  保存
                </button>
                <button type="button" onClick={() => setEditingId(null)}>
                  取消
                </button>
              </div>
            ) : (
              <>
                <NavLink to={`/projects/${project.id}`}>
                  <span className="entity-dot" aria-hidden="true" />
                  <strong>{project.name}</strong>
                  <span>查看任务 ›</span>
                </NavLink>
                <div className="entity-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(project.id)
                      setEditingName(project.name)
                    }}
                  >
                    重命名
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleArchive(project.id, project.name)}
                  >
                    归档
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
        {projects !== undefined && activeProjects.length === 0 ? (
          <div className="management-empty">
            创建第一个项目，把相关任务放到同一个清晰归属中。
          </div>
        ) : null}
      </div>

      {archivedProjects.length > 0 ? (
        <details className="archived-projects">
          <summary>已归档项目（{archivedProjects.length}）</summary>
          <ul>
            {archivedProjects.map((project) => (
              <li key={project.id}>{project.name}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}
