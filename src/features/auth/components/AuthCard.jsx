import { ArrowUpRight, BookOpen, Quote, Sparkles, TrendingUp, Users } from "lucide-react"
import "./AuthCard.css"

function BrandLogo({ tone = "dark" }) {
  return (
    <span className={`auth-brand auth-brand--${tone}`}>
      <span className="auth-brand__mark" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19V5l8 5 8-5v14" />
          <path d="M4 12l8 5 8-5" opacity="0.55" />
        </svg>
      </span>
      <span className="auth-brand__wordmark">
        Smart<span>Learnly</span>
      </span>
    </span>
  )
}

export function AuthPage({ children }) {
  return (
    <div className="auth-page">
      <aside className="auth-stage">
        <div className="auth-stage__decor" aria-hidden="true">
          <span className="auth-stage__orbit auth-stage__orbit--one" />
          <span className="auth-stage__orbit auth-stage__orbit--two" />
          <span className="auth-stage__glow auth-stage__glow--blue" />
          <span className="auth-stage__glow auth-stage__glow--violet" />
          <span className="auth-stage__grid" />
        </div>

        <div className="auth-stage__inner">
          <div className="auth-stage__top">
            <BrandLogo tone="light" />
            <span className="auth-stage__pill">
              <Sparkles size={11} strokeWidth={2.6} />
              AI-powered learning
            </span>
          </div>

          <div className="auth-stage__body">
            <div className="auth-stage__hero">
              <h2 className="auth-stage__title">
                Learn smarter,
                <br />
                <em>progress</em> every day.
              </h2>
              <p className="auth-stage__lede">
                Smart Learnly personalizes your learning path with AI &mdash; track progress,
                get exercises matched to your level, and remember longer.
              </p>
            </div>

            <figure className="auth-stage__quote">
            <span className="auth-stage__quote-mark" aria-hidden="true">
              <Quote size={18} strokeWidth={2.4} />
            </span>
            <blockquote>
              &ldquo;After 3 months, I scored 8.0 on IELTS. The AI roadmap really
              knows my weak spots and trains me right where it matters.&rdquo;
            </blockquote>
            <figcaption>
              <span className="auth-stage__avatar">MN</span>
              <span>
                <strong>Minh Nguyen</strong>
                <small>Third-year student &middot; HUST</small>
              </span>
            </figcaption>
          </figure>

          <div className="auth-stage__chips" aria-hidden="true">
            <span className="auth-chip">
              <span className="auth-chip__icon auth-chip__icon--blue">
                <TrendingUp size={13} strokeWidth={2.4} />
              </span>
              <span className="auth-chip__body">
                <strong>+92%</strong>
                <small>Completion rate</small>
              </span>
            </span>
            <span className="auth-chip">
              <span className="auth-chip__icon auth-chip__icon--violet">
                <Users size={13} strokeWidth={2.4} />
              </span>
              <span className="auth-chip__body">
                <strong>12.4K</strong>
                <small>Active learners</small>
              </span>
            </span>
            <span className="auth-chip">
              <span className="auth-chip__icon auth-chip__icon--teal">
                <BookOpen size={13} strokeWidth={2.4} />
              </span>
              <span className="auth-chip__body">
                <strong>340+</strong>
                <small>Quality courses</small>
              </span>
            </span>
          </div>
          </div>

          <div className="auth-stage__foot">
            <span>Trusted by 500+ educational institutions</span>
            <span className="auth-stage__delta">
              <ArrowUpRight size={11} strokeWidth={2.6} />
              4.9/5 rating
            </span>
          </div>
        </div>
      </aside>

      <main className="auth-form">
        <div className="auth-form__brand-mobile">
          <BrandLogo tone="dark" />
        </div>
        <div className="auth-form__inner">
          {children}
        </div>
      </main>
    </div>
  )
}

export function AuthCard({ title, subtitle, children, footer, wide = false, alert, icon }) {
  const className = ["auth-card", wide ? "auth-card--wide" : ""].filter(Boolean).join(" ")

  return (
    <section className={className}>
      {icon && <span className="auth-card__icon" aria-hidden="true">{icon}</span>}
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
