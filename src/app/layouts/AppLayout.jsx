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
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar
          userRole={user.role}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="min-w-0 flex-1">
          <Header
            user={user}
            onToggleSidebar={() => setSidebarOpen(true)}
            onLogout={handleLogout}
          />

          <main className="p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}