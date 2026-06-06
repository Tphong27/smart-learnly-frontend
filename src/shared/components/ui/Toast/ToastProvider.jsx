import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { ToastContainer } from './ToastContainer'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    )
  }, [])

  const showToast = useCallback(
    ({ type = 'info', message, title, duration = 3000 }) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`

      const toast = {
        id,
        type,
        title,
        message,
      }

      setToasts((currentToasts) => [...currentToasts, toast])

      if (duration > 0) {
        window.setTimeout(() => {
          removeToast(id)
        }, duration)
      }

      return id
    },
    [removeToast],
  )

  const value = useMemo(
    () => ({
      showToast,
      removeToast,
      success: (message, options = {}) =>
        showToast({ type: 'success', message, ...options }),
      error: (message, options = {}) =>
        showToast({ type: 'error', message, ...options }),
      warning: (message, options = {}) =>
        showToast({ type: 'warning', message, ...options }),
      info: (message, options = {}) =>
        showToast({ type: 'info', message, ...options }),
    }),
    [showToast, removeToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }

  return context
}