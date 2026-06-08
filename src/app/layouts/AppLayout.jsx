import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { clearAuthSession, getCurrentUser, setAuthSession } from '@/services/api-client'
import { demoUsers } from '@/data/demo'
import { ROLES } from '@/shared/constants/roles'

function getInitialDemoUser() {
  return getCurrentUser() || demoUsers[ROLES.TRAINEE]
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(getInitialDemoUser)
  const navigate = useNavigate()

  useEffect(() => {
    setAuthSession({
      accessToken: `demo-token-${user.role}`,
      refreshToken: `demo-refresh-${user.role}`,
      user,
    })
  }, [user])

  const handleRoleChange = (role) => {
    const nextUser = demoUsers[role]
    if (!nextUser) return

    setUser(nextUser)
    navigate(role === ROLES.TRAINEE ? '/my-courses' : '/dashboard')
  }

  const handleLogout = () => {
    clearAuthSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="demo-app-layout">
      <div className="demo-app-layout__inner">
        <Sidebar
          userRole={user.role}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="demo-app-layout__main">
          <Header
            user={user}
            onToggleSidebar={() => setSidebarOpen(true)}
            onLogout={handleLogout}
            onRoleChange={handleRoleChange}
          />

          <main className="demo-app-layout__content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
