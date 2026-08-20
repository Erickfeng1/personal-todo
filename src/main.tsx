import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { CloudAuthProvider } from './auth/CloudAuthProvider'
import './styles/global.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element is missing')
}

createRoot(root).render(
  <StrictMode>
    <CloudAuthProvider>
      <RouterProvider router={router} />
    </CloudAuthProvider>
  </StrictMode>
)
