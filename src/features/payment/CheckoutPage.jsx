import { useState } from 'react'
import { ArrowRight, CreditCard, ShieldCheck, WalletCards } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { demoUsers } from '@/data/demo'
import { createMockPayment, getDemoEnrollmentByCourse } from '@/data/demo/demoRuntime'
import { getLifecycleCourseById } from '@/data/demo/courseLifecycleRuntime'
import { isCoursePublished } from '@/data/demo/courseLifecycle'
import { getCurrentUser } from '@/services'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

const paymentMethods = [
  { id: 'bank_transfer', label: 'Bank transfer', description: 'Simulate a paid bank transfer receipt.' },
  { id: 'card', label: 'Card', description: 'Simulate a successful card authorization.' },
  { id: 'center_sponsored', label: 'Center sponsored', description: 'Mark the enrollment as paid by training center.' },
]

function formatPrice(course) {
  return new Intl.NumberFormat('vi-VN').format(course.price) + ' ' + course.currency
}

export function CheckoutPage() {
  useDocumentTitle('Checkout mock')

  const { courseId } = useParams()
  const navigate = useNavigate()
  const { loading, error } = useDemoPageState()
  const [method, setMethod] = useState('bank_transfer')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const course = getLifecycleCourseById(courseId)
  const currentUser = getCurrentUser() || demoUsers.trainee
  const enrollment = getDemoEnrollmentByCourse(courseId, currentUser.id)
  const trainee = currentUser

  const handleSubmit = (event) => {
    event.preventDefault()
    setFormError('')

    if (!method) {
      setFormError('Choose a payment method before continuing.')
      return
    }

    setSubmitting(true)
    window.setTimeout(() => {
      const payment = createMockPayment(currentUser.id, courseId, {
        method,
        amount: Number(course.price) || 0,
        currency: course.currency || 'VND',
      })

      navigate(`/payment/simulation/${courseId}`, {
        replace: true,
        state: { paymentId: payment.id, method },
      })
    }, 500)
  }

  if (loading) {
    return <PageState state="loading" title="Preparing checkout" description="Loading course price and learner details." />
  }

  if (error) {
    return <PageState state="error" title="Checkout unavailable" description={error.message} />
  }

  if (!course || !isCoursePublished(course)) {
    return <PageState state="empty" title="Course unavailable" description="Only published courses can be enrolled in the demo checkout." />
  }

  if (enrollment) {
    return (
      <PageState
        state="empty"
        title="Already enrolled"
        description="This trainee already has access to the course."
        action={<Link className="demo-primary-action" to={`/learning/${course.id}`}>Go to learning workspace <ArrowRight size={16} /></Link>}
      />
    )
  }

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Checkout mock</span>
          <h1>Confirm enrollment</h1>
          <p>This screen simulates payment and enrollment for demo purposes. No real payment is processed.</p>
        </div>
      </section>

      <form className="checkout-layout" onSubmit={handleSubmit}>
        <section className="demo-card">
          <h2>Payment method</h2>
          <div className="payment-method-list">
            {paymentMethods.map((item) => (
              <label key={item.id} className={method === item.id ? 'payment-method is-selected' : 'payment-method'}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value={item.id}
                  checked={method === item.id}
                  onChange={(event) => setMethod(event.target.value)}
                />
                <span><CreditCard size={19} /></span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </label>
            ))}
          </div>
          {formError && <p className="demo-form-error">{formError}</p>}
        </section>

        <aside className="demo-card checkout-summary">
          <StatusBadge status="pending" />
          <h2>{course.title}</h2>
          <p>{course.shortDescription}</p>
          <dl>
            <div><dt>Learner</dt><dd>{trainee.displayName}</dd></div>
            <div><dt>Course fee</dt><dd>{formatPrice(course)}</dd></div>
            <div><dt>Payment mode</dt><dd>Demo simulation</dd></div>
          </dl>
          <button className="demo-primary-action" type="submit" disabled={submitting}>
            {submitting ? <WalletCards size={16} /> : <ShieldCheck size={16} />}
            {submitting ? 'Preparing payment...' : 'Continue to Payment'}
          </button>
        </aside>
      </form>
    </main>
  )
}
