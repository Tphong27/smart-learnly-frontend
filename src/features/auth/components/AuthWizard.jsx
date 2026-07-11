import { Link } from "react-router-dom";
import { AuthPage, AuthCard } from "./AuthCard";
import "./AuthWizard.css";

export function AuthWizard({
  title,
  subtitle,
  alert,
  footer,
  children,
}) {
  return (
    <AuthPage>
      <AuthCard
        wide
        title={title}
        subtitle={subtitle}
        alert={alert}
        footer={footer}
      >
        <div className="auth-wizard__panel">{children}</div>
      </AuthCard>
    </AuthPage>
  );
}

export function AuthWizardFooter({ left, right }) {
  return (
    <div className="auth-wizard__footer">
      {left ? (
        <Link to={left.to} className="auth-wizard__footer-link">
          {left.label}
        </Link>
      ) : (
        <span />
      )}
      {right && <div className="auth-wizard__footer-right">{right}</div>}
    </div>
  );
}