import { useEffect, useState } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastProvider } from '@/shared/components/ui/Toast/index'
import apiClient from '@/services/api-client'

const ENV_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const PLACEHOLDER = '__SET_ME__'

function isValid(clientId) {
  return Boolean(clientId && clientId !== PLACEHOLDER)
}

export function AppProviders({ children }) {
  // Ưu tiên Client ID động từ backend (admin có thể đổi qua System Settings),
  // fallback về biến môi trường khi backend chưa có cấu hình hoặc lỗi mạng.
  const [clientId, setClientId] = useState(ENV_GOOGLE_CLIENT_ID)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await apiClient.get('/auth/google/config')
        const data = response?.data ?? response
        if (!cancelled && isValid(data?.clientId)) {
          setClientId(data.clientId)
        }
      } catch {
        // Giữ nguyên giá trị env fallback.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const tree = <ToastProvider>{children}</ToastProvider>

  if (!isValid(clientId)) {
    return tree
  }

  return <GoogleOAuthProvider clientId={clientId}>{tree}</GoogleOAuthProvider>
}
