import { Navigate, Outlet } from 'react-router-dom'

function getCurrentUser() {
  const rawUser = localStorage.getItem('user')

  if (!rawUser) return null

  try {
    return JSON.parse(rawUser)
  } catch {
    return null
  }
}

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