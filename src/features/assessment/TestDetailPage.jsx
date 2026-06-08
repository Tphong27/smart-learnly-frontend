import { ArrowRight, ClipboardCheck, Clock3, ShieldCheck, Target } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getDemoEnrollmentByCourse } from '@/data/demo/demoRuntime'
import {
  getLifecycleCourseById,
  getLifecycleTestById,
} from '@/data/demo/courseLifecycleRuntime'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

export function TestDetailPage() {
  const { testId } = useParams()
  const { loading, error } = useDemoPageState()
  const test = getLifecycleTestById(testId)
  const course = getLifecycleCourseById(test?.courseId)
  const enrollment = getDemoEnrollmentByCourse(test?.courseId)

  useDocumentTitle(test ? test.title : 'Test detail')

  if (loading) {
    return <PageState state="loading" title="Loading test" description="Preparing checkpoint settings." />
  }

  if (error) {
    return <PageState state="error" title="Test unavailable" description={error.message} />
  }

  if (!test || test.status !== 'published') {
    return <PageState state="empty" title="Test not available" description="This test is not published for trainees." />
  }

  if (!enrollment) {
    return (
      <PageState
        state="error"
        title="Enrollment required"
        description="You must enroll in the course before taking this test."
        action={<Link className="demo-primary-action" to={`/courses/${test.courseId}`}>View course <ArrowRight size={16} /></Link>}
      />
    )
  }

  return (
    <main className="demo-page">
      <section className="demo-detail-card">
        <StatusBadge status={test.status} />
        <span className="demo-kicker">{course?.title}</span>
        <h1>{test.title}</h1>
        <p>{test.description}</p>
        <div className="demo-meta-grid demo-meta-grid--wide">
          <span><ClipboardCheck size={16} /> {test.totalQuestions} questions</span>
          <span><Clock3 size={16} /> {test.durationMinutes} minutes</span>
          <span><Target size={16} /> {test.passingScore}% pass</span>
          <span><ShieldCheck size={16} /> Auto-scored mock</span>
        </div>
        <div className="demo-chip-list">
          <span>{test.type || 'Module Test'}</span>
          <span>{test.testStatus || 'Not Started'}</span>
          {test.topicTags.map((topic) => <span key={topic}>{topic}</span>)}
        </div>
        <div className="demo-actions">
          <Link className="demo-primary-action" to={`/tests/${test.id}/take`}>
            Start test <ArrowRight size={16} />
          </Link>
          <Link className="demo-secondary-action" to="/tests">Back to tests</Link>
        </div>
      </section>
    </main>
  )
}
