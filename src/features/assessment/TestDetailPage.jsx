import { ArrowRight, Clock3, History, Target } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getTestForTrainee } from '@/data/demo/traineeTestRuntime'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { getCurrentUser } from '@/services'

export function TestDetailPage() {
  const { testId } = useParams()
  const traineeId = getCurrentUser()?.id || 'trainee-minh'
  const test = getTestForTrainee(testId, traineeId)
  useDocumentTitle(test?.title || 'Test detail')

  if (!test) return <PageState state="error" title="Test unavailable" description="You are not enrolled in the course or class for this test." />
  const takeTo = test.inProgressAttemptId ? `/tests/${test.id}/attempts/${test.inProgressAttemptId}` : `/tests/${test.id}/take`

  return (
    <main className="demo-page">
      <section className="demo-detail-card">
        <StatusBadge status={test.learnerStatus} />
        <span className="demo-kicker">{test.source.replaceAll('_', ' ')}</span>
        <h1>{test.title}</h1>
        <p>{test.description}</p>
        <div className="demo-meta-grid demo-meta-grid--wide">
          <span><Target size={16} /> {test.totalQuestions} questions</span>
          <span><Clock3 size={16} /> {test.durationMinutes} minutes</span>
          <span><History size={16} /> {test.attemptCount} submitted attempts</span>
        </div>
        <div className="demo-actions">
          {test.questions.length && !['closed', 'archived'].includes(test.status) ? <Link className="demo-primary-action" to={takeTo}>{test.inProgressAttemptId ? 'Resume' : 'Start Test'} <ArrowRight size={16} /></Link> : null}
          <Link className="demo-secondary-action" to="/tests">Back to Tests</Link>
        </div>
      </section>
    </main>
  )
}
