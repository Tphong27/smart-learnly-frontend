import { Link, useLocation, useParams } from 'react-router-dom'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { paymentStatusService } from '@/services'
import { PaymentStatusBadge } from '../components/PaymentStatusBadge'
import '../checkout.css'

function getResultContent(status) {
  const normalized = String(status || '').toUpperCase()

  if (paymentStatusService.isSuccess(normalized)) {
    return {
      icon: CheckCircle2,
      title: 'Payment successful',
      message:
        'Your payment has been confirmed. Your course access will be available in My Courses.',
      actionLabel: 'Go to My Courses',
      actionPath: '/my-courses',
    }
  }

  if (paymentStatusService.isProblem(normalized)) {
    return {
      icon: XCircle,
      title: 'Payment was not completed',
      message:
        'The payment failed, expired, was cancelled, or needs review. Please return to cart or contact support if money was transferred.',
      actionLabel: 'Back to cart',
      actionPath: '/cart',
    }
  }

  return {
    icon: Clock3,
    title: 'Payment is processing',
    message:
      'We have not confirmed this payment yet. The system will update the result after matching the bank transaction.',
    actionLabel: 'Back to cart',
    actionPath: '/cart',
  }
}

export function PaymentResultPage() {
  const { orderId } = useParams()
  const location = useLocation()

  const status = location.state?.status ?? 'PROCESSING'
  const transactionId = location.state?.transactionId
  const content = getResultContent(status)
  const Icon = content.icon

  return (
    <section className="payment-result">
      <div className="payment-result__card">
        <Icon size={48} />

        <PaymentStatusBadge status={status} />

        <h1>{content.title}</h1>
        <p>{content.message}</p>

        <div className="payment-result__meta">
          <small>Order ID: {orderId}</small>
          {transactionId && (
            <small>Transaction ID: {transactionId}</small>
          )}
        </div>

        <Link to={content.actionPath} className="button button--primary">
          {content.actionLabel}
        </Link>
      </div>
    </section>
  )
}