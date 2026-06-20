function formatMoney(value, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function CheckoutSummary({ payment }) {
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
        <span>Total</span>
        <strong>{formatMoney(payment?.amount, payment?.currency)}</strong>
      </div>

      <p className="checkout-summary__note">
        The system will confirm your payment automatically after the bank
        transaction is matched.
      </p>
    </aside>
  )
}