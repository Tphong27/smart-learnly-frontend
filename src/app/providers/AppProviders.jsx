import { ToastProvider } from '@/shared/components/ui/Toast/index'

export function AppProviders({ children }) {
  return <ToastProvider>{children}</ToastProvider>
}