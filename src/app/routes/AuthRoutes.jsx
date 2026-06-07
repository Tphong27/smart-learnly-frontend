import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'

function SessionGate({ children }) {
  const status = useAuthStore((state) => state.status)
  if (status === 'idle' || status === 'restoring') {
    return <main className="session-loading">Đang khôi phục phiên đăng nhập...</main>
  }
  return children
}

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()
  return <SessionGate>{status === 'authenticated'
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />}
  </SessionGate>
}

export function GuestRoute() {
  const status = useAuthStore((state) => state.status)
  return <SessionGate>{status === 'authenticated' ? <Navigate to="/app" replace /> : <Outlet />}</SessionGate>
}
