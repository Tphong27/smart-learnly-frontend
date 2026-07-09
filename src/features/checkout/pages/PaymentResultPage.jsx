import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { orderService, paymentStatusService } from '@/services'
import '../payment-result.css'

function getStatusCandidates(payment) {
  return [
    payment?.status,
    payment?.transactionStatus,
    payment?.sepayOrderStatus,
  ].filter(Boolean)
}

function hasStatus(payment, targetStatus) {
  const normalizedTarget = String(targetStatus || '').toUpperCase()

  return getStatusCandidates(payment).some(
    (status) => String(status || '').toUpperCase() === normalizedTarget,
  )
}

function resolveOutcome(payment) {
  const statuses = getStatusCandidates(payment)

  if (statuses.some((status) => paymentStatusService.isSuccess(status))) {
    return 'success'
  }

  if (statuses.some((status) => paymentStatusService.isProblem(status))) {
    return 'failed'
  }

  return 'pending'
}

export function PaymentResultPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const orderId = searchParams.get('orderId')
  const initialPayment = location.state?.payment ?? null
  const initialStatus = location.state?.status ?? null

  const [payment, setPayment] = useState(
    initialPayment ?? {
      orderId,
      status: initialStatus,
    },
  )

  const [outcome, setOutcome] = useState(() =>
    resolveOutcome(
      initialPayment ?? {
        status: initialStatus,
      },
    ),
  )

  const [loading, setLoading] = useState(!initialPayment && Boolean(orderId))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orderId) {
      return undefined
    }

    let cancelled = false

    async function loadPaymentResult() {
      setLoading(true)
      setError(null)

      try {
        const data = await orderService.get(orderId)

        if (cancelled) return

        setPayment(data)
        setOutcome(resolveOutcome(data))
      } catch (err) {
        if (cancelled) return

        setError(err?.message || 'Could not check payment status.')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadPaymentResult()

    return () => {
      cancelled = true
    }
  }, [orderId])

  if (!orderId) {
    return (
      <div className="payment-result">
        <div className="payment-result__card payment-result__card--failed">
          <XCircle size={48} />
          <h1>Missing order</h1>
          <p>We could not find the order to verify. Please return to your transactions.</p>
          <Button onClick={() => navigate('/learning/transactions')}>
            Go to transactions
          </Button>
        </div>
      </div>
    )
  }

  if (loading && !payment?.status) {
    return (
      <div className="payment-result">
        <div className="payment-result__card payment-result__card--pending">
          <Clock3 size={48} />
          <h1>Loading payment result...</h1>
          <p>Please wait while we check your order status.</p>
        </div>
      </div>
    )
  }

  if (error && !payment?.status) {
    return (
      <div className="payment-result">
        <div className="payment-result__card payment-result__card--failed">
          <XCircle size={48} />
          <h1>Could not load order</h1>
          <p>{error}</p>
          <Button onClick={() => navigate('/learning/transactions')}>
            Go to transactions
          </Button>
        </div>
      </div>
    )
  }

  if (outcome === 'success') {
    return (
      <div className="payment-result">
        <div className="payment-result__card payment-result__card--success">
          <CheckCircle2 size={48} />
          <h1>Payment successful</h1>
          <p>
            Your order <strong>{payment?.orderCode || orderId}</strong> has been confirmed.
          </p>

          <div className="payment-result__actions">
            <Link to="/learning/courses" className="button button--primary">
              Go to my courses
            </Link>

            <Link to="/learning/transactions" className="button button--ghost">
              View transactions
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (outcome === 'failed') {
    const reason = hasStatus(payment, 'EXPIRED')
      ? 'The payment session has expired.'
      : hasStatus(payment, 'CANCELLED')
        ? 'The order has been cancelled.'
        : hasStatus(payment, 'REFUNDED')
          ? 'The payment has been refunded.'
          : hasStatus(payment, 'MISMATCHED')
            ? 'The payment information did not match this order.'
            : 'The payment did not complete successfully.'

    return (
      <div className="payment-result">
        <div className="payment-result__card payment-result__card--failed">
          <XCircle size={48} />
          <h1>Payment not completed</h1>
          <p>{reason}</p>

          <div className="payment-result__actions">
            <Link to="/learning/transactions" className="button button--primary">
              View transactions
            </Link>

            <Link to="/" className="button button--ghost">
              Browse courses
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-result">
      <div className="payment-result__card payment-result__card--pending">
        <Clock3 size={48} />
        <h1>Payment is still being verified</h1>
        <p>
          We have not received final confirmation yet. You can check your transaction history later.
        </p>

        <div className="payment-result__actions">
          <Link to="/learning/transactions" className="button button--ghost">
            View transactions
          </Link>
        </div>
      </div>
    </div>
  )
}