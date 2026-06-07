import { Navigate, Outlet, useLocation } from 'react-router-dom'

function getAccessToken() {
  return localStorage.getItem('accessToken')
  //const { isAuthenticated, isLoading } = useAuthStore()
}

export function ProtectedRoute() {
  const location = useLocation()
  const accessToken = getAccessToken()

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}