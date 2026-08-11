import { useParams } from 'react-router-dom'
import { useProjects } from '../hooks/useOrganization'
import { TaskViewPage } from './TaskViewPage'

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const projects = useProjects(true)
  const project = projects?.find((item) => item.id === projectId)

  if (projects === undefined)
    return <div className="management-page">正在读取项目…</div>
  if (!project)
    return (
      <div className="management-page">
        <h1>项目不存在</h1>
      </div>
    )

  return (
    <TaskViewPage
      collection="project"
      entityId={project.id}
      eyebrow={project.archivedAt ? 'ARCHIVED PROJECT' : 'PROJECT'}
      title={project.name}
      description={
        project.archivedAt
          ? '这是已归档项目，原任务仍可查看。'
          : '集中处理属于这个项目的活动任务。'
      }
      emptyTitle="这个项目还没有活动任务"
      emptyDescription="可以直接创建第一项项目任务。"
      {...(project.archivedAt
        ? {}
        : {
            quickAdd: {
              context: { source: 'project' as const, projectId: project.id },
              placeholder: `添加到“${project.name}”`
            }
          })}
    />
  )
}
