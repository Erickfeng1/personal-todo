import { getTodayLocal } from '../domain/date/local-date'
import { TaskViewPage } from './TaskViewPage'

export function TodayPage() {
  return (
    <TaskViewPage
      collection="today"
      eyebrow="FOCUS"
      title="今天"
      description="只看今天真正需要关注的事情。"
      emptyTitle="今天还没有安排"
      emptyDescription="可以直接创建一项今日任务，让计划从一个清晰动作开始。"
      quickAdd={{
        context: { source: 'today', today: getTodayLocal() },
        placeholder: '今天想完成什么？按 Enter 添加'
      }}
    />
  )
}
