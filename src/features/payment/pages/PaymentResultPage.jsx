import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { Button, useToast } from '@/shared/components/ui'
import { orderService } from '@/services'
import './payment-result.css'

const POLL_INTERVAL_MS = 4000
const MAX_POLL_ATTEMPTS = 45

const TERMINAL_STATUSES = new Set(['PAID', 'CANCELLED', 'EXPIRED', 'FAILED'])

function resolveOutcome(order) {
  const status = (order?.status || '').toUpperCase()
  if (status === 'PAID') return 'success'
  if (status === 'CANCELLED' || status === 'EXPIRED' || status === 'FAILED') return 'failed'
  return 'pending'
}

export function PaymentResultPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const toast = useToast()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [outcome, setOutcome] = useState('pending')
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState(null)

  const notifiedRef = useRef(false)
  const pollingRef = useRef(true)

  useEffect(() => {
    if (!orderId) {
      pollingRef.current = false
      return undefined
    }

    let timer = null
    let cancelled = false

    async function tick() {
      if (cancelled || !pollingRef.current) return
      try {
        const data = await orderService.get(orderId)
        if (cancelled) return
        setOrder(data)
        const next = resolveOutcome(data)
        setOutcome(next)

        if (next === 'success' && !notifiedRef.current) {
          notifiedRef.current = true
          toast.success('Payment confirmed. Your access has been granted.')
        }
        if (next === 'failed' && !notifiedRef.current) {
          notifiedRef.current = true
          toast.error('Payment was not completed. Please try again or contact support.')
        }

        if (TERMINAL_STATUSES.has((data?.status || '').toUpperCase())) {
          pollingRef.current = false
          return
        }
      } catch (err) {
        if (cancelled) return
        setError(err?.message || 'Could not check payment status.')
      }

      setAttempts((n) => {
        const next = n + 1
        if (next >= MAX_POLL_ATTEMPTS) {
          pollingRef.current = false
        }
        return next
      })

      if (pollingRef.current) {
        timer = setTimeout(tick, POLL_INTERVAL_MS)
      }
    }

    tick()

    return () => {
      cancelled = true
      pollingRef.current = false
      if (timer) clearTimeout(timer)
    }
  }, [orderId, toast])

  if (!orderId) {
    return (
      <div className="payment-result">
        <div className="payment-result__card payment-result__card--failed">
          <XCircle size={48} />
          <h1>Missing order</h1>
          <p>We could not find the order to verify. Please return to your transactions.</p>
          <Button onClick={() => navigate('/learning/transactions')}>Go to transactions</Button>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="payment-result">
        <div className="payment-result__card payment-result__card--failed">
          <XCircle size={48} />
          <h1>Could not load order</h1>
          <p>{error}</p>
          <Button onClick={() => navigate('/learning/transactions')}>Go to transactions</Button>
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
          <p>Your order <strong>{order?.orderCode || orderId}</strong> has been confirmed.</p>
          <div className="payment-result__actions">
            <Link to="/learning/courses" className="button button--primary">Go to my courses</Link>
            <Link to="/learning/transactions" className="button button--ghost">View transactions</Link>
          </div>
        </div>
      </div>
    )
  }

  if (outcome === 'failed') {
    const status = (order?.status || '').toUpperCase()
    const reason = status === 'EXPIRED'
      ? 'The payment session has expired.'
      : status === 'CANCELLED'
        ? 'The order has been cancelled.'
        : 'The payment did not complete successfully.'

    return (
      <div className="payment-result">
        <div className="payment-result__card payment-result__card--failed">
          <XCircle size={48} />
          <h1>Payment not completed</h1>
          <p>{reason}</p>
          <div className="payment-result__actions">
            <Link to="/learning/transactions" className="button button--primary">View transactions</Link>
            <Link to="/" className="button button--ghost">Browse courses</Link>
          </div>
        </div>
      </div>
    )
  }

  const timedOut = attempts >= MAX_POLL_ATTEMPTS

  return (
    <div className="payment-result">
      <div className="payment-result__card payment-result__card--pending">
        <Clock3 size={48} />
        <h1>{timedOut ? 'Still waiting for confirmation' : 'Verifying payment...'}</h1>
        <p>
          {timedOut
            ? 'We have not received confirmation yet. You can refresh later or check your transaction history.'
            : 'Please keep this page open. We are checking with the payment gateway.'}
        </p>
        <div className="payment-result__actions">
          <Link to="/learning/transactions" className="button button--ghost">View transactions</Link>
        </div>
      </div>
    </div>
  )
}
