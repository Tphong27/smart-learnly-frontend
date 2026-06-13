import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, Search, User } from 'lucide-react'

function getInitials(name) {
  return (name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function Header({ user, onToggleSidebar, onLogout }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'User'
  const initials = getInitials(displayName)
  const role = user?.role || 'user'

  useEffect(() => {
    function handleClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
    return undefined
  }, [open])

  function handleProfile() {
    setOpen(false)
    navigate('/profile')
  }

  function handleLogout() {
    setOpen(false)
    onLogout?.()
  }

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

          <div className="app-header__user" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
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

            {open && (
              <div className="app-header__user-menu">
                <button
                  type="button"
                  onClick={handleProfile}
                  className="app-header__user-menu-item"
                >
                  <User size={16} /> Profile
                </button>
                <div className="user-menu__divider" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="app-header__user-menu-item app-header__user-menu-item--danger"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

