import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

// Tạ dùng mock user vì chưa merge auth-store.
// Sau khi có useAuth, thay block này bằng:
// const { user, logout } = useAuthStore()
const mockUser = {
  firstName: 'Dev',
  lastName: 'D',
  email: 'devd@slp.vn',
  role: 'admin',
  avatarUrl: '',
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const user = mockUser

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-layout-shell">
      <div className="app-layout-shell__inner">
        <Sidebar
          userRole={user.role}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="app-layout-shell__main">
          <Header
            user={user}
            onToggleSidebar={() => setSidebarOpen(true)}
            onLogout={handleLogout}
          />

          <main className="app-layout-shell__content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
