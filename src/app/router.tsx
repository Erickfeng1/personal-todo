import { createBrowserRouter, Navigate } from 'react-router-dom'
import { App } from './App'
import { CompletedPage } from '../pages/CompletedPage'
import { InboxPage } from '../pages/InboxPage'
import { TodayPage } from '../pages/TodayPage'
import { UpcomingPage } from '../pages/UpcomingPage'
import { ProjectsPage } from '../pages/ProjectsPage'
import { ProjectDetailPage } from '../pages/ProjectDetailPage'
import { TagsPage } from '../pages/TagsPage'
import { TagDetailPage } from '../pages/TagDetailPage'
import { SettingsRoute } from '../pages/SettingsRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/today" replace /> },
      { path: 'today', element: <TodayPage /> },
      { path: 'inbox', element: <InboxPage /> },
      { path: 'upcoming', element: <UpcomingPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:projectId', element: <ProjectDetailPage /> },
      { path: 'tags', element: <TagsPage /> },
      { path: 'tags/:tagId', element: <TagDetailPage /> },
      { path: 'completed', element: <CompletedPage /> },
      { path: 'settings', element: <SettingsRoute /> },
      { path: '*', element: <Navigate to="/today" replace /> }
    ]
  }
])
