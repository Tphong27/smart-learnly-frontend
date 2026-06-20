import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cartService, orderService } from '@/services'
import { useToast } from '@/shared/components/ui'
import { CartItem } from '../components/CartItem'
import { CartSummary } from '../components/CartSummary'
import { EmptyCartState } from '../components/EmptyCartState'
import '../cart.css'

export function CartPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [cart, setCart] = useState({
    id: null,
    items: [],
    totalAmount: 0,
    currency: 'VND',
  })
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchInitialCart() {
      try {
        const data = await cartService.getCart()

        if (!cancelled) {
          setCart(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || 'Could not load your cart.'
          setError(message)
          toast.error(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchInitialCart()

    return () => {
      cancelled = true
    }
  }, [toast])

  async function refreshCart() {
    setLoading(true)
    setError(null)

    try {
      const data = await cartService.getCart()
      setCart(data)
    } catch (err) {
      const message = err?.message || 'Could not load your cart.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(itemId) {
    setRemovingId(itemId)

    try {
      await cartService.removeItem(itemId)

      const data = await cartService.getCart()
      setCart(data)

      toast.success('Item removed from cart.')
    } catch (err) {
      toast.error(err?.message || 'Could not remove this item.')
    } finally {
      setRemovingId(null)
    }
  }

  async function handleCheckout() {
    if (!cart?.id) {
      toast.error('Cart is not ready.')
      return
    }

    setCheckingOut(true)

    try {
      const checkout = await orderService.checkout(cart.id)

      navigate(`/checkout/${checkout.orderId}`, {
        state: {
          checkout,
        },
      })
    } catch (err) {
      toast.error(err?.message || 'Could not create checkout order.')
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) {
    return <div className="admin-loading">Loading cart...</div>
  }

  if (error) {
    return (
      <section className="cart-page">
        <div className="admin-error">{error}</div>

        <button
          type="button"
          className="button button--primary"
          onClick={refreshCart}
        >
          Try again
        </button>
      </section>
    )
  }

  return (
    <section className="cart-page">
      <header className="cart-page__header">
        <div>
          <span className="cart-page__eyebrow">Checkout</span>
          <h1>Your cart</h1>
          <p>Review selected courses and classes before payment.</p>
        </div>
      </header>

      {cart.items.length === 0 ? (
        <EmptyCartState />
      ) : (
        <div className="cart-grid">
          <div className="cart-list">
            {cart.items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                removing={removingId === item.id}
                onRemove={handleRemove}
              />
            ))}
          </div>

          <CartSummary
            cart={cart}
            loading={checkingOut}
            onCheckout={handleCheckout}
          />
        </div>
      )}
    </section>
  )
}