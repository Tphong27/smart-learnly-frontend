import { ArrowRight, ClipboardCheck, Clock3, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getEnrollmentsByUser } from '@/data/demo/demoRuntime'
import {
  getAllLifecycleTests,
  getLifecycleCourseById,
} from '@/data/demo/courseLifecycleRuntime'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { getCurrentUser } from '@/services'

export function TestListPage() {
  useDocumentTitle('Tests and practice')

  const { loading, error } = useDemoPageState()
  const traineeId = getCurrentUser()?.id || 'trainee-minh'
  const enrolledCourseIds = new Set(getEnrollmentsByUser(traineeId).map((enrollment) => enrollment.courseId))
  const availableTests = getAllLifecycleTests().filter((test) => test.status === 'published' && enrolledCourseIds.has(test.courseId))

  if (loading) {
    return <PageState state="loading" title="Loading tests" description="Checking published tests for enrolled courses." />
  }

  if (error) {
    return <PageState state="error" title="Tests unavailable" description={error.message} />
  }

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Tests and practice</span>
          <h1>Practice from your enrolled courses</h1>
          <p>Only published tests connected to enrolled courses appear for trainees.</p>
        </div>
      </section>

      {availableTests.length === 0 ? (
        <PageState
          state="empty"
          title="No tests available"
          description="Enroll in a course with a published test to start practice."
          action={<Link className="demo-primary-action" to="/courses">Explore courses <ArrowRight size={16} /></Link>}
        />
      ) : (
        <section className="demo-card-grid">
          {availableTests.map((test) => {
            const course = getLifecycleCourseById(test.courseId)

            return (
              <article className="demo-card test-card" key={test.id}>
                <div className="demo-row demo-row--between">
                  <StatusBadge status={test.status} />
                  <span className="test-card__course">{course?.title}</span>
                </div>
                <div className="demo-chip-list">
                  <span>{test.type || 'Module Test'}</span>
                  <span>{test.testStatus || 'Not Started'}</span>
                </div>
                <h2>{test.title}</h2>
                <p>{test.description}</p>
                <div className="demo-meta-grid">
                  <span><ClipboardCheck size={15} /> {test.totalQuestions} questions</span>
                  <span><Clock3 size={15} /> {test.durationMinutes} min</span>
                  <span><Target size={15} /> {test.passingScore}% pass</span>
                </div>
                <Link className="demo-primary-action" to={`/tests/${test.id}`}>
                  View test <ArrowRight size={16} />
                </Link>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}
