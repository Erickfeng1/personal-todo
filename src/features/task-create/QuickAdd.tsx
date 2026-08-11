import { useRef, useState, type FormEvent } from 'react'
import { taskService } from '../../app/services'
import { AppError } from '../../domain/shared/app-error'
import type { CreateTaskContext } from '../../domain/task/task.types'
import { PlusIcon } from '../../components/icons'

interface QuickAddProps {
  context: CreateTaskContext
  placeholder: string
}

export function QuickAdd({ context, placeholder }: QuickAddProps) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return

    setIsSaving(true)
    setError(null)
    try {
      await taskService.create({ title }, context)
      setTitle('')
      requestAnimationFrame(() => inputRef.current?.focus())
    } catch (cause) {
      setError(
        cause instanceof AppError
          ? cause.message
          : '任务没有保存，输入内容已保留，请重试'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="quick-add-wrap">
      <form
        className="quick-add"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <PlusIcon className="quick-add-icon" />
        <label className="sr-only" htmlFor="quick-add-input">
          新任务标题
        </label>
        <input
          id="quick-add-input"
          ref={inputRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={placeholder}
          maxLength={300}
          aria-describedby={error ? 'quick-add-error' : undefined}
          aria-invalid={error !== null}
          disabled={isSaving}
        />
        <button type="submit" disabled={isSaving}>
          {isSaving ? '保存中' : '添加'}
        </button>
      </form>
      {error ? (
        <p id="quick-add-error" className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
