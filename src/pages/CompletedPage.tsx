import { TaskViewPage } from './TaskViewPage'

export function CompletedPage() {
  return (
    <TaskViewPage
      collection="completed"
      eyebrow="REVIEW"
      title="已完成"
      description="完成记录保存在私人云端，也可以随时恢复。"
      emptyTitle="还没有完成记录"
      emptyDescription="完成任务后，它们会安全地出现在这里。"
    />
  )
}
