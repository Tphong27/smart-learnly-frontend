import { Navigate, Outlet } from 'react-router-dom'
import { getCurrentUser } from '@/services'

export function RoleGuard({ allowedRoles = [] }) {
  const user = getCurrentUser()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}