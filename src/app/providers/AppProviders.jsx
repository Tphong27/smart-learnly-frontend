import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastProvider } from '@/shared/components/ui/Toast/index'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== '__SET_ME__')

export function AppProviders({ children }) {
  const tree = <ToastProvider>{children}</ToastProvider>

  if (!isGoogleConfigured) {
    return tree
  }

  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{tree}</GoogleOAuthProvider>
}
