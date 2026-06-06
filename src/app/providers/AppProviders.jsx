import { ToastProvider } from '@/shared/components/ui/Toast'

export function AppProviders({ children }) {
  return <ToastProvider>{children}</ToastProvider>
}