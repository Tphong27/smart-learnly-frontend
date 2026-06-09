import { useState } from 'react'
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { demoUsers } from '@/data/demo'
import {
  createMockPayment,
  markPaymentFailed,
  markPaymentSuccess,
} from '@/data/demo/demoRuntime'
import { getLifecycleCourseById } from '@/data/demo/courseLifecycleRuntime'
import { getCurrentUser } from '@/services'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

export function PaymentSimulationPage() {
  useDocumentTitle('Payment simulation')

  const { courseId } = useParams()
  const location = useLocation()
  const { loading } = useDemoPageState()
  const course = getLifecycleCourseById(courseId)
  const user = getCurrentUser() || demoUsers.trainee
  const [paymentId, setPaymentId] = useState(() => location.state?.paymentId || '')
  const [status, setStatus] = useState('pending')

  const ensurePaymentId = () => {
    if (paymentId) return paymentId

    const payment = createMockPayment(user.id, courseId, {
      amount: Number(course?.price) || 0,
      currency: course?.currency || 'VND',
      method: location.state?.method || 'bank_transfer',
    })
    setPaymentId(payment.id)
    return payment.id
  }

  const simulateSuccess = () => {
    markPaymentSuccess(ensurePaymentId())
    setStatus('paid')
  }

  const simulateFailure = () => {
    markPaymentFailed(ensurePaymentId())
    setStatus('failed')
  }

  if (loading) {
    return <PageState state="loading" title="Confirming payment" description="Simulating payment provider callback." />
  }

  if (!course) {
    return <PageState state="empty" title="Course not found" description="The simulated payment could not be matched to a course." />
  }

  return (
    <main className="demo-page">
      <section className="demo-result-card">
        <span className={status === 'failed' ? 'demo-result-card__icon is-fail' : 'demo-result-card__icon'}>
          {status === 'failed' ? <XCircle size={34} /> : <CheckCircle2 size={34} />}
        </span>
        <StatusBadge status={status} />
        <h1>{status === 'paid' ? 'Enrollment confirmed' : status === 'failed' ? 'Payment failed' : 'Payment simulation'}</h1>
        <p>
          {status === 'paid'
            ? `${course.title} is now available in My Courses.`
            : status === 'failed'
              ? 'The mock payment was marked as failed. You can retry the checkout flow.'
              : `Choose a mock outcome for ${course.title}. No real payment is processed.`}
        </p>
        {status === 'pending' ? (
          <div className="demo-actions">
            <button type="button" className="demo-primary-action" onClick={simulateSuccess}>
              Simulate Payment Success <ArrowRight size={16} />
            </button>
            <button type="button" className="demo-secondary-action" onClick={simulateFailure}>
              Simulate Payment Failure
            </button>
          </div>
        ) : status === 'failed' ? (
          <div className="demo-actions">
            <Link className="demo-primary-action" to={`/checkout/${course.id}`}>
              Retry Payment <ArrowRight size={16} />
            </Link>
            <Link className="demo-secondary-action" to={`/courses/${course.id}`}>
              Back to Course
            </Link>
          </div>
        ) : (
          <div className="demo-actions">
            <Link className="demo-primary-action" to="/my-courses">
              Go to My Courses <ArrowRight size={16} />
            </Link>
            <Link className="demo-secondary-action" to={`/learning/${course.id}`}>
              Start learning
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
