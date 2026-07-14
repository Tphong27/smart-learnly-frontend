import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AuroraBackground } from "./AuroraBackground";
import { SmartLearnlyMark } from "@/shared/components/SmartLearnlyMark";
import "./AuthCard.css";

function BrandLogo({ tone = "light" }) {
    return (
        <span className={`auth-brand auth-brand--${tone}`}>
            <SmartLearnlyMark className="auth-brand__mark" />
            <span className="auth-brand__wordmark">
                Smart <span>Learnly</span>
            </span>
        </span>
    );
}

export function AuthPage({ children }) {
    return (
        <div className="auth-page">
            <AuroraBackground />

            <header className="auth-page__header">
                <BrandLogo tone="light" />
                <Link className="auth-page__home" to="/">
                    Back to home <ArrowUpRight size={15} />
                </Link>
            </header>

            <main className="auth-form">
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
