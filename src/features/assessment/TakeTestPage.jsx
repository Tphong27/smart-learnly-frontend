import { useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, ClipboardCheck } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { demoQuestions, demoTests } from '@/data/demo'
import { PageState } from '@/shared/components/PageState'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

function scoreAnswers(questions, answers) {
  const correctCount = questions.reduce((count, question) => {
    const selected = answers[question.id] || []
    const expected = question.correctOptionIds || []
    const isCorrect = expected.length > 0
      && expected.length === selected.length
      && expected.every((id) => selected.includes(id))

    return isCorrect ? count + 1 : count
  }, 0)

  return {
    correctCount,
    score: Math.round((correctCount / questions.length) * 100),
  }
}

export function TakeTestPage() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const { loading, error } = useDemoPageState()
  const test = demoTests.find((item) => item.id === testId)
  const questions = useMemo(() => {
    if (!test) return []
    return test.questionIds
      .map((questionId) => demoQuestions.find((question) => question.id === questionId))
      .filter((question) => question && question.status === 'published')
  }, [test])
  const [answers, setAnswers] = useState({})
  const [formError, setFormError] = useState('')

  useDocumentTitle(test ? `Take ${test.title}` : 'Take test')

  const handleSelect = (questionId, optionId) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: [optionId],
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const missingQuestion = questions.find((question) => !answers[question.id]?.length)

    if (missingQuestion) {
      setFormError('Answer every required question before submitting.')
      return
    }

    const result = scoreAnswers(questions, answers)

    window.sessionStorage.setItem(`slp.demo.result.${test.id}`, JSON.stringify({
      testId: test.id,
      courseId: test.courseId,
      traineeId: 'trainee-minh',
      status: 'completed',
      score: result.score,
      correctCount: result.correctCount,
      totalQuestions: questions.length,
      submittedAt: new Date().toISOString(),
      answers,
    }))

    navigate(`/tests/${test.id}/result/demo-live-attempt`)
  }

  if (loading) {
    return <PageState state="loading" title="Preparing test" description="Loading published questions." />
  }

  if (error) {
    return <PageState state="error" title="Test unavailable" description={error.message} />
  }

  if (!test || test.status !== 'published') {
    return <PageState state="empty" title="Test not found" description="Only published tests can be taken." />
  }

  if (questions.length === 0) {
    return <PageState state="empty" title="No published questions" description="This test does not have published questions yet." />
  }

  return (
    <main className="demo-page">
      <form className="take-test-layout" onSubmit={handleSubmit}>
        <section className="demo-card take-test-main">
          <span className="demo-kicker">Assessment</span>
          <h1>{test.title}</h1>
          <p>{test.description}</p>

          {formError && (
            <div className="demo-inline-alert">
              <AlertCircle size={17} />
              {formError}
            </div>
          )}

          <div className="question-list">
            {questions.map((question, index) => (
              <fieldset className="question-card" key={question.id}>
                <legend>
                  <small>Question {index + 1}</small>
                  {question.question}
                </legend>
                <div className="answer-list">
                  {question.options.map((option) => (
                    <label key={option.id} className="answer-option">
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={answers[question.id]?.includes(option.id) || false}
                        onChange={() => handleSelect(question.id, option.id)}
                      />
                      <span>{option.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <aside className="demo-card take-test-side">
          <ClipboardCheck size={24} />
          <h2>Submit checkpoint</h2>
          <p>{questions.length} required questions. Results are mock-scored for demo only.</p>
          <button className="demo-primary-action" type="submit">
            Submit test <ArrowRight size={16} />
          </button>
        </aside>
      </form>
    </main>
  )
}
