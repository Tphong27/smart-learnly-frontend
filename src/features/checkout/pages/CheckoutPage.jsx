import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Clock3 } from 'lucide-react'
import {
  orderService,
  paymentStatusService,
} from '@/services'
import { useToast } from '@/shared/components/ui'
import { PaymentInstructionCard } from '../components/PaymentInstructionCard'
import { CheckoutSummary } from '../components/CheckoutSummary'
import '../checkout.css'

const POLLING_INTERVAL_MS = 5000

export function CheckoutPage() {
  const { orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  const initialCheckout = location.state?.checkout ?? null

  const [payment, setPayment] = useState(initialCheckout)
  const [loading, setLoading] = useState(!initialCheckout)
  const [error, setError] = useState(null)

  const transactionId = payment?.transactionId

  const isFinalStatus = useMemo(
    () => paymentStatusService.isFinal(payment?.status),
    [payment?.status],
  )

  useEffect(() => {
    let cancelled = false

    async function loadOrder() {
      if (!orderId) return

      setLoading(true)
      setError(null)

      try {
        const data = await orderService.getOrder(orderId)

        if (!cancelled) {
          setPayment(data)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || 'Could not load checkout order.'
          setError(message)
          toast.error(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (!initialCheckout) {
      loadOrder()
    }

    return () => {
      cancelled = true
    }
  }, [orderId, initialCheckout, toast])

  useEffect(() => {
    if (!transactionId || isFinalStatus) {
      return undefined
    }

    const timer = window.setInterval(async () => {
      try {
        const statusPayload = await paymentStatusService.getStatus(transactionId)
        const nextStatus = statusPayload.status

        setPayment((current) => ({
          ...current,
          ...statusPayload,
          status: nextStatus,
        }))

        if (paymentStatusService.isFinal(nextStatus)) {
          window.clearInterval(timer)

          navigate(`/checkout/${orderId}/result`, {
            replace: true,
            state: {
              orderId,
              transactionId,
              status: nextStatus,
              message: statusPayload.message,
            },
          })
        }
      } catch {
        // Không toast liên tục khi polling lỗi tạm thời.
      }
    }, POLLING_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [transactionId, isFinalStatus, navigate, orderId])

  async function handleCopy(value) {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copied.')
    } catch {
      toast.error('Could not copy.')
    }
  }

  if (loading) {
    return <div className="admin-loading">Loading checkout...</div>
  }

  if (error || !payment) {
    return (
      <section className="checkout-page">
        <div className="admin-error">
          {error || 'Checkout order not found.'}
        </div>

        <Link to="/cart" className="button button--primary">
          Back to cart
        </Link>
      </section>
    )
  }

  return (
    <section className="checkout-page">
      <header className="checkout-page__header">
        <div>
          <span className="checkout-page__eyebrow">VietQR payment</span>
          <h1>Complete your checkout</h1>
          <p>
            Order {payment.orderCode || payment.orderId}
          </p>
        </div>

        <div className="checkout-page__hint">
          <Clock3 size={18} />
          <span>Status updates automatically.</span>
        </div>
      </header>

      <div className="checkout-layout">
        <PaymentInstructionCard
          payment={payment}
          onCopy={handleCopy}
        />

        <CheckoutSummary payment={payment} />
      </div>

      <div className="checkout-warning">
        <strong>Important:</strong> Please transfer the exact amount and exact
        payment code. Partial or overpayment will not be automatically confirmed.
      </div>
    </section>
  )
}