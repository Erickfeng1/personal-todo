import { describe, expect, it } from 'vitest'
import {
  completeTask,
  createTask,
  getEisenhowerQuadrant,
  matchesClassificationFilter,
  normalizeTaskTitle,
  reopenTask,
  updateTaskClassification
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
})
