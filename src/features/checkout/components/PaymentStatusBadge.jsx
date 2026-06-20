const STATUS_LABELS = {
  PENDING: 'Waiting for payment',
  PROCESSING: 'Processing',
  SUCCESS: 'Payment successful',
  PAID: 'Paid',
  FAILED: 'Payment failed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  MISMATCHED: 'Need review',
  WAITING_PAYMENT: 'Waiting for payment',
  MATCHED: 'Matched',
}

export function PaymentStatusBadge({ status }) {
  const normalized = String(status || 'PENDING').toUpperCase()
  const label = STATUS_LABELS[normalized] || normalized

  return (
    <span className={`payment-status payment-status--${normalized.toLowerCase()}`}>
      {label}
    </span>
  )
}