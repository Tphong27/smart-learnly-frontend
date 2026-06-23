import { getStatusColorClass, getStatusLabel } from "../utils/classFormatter";

export function ClassStatusBadge({ status, className = "" }) {
  const colorClass = getStatusColorClass(status);
  const label = getStatusLabel(status);

  return (
    <span className={`class-badge class-badge--${colorClass} ${className}`}>
      {label}
    </span>
  );
}