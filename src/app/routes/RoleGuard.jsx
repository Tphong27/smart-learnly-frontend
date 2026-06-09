import { Navigate, Outlet, useOutletContext } from 'react-router-dom'
import { getCurrentUser } from '@/services'

export function RoleGuard({ allowedRoles = [] }) {
  const user = getCurrentUser()
  // Forward parent outlet context when available (e.g., from ClassWorkspaceLayout).
  // For routes under AppLayout (which passes no context), this will be null — and that's fine.
  const parentContext = useOutletContext()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet context={parentContext} />
}