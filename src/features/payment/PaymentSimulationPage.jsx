import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getLifecycleCourseById } from '@/data/demo/courseLifecycleRuntime'
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
  const status = location.state?.status || 'paid'

  if (loading) {
    return <PageState state="loading" title="Confirming payment" description="Simulating payment provider callback." />
  }

  if (!course) {
    return <PageState state="empty" title="Course not found" description="The simulated payment could not be matched to a course." />
  }

  return (
    <main className="demo-page">
      <section className="demo-result-card">
        <span className="demo-result-card__icon"><CheckCircle2 size={34} /></span>
        <StatusBadge status={status} />
        <h1>Enrollment confirmed</h1>
        <p>
          {course.title} is now available in My Courses. This is a mock payment result for the demo vertical slice.
        </p>
        <div className="demo-actions">
          <Link className="demo-primary-action" to="/my-courses">
            Go to My Courses <ArrowRight size={16} />
          </Link>
          <Link className="demo-secondary-action" to={`/learning/${course.id}`}>
            Start learning
          </Link>
        </div>
      </section>
    </main>
  )
}
