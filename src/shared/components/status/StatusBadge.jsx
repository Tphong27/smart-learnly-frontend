import { formatStatusLabel } from "@/shared/utils/formatters";
import "./status-badge.css";

export function StatusBadge({
  status,
  label,
  variant = "default",
  className = "",
}) {
  const normalized = String(status || "pending").toLowerCase();
  const classes = [
    "status-badge",
    `status-badge--${normalized}`,
    variant !== "default" ? `status-badge--${variant}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      {label || formatStatusLabel(status)}
    </span>
  );
}