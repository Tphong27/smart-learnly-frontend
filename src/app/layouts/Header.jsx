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
      <div className="app-header__left">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="app-header__menu-btn"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <label className="app-header__search">
          <Search size={16} />
          <input type="text" placeholder="Search courses, lessons, questions..." />
        </label>
      </div>

      <div className="app-header__right">
        <button type="button" className="icon-button" aria-label="Notifications">
          <Bell size={18} />
          <span className="icon-button__dot" />
        </button>

        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className="user-menu__trigger"
            onClick={() => setOpen((s) => !s)}
            aria-haspopup="true"
            aria-expanded={open}
          >
            <span className="user-menu__avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={displayName} />
              ) : (
                initials
              )}
            </span>
            <span className="user-menu__meta">
              <span className="user-menu__meta-name">{displayName}</span>
              <span className="user-menu__meta-role">{role}</span>
            </span>
          </button>

          {open && (
            <div className="user-menu__panel" role="menu">
              <button
                type="button"
                className="user-menu__panel-item"
                onClick={handleProfile}
              >
                <User size={16} /> Profile
              </button>
              <div className="user-menu__divider" />
              <button
                type="button"
                className="user-menu__panel-item user-menu__panel-item--danger"
                onClick={handleLogout}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
