function formatMoney(value, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function CartSummary({ cart, loading, onCheckout }) {
  const items = cart?.items ?? []

  const totalAmount =
    cart?.totalAmount ??
    items.reduce(
      (sum, item) =>
        sum + Number(item?.finalAmount ?? item?.price ?? item?.unitPrice ?? 0),
      0,
    )

  return (
    <aside className="cart-summary">
      <h2>Order summary</h2>

      <div className="cart-summary__row">
        <span>Items</span>
        <strong>{items.length}</strong>
      </div>

      <div className="cart-summary__row cart-summary__row--total">
        <span>Total</span>
        <strong>{formatMoney(totalAmount, cart?.currency)}</strong>
      </div>

      <button
        type="button"
        className="button button--primary cart-summary__button"
        disabled={loading || items.length === 0}
        onClick={onCheckout}
      >
        {loading ? 'Creating order...' : 'Proceed to checkout'}
      </button>
    </aside>
  )
}