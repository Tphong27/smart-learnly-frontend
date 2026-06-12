import { Zap, BookOpen, ShieldCheck, BarChart3, Check, TrendingUp } from "lucide-react"
import "./AuthCard.css"

export function AuthPage({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-page__shell">
        <aside className="auth-side">
          <div className="auth-side__inner">
            <div className="auth-side__brand">
              <span className="auth-side__brand-mark">
                <Zap size={18} strokeWidth={2.6} />
              </span>
              <span>Smart Learnly</span>
            </div>

            <div className="auth-side__copy">
              <h2 className="auth-side__title">
                The learning platform built for modern teams.
              </h2>
              <p className="auth-side__subtitle">
                Personalized paths, deep analytics, and instant feedback. Trusted by universities and enterprise teams to accelerate skill growth.
              </p>
            </div>

            <div className="auth-side__preview" aria-hidden="true">
              <div className="preview-card">
                <div className="preview-card__head">
                  <div className="preview-card__title">
                    <span className="preview-card__dot" />
                    <strong>Weekly progress</strong>
                  </div>
                  <span className="preview-card__badge">
                    <TrendingUp size={11} strokeWidth={2.6} />
                    +12.4%
                  </span>
                </div>

                <div className="preview-card__metric">
                  <span className="preview-card__value">86<small>%</small></span>
                  <span className="preview-card__label">Course completion</span>
                </div>

                <div className="preview-card__chart">
                  <span style={{ height: "32%" }} />
                  <span style={{ height: "48%" }} />
                  <span style={{ height: "40%" }} />
                  <span style={{ height: "62%" }} />
                  <span style={{ height: "55%" }} />
                  <span style={{ height: "78%" }} />
                  <span style={{ height: "72%" }} />
                </div>

                <ul className="preview-card__rows">
                  <li>
                    <span className="preview-card__row-icon preview-card__row-icon--blue">
                      <BarChart3 size={13} />
                    </span>
                    <div>
                      <strong>Data Analytics</strong>
                      <small>Module 4 of 6</small>
                    </div>
                    <span className="preview-card__progress">
                      <i style={{ width: "72%" }} />
                    </span>
                  </li>
                  <li>
                    <span className="preview-card__row-icon preview-card__row-icon--slate">
                      <BookOpen size={13} />
                    </span>
                    <div>
                      <strong>Product Strategy</strong>
                      <small>Module 2 of 5</small>
                    </div>
                    <span className="preview-card__progress">
                      <i style={{ width: "44%" }} />
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <ul className="auth-side__points">
              <li>
                <Check size={14} strokeWidth={3} />
                <span>Adaptive learning paths tailored to each learner</span>
              </li>
              <li>
                <Check size={14} strokeWidth={3} />
                <span>Real-time analytics for managers and instructors</span>
              </li>
              <li>
                <Check size={14} strokeWidth={3} />
                <span>SSO, SCIM and enterprise-grade security</span>
              </li>
            </ul>

            <div className="auth-side__footer">
              <div className="auth-side__metric">
                <strong>120K+</strong>
                <span>Active learners</span>
              </div>
              <div className="auth-side__metric">
                <strong>98%</strong>
                <span>Satisfaction rate</span>
              </div>
              <div className="auth-side__metric">
                <strong>SOC 2</strong>
                <span>Type II certified</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="auth-main">
          {children}
        </main>
      </div>
    </div>
  )
}

export function AuthCard({ title, subtitle, children, footer, wide = false, alert }) {
  const className = ["auth-card", wide ? "auth-card--wide" : ""].filter(Boolean).join(" ")

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
        <div className={`auth-card__alert auth-card__alert--${alert.type || "error"}`}>
          {alert.message}
        </div>
      )}

      {children}

      {footer && <div className="auth-card__footer">{footer}</div>}
    </section>
  )
}
