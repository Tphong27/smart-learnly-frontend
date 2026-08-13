import {
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import { IconButton } from "../IconButton";
import "./Alert.css";

const ALERT_ICONS = {
  danger: CircleAlert,
  info: Info,
  neutral: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
};

/** Hiển thị feedback tồn tại trong luồng nội dung với tone semantic thống nhất. */
export function Alert({
  id,
  tone = "info",
  title,
  children,
  action,
  icon,
  dismissLabel = "Dismiss message",
  className = "",
  onDismiss,
  role,
}) {
  const Icon = ALERT_ICONS[tone] || Info;
  const resolvedRole = role || (tone === "danger" ? "alert" : "status");

  return (
    <section
      id={id}
      className={`alert alert--${tone}${className ? ` ${className}` : ""}`}
      role={resolvedRole}
    >
      <span className="alert__icon" aria-hidden="true">
        {icon || <Icon size={20} />}
      </span>
      <div className="alert__content">
        {title ? <strong className="alert__title">{title}</strong> : null}
        <div className="alert__message">{children}</div>
      </div>
      {action ? <div className="alert__action">{action}</div> : null}
      {onDismiss ? (
        <IconButton
          icon={<X size={17} />}
          label={dismissLabel}
          className="alert__dismiss"
          onClick={onDismiss}
        />
      ) : null}
    </section>
  );
}
