import { useState } from 'react'
import {
  ArrowRight,
  Clock3,
  Edit3,
  History,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  QUESTION_TYPES,
  archivePersonalTest,
  createPersonalTest,
  deletePersonalTest,
  getGenerationModules,
  getTestsForTrainee,
  getTopicsForCourse,
  getTraineeCourseOptions,
  updatePersonalTest,
} from '@/data/demo/traineeTestRuntime'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { getCurrentUser } from '@/services'

const typeLabels = {
  simulation: 'Simulation Test',
  mock: 'Mock Test',
  module: 'Module Test',
  practice: 'Practice Test',
}

const sourceLabels = {
  official_course: 'Official Course',
  official_class: 'Official Class',
  personal_ai: 'Personal AI',
}

function initialForm(courseId = '') {
  return {
    title: '',
    description: '',
    type: 'practice',
    sourceType: 'modules',
    courseId,
    selectedModuleIds: [],
    topic: '',
    difficulty: 'mixed',
    questionTypes: ['single_choice'],
    totalQuestions: 10,
    durationMinutes: 20,
    purpose: 'Quick practice',
    uploadedFileName: '',
  }
}

function toEditForm(test) {
  return {
    ...initialForm(test.courseId),
    title: test.title,
    description: test.description,
    type: test.type,
    durationMinutes: test.durationMinutes,
    totalQuestions: test.requestedQuestions || test.totalQuestions,
    ...test.generationConfig,
  }
}

function GenerateTestModal({ open, traineeId, editingTest, onClose, onSaved }) {
  const courses = getTraineeCourseOptions(traineeId)
  const [form, setForm] = useState(() => editingTest ? toEditForm(editingTest) : initialForm(courses[0]?.id))
  const [error, setError] = useState('')
  const modules = form.courseId ? getGenerationModules(form.courseId) : []
  const topics = form.courseId ? getTopicsForCourse(form.courseId) : []

  if (!open) return null

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const toggle = (name, value) => {
    const values = new Set(form[name])
    values.has(value) ? values.delete(value) : values.add(value)
    update(name, Array.from(values))
  }
  const submit = () => {
    if (!form.title.trim() || !form.courseId) {
      setError('Enter a title and select an enrolled course.')
      return
    }
    if (form.sourceType === 'modules' && !form.selectedModuleIds.length) {
      setError('Select at least one module.')
      return
    }
    if (form.sourceType === 'upload' && !form.uploadedFileName.trim()) {
      setError('Enter the uploaded personal material file name.')
      return
    }
    if (!form.questionTypes.length || Number(form.totalQuestions) < 1 || Number(form.durationMinutes) < 1) {
      setError('Select question types and enter valid question and duration values.')
      return
    }
    const saved = editingTest
      ? updatePersonalTest(traineeId, editingTest.id, form)
      : createPersonalTest(traineeId, form)
    onSaved(saved)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <section className="demo-card w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="demo-row demo-row--between">
          <div>
            <span className="demo-kicker">Personal AI learning resource</span>
            <h2>{editingTest ? 'Regenerate AI Test' : 'Generate AI Test'}</h2>
            <p className="demo-muted">Personal tests never enter the official Question Bank.</p>
          </div>
          <button type="button" className="demo-secondary-action" onClick={onClose}><X size={16} /> Close</button>
        </div>

        <div className="course-flow-form-section">
          <div className="course-flow-form-grid">
            <label className="course-flow-field course-flow-field--wide">
              <span>Test title</span>
              <input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="AWS weak areas practice" />
            </label>
            <label className="course-flow-field">
              <span>Test type</span>
              <select value={form.type} onChange={(event) => update('type', event.target.value)}>
                <option value="practice">Practice Test</option>
                <option value="simulation">Simulation Test</option>
              </select>
            </label>
            <label className="course-flow-field">
              <span>Course</span>
              <select value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value, selectedModuleIds: [], topic: '' })}>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </label>
            <label className="course-flow-field">
              <span>Source</span>
              <select value={form.sourceType} onChange={(event) => update('sourceType', event.target.value)}>
                <option value="modules">Enrolled course modules</option>
                <option value="weak_area">Weak topics</option>
                <option value="upload">Uploaded personal material</option>
              </select>
            </label>
            <label className="course-flow-field">
              <span>Topic (optional)</span>
              <select value={form.topic} onChange={(event) => update('topic', event.target.value)}>
                <option value="">All matching topics</option>
                {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
              </select>
            </label>
            <label className="course-flow-field">
              <span>Difficulty</span>
              <select value={form.difficulty} onChange={(event) => update('difficulty', event.target.value)}>
                {['mixed', 'easy', 'medium', 'hard'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="course-flow-field">
              <span>Questions requested</span>
              <input type="number" min="1" max="50" value={form.totalQuestions} onChange={(event) => update('totalQuestions', event.target.value)} />
            </label>
            <label className="course-flow-field">
              <span>Duration minutes</span>
              <input type="number" min="1" value={form.durationMinutes} onChange={(event) => update('durationMinutes', event.target.value)} />
            </label>
            <label className="course-flow-field">
              <span>Purpose</span>
              <select value={form.purpose} onChange={(event) => update('purpose', event.target.value)}>
                <option>Quick practice</option>
                <option>Weak topic review</option>
                <option>Exam simulation</option>
              </select>
            </label>
          </div>

          {form.sourceType === 'upload' ? (
            <label className="course-flow-field">
              <span>Uploaded file name (demo metadata)</span>
              <input value={form.uploadedFileName} onChange={(event) => update('uploadedFileName', event.target.value)} placeholder="personal-notes.pdf" />
            </label>
          ) : (
            <section className="demo-card">
              <h3>Modules</h3>
              <div className="demo-chip-list">
                {modules.map((module) => (
                  <label key={module.id}>
                    <input type="checkbox" checked={form.selectedModuleIds.includes(module.id)} onChange={() => toggle('selectedModuleIds', module.id)} /> {module.title}
                  </label>
                ))}
              </div>
            </section>
          )}

          <section className="demo-card">
            <h3>Question types</h3>
            <div className="demo-chip-list">
              {QUESTION_TYPES.map((type) => (
                <label key={type}>
                  <input type="checkbox" checked={form.questionTypes.includes(type)} onChange={() => toggle('questionTypes', type)} /> {type.replaceAll('_', ' ')}
                </label>
              ))}
            </div>
          </section>
        </div>

        {error ? <p className="demo-form-error">{error}</p> : null}
        <div className="demo-actions">
          <button type="button" className="demo-secondary-action" onClick={onClose}>Cancel</button>
          <button type="button" className="demo-primary-action" onClick={submit}><Sparkles size={16} /> Generate AI Test</button>
        </div>
      </section>
    </div>
  )
}

function TestCard({ test, traineeId, onEdit, onRefresh }) {
  const takeLabel = test.inProgressAttemptId ? 'Resume' : test.attemptCount ? 'Retake' : 'Start Test'
  const takeTo = test.inProgressAttemptId
    ? `/tests/${test.id}/attempts/${test.inProgressAttemptId}`
    : `/tests/${test.id}/take`
  const archiveOrDelete = () => {
    if (test.attemptCount || test.inProgressAttemptId) archivePersonalTest(traineeId, test.id)
    else deletePersonalTest(traineeId, test.id)
    onRefresh()
  }

  return (
    <article className="demo-card test-card">
      <div className="demo-row demo-row--between">
        <StatusBadge status={test.learnerStatus} />
        <span className="test-card__course">{test.courseTitle || test.className}</span>
      </div>
      <div className="demo-chip-list">
        <span>{typeLabels[test.type]}</span>
        <span>{sourceLabels[test.source]}</span>
        {test.version > 1 ? <span>Version {test.version}</span> : null}
      </div>
      <h2>{test.title}</h2>
      <p>{test.description || 'Official assessment available to the trainee.'}</p>
      <div className="demo-meta-grid">
        <span><Target size={15} /> {test.totalQuestions} questions</span>
        <span><Clock3 size={15} /> {test.durationMinutes} min</span>
        <span><History size={15} /> {test.attemptCount} attempts</span>
        <span>Latest: {test.latestScore ?? '—'}%</span>
        <span>Best: {test.bestScore ?? '—'}%</span>
      </div>
      {test.requestedQuestions > test.totalQuestions ? (
        <p className="demo-muted">Generated {test.totalQuestions} of {test.requestedQuestions} requested questions from the available pool.</p>
      ) : null}
      <div className="demo-actions">
        {test.questions.length && test.status !== 'closed' ? <Link className="demo-primary-action" to={takeTo}>{takeLabel} <ArrowRight size={16} /></Link> : null}
        {test.attemptCount ? <Link className="demo-secondary-action" to={`/tests/${test.id}/results`}>History</Link> : null}
        {test.source === 'personal_ai' ? (
          <>
            <button type="button" className="demo-secondary-action" onClick={() => onEdit(test)}><Edit3 size={15} /> Regenerate</button>
            <button type="button" className="demo-secondary-action" onClick={archiveOrDelete}><Trash2 size={15} /> {test.attemptCount || test.inProgressAttemptId ? 'Archive' : 'Delete'}</button>
          </>
        ) : null}
      </div>
    </article>
  )
}

export function TestListPage() {
  useDocumentTitle('Tests and practice')
  const { loading, error } = useDemoPageState()
  const traineeId = getCurrentUser()?.id || 'trainee-minh'
  const [, setRevision] = useState(0)
  const [tab, setTab] = useState('available')
  const [modal, setModal] = useState(null)
  const [keyword, setKeyword] = useState('')
  const tests = getTestsForTrainee(traineeId)
  const visible = tests.filter((test) => {
    const tabMatch =
      tab === 'personal' ? test.source === 'personal_ai'
        : tab === 'in_progress' ? test.learnerStatus === 'In Progress'
          : tab === 'completed' ? test.attemptCount > 0
            : test.source !== 'personal_ai'
    return tabMatch && [test.title, test.courseTitle, typeLabels[test.type], sourceLabels[test.source]].join(' ').toLowerCase().includes(keyword.toLowerCase())
  })

  if (loading) return <PageState state="loading" title="Loading tests" description="Preparing official and personal tests." />
  if (error) return <PageState state="error" title="Tests unavailable" description={error.message} />

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Tests and practice</span>
          <h1>Official assessments and personal AI practice</h1>
          <p>Take published tests, resume unfinished attempts, and generate private AI learning resources.</p>
        </div>
        <button type="button" className="demo-primary-action" onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Generate AI Test</button>
      </section>

      <section className="demo-toolbar">
        <div className="demo-actions">
          {[
            ['available', 'Available Tests'],
            ['personal', 'My AI Tests'],
            ['in_progress', 'In Progress'],
            ['completed', 'Completed'],
          ].map(([value, label]) => (
            <button key={value} type="button" className={tab === value ? 'demo-primary-action' : 'demo-secondary-action'} onClick={() => setTab(value)}>{label}</button>
          ))}
        </div>
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Search tests" />
      </section>

      {visible.length ? (
        <section className="demo-card-grid">
          {visible.map((test) => <TestCard key={test.id} test={test} traineeId={traineeId} onEdit={(item) => setModal({ mode: 'edit', test: item })} onRefresh={() => setRevision((value) => value + 1)} />)}
        </section>
      ) : (
        <PageState state="empty" title="No tests in this view" description="Try another tab, clear the search, or generate a personal AI test." />
      )}

      {modal ? (
        <GenerateTestModal
          key={modal.test?.id || 'create'}
          open
          traineeId={traineeId}
          editingTest={modal.test}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            setTab('personal')
            setRevision((value) => value + 1)
          }}
        />
      ) : null}
    </main>
  )
}
