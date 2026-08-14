import { useEffect, useState } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastProvider } from '@/shared/components/ui/Toast/index'
import apiClient from '@/services/api-client'
import { GoogleAuthConfigContext } from './googleAuthConfigContext'

const ENV_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const PLACEHOLDER = '__SET_ME__'
/** Kiểm tra Client ID có thể dùng để khởi tạo Google Identity Services. */
function isValid(clientId) {
  return Boolean(clientId?.trim() && clientId.trim() !== PLACEHOLDER)
}

/** Nạp cấu hình Google một lần và dùng cùng một Client ID cho provider lẫn nút đăng nhập. */
export function AppProviders({ children }) {
  const [googleConfig, setGoogleConfig] = useState({
    clientId: null,
    isLoading: true,
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let clientId = isValid(ENV_GOOGLE_CLIENT_ID)
        ? ENV_GOOGLE_CLIENT_ID.trim()
        : null

      try {
        const response = await apiClient.get('/auth/google/config', {
          skipAuthorization: true,
          skipAuthRedirect: true,
        })
        const data = response?.data ?? response
        if (isValid(data?.clientId)) {
          clientId = data.clientId.trim()
        }
      } catch {
        // Backend không khả dụng thì dùng biến môi trường làm fallback.
      }

      if (!cancelled) {
        setGoogleConfig({ clientId, isLoading: false })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  let tree = <ToastProvider>{children}</ToastProvider>

  if (isValid(googleConfig.clientId)) {
    tree = (
      <GoogleOAuthProvider clientId={googleConfig.clientId}>
        {tree}
      </GoogleOAuthProvider>
    )
  }

  return (
    <GoogleAuthConfigContext.Provider value={googleConfig}>
      {tree}
    </GoogleAuthConfigContext.Provider>
  )
}
