import { cleanup, render, screen } from '@testing-library/react'
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
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('saves title, notes, dates, importance, and urgency together', async () => {
    const user = userEvent.setup()
    const update = vi
      .spyOn(taskService, 'updateDetails')
      .mockResolvedValue(task)
    render(<TaskDetailsPanel task={task} onClose={() => undefined} />)

    await user.clear(screen.getByLabelText('标题'))
    await user.type(screen.getByLabelText('标题'), '梳理本周计划')
    await user.type(screen.getByLabelText('备注'), '先完成需求拆解')
    await user.type(screen.getByLabelText('计划日期'), '2026-08-12')
    await user.type(screen.getByLabelText('截止日期'), '2026-08-15')
    await user.click(screen.getByRole('button', { name: /^重要$/ }))
    await user.click(screen.getByRole('button', { name: /^紧急$/ }))
    await user.click(screen.getByRole('button', { name: '保存修改' }))

    expect(update).toHaveBeenCalledWith('task-1', {
      title: '梳理本周计划',
      notes: '先完成需求拆解',
      importance: 'important',
      urgency: 'urgent',
      plannedDate: '2026-08-12',
      deadline: '2026-08-15'
    })
    expect(screen.getByRole('status')).toHaveTextContent('已保存在本设备')
  })

  it('discards an edited draft when the user cancels', async () => {
    const user = userEvent.setup()
    const update = vi.spyOn(taskService, 'updateDetails')
    const onClose = vi.fn()
    render(<TaskDetailsPanel task={task} onClose={onClose} />)

    await user.type(screen.getByLabelText('备注'), '不保存的草稿')
    await user.click(screen.getByRole('button', { name: '取消' }))

    expect(update).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
