import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { taskService } from '../../app/services'
import type { Task } from '../../domain/task/task.types'
import { TaskDetailsPanel } from './TaskDetailsPanel'

vi.mock('../../hooks/useOrganization', () => ({
  useProjects: () => [
    {
      id: 'project-1',
      name: '工作',
      color: null,
      sortOrder: 1,
      archivedAt: null,
      createdAt: '2026-08-11T08:00:00.000Z',
      updatedAt: '2026-08-11T08:00:00.000Z'
    }
  ],
  useTags: () => [
    {
      id: 'tag-1',
      name: '等待回复',
      color: null,
      createdAt: '2026-08-11T08:00:00.000Z',
      updatedAt: '2026-08-11T08:00:00.000Z'
    }
  ]
}))

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
    render(
      <TaskDetailsPanel
        task={task}
        onClose={() => undefined}
        onDelete={vi.fn()}
      />
    )

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
      deadline: '2026-08-15',
      inbox: false,
      projectId: null,
      tagIds: []
    })
    expect(screen.getByRole('status')).toHaveTextContent('已保存在本设备')
  })

  it('discards an edited draft when the user cancels', async () => {
    const user = userEvent.setup()
    const update = vi.spyOn(taskService, 'updateDetails')
    const onClose = vi.fn()
    render(
      <TaskDetailsPanel task={task} onClose={onClose} onDelete={vi.fn()} />
    )

    await user.type(screen.getByLabelText('备注'), '不保存的草稿')
    await user.click(screen.getByRole('button', { name: '取消' }))

    expect(update).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('assigns one project and multiple tags while organizing Inbox', async () => {
    const user = userEvent.setup()
    const update = vi
      .spyOn(taskService, 'updateDetails')
      .mockResolvedValue(task)
    render(
      <TaskDetailsPanel
        task={task}
        onClose={() => undefined}
        onDelete={vi.fn()}
      />
    )

    await user.selectOptions(screen.getByLabelText('项目'), 'project-1')
    await user.click(screen.getByRole('checkbox', { name: '# 等待回复' }))
    await user.click(screen.getByRole('button', { name: '保存修改' }))

    expect(update).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        projectId: 'project-1',
        tagIds: ['tag-1'],
        inbox: false
      })
    )
  })

  it('requests a soft delete from the details panel', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <TaskDetailsPanel
        task={task}
        onClose={() => undefined}
        onDelete={onDelete}
      />
    )

    await user.click(screen.getByRole('button', { name: '删除任务' }))
    expect(onDelete).toHaveBeenCalledWith(task)
  })
})
