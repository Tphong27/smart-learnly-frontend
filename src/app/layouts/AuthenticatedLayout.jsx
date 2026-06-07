import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, UserRound, KeyRound, LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import { Button } from '@/shared/components/ui'
import './AuthenticatedLayout.css'

export function AuthenticatedLayout() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }

  return <div className="authenticated-shell">
    <header className="authenticated-header">
      <NavLink className="authenticated-brand" to="/app">Smart Learnly</NavLink>
      <div><strong>{user?.fullName}</strong><span>{user?.role}</span></div>
      <Button variant="ghost" onClick={handleLogout} leftIcon={<LogOut size={17} />}>Đăng xuất</Button>
    </header>
    <aside className="authenticated-sidebar">
      <NavLink to="/app"><LayoutDashboard size={18} /> Tổng quan</NavLink>
      <NavLink to="/account/profile"><UserRound size={18} /> Hồ sơ</NavLink>
      <NavLink to="/account/change-password"><KeyRound size={18} /> Đổi mật khẩu</NavLink>
    </aside>
    <main className="authenticated-main"><Outlet /></main>
  </div>
}
