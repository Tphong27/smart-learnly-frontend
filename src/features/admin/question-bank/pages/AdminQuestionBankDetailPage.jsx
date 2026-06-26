import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Archive, CheckCircle2, Edit2, Plus, Search, Trash2 } from 'lucide-react'
import { Button, FormField, Modal, useToast } from '@/shared/components/ui'
import { courseService, getCurrentUser, questionBankService } from '@/services'
import '../../admin-shared.css'
import './question-bank.css'

const PAGE_SIZE = 20

const blankAnswer = (index = 0) => ({ answerText: '', correct: index === 0, displayOrder: index + 1 })

function canWriteQuestionBank() {
  const role = getCurrentUser()?.role
  return role === 'ADMIN' || role === 'SME'
}

function formatDate(value) {
  if (!value) return '--'
  try {
    return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '--'
  }
}

function normalizeAnswers(type, answers) {
  if (type === 'true_false') {
    return [
      { answerText: 'True', correct: answers?.[0]?.correct ?? answers?.[0]?.isCorrect ?? true, displayOrder: 1 },
      { answerText: 'False', correct: answers?.[1]?.correct ?? answers?.[1]?.isCorrect ?? false, displayOrder: 2 },
    ]
  }
  return answers?.length ? answers : [blankAnswer(0), blankAnswer(1), blankAnswer(2), blankAnswer(3)]
}

function normalizeModules(payload) {
  const root = payload?.data ?? payload
  const items = Array.isArray(root) ? root : root?.items ?? root?.content ?? root?.sections ?? []
  return items
    .map((item, index) => ({
      id: item.sectionId || item.id,
      title: item.title || item.name || `Module ${index + 1}`,
    }))
    .filter((item) => item.id)
}

function validateQuestion(values) {
  if (!values.questionText.trim()) return 'Question text is required.'
  if (!values.questionType) return 'Question type is required.'
  const answers = normalizeAnswers(values.questionType, values.answers)
  if (answers.length < 2) return 'At least two answers are required.'
  if (values.questionType === 'multiple_choice' && answers.length > 6) return 'Multiple choice supports 2 to 6 answers.'
  if (answers.some((answer) => !answer.answerText.trim())) return 'Answer text must not be empty.'
  if (answers.filter((answer) => answer.correct).length !== 1) return 'Exactly one correct answer is required.'
  return null
}

function questionToForm(question) {
  const type = question?.questionType || 'multiple_choice'
  return {
    moduleId: question?.moduleId || '',
    questionText: question?.questionText || '',
    questionType: type,
    difficulty: question?.difficulty ? String(question.difficulty) : '',
    status: question?.status === 'approved' ? 'approved' : 'draft',
    explanation: question?.explanation || '',
    answers: normalizeAnswers(type, (question?.answers || []).map((answer, index) => ({
      answerText: answer.answerText || '',
      correct: Boolean(answer.correct || answer.isCorrect),
      displayOrder: answer.displayOrder ?? answer.orderIndex ?? index + 1,
    }))),
  }
}

function QuestionModal({ open, bankId, modules, question, onClose, onSaved }) {
  const toast = useToast()
  const editing = Boolean(question)
  const [values, setValues] = useState(questionToForm(question))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)


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
    const validationError = validateQuestion(values)
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    setError(null)
    const payload = {
      bankId,
      moduleId: values.moduleId || null,
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
        await questionBankService.updateQuestion(question.questionId || question.id, payload)
        toast.success('Question updated')
      } else {
        await questionBankService.createQuestion(payload)
        toast.success('Question created')
      }
      onSaved()
    } catch (err) {
      setError(err?.message || 'Could not save question.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title={editing ? 'Edit question' : 'Create question'} size="lg" closeOnOverlayClick={!submitting} onClose={submitting ? undefined : onClose}>
      {error && <div className="auth-card__alert" style={{ marginBottom: 14 }}>{error}</div>}
      <form className="form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div className="input-field">
            <label className="input-field__label" htmlFor="question-module">Module</label>
            <select id="question-module" className="admin-toolbar__select" value={values.moduleId} onChange={(event) => setValues((current) => ({ ...current, moduleId: event.target.value }))}>
              <option value="">No module</option>
              {modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
            </select>
          </div>
          <div className="input-field">
            <label className="input-field__label" htmlFor="question-type">Type</label>
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

        <div className="question-modal__answers">
          <div className="question-modal__answers-header">
            <h3>Answers</h3>
            {values.questionType === 'multiple_choice' && <Button type="button" size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={addAnswer}>Add answer</Button>}
          </div>
          {normalizeAnswers(values.questionType, values.answers).map((answer, index) => (
            <div key={`${values.questionType}-${index}`} className="question-modal__answer-row">
              <input type="radio" name="correct-answer" checked={answer.correct} onChange={() => setCorrect(index)} aria-label={`Mark answer ${index + 1} correct`} />
              <FormField value={answer.answerText} disabled={values.questionType === 'true_false'} onChange={(event) => updateAnswer(index, event.target.value)} placeholder={`Answer ${index + 1}`} />
              {values.questionType === 'multiple_choice' && (
                <button type="button" className="admin-table__icon-btn admin-table__icon-btn--danger" onClick={() => removeAnswer(index)} aria-label="Remove answer"><Trash2 size={15} /></button>
              )}
            </div>
          ))}
        </div>

        <div className="question-modal__actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting}>{editing ? 'Update question' : 'Create question'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function AdminQuestionBankDetailPage() {
  const { bankId } = useParams()
  const toast = useToast()
  const writable = canWriteQuestionBank()
  const [bank, setBank] = useState(null)
  const [modules, setModules] = useState([])
  const [items, setItems] = useState([])
  const [pageInfo, setPageInfo] = useState({ page: 0, totalPages: 1, totalItems: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [moduleId, setModuleId] = useState('all')
  const [page, setPage] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [archivingId, setArchivingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [modalRevision, setModalRevision] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const bankData = await questionBankService.getBank(bankId)
        if (cancelled) return
        setBank(bankData)

        const [moduleData, questionPage] = await Promise.all([
          bankData?.courseId ? courseService.getCourseContent(bankData.courseId) : Promise.resolve([]),
          questionBankService.listQuestions({
            bankId,
            search: search.trim() || undefined,
            type: type === 'all' ? undefined : type,
            status: status === 'all' ? undefined : status,
            difficulty: difficulty === 'all' ? undefined : difficulty,
            moduleId: moduleId === 'all' ? undefined : moduleId,
            page,
            size: PAGE_SIZE,
          }),
        ])
        if (cancelled) return
        setModules(normalizeModules(moduleData))
        setItems(questionPage.items || [])
        setPageInfo({ page: questionPage.page, totalPages: questionPage.totalPages, totalItems: questionPage.totalItems })
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || 'Could not load question bank.'
          setError(message)
          toast.error(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [bankId, difficulty, moduleId, page, refreshKey, search, status, toast, type])

  const moduleNameById = useMemo(() => new Map(modules.map((module) => [module.id, module.title])), [modules])

  function closeModal() {
    setModalOpen(false)
    setEditingQuestion(null)
  }

  function openCreateModal() {
    setEditingQuestion(null)
    setModalRevision((value) => value + 1)
    setModalOpen(true)
  }

  function openEditModal(question) {
    setEditingQuestion(question)
    setModalRevision((value) => value + 1)
    setModalOpen(true)
  }

  async function handleArchive(question) {
    if (!writable || !question?.questionId) return
    const confirmed = window.confirm('Archive this question?')
    if (!confirmed) return
    setArchivingId(question.questionId)
    try {
      await questionBankService.archiveQuestion(question.questionId)
      toast.success('Question archived')
      setRefreshKey((key) => key + 1)
    } catch (err) {
      toast.error(err?.message || 'Could not archive question.')
    } finally {
      setArchivingId(null)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <Link to="/admin/question-banks" className="button button--ghost button--sm">Back to banks</Link>
          <h1 className="admin-page__title" style={{ marginTop: 8 }}>{bank?.name || 'Question bank'}</h1>
          <p className="admin-page__subtitle">{bank?.description || 'Browse and manage questions in this bank.'}</p>
        </div>
        {writable && bank?.status !== 'archived' && (
          <Button leftIcon={<Plus size={16} />} onClick={openCreateModal}>Create question</Button>
        )}
      </header>

      {bank && (
        <section className="admin-card" style={{ marginBottom: 18 }}>
          <div className="admin-toolbar" style={{ padding: 0 }}>
            <span><strong>Status:</strong> <span className={`admin-status admin-status--${bank.status}`}>{bank.status}</span></span>
            <span><strong>Questions:</strong> {bank.questionCount ?? pageInfo.totalItems}</span>
            <span><strong>Updated:</strong> {formatDate(bank.updatedAt || bank.createdAt)}</span>
          </div>
        </section>
      )}

      <section className="admin-card admin-card--flush">
        <div className="admin-toolbar">
          <div className="admin-toolbar__filters">
            <div className="admin-toolbar__search">
              <FormField placeholder="Search questions..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} leftIcon={<Search size={16} />} />
            </div>
            <select className="admin-toolbar__select" value={moduleId} onChange={(event) => { setModuleId(event.target.value); setPage(0) }}>
              <option value="all">All modules</option>
              {modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
            </select>
            <select className="admin-toolbar__select" value={type} onChange={(event) => { setType(event.target.value); setPage(0) }}>
              <option value="all">All types</option>
              <option value="multiple_choice">Multiple choice</option>
              <option value="true_false">True/False</option>
            </select>
            <select className="admin-toolbar__select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0) }}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
            <select className="admin-toolbar__select" value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setPage(0) }}>
              <option value="all">All difficulty</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
          <span style={{ color: '#64748b', fontSize: 13 }}>{pageInfo.totalItems} questions</span>
        </div>

        {loading ? (
          <div className="admin-loading">Loading questions...</div>
        ) : error ? (
          <div className="admin-error">{error}</div>
        ) : items.length === 0 ? (
          <div className="admin-empty">No questions match the current filters.</div>
        ) : (
          <div className="question-card-list">
            {items.map((question, index) => {
              const answers = [...(question.answers || [])].sort((left, right) => (left.displayOrder ?? left.orderIndex ?? 0) - (right.displayOrder ?? right.orderIndex ?? 0))
              const questionNumber = page * PAGE_SIZE + index + 1
              const questionId = question.questionId || question.id
              const moduleLabel = moduleNameById.get(question.moduleId) || 'No module'
              return (
                <article className="question-card" key={questionId}>
                  <div className="question-card__header">
                    <div>
                      <div className="question-card__eyebrow">
                        <span>Question {questionNumber}</span>
                        <span className="question-card__tag">{moduleLabel}</span>
                        <span className={`admin-status admin-status--${question.status}`}>{question.status}</span>
                      </div>
                      <h2 className="question-card__title">{question.questionText}</h2>
                    </div>
                    {writable && question.status !== 'archived' && (
                      <div className="question-card__actions">
                        <button type="button" className="admin-table__icon-btn" title="Edit" onClick={() => openEditModal(question)}><Edit2 size={15} /></button>
                        <button type="button" className="admin-table__icon-btn admin-table__icon-btn--danger" title="Archive" disabled={archivingId === questionId} onClick={() => handleArchive(question)}><Archive size={15} /></button>
                      </div>
                    )}
                  </div>
                  <div className="question-card__meta">
                    <span>{question.questionType === 'true_false' ? 'True/False' : 'Multiple choice'}</span>
                    <span>Difficulty: {question.difficulty ?? '--'}</span>
                    <span>Updated: {formatDate(question.updatedAt || question.createdAt)}</span>
                  </div>
                  <div className="question-card__answers">
                    {answers.map((answer, answerIndex) => {
                      const correct = Boolean(answer.correct || answer.isCorrect)
                      return (
                        <div className={`question-card__answer ${correct ? 'question-card__answer--correct' : ''}`} key={answer.answerId || answer.id || answerIndex}>
                          <span className="question-card__answer-index">{String.fromCharCode(65 + answerIndex)}</span>
                          <span>{answer.answerText}</span>
                          {correct && <span className="question-card__correct"><CheckCircle2 size={15} /> Correct answer</span>}
                        </div>
                      )
                    })}
                  </div>
                  <div className="question-card__explanation">
                    <strong>Explanation:</strong> {question.explanation || '--'}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {pageInfo.totalPages > 1 && (
          <div className="admin-pagination">
            <span>Page {pageInfo.page + 1} / {pageInfo.totalPages}</span>
            <div className="admin-pagination__controls">
              <Button size="sm" variant="secondary" disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page + 1 >= pageInfo.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        )}
      </section>

      <QuestionModal
        key={`${editingQuestion?.questionId || editingQuestion?.id || 'create'}-${modalRevision}`}
        open={modalOpen}
        bankId={bankId}
        modules={modules}
        question={editingQuestion}
        onClose={closeModal}
        onSaved={() => {
          closeModal()
          setRefreshKey((key) => key + 1)
        }}
      />
    </div>
  )
}