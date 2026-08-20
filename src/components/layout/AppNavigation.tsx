import { NavLink } from 'react-router-dom'
import {
  CompletedIcon,
  InboxIcon,
  ProjectsIcon,
  SettingsIcon,
  TagsIcon,
  TodayIcon,
  UpcomingIcon
} from '../icons'
import { useCloudAuth } from '../../auth/cloud-auth-context'

const navItems = [
  { to: '/today', label: '今天', icon: TodayIcon },
  { to: '/inbox', label: '收集箱', icon: InboxIcon },
  { to: '/upcoming', label: '未来', icon: UpcomingIcon },
  { to: '/projects', label: '项目', icon: ProjectsIcon },
  { to: '/tags', label: '标签', icon: TagsIcon },
  { to: '/completed', label: '已完成', icon: CompletedIcon },
  { to: '/settings', label: '设置', icon: SettingsIcon }
]

export function AppNavigation() {
  const auth = useCloudAuth()
  const isSignedIn = auth.status === 'signed-in'

  return (
    <aside className="app-nav">
      <div className="brand" aria-label="序 Todo">
        <span className="brand-mark" aria-hidden="true">
          序
        </span>
        <span>
          <strong>序 Todo</strong>
          <small>把注意力放回当下</small>
        </span>
      </div>

      <nav aria-label="主要导航" className="nav-list">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item${isActive ? ' is-active' : ''}`
            }
          >
            <Icon className="nav-icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="local-first-note">
        <span className="local-dot" aria-hidden="true" />
        <div>
          <strong>{isSignedIn ? '同步尚未启用' : '仅保存在此设备'}</strong>
          <span>{isSignedIn ? '已登录 · 本地优先' : '本地模式'}</span>
        </div>
      </div>
    </aside>
  )
}
