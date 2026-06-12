import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { authService, getCurrentUser } from '@/services'
import { ROLES } from '@/shared/constants/roles'
import './app-layout.css'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const storedUser = getCurrentUser()
  const user = storedUser ?? { fullName: 'Guest', email: '', role: ROLES.TRAINEE }
  const userRole = user.role || ROLES.TRAINEE

  async function handleLogout() {
    try {
      await authService.logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        userRole={userRole}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-shell__main">
        <Header
          user={user}
          onToggleSidebar={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
