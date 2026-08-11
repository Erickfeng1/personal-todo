import { TaskViewPage } from './TaskViewPage'

export function InboxPage() {
  return (
    <TaskViewPage
      collection="inbox"
      eyebrow="CAPTURE"
      title="收集箱"
      description="先把事情记下来，判断和安排可以晚一点。"
      emptyTitle="收集箱已经清空"
      emptyDescription="想到新事情时，在上方快速记下即可。"
      quickAdd={{
        context: { source: 'inbox' },
        placeholder: '记下一件事，按 Enter 添加'
      }}
    />
  )
}
