import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { Button, FormField, useToast } from '@/shared/components/ui'
import { getCurrentUser, questionBankService } from '@/services'
import '../../admin-shared.css'

function canWriteQuestionBank() {
  const role = getCurrentUser()?.role
  return role === 'ADMIN' || role === 'SME'
}

const blankAnswer = (index = 0) => ({ answerText: '', correct: index === 0, displayOrder: index + 1 })

function normalizeAnswers(type, answers) {
  if (type === 'true_false') {
    return [
      { answerText: 'True', correct: answers?.[0]?.correct ?? true, displayOrder: 1 },
      { answerText: 'False', correct: answers?.[1]?.correct ?? false, displayOrder: 2 },
    ]
  }
  return answers?.length ? answers : [blankAnswer(0), blankAnswer(1), blankAnswer(2), blankAnswer(3)]
}

function validate(values) {
  if (!values.questionText.trim()) return 'Question text is required.'
  if (!values.questionType) return 'Question type is required.'
  const answers = normalizeAnswers(values.questionType, values.answers)
  if (answers.length < 2) return 'At least two answers are required.'
  if (values.questionType === 'multiple_choice' && answers.length > 6) return 'Multiple choice supports 2 to 6 answers.'
  if (answers.some((answer) => !answer.answerText.trim())) return 'Answer text must not be empty.'
  if (answers.filter((answer) => answer.correct).length !== 1) return 'Exactly one correct answer is required.'
  if (values.questionType === 'true_false') {
    const labels = answers.map((answer) => answer.answerText.trim().toLowerCase())
    if (!labels.includes('true') || !labels.includes('false')) return 'True/False answers must be True and False.'
  }
  return null
}

export function AdminQuestionFormPage() {
  const { bankId, questionId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const writable = canWriteQuestionBank()
  const editing = Boolean(questionId)
  const [bank, setBank] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [values, setValues] = useState({
    questionText: '',
    questionType: 'multiple_choice',
    difficulty: '',
    status: 'draft',
    explanation: '',
    answers: normalizeAnswers('multiple_choice'),
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        if (editing) {
          const question = await questionBankService.getQuestion(questionId)
          if (cancelled) return
          setValues({
            questionText: question.questionText || '',
            questionType: question.questionType || 'multiple_choice',
            difficulty: question.difficulty ? String(question.difficulty) : '',
            status: question.status || 'draft',
            explanation: question.explanation || '',
            answers: normalizeAnswers(question.questionType || 'multiple_choice', (question.answers || []).map((answer, index) => ({
              answerText: answer.answerText || '',
              correct: Boolean(answer.correct || answer.isCorrect),
              displayOrder: answer.displayOrder ?? index + 1,
            }))),
          })
          const resolvedBankId = question.bankId || question.questionBankId
          if (resolvedBankId) {
            const bankData = await questionBankService.getBank(resolvedBankId)
            if (!cancelled) setBank(bankData)
          }
        } else {
          const bankData = await questionBankService.getBank(bankId)
          if (!cancelled) setBank(bankData)
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load question form.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [bankId, editing, questionId])

  const returnBankId = useMemo(() => bank?.bankId || bank?.id || bankId, [bank, bankId])

  function setType(nextType) {
    setValues((current) => ({
      ...current,
      questionType: nextType,
      answers: normalizeAnswers(nextType, current.answers),
    }))
  }

  function setCorrect(index) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) => ({ ...answer, correct: answerIndex === index })),
    }))
  }

  function updateAnswer(index, answerText) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) => answerIndex === index ? { ...answer, answerText } : answer),
    }))
  }

  function addAnswer() {
    setValues((current) => {
      if (current.answers.length >= 6) return current
      return { ...current, answers: [...current.answers, blankAnswer(current.answers.length)] }
    })
  }

  function removeAnswer(index) {
    setValues((current) => {
      const nextAnswers = current.answers.filter((_, answerIndex) => answerIndex !== index)
      if (nextAnswers.length < 2) return current
      if (!nextAnswers.some((answer) => answer.correct)) nextAnswers[0] = { ...nextAnswers[0], correct: true }
      return { ...current, answers: nextAnswers.map((answer, answerIndex) => ({ ...answer, displayOrder: answerIndex + 1 })) }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationError = validate(values)
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    setError(null)
    const payload = {
      bankId: returnBankId,
      questionText: values.questionText.trim(),
      questionType: values.questionType,
      difficulty: values.difficulty ? Number(values.difficulty) : null,
      status: values.status,
      explanation: values.explanation.trim() || null,
      answers: normalizeAnswers(values.questionType, values.answers).map((answer, index) => ({
        answerText: answer.answerText.trim(),
        correct: Boolean(answer.correct),
        displayOrder: index + 1,
      })),
    }
    try {
      if (editing) {
        await questionBankService.updateQuestion(questionId, payload)
        toast.success('Question updated')
      } else {
        await questionBankService.createQuestion(payload)
        toast.success('Question created')
      }
      navigate(`/admin/question-banks/${returnBankId}`)
    } catch (err) {
      setError(err?.message || 'Could not save question.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!writable) {
    return (
      <div className="admin-page">
        <section className="admin-card">
          <h1 className="admin-page__title">Unauthorized</h1>
          <p className="admin-page__subtitle">Only Admin and SME users can create or edit questions.</p>
          <Link to="/admin/question-banks" className="button button--secondary">Back to Question Bank</Link>
        </section>
      </div>
    )
  }

  if (loading) return <div className="admin-page"><div className="admin-loading">Loading question form...</div></div>

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <Link to={returnBankId ? `/admin/question-banks/${returnBankId}` : '/admin/question-banks'} className="button button--ghost button--sm">Back</Link>
          <h1 className="admin-page__title" style={{ marginTop: 8 }}>{editing ? 'Edit question' : 'Create question'}</h1>
          <p className="admin-page__subtitle">{bank?.name || 'Question Bank'} - supports multiple choice and true/false for Sprint 4B.</p>
        </div>
      </header>

      <section className="admin-card">
        {error && <div className="auth-card__alert" style={{ marginBottom: 16 }}>{error}</div>}
        <form className="form" onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <div className="input-field">
              <label className="input-field__label" htmlFor="question-type">Question type</label>
              <select id="question-type" className="admin-toolbar__select" value={values.questionType} onChange={(event) => setType(event.target.value)}>
                <option value="multiple_choice">Multiple choice</option>
                <option value="true_false">True/False</option>
              </select>
            </div>
            <div className="input-field">
              <label className="input-field__label" htmlFor="question-difficulty">Difficulty</label>
              <select id="question-difficulty" className="admin-toolbar__select" value={values.difficulty} onChange={(event) => setValues((current) => ({ ...current, difficulty: event.target.value }))}>
                <option value="">Not set</option>
                <option value="1">1 - Easy</option>
                <option value="2">2</option>
                <option value="3">3 - Medium</option>
                <option value="4">4</option>
                <option value="5">5 - Hard</option>
              </select>
            </div>
            <div className="input-field">
              <label className="input-field__label" htmlFor="question-status">Status</label>
              <select id="question-status" className="admin-toolbar__select" value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value }))}>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            <div className="input-field admin-form-grid__full">
              <label className="input-field__label" htmlFor="question-text">Question text</label>
              <textarea id="question-text" className="admin-textarea" rows={4} value={values.questionText} onChange={(event) => setValues((current) => ({ ...current, questionText: event.target.value }))} />
            </div>
            <div className="input-field admin-form-grid__full">
              <label className="input-field__label" htmlFor="question-explanation">Explanation</label>
              <textarea id="question-explanation" className="admin-textarea" rows={3} value={values.explanation} onChange={(event) => setValues((current) => ({ ...current, explanation: event.target.value }))} />
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div className="admin-toolbar" style={{ padding: 0, marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, margin: 0 }}>Answers</h2>
              {values.questionType === 'multiple_choice' && <Button type="button" size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={addAnswer}>Add answer</Button>}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {normalizeAnswers(values.questionType, values.answers).map((answer, index) => (
                <div key={`${values.questionType}-${index}`} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 40px', gap: 10, alignItems: 'center' }}>
                  <input type="radio" name="correct-answer" checked={answer.correct} onChange={() => setCorrect(index)} aria-label={`Mark answer ${index + 1} correct`} />
                  <FormField value={answer.answerText} disabled={values.questionType === 'true_false'} onChange={(event) => updateAnswer(index, event.target.value)} placeholder={`Answer ${index + 1}`} />
                  {values.questionType === 'multiple_choice' && (
                    <button type="button" className="admin-table__icon-btn admin-table__icon-btn--danger" onClick={() => removeAnswer(index)} aria-label="Remove answer"><Trash2 size={15} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <Button type="button" variant="ghost" onClick={() => navigate(`/admin/question-banks/${returnBankId}`)} disabled={submitting}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editing ? 'Update question' : 'Create question'}</Button>
          </div>
        </form>
      </section>
    </div>
  )
}
