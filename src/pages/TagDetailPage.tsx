import { useParams } from 'react-router-dom'
import { useTags } from '../hooks/useOrganization'
import { TaskViewPage } from './TaskViewPage'

export function TagDetailPage() {
  const { tagId = '' } = useParams()
  const tags = useTags()
  const tag = tags?.find((item) => item.id === tagId)

  if (tags === undefined)
    return <div className="management-page">正在读取标签…</div>
  if (!tag)
    return (
      <div className="management-page">
        <h1>标签不存在</h1>
      </div>
    )

  return (
    <TaskViewPage
      collection="tag"
      entityId={tag.id}
      eyebrow="TAG"
      title={`# ${tag.name}`}
      description="跨项目查看具有同一标签的活动任务。"
      emptyTitle="这个标签还没有关联任务"
      emptyDescription="可以直接创建带有该标签的任务。"
      quickAdd={{
        context: { source: 'tag', tagId: tag.id },
        placeholder: `添加带“${tag.name}”标签的任务`
      }}
    />
  )
}
