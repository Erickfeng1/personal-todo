import { describe, expect, it } from 'vitest'
import {
  completeTask,
  createTask,
  getEisenhowerQuadrant,
  getTodayGroup,
  getUpcomingDate,
  matchesClassificationFilter,
  normalizeTaskTitle,
  reopenTask,
  updateTaskClassification,
  updateTaskDetails
} from './task.rules'

const options = {
  id: 'task-1',
  now: '2026-08-11T08:00:00.000Z',
  sortOrder: 1
}

describe('task rules', () => {
  it('normalizes a valid title and rejects blank titles', () => {
    expect(normalizeTaskTitle('  提交周报  ')).toBe('提交周报')
    expect(() => normalizeTaskTitle('   ')).toThrow('任务标题不能为空')
  })

  it('creates an unclassified inbox task by default', () => {
    const task = createTask({ title: '提交周报' }, { source: 'inbox' }, options)

    expect(task).toMatchObject({
      title: '提交周报',
      status: 'todo',
      inbox: true,
      plannedDate: null,
      importance: null,
      urgency: null
    })
  })

  it('creates a Today task with a local planned date outside Inbox', () => {
    const task = createTask(
      { title: '整理会议纪要' },
      { source: 'today', today: '2026-08-11' },
      options
    )

    expect(task.inbox).toBe(false)
    expect(task.plannedDate).toBe('2026-08-11')
  })

  it('completes and reopens without losing classification', () => {
    const task = updateTaskClassification(
      createTask({ title: '任务' }, { source: 'inbox' }, options),
      { importance: 'important', urgency: 'urgent' },
      '2026-08-11T08:01:00.000Z'
    )
    const completed = completeTask(task, '2026-08-11T08:02:00.000Z')
    const reopened = reopenTask(completed, '2026-08-11T08:03:00.000Z')

    expect(completed.status).toBe('completed')
    expect(completed.completedAt).toBe('2026-08-11T08:02:00.000Z')
    expect(reopened).toMatchObject({
      status: 'todo',
      completedAt: null,
      importance: 'important',
      urgency: 'urgent'
    })
  })

  it('derives quadrants and keeps single-dimension filters independent', () => {
    const task = {
      importance: 'important' as const,
      urgency: 'not-urgent' as const
    }

    expect(getEisenhowerQuadrant(task)).toBe('important-not-urgent')
    expect(matchesClassificationFilter(task, 'important')).toBe(true)
    expect(matchesClassificationFilter(task, 'urgent')).toBe(false)
    expect(matchesClassificationFilter(task, 'important-not-urgent')).toBe(true)
    expect(
      matchesClassificationFilter(
        { importance: null, urgency: 'urgent' },
        'unclassified'
      )
    ).toBe(true)
  })

  it('updates editable details while keeping planned and deadline dates independent', () => {
    const task = {
      ...createTask({ title: '初稿' }, { source: 'inbox' }, options),
      plannedDate: '2026-08-11' as const,
      deadline: '2026-08-15' as const,
      inbox: false
    }

    const updated = updateTaskDetails(
      task,
      {
        title: '  终稿  ',
        notes: '保留截止日期，只移出今天。',
        importance: 'important',
        urgency: 'not-urgent',
        plannedDate: null,
        deadline: '2026-08-15'
      },
      '2026-08-11T09:00:00.000Z'
    )

    expect(updated).toMatchObject({
      title: '终稿',
      notes: '保留截止日期，只移出今天。',
      plannedDate: null,
      deadline: '2026-08-15',
      inbox: false,
      importance: 'important',
      urgency: 'not-urgent'
    })
  })

  it('moves an Inbox task out after assigning a planned date', () => {
    const task = createTask({ title: '安排任务' }, { source: 'inbox' }, options)
    const updated = updateTaskDetails(
      task,
      {
        title: task.title,
        notes: task.notes,
        importance: task.importance,
        urgency: task.urgency,
        plannedDate: '2026-08-12',
        deadline: null
      },
      '2026-08-11T09:00:00.000Z'
    )

    expect(updated.inbox).toBe(false)
  })

  it('assigns Today groups once using the documented urgency order', () => {
    const baseTask = createTask(
      { title: '日期任务' },
      { source: 'today', today: '2026-08-11' },
      options
    )

    expect(
      getTodayGroup({ ...baseTask, deadline: '2026-08-10' }, '2026-08-11')
    ).toBe('overdue-deadline')
    expect(
      getTodayGroup(
        {
          ...baseTask,
          plannedDate: '2026-08-10',
          deadline: '2026-08-11'
        },
        '2026-08-11'
      )
    ).toBe('due-today')
    expect(
      getTodayGroup({ ...baseTask, plannedDate: '2026-08-10' }, '2026-08-11')
    ).toBe('carry-over')
    expect(getTodayGroup(baseTask, '2026-08-11')).toBe('planned-today')
  })

  it('uses the earliest relevant date in the next seven natural days', () => {
    const task = {
      ...createTask({ title: '未来任务' }, { source: 'inbox' }, options),
      plannedDate: '2026-08-12' as const,
      deadline: '2026-08-15' as const
    }

    expect(getUpcomingDate(task, '2026-08-11')).toBe('2026-08-12')
    expect(
      getUpcomingDate(
        { ...task, plannedDate: '2026-08-19', deadline: null },
        '2026-08-11'
      )
    ).toBeNull()
    expect(
      getUpcomingDate(
        { ...task, plannedDate: '2026-08-11', deadline: '2026-08-12' },
        '2026-08-11'
      )
    ).toBe('2026-08-12')
  })
})
