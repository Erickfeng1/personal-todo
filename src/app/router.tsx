import { createBrowserRouter, Navigate } from 'react-router-dom'
import { App } from './App'
import { CompletedPage } from '../pages/CompletedPage'
import { InboxPage } from '../pages/InboxPage'
import { TodayPage } from '../pages/TodayPage'
import { UpcomingPage } from '../pages/UpcomingPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/today" replace /> },
      { path: 'today', element: <TodayPage /> },
      { path: 'inbox', element: <InboxPage /> },
      { path: 'upcoming', element: <UpcomingPage /> },
      { path: 'completed', element: <CompletedPage /> },
      { path: '*', element: <Navigate to="/today" replace /> }
    ]
  }
])
