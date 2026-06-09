import { Zap } from 'lucide-react'
import './AuthCard.css'

export function AuthPage({ children }) {
  return <div className="auth-page">{children}</div>
}

export function AuthCard({ title, subtitle, children, footer, wide = false, alert }) {
  const className = ['auth-card', wide ? 'auth-card--wide' : ''].filter(Boolean).join(' ')

  return (
    <section className={className}>
      <div className="auth-card__brand">
        <span className="auth-card__brand-mark">
          <Zap size={18} strokeWidth={2.6} />
        </span>
        Smart Learnly
      </div>

      {title && <h1 className="auth-card__title">{title}</h1>}
      {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}

      {alert && (
        <div className={`auth-card__alert auth-card__alert--${alert.type || 'error'}`}>
          {alert.message}
        </div>
      )}

      {children}

      {footer && <div className="auth-card__footer">{footer}</div>}
    </section>
  )
}
