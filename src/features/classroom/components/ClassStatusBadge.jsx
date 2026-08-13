import { getStatusLabel } from "../utils/classFormatter";
import { StatusBadge } from "@/shared/components/status";

const CLASS_STATUS_TONES = {
  UPCOMING: "warning",
  ONGOING: "success",
  ACTIVE: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
  DRAFT: "neutral",
};

/** Ánh xạ trạng thái lớp sang StatusBadge semantic dùng chung. */
export function ClassStatusBadge({ status, className = "" }) {
  const label = getStatusLabel(status);
  const tone = CLASS_STATUS_TONES[String(status || "").toUpperCase()] || "neutral";

  return <StatusBadge status={status} label={label} tone={tone} className={className} />;
}
