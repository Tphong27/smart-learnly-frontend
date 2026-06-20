function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const numberValue = Number(value)

  if (Number.isNaN(numberValue)) {
    return fallback
  }

  return numberValue
}

function formatMoney(value, currency = 'VND') {
  const amount = toNumber(value, 0)

  if (amount <= 0) {
    return 'Free'
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CheckoutSummary({ payment }) {
  const paymentAmount = toNumber(payment?.amount, 0)

  return (
    <aside className="checkout-summary">
      <h2>Checkout summary</h2>

      <div className="checkout-summary__row">
        <span>Order</span>
        <strong>{payment?.orderCode || payment?.orderId || '-'}</strong>
      </div>

      <div className="checkout-summary__row">
        <span>Gateway</span>
        <strong>{payment?.paymentGateway || 'SEPAY'}</strong>
      </div>

      <div className="checkout-summary__row checkout-summary__row--total">
        <span>Payment amount</span>
        <strong>{formatMoney(paymentAmount, payment?.currency)}</strong>
      </div>
    </aside>
  )
}