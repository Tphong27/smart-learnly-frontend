import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { clearAuthSession, getCurrentUser } from '@/services/api-client'
import { demoUsers } from '@/data/demo'
import { ROLES } from '@/shared/constants/roles'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const user = getCurrentUser() || demoUsers[ROLES.TRAINEE]

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
          />

          <main className="demo-app-layout__content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
