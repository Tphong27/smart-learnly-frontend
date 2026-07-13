import { useEffect, useId, useRef } from 'react'
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
  closeLabel = 'Close dialog',
  onClose,
}) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    const dialog = dialogRef.current
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    const focusTimer = window.requestAnimationFrame(() => {
      const firstFocusable = dialog?.querySelector(focusableSelector)
      ;(firstFocusable || dialog)?.focus()
    })

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onCloseRef.current?.()
        return
      }

      if (event.key !== 'Tab' || !dialog) return

      const focusable = Array.from(dialog.querySelectorAll(focusableSelector))
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.cancelAnimationFrame(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  function handleOverlayClick(event) {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onCloseRef.current?.()
    }
  }

  return (
    <div
      className={`modal-overlay modal-overlay--${position}`}
      role="presentation"
      onClick={handleOverlayClick}
    >
      <section
        ref={dialogRef}
        className={`modal modal--${size} modal--${position}`}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-label={title ? undefined : 'Dialog'}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="modal__header">
          <div>
            {title && (
              <h2 id={titleId} className="modal__title">
                {title}
              </h2>
            )}

            {description && (
              <p id={descriptionId} className="modal__description">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            className="modal__close"
            aria-label={closeLabel}
            onClick={() => onCloseRef.current?.()}
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
