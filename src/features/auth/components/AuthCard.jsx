import { Link } from "react-router-dom";
import "./AuthCard.css";

function BrandLogo({ tone = "dark" }) {
    return (
        <span className={`auth-brand auth-brand--${tone}`}>
            <span className="auth-brand__mark" aria-hidden="true">
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M4 19V5l8 5 8-5v14" />
                    <path d="M4 12l8 5 8-5" opacity="0.55" />
                </svg>
            </span>
            <span className="auth-brand__wordmark">
                Smart Learnly
                <small>Learning platform</small>
            </span>
        </span>
    );
}

function BrandStory() {
    return (
        <aside className="auth-story" aria-label="Smart Learnly introduction">
            <div className="auth-story__inner">
                <BrandLogo tone="light" />

                <div className="auth-story__content">
                    <p className="auth-story__kicker">Smart Learnly</p>
                    <h2 className="auth-story__title">
                        Build real skills,
                        <br />
                        one lesson at a time.
                    </h2>
                    <p className="auth-story__copy">
                        A focused learning space for courses, practice tests,
                        flashcards, and progress tracking.
                    </p>
                </div>

                <div className="auth-story__quote">
                    <span>For learners, trainers, and teams who want a clearer path to progress.</span>
                </div>
            </div>
        </aside>
    );
}

export function AuthPage({ children }) {
    return (
        <div className="auth-page">
            <BrandStory />

            <main className="auth-form">
                <header className="auth-form__header">
                    <BrandLogo tone="dark" />
                    <Link to="/" className="auth-form__header-link">
                        Back to home
                    </Link>
                </header>

                <div className="auth-form__brand-mobile">
                    <BrandLogo tone="dark" />
                </div>

                <div className="auth-form__inner">{children}</div>

                <footer className="auth-form__foot">
                    <span>© 2025 Smart Learnly</span>
                    <Link to="/terms">Terms</Link>
                    <Link to="/privacy">Privacy</Link>
                </footer>
            </main>
        </div>
    );
}

export function AuthCard({
    title,
    subtitle,
    children,
    footer,
    wide = false,
    alert,
    icon,
}) {
    const className = ["auth-card", wide ? "auth-card--wide" : ""]
        .filter(Boolean)
        .join(" ");

    return (
        <section className={className}>
            {icon && (
                <span className="auth-card__icon" aria-hidden="true">
                    {icon}
                </span>
            )}
            {title && <h1 className="auth-card__title">{title}</h1>}
            {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
            {alert && (
                <div
                    className={`auth-card__alert auth-card__alert--${alert.type || "error"}`}
                >
                    {alert.message}
                </div>
            )}
            {children}
            {footer && <div className="auth-card__footer">{footer}</div>}
        </section>
    );
}
