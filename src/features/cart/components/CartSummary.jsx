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
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(toNumber(value, 0))
}

function getItemAmount(item) {
  return (
    item?.finalAmount ??
    item?.amount ??
    item?.totalAmount ??
    item?.price ??
    item?.unitPrice ??
    item?.course?.price ??
    0
  )
}

export function CartSummary({ cart, loading, onCheckout }) {
  const items = cart?.items ?? []

  const calculatedTotal = items.reduce(
    (sum, item) => sum + toNumber(getItemAmount(item), 0),
    0,
  )

  const cartTotalAmount = toNumber(cart?.totalAmount, 0)

  const totalAmount = cartTotalAmount > 0
    ? cartTotalAmount
    : calculatedTotal

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