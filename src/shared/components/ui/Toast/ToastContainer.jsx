import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react'
import './Toast.css'

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: TriangleAlert,
  info: Info,
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.type] || Info

        return (
          <div
            key={toast.id}
            className={`toast toast--${toast.type}`}
            role="status"
          >
            <div className="toast__icon">
              <Icon size={20} />
            </div>

            <div className="toast__content">
              {toast.title && (
                <p className="toast__title">{toast.title}</p>
              )}
              <p className="toast__message">{toast.message}</p>
            </div>

            <button
              type="button"
              className="toast__close"
              aria-label="Đóng thông báo"
              onClick={() => onRemove(toast.id)}
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}