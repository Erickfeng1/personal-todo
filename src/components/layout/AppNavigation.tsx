import { NavLink } from 'react-router-dom'
import { CompletedIcon, InboxIcon, TodayIcon } from '../icons'

const navItems = [
  { to: '/today', label: '今天', icon: TodayIcon },
  { to: '/inbox', label: '收集箱', icon: InboxIcon },
  { to: '/completed', label: '已完成', icon: CompletedIcon }
]

export function AppNavigation() {
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
          <strong>仅保存在此设备</strong>
          <span>无账号 · 本地优先</span>
        </div>
      </div>
    </aside>
  )
}
