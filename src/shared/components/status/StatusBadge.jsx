import { formatStatusLabel } from "@/shared/utils/formatters";
import "./status-badge.css";

/** Hiển thị trạng thái nghiệp vụ bằng nhãn chữ và tone semantic nhất quán. */
export function StatusBadge({
  status,
  label,
  tone,
  icon,
  variant = "default",
  className = "",
}) {
  const normalized = String(status || "pending").toLowerCase();
  const classes = [
    "status-badge",
    `status-badge--${normalized}`,
    tone ? `status-badge--tone-${tone}` : "",
    variant !== "default" ? `status-badge--${variant}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      {icon ? <span className="status-badge__icon" aria-hidden="true">{icon}</span> : null}
      {label || formatStatusLabel(status)}
    </span>
  );
}
