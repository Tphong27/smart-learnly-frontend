import { Bell, Menu, Search, User, LogOut } from 'lucide-react'

export function Header({ user, onToggleSidebar, onLogout }) {
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.email || 'User'

  const initials = displayName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__left">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="app-header__menu-button"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="app-header__search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search..."
            />
          </div>
        </div>

        <div className="app-header__actions">
          <button
            type="button"
            className="app-header__icon-button"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="app-header__notification-dot" />
          </button>

          <div className="app-header__user">
            <button
              type="button"
              className="app-header__user-button"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="app-header__avatar"
                />
              ) : (
                <span className="app-header__avatar app-header__avatar--initials">
                  {initials}
                </span>
              )}

              <span className="app-header__user-copy">
                <span className="app-header__user-name">
                  {displayName}
                </span>
                <span className="app-header__user-role">
                  {user?.role || 'user'}
                </span>
              </span>
            </button>

            <div className="app-header__user-menu">
              <a
                href="/profile"
                className="app-header__user-menu-item"
              >
                <User size={16} />
                Profile
              </a>

              <button
                type="button"
                onClick={onLogout}
                className="app-header__user-menu-item app-header__user-menu-item--danger"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
