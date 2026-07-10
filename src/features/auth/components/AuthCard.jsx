import { BookOpen, Brain, ChartLine, Sparkles, Zap } from "lucide-react";
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
                Smart <span>Learnly</span>
            </span>
        </span>
    );
}

function FeatureItem({ icon: Icon, title, description }) {
    return (
        <div className="auth-feature-item">
            <span className="auth-feature-icon">
                <Icon size={18} strokeWidth={2} />
            </span>
            <div className="auth-feature-text">
                <strong>{title}</strong>
                <span>{description}</span>
            </div>
        </div>
    );
}

export function AuthPage({ children }) {
    return (
        <div className="auth-page">
            <aside className="auth-stage">
                <div className="auth-stage__inner">
                    <div className="auth-stage__top">
                        <BrandLogo tone="light" />
                    </div>

                    <div className="auth-stage__body">
                        <div className="auth-stage__hero">
                            <h2 className="auth-stage__title">
                                Your journey to
                                <br />
                                <span className="auth-stage__highlight">
                                    mastery
                                </span>{" "}
                                starts here
                            </h2>
                            <p className="auth-stage__lede">
                                Join many of learners building real skills with
                                personalized AI guidance.
                            </p>
                        </div>

                        <div className="auth-stage__features">
                            <FeatureItem
                                icon={Brain}
                                title="Adaptive Learning"
                                description="AI adjusts content to your pace"
                            />
                            <FeatureItem
                                icon={ChartLine}
                                title="Track Progress"
                                description="Visual dashboards show your growth"
                            />
                            <FeatureItem
                                icon={BookOpen}
                                title="Expert Content"
                                description="Quality courses from certified trainers"
                            />
                        </div>
                    </div>

                    <div className="auth-stage__foot">
                        <span>Trusted by learners worldwide</span>
                    </div>
                </div>
            </aside>

            <main className="auth-form">
                <div className="auth-form__brand-mobile">
                    <BrandLogo tone="dark" />
                </div>
                <div className="auth-form__inner">{children}</div>
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
