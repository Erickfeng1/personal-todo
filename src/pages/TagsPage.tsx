import { useState, type FormEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { tagService } from '../app/services'
import { AppError } from '../domain/shared/app-error'
import { useTags } from '../hooks/useOrganization'

export function TagsPage() {
  const tags = useTags()
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      await tagService.create({ name })
      setName('')
    } catch (cause) {
      setError(
        cause instanceof AppError ? cause.message : '标签创建失败，请重试'
      )
    }
  }

  const handleRename = async (id: string) => {
    setError(null)
    try {
      await tagService.rename(id, editingName)
      setEditingId(null)
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : '标签重命名失败')
    }
  }

  const handleDelete = async (id: string, tagName: string) => {
    setError(null)
    try {
      const count = await tagService.countUsage(id)
      if (
        !window.confirm(
          `标签“${tagName}”关联 ${String(count)} 项任务。删除只会移除关联，不会删除任务。`
        )
      ) {
        return
      }
      await tagService.delete(id)
    } catch {
      setError('标签删除失败，任务没有被修改，请重试。')
    }
  }

  return (
    <section className="management-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CONTEXT</span>
          <h1>标签</h1>
          <p>用标签表达跨项目情境，一项任务可以拥有多个标签。</p>
        </div>
      </header>

      <form
        className="entity-create"
        onSubmit={(event) => void handleCreate(event)}
      >
        <label htmlFor="new-tag">新标签名称</label>
        <div>
          <input
            id="new-tag"
            value={name}
            maxLength={50}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：等待回复"
          />
          <button type="submit">创建标签</button>
        </div>
      </form>

      {error ? (
        <div className="inline-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="entity-list" aria-label="标签列表">
        {tags?.map((tag) => (
          <article key={tag.id} className="entity-card">
            {editingId === tag.id ? (
              <div className="entity-edit">
                <input
                  aria-label={`重命名标签 ${tag.name}`}
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                />
                <button type="button" onClick={() => void handleRename(tag.id)}>
                  保存
                </button>
                <button type="button" onClick={() => setEditingId(null)}>
                  取消
                </button>
              </div>
            ) : (
              <>
                <NavLink to={`/tags/${tag.id}`}>
                  <span className="tag-mark">#</span>
                  <strong>{tag.name}</strong>
                  <span>查看任务 ›</span>
                </NavLink>
                <div className="entity-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(tag.id)
                      setEditingName(tag.name)
                    }}
                  >
                    重命名
                  </button>
                  <button
                    type="button"
                    className="danger-text"
                    onClick={() => void handleDelete(tag.id, tag.name)}
                  >
                    删除
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
        {tags !== undefined && tags.length === 0 ? (
          <div className="management-empty">
            创建标签，为等待、外出或精力场景建立跨项目视角。
          </div>
        ) : null}
      </div>
    </section>
  )
}
