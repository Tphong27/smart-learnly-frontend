import { ToastProvider } from '../../shared/components/ui'

export function AppProviders({ children }) {
  return <ToastProvider>{children}</ToastProvider>
}