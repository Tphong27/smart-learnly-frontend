import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, Clock3 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getAttemptById,
  getTestForTrainee,
  saveAttemptAnswers,
  startOrResumeAttempt,
  submitAttempt,
} from '@/data/demo/traineeTestRuntime'
import { PageState } from '@/shared/components/PageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { getCurrentUser } from '@/services'

function answered(question, answer) {
  if (question.type === 'matching') return question.pairs?.every((pair) => answer?.[pair.id])
  return Array.isArray(answer) ? answer.length > 0 : Boolean(String(answer ?? '').trim())
}

function QuestionInput({ question, answer, onChange }) {
  if (question.type === 'fill_blank') {
    return <input value={answer || ''} onChange={(event) => onChange(event.target.value)} placeholder="Type your answer" />
  }
  if (question.type === 'matching') {
    const choices = question.pairs.map((pair) => pair.answer)
    return (
      <div className="demo-list">
        {question.pairs.map((pair) => (
          <label className="course-flow-field" key={pair.id}>
            <span>{pair.prompt}</span>
            <select value={answer?.[pair.id] || ''} onChange={(event) => onChange({ ...(answer || {}), [pair.id]: event.target.value })}>
              <option value="">Select match</option>
              {choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
            </select>
          </label>
        ))}
      </div>
    )
  }
  const multiple = question.type === 'multiple_response'
  const selected = Array.isArray(answer) ? answer : answer ? [answer] : []
  return (
    <div className="answer-list">
      {question.options?.map((option) => (
        <label key={option.id} className="answer-option">
          <input
            type={multiple ? 'checkbox' : 'radio'}
            name={question.id}
            checked={selected.includes(option.id)}
            onChange={() => {
              if (!multiple) onChange(option.id)
              else onChange(selected.includes(option.id) ? selected.filter((id) => id !== option.id) : [...selected, option.id])
            }}
          />
          <span>{option.text}</span>
        </label>
      ))}
    </div>
  )
}

export function TakeTestPage() {
  const { testId, attemptId, classId } = useParams()
  const navigate = useNavigate()
  const traineeId = getCurrentUser()?.id || 'trainee-minh'
  const test = getTestForTrainee(testId, traineeId)
  const attempt = attemptId ? getAttemptById(attemptId, traineeId) : null
  const [answers, setAnswers] = useState(attempt?.answers || {})
  const [message, setMessage] = useState('')
  const [seconds, setSeconds] = useState(() => Math.max(0, Number(test?.durationMinutes || 0) * 60))

  useDocumentTitle(test ? `Take ${test.title}` : 'Take test')

  useEffect(() => {
    if (attemptId || !test || (classId && test.classId !== classId) || test.status === 'archived') return
    const next = startOrResumeAttempt(test.id, traineeId)
    if (!next) return
    const prefix = classId ? `/my-classes/${classId}/tests` : '/tests'
    navigate(`${prefix}/${test.id}/attempts/${next.id}`, { replace: true })
  }, [attemptId, classId, navigate, test, traineeId])

  useEffect(() => {
    if (!attemptId || !attempt) return
    const timer = window.setTimeout(() => saveAttemptAnswers(attemptId, traineeId, answers), 250)
    return () => window.clearTimeout(timer)
  }, [answers, attempt, attemptId, traineeId])

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [attempt])

  const questions = useMemo(() => attempt?.questionSnapshot || [], [attempt])
  if (!test || (classId && test.classId !== classId) || test.status === 'archived') {
    return <PageState state="error" title="Test unavailable" description="You are not enrolled in the course or class for this test." />
  }
  if (!attemptId) return <PageState state="loading" title="Starting attempt" description="Preparing your question snapshot." />
  if (!attempt || attempt.testId !== testId || attempt.status !== 'in_progress') {
    return <PageState state="error" title="Attempt unavailable" description="This attempt is not available to the current trainee." />
  }

  const submit = () => {
    if (questions.some((question) => !answered(question, answers[question.id]))) {
      setMessage('Answer every question before submitting.')
      return
    }
    const result = submitAttempt(attempt.id, traineeId, answers)
    const prefix = classId ? `/my-classes/${classId}/tests` : '/tests'
    navigate(`${prefix}/${test.id}/results/${result.id}`)
  }

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div><span className="demo-kicker">Attempt autosaves locally</span><h1>{test.title}</h1><p>{questions.length} questions · {test.type} · {test.source}</p></div>
        <strong><Clock3 size={16} /> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong>
      </section>
      {message ? <div className="demo-inline-alert"><AlertCircle size={17} /> {message}</div> : null}
      <section className="question-list">
        {questions.map((question, index) => (
          <fieldset className="question-card" key={question.id}>
            <legend><small>Question {index + 1} · {question.type.replaceAll('_', ' ')}</small>{question.question}</legend>
            <QuestionInput question={question} answer={answers[question.id]} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} />
          </fieldset>
        ))}
      </section>
      <button type="button" className="demo-primary-action" onClick={submit}>Submit Test <ArrowRight size={16} /></button>
    </main>
  )
}
