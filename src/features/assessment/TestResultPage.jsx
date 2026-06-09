import { useState } from 'react'
import { CheckCircle2, Flag, RotateCcw, Target, XCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  getAttemptById,
  getAttemptsForTest,
  getTestForTrainee,
  reportQuestionIssue,
} from '@/data/demo/traineeTestRuntime'
import { PageState } from '@/shared/components/PageState'
import { ProgressBar } from '@/shared/components/ProgressBar'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { getCurrentUser } from '@/services'

function formatAnswer(question, answer) {
  if (question.type === 'matching') {
    return question.pairs.map((pair) => `${pair.prompt}: ${answer?.[pair.id] || 'No answer'}`).join(' · ')
  }
  if (question.type === 'fill_blank') return answer || 'No answer'
  const ids = Array.isArray(answer) ? answer : answer ? [answer] : []
  return ids.map((id) => question.options?.find((option) => option.id === id)?.text || id).join(', ') || 'No answer'
}

export function TestResultPage() {
  const { testId, attemptId, classId } = useParams()
  const traineeId = getCurrentUser()?.id || 'trainee-minh'
  const test = getTestForTrainee(testId, traineeId)
  const attempts = getAttemptsForTest(testId, traineeId).filter((attempt) => attempt.status === 'completed')
  const result = attemptId ? getAttemptById(attemptId, traineeId) : attempts[0]
  const [reported, setReported] = useState([])
  const prefix = classId ? `/my-classes/${classId}/tests` : '/tests'

  useDocumentTitle(test ? `${test.title} result` : 'Test result')
  if (!test || (classId && test.classId !== classId) || !result || result.testId !== testId || result.status !== 'completed') {
    return <PageState state="empty" title="No result found" description="Complete an accessible test attempt to view its result." />
  }

  const questions = result.questionSnapshot?.length ? result.questionSnapshot : test.questions
  const passed = result.score >= test.passingScore
  const report = (questionId) => {
    reportQuestionIssue({ traineeId, testId, attemptId: result.id, questionId })
    setReported((items) => [...items, questionId])
  }

  return (
    <main className="demo-page">
      <section className="result-layout">
        <article className="demo-card result-score-card">
          {passed ? <CheckCircle2 className="is-success" size={36} /> : <XCircle className="is-danger" size={36} />}
          <StatusBadge status={passed ? 'passed' : 'needs review'} />
          <h1>{result.score}%</h1>
          <p>{result.correctCount} of {result.totalQuestions} questions correct</p>
          <ProgressBar value={result.score} label="Test score" />
          <div className="demo-actions">
            {test.status !== 'closed' ? <Link className="demo-primary-action" to={`${prefix}/${test.id}/take`}><RotateCcw size={16} /> Retake</Link> : null}
            <Link className="demo-secondary-action" to={prefix}>Back to Tests</Link>
          </div>
        </article>

        <article className="demo-card">
          <h2>Attempt History</h2>
          <div className="demo-list">
            {attempts.map((attempt) => (
              <Link className="demo-list-item" key={attempt.id} to={`${prefix}/${test.id}/results/${attempt.id}`}>
                <strong>{attempt.score}%</strong>
                <small>{new Date(attempt.submittedAt).toLocaleString()} · {attempt.correctCount}/{attempt.totalQuestions}</small>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="demo-card">
        <h2>Answer Review</h2>
        <div className="question-list">
          {questions.map((question, index) => {
            const correct = result.correctness?.[question.id]
            return (
              <article className="question-card" key={question.id}>
                <div className="demo-row demo-row--between">
                  <strong>{index + 1}. {question.question}</strong>
                  {correct ? <CheckCircle2 className="is-success" size={20} /> : <XCircle className="is-danger" size={20} />}
                </div>
                <p><strong>Your answer:</strong> {formatAnswer(question, result.answers?.[question.id])}</p>
                <p className="demo-muted">{question.explanation || 'Review the related learning material.'}</p>
                <button type="button" className="demo-secondary-action" disabled={reported.includes(question.id)} onClick={() => report(question.id)}>
                  <Flag size={14} /> {reported.includes(question.id) ? 'Issue reported' : 'Report issue'}
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section className="demo-card">
        <div className="demo-row demo-row--between"><div><h2>Weakness-Based Review</h2><p className="demo-muted">Draft study recommendations generated from incorrect topics.</p></div><Target size={24} /></div>
        {result.weakTopics?.length ? (
          <div className="weakness-grid">
            {result.weakTopics.map((topic) => <article className="weakness-card" key={topic}><StatusBadge status="draft" /><h3>{topic}</h3><p>Review the related course module, then generate a personal Practice Test focused on this topic.</p></article>)}
          </div>
        ) : <p className="demo-muted">No weak topics detected in this attempt.</p>}
      </section>
    </main>
  )
}
