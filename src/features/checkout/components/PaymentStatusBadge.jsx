const STATUS_LABELS = {
  pending: "Pending",
  waiting_payment: "Waiting for payment",
  processing: "Processing",
  matched: "Matched",
  success: "Paid",
  paid: "Paid",
  completed: "Completed",
  failed: "Failed",
  expired: "Expired",
  cancelled: "Cancelled",
  mismatched: "Mismatched",
  refunded: "Refunded",
  unknown: "Unknown",
};

export function PaymentStatusBadge({ status }) {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  const statusKey = Object.hasOwn(
    STATUS_LABELS,
    normalizedStatus,
  )
    ? normalizedStatus
    : "unknown";

  return (
    <span
      className={`payment-status payment-status--${statusKey}`}
    >
      {STATUS_LABELS[statusKey]}
    </span>
  );
}