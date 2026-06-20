import React from "react";

const STATUS_STYLES = {
  pending: { label: "Pending", color: "#f59e0b" },
  completed: { label: "Completed", color: "#10b981" },
  failed: { label: "Failed", color: "#ef4444" },
  refunded: { label: "Refunded", color: "#3b82f6" },
  unknown: { label: "Unknown", color: "#6b7280" },
};

export function PaymentStatusBadge({ status }) {
  const key = String(status || "unknown").toLowerCase();
  const { label, color } = STATUS_STYLES[key] || STATUS_STYLES.unknown;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.25rem 0.5rem",
        borderRadius: "999px",
        backgroundColor: `${color}20`,
        color,
        fontWeight: 600,
        fontSize: "0.85rem",
      }}
    >
      {label}
    </span>
  );
}
