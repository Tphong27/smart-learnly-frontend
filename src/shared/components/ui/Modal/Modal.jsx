import { useEffect } from 'react'
import { X } from 'lucide-react'
import './Modal.css'

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  size = 'md',
  position = 'center',
  closeOnOverlayClick = true,
  onClose,
}) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  function handleOverlayClick() {
    if (closeOnOverlayClick) {
      onClose?.()
    }
  }

  return (
    <div
      className={`modal-overlay modal-overlay--${position}`}
      role="presentation"
      onClick={handleOverlayClick}
    >
      <section
        className={`modal modal--${size} modal--${position}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <div>
            {title && (
              <h2 id="modal-title" className="modal__title">
                {title}
              </h2>
            )}

            {description && (
              <p id="modal-description" className="modal__description">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            className="modal__close"
            aria-label="Đóng modal"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="modal__body">{children}</div>

        {footer && <footer className="modal__footer">{footer}</footer>}
      </section>
    </div>
  )
}
