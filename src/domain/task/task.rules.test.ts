import { describe, expect, it } from 'vitest'
import {
  completeTask,
  createTask,
  filterAndSortTasks,
  getEisenhowerQuadrant,
  getTodayGroup,
  getUpcomingDate,
  matchesClassificationFilter,
  normalizeTaskTitle,
  reopenTask,
  restoreDeletedTask,
  softDeleteTask,
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

  it('creates project and tag tasks with the documented Inbox semantics', () => {
    const projectTask = createTask(
      { title: '项目任务' },
      { source: 'project', projectId: 'project-1' },
      options
    )
    const tagTask = createTask(
      { title: '标签任务' },
      { source: 'tag', tagId: 'tag-1' },
      options
    )

    expect(projectTask).toMatchObject({ projectId: 'project-1', inbox: false })
    expect(tagTask).toMatchObject({ tagIds: ['tag-1'], inbox: true })
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
        deadline: '2026-08-15',
        inbox: false,
        projectId: null,
        tagIds: []
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
        deadline: null,
        inbox: false,
        projectId: null,
        tagIds: []
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

  it('soft deletes and restores without changing completion or organization', () => {
    const task = {
      ...createTask({ title: '临时任务' }, { source: 'inbox' }, options),
      projectId: 'project-1',
      tagIds: ['tag-1']
    }
    const deleted = softDeleteTask(task, '2026-08-11T10:00:00.000Z')
    const restored = restoreDeletedTask(deleted, '2026-08-11T11:00:00.000Z')

    expect(deleted.deletedAt).toBe('2026-08-11T10:00:00.000Z')
    expect(restored).toMatchObject({
      deletedAt: null,
      projectId: 'project-1',
      tagIds: ['tag-1'],
      status: 'todo'
    })
  })

  it('combines importance, urgency, project, and tag filters with AND semantics', () => {
    const matching = {
      ...createTask({ title: '匹配合同' }, { source: 'inbox' }, options),
      importance: 'important' as const,
      urgency: 'not-urgent' as const,
      projectId: 'project-1',
      tagIds: ['tag-1']
    }
    const wrongUrgency = {
      ...matching,
      id: 'task-2',
      urgency: 'urgent' as const
    }

    const results = filterAndSortTasks([matching, wrongUrgency], {
      search: '合同',
      status: 'all',
      importance: 'important',
      urgency: 'not-urgent',
      quadrant: 'all',
      projectId: 'project-1',
      tagId: 'tag-1',
      sort: 'created',
      includeCompleted: false
    })

    expect(results.map((task) => task.id)).toEqual(['task-1'])
  })

  it('sorts complete quadrants before unclassified tasks', () => {
    const unclassified = createTask(
      { title: '未分类' },
      { source: 'inbox' },
      { ...options, id: 'unclassified' }
    )
    const importantUrgent = {
      ...unclassified,
      id: 'important-urgent',
      importance: 'important' as const,
      urgency: 'urgent' as const
    }

    const results = filterAndSortTasks([unclassified, importantUrgent], {
      search: '',
      status: 'all',
      importance: 'all',
      urgency: 'all',
      quadrant: 'all',
      projectId: 'all',
      tagId: 'all',
      sort: 'quadrant',
      includeCompleted: false
    })

    expect(results.map((task) => task.id)).toEqual([
      'important-urgent',
      'unclassified'
    ])
  })
})
