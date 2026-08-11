import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { taskService } from '../../app/services'
import type { Task } from '../../domain/task/task.types'
import { TaskDetailsPanel } from './TaskDetailsPanel'

const task: Task = {
  id: 'task-1',
  title: '梳理计划',
  notes: '',
  status: 'todo',
  importance: null,
  urgency: null,
  plannedDate: null,
  deadline: null,
  inbox: true,
  projectId: null,
  tagIds: [],
  sortOrder: 1,
  createdAt: '2026-08-11T08:00:00.000Z',
  updatedAt: '2026-08-11T08:00:00.000Z',
  completedAt: null,
  deletedAt: null
}

describe('TaskDetailsPanel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('persists importance and urgency as independent dimensions', async () => {
    const user = userEvent.setup()
    const update = vi
      .spyOn(taskService, 'updateClassification')
      .mockResolvedValue(task)
    render(<TaskDetailsPanel task={task} onClose={() => undefined} />)

    await user.click(screen.getByRole('button', { name: /^重要$/ }))
    await user.click(screen.getByRole('button', { name: /^紧急$/ }))

    expect(update).toHaveBeenNthCalledWith(1, 'task-1', {
      importance: 'important',
      urgency: null
    })
    expect(update).toHaveBeenNthCalledWith(2, 'task-1', {
      importance: 'important',
      urgency: 'urgent'
    })
    expect(screen.getByRole('status')).toHaveTextContent('已保存在本设备')
  })
})
