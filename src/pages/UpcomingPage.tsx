import { TaskViewPage } from './TaskViewPage'

export function UpcomingPage() {
  return (
    <TaskViewPage
      collection="upcoming"
      eyebrow="PLAN"
      title="未来 7 天"
      description="从明天开始，提前看见计划与截止压力。"
      emptyTitle="未来一周还很从容"
      emptyDescription="为任务设置计划日期或截止日期后，会按最早的相关日期出现在这里。"
    />
  )
}
