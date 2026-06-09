import { ArrowRight, Clock3, History, Target } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { getTestsForTrainee } from '@/data/demo/traineeTestRuntime'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { getCurrentUser } from '@/services/api-client'

export function TraineeTests() {
  const { classId } = useOutletContext()
  const traineeId = getCurrentUser()?.id || 'trainee-minh'
  const tests = getTestsForTrainee(traineeId, { classId })

  if (!tests.length) return <PageState state="empty" title="No class tests available" description="Published official class tests will appear here." />

  return (
    <section className="classflow-section">
      <h2 className="classflow-section__title">Official Class Tests</h2>
      <p className="demo-muted">Class tests use the same attempt, resume, scoring, and history engine as Tests & Practice.</p>
      <div className="demo-list">
        {tests.map((test) => {
          const takeTo = test.inProgressAttemptId
            ? `/my-classes/${classId}/tests/${test.id}/attempts/${test.inProgressAttemptId}`
            : `/my-classes/${classId}/tests/${test.id}/take`
          return (
            <article className="demo-list-item" key={test.id}>
              <div>
                <StatusBadge status={test.learnerStatus} />
                <strong>{test.title}</strong>
                <small>{test.type} · {test.source.replaceAll('_', ' ')}</small>
                <div className="demo-chip-list">
                  <span><Target size={14} /> {test.totalQuestions} questions</span>
                  <span><Clock3 size={14} /> {test.durationMinutes} min</span>
                  <span><History size={14} /> {test.attemptCount} attempts</span>
                </div>
              </div>
              <div className="demo-actions">
                {test.questions.length && test.status !== 'closed' ? <Link className="demo-primary-action" to={takeTo}>{test.inProgressAttemptId ? 'Resume' : test.attemptCount ? 'Retake' : 'Start Test'} <ArrowRight size={15} /></Link> : <span className="demo-muted">Closed or no published questions</span>}
                {test.attemptCount ? <Link className="demo-secondary-action" to={`/my-classes/${classId}/tests/${test.id}/results`}>History</Link> : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
