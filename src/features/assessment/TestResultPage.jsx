import { ArrowRight, CheckCircle2, RotateCcw, Target, XCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { demoAttempts, demoQuestions, demoTests, demoTraineeWeaknessAnalysis } from '@/data/demo'
import { PageState } from '@/shared/components/PageState'
import { ProgressBar } from '@/shared/components/ProgressBar'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

function getLiveResult(testId) {
  if (typeof window === 'undefined') return null

  try {
    const value = window.sessionStorage.getItem(`slp.demo.result.${testId}`)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export function TestResultPage() {
  const { testId, attemptId } = useParams()
  const { loading, error } = useDemoPageState()
  const test = demoTests.find((item) => item.id === testId)
  const liveResult = attemptId === 'demo-live-attempt' ? getLiveResult(testId) : null
  const savedAttempt = demoAttempts.find((attempt) => attempt.id === attemptId) || demoAttempts.find((attempt) => attempt.testId === testId)
  const result = liveResult || savedAttempt
  const weaknessItems = demoTraineeWeaknessAnalysis.filter((item) => item.testId === testId)
  const questions = test
    ? test.questionIds
      .map((questionId) => demoQuestions.find((question) => question.id === questionId))
      .filter(Boolean)
    : []

  useDocumentTitle(test ? `${test.title} result` : 'Test result')

  if (loading) {
    return <PageState state="loading" title="Loading result" description="Preparing score and weakness analysis." />
  }

  if (error) {
    return <PageState state="error" title="Result unavailable" description={error.message} />
  }

  if (!test || !result) {
    return <PageState state="empty" title="No result found" description="Complete the test to view score and weakness analysis." />
  }

  const passed = result.score >= test.passingScore

  return (
    <main className="demo-page">
      <section className="result-layout">
        <article className="demo-card result-score-card">
          <span className={passed ? 'result-score-card__icon is-pass' : 'result-score-card__icon is-fail'}>
            {passed ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
          </span>
          <StatusBadge status={passed ? 'passed' : 'needs review'} tone={passed ? 'completed' : 'at-risk'} />
          <h1>{result.score}%</h1>
          <p>{result.correctCount} of {result.totalQuestions} questions correct</p>
          <ProgressBar value={result.score} label="Test score" />
          <div className="demo-actions">
            <Link className="demo-primary-action" to="/analytics/me">
              View weakness analysis <ArrowRight size={16} />
            </Link>
            <Link className="demo-secondary-action" to={`/tests/${test.id}/take`}>
              <RotateCcw size={16} />
              Retake
            </Link>
          </div>
        </article>

        <article className="demo-card">
          <h2>Question summary</h2>
          <div className="demo-list">
            {questions.map((question) => {
              const liveAnswer = liveResult?.answers?.[question.id] || []
              const savedAnswer = savedAttempt?.answers?.find((answer) => answer.questionId === question.id)
              const isCorrect = liveResult
                ? question.correctOptionIds.every((id) => liveAnswer.includes(id))
                : savedAnswer?.isCorrect

              return (
                <div className="demo-list-item" key={question.id}>
                  <div>
                    <strong>{question.topic}</strong>
                    <small>{question.question}</small>
                  </div>
                  {isCorrect ? <CheckCircle2 className="is-success" size={20} /> : <XCircle className="is-danger" size={20} />}
                </div>
              )
            })}
          </div>
        </article>
      </section>

      <section className="demo-card">
        <div className="demo-row demo-row--between">
          <div>
            <h2>Weakness analysis</h2>
            <p className="demo-muted">Recommendations are draft study suggestions until reviewed or published by staff.</p>
          </div>
          <Target size={24} />
        </div>
        {weaknessItems.length === 0 ? (
          <PageState state="empty" title="No weakness detected" description="Your latest result does not contain weak topics in demo data." />
        ) : (
          <div className="weakness-grid">
            {weaknessItems.map((item) => (
              <article className="weakness-card" key={item.id}>
                <StatusBadge status={item.severity} tone={item.severity === 'high' ? 'at-risk' : 'review'} />
                <h3>{item.topic}</h3>
                <ProgressBar value={item.score} label={`${item.topic} score`} />
                <p>{item.recommendation}</p>
                <StatusBadge status={item.recommendationStatus} />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
