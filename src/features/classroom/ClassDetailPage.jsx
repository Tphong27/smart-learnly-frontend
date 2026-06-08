import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
  Edit3,
} from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { ProgressBar } from '@/shared/components/ui/ProgressBar'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { DataState } from '@/shared/components/ui/DataState'
import {
  addTrainerClassDiscussion,
  createInterventionFromRisk,
  createTrainerAssignment,
  deleteTrainerAssignment,
  generateTrainerAssignmentWithAi,
  getTrainerClassAssignments,
  getTrainerClassById,
  getTrainerClassDiscussions,
  getTrainerClassModules,
  getTrainerClassTests,
  getTrainerClassTrainees,
  getTrainerInterventions,
  markInterventionDone,
  updateTrainerAssignment,
} from '@/data/demo/demoTrainerRuntime'

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'tests', label: 'Class Tests' },
  { key: 'discussion', label: 'Discussion' },
  { key: 'intervention', label: 'Intervention' },
]

const emptyAssignmentForm = {
  title: '',
  description: '',
  dueDate: '',
  status: 'open',
  sourceType: 'manual',
  selectedModuleIds: [],
  uploadedFileName: '',
}

function formatDate(value) {
  if (!value) return 'Not scheduled'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function TabButton({ tab, activeTab, onClick }) {
  return (
    <button
      type="button"
      className={
        activeTab === tab.key ? 'demo-primary-action' : 'demo-secondary-action'
      }
      onClick={() => onClick(tab.key)}
    >
      {tab.label}
    </button>
  )
}

function WeakTopic({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-amber-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function OverviewTab({ currentClass, trainees }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Class information
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <InfoItem label="Course" value={currentClass.courseTitle} />
          <InfoItem label="Trainer" value={currentClass.trainerName} />
          <InfoItem
            label="Date"
            value={`${formatDate(currentClass.startDate)} - ${formatDate(
              currentClass.endDate,
            )}`}
          />
          <InfoItem
            label="Schedule"
            value={currentClass.schedule || 'Not configured'}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="demo-primary-action"
            to={`/courses/${currentClass.courseId}`}
          >
            <FileText size={16} />
            View course
          </Link>

          {currentClass.meetLink ? (
            <a
              className="demo-secondary-action"
              href={currentClass.meetLink}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} />
              Open meet link
            </a>
          ) : (
            <span className="demo-muted">Meet link not configured</span>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Weak Topic Summary
          </h2>

          <div className="mt-4 space-y-4">
            <WeakTopic label="Cloud Pricing Models" value={52} />
            <WeakTopic label="Security & Compliance" value={58} />
            <WeakTopic label="Shared Responsibility Model" value={61} />
          </div>
        </section>

        <section className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-red-600" size={20} />
            <div>
              <h3 className="font-bold text-red-800">
                Recommended Intervention
              </h3>
              <p className="mt-1 text-sm text-red-700">
                Schedule a focused review session for Cloud Pricing Models and
                contact high-risk trainees.
              </p>
            </div>
          </div>
        </section>
      </aside>

      <section className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Trainee Risk Monitoring
        </h2>
        <RiskTable trainees={trainees} />
      </section>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function RiskTable({ trainees, onCreateIntervention }) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Trainee</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3">Weak Topic</th>
              <th className="px-4 py-3">Risk</th>
              {onCreateIntervention ? (
                <th className="px-4 py-3">Action</th>
              ) : null}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {trainees.length > 0 ? (
              trainees.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-medium text-slate-900">
                    {item.name}
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-36">
                      <ProgressBar value={item.progress} />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{item.score}%</td>
                  <td className="px-4 py-4 text-slate-700">
                    {item.lastLoginDays} day(s) ago
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    {item.weakTopic}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={item.risk} />
                  </td>
                  {onCreateIntervention ? (
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        className="demo-secondary-action"
                        onClick={() => onCreateIntervention(item)}
                      >
                        Create action
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={onCreateIntervention ? 7 : 6}>
                  <DataState
                    type="empty"
                    title="No trainee data"
                    description="Trainee monitoring data has not been synced for this class."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AssignmentModal({
  open,
  mode,
  form,
  modules,
  error,
  onChange,
  onClose,
  onSubmit,
  onGenerateAi,
}) {
  if (!open) return null

  const updateField = (name, value) => {
    onChange({
      ...form,
      [name]: value,
    })
  }

  const toggleModule = (moduleId) => {
    const selected = new Set(form.selectedModuleIds)

    if (selected.has(moduleId)) {
      selected.delete(moduleId)
    } else {
      selected.add(moduleId)
    }

    updateField('selectedModuleIds', Array.from(selected))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <section className="demo-card w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="demo-row demo-row--between">
          <div>
            <span className="demo-kicker">
              {mode === 'create' ? 'Create assignment' : 'Update assignment'}
            </span>
            <h2>
              {mode === 'create'
                ? 'Create class assignment'
                : 'Update class assignment'}
            </h2>
          </div>

          <button
            type="button"
            className="demo-secondary-action"
            onClick={onClose}
          >
            <X size={16} />
            Close
          </button>
        </div>

        <div className="course-flow-form-section">
          <label className="course-flow-field">
            <span>Assignment title</span>
            <input
              value={form.title}
              placeholder="Review AWS pricing models"
              onChange={(event) => updateField('title', event.target.value)}
            />
          </label>

          <label className="course-flow-field">
            <span>Description</span>
            <textarea
              rows="4"
              value={form.description}
              placeholder="Describe assignment requirements..."
              onChange={(event) =>
                updateField('description', event.target.value)
              }
            />
          </label>

          <div className="course-flow-form-grid course-flow-form-grid--compact">
            <label className="course-flow-field">
              <span>Due date</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => updateField('dueDate', event.target.value)}
              />
            </label>

            <label className="course-flow-field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => updateField('status', event.target.value)}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </div>

          <section className="demo-card">
            <span className="demo-kicker">AI assignment source</span>
            <h3>Choose source for mock AI generation</h3>

            <div className="demo-actions">
              <button
                type="button"
                className={
                  form.sourceType === 'modules'
                    ? 'demo-primary-action'
                    : 'demo-secondary-action'
                }
                onClick={() => updateField('sourceType', 'modules')}
              >
                <ClipboardCheck size={16} />
                Module checklist
              </button>

              <button
                type="button"
                className={
                  form.sourceType === 'upload'
                    ? 'demo-primary-action'
                    : 'demo-secondary-action'
                }
                onClick={() => updateField('sourceType', 'upload')}
              >
                <Upload size={16} />
                Upload document mock
              </button>

              <button
                type="button"
                className={
                  form.sourceType === 'manual'
                    ? 'demo-primary-action'
                    : 'demo-secondary-action'
                }
                onClick={() => updateField('sourceType', 'manual')}
              >
                Manual
              </button>
            </div>

            {form.sourceType === 'modules' ? (
              <div className="demo-list">
                {modules.map((module) => (
                  <label key={module.id} className="demo-list-item">
                    <div>
                      <strong>{module.title}</strong>
                      <small>{module.lessons.length} lessons</small>
                    </div>

                    <input
                      type="checkbox"
                      checked={form.selectedModuleIds.includes(module.id)}
                      onChange={() => toggleModule(module.id)}
                    />
                  </label>
                ))}
              </div>
            ) : null}

            {form.sourceType === 'upload' ? (
              <label className="course-flow-field">
                <span>Uploaded document mock</span>
                <input
                  value={form.uploadedFileName}
                  placeholder="aws-pricing-review.pdf"
                  onChange={(event) =>
                    updateField('uploadedFileName', event.target.value)
                  }
                />
              </label>
            ) : null}
          </section>
        </div>

        {error ? <p className="demo-form-error">{error}</p> : null}

        <div className="demo-actions">
          <button
            type="button"
            className="demo-secondary-action"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="demo-secondary-action"
            onClick={onGenerateAi}
          >
            <Sparkles size={16} />
            AI generate mock
          </button>

          <button
            type="button"
            className="demo-primary-action"
            onClick={onSubmit}
          >
            <CheckCircle2 size={16} />
            {mode === 'create' ? 'Create assignment' : 'Save changes'}
          </button>
        </div>
      </section>
    </div>
  )
}

function AssignmentsTab({ classId }) {
  const [assignments, setAssignments] = useState(() =>
    getTrainerClassAssignments(classId),
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyAssignmentForm)
  const [error, setError] = useState('')

  const modules = getTrainerClassModules(classId)

  const refresh = () => {
    setAssignments(getTrainerClassAssignments(classId))
  }

  const openCreate = () => {
    setModalMode('create')
    setEditingId(null)
    setForm(emptyAssignmentForm)
    setError('')
    setModalOpen(true)
  }

  const openUpdate = (assignment) => {
    setModalMode('update')
    setEditingId(assignment.id)
    setForm({
      title: assignment.title,
      description: assignment.description || '',
      dueDate: assignment.dueDate || '',
      status: assignment.status || 'open',
      sourceType: assignment.sourceType || 'manual',
      selectedModuleIds: assignment.selectedModuleIds || [],
      uploadedFileName: assignment.uploadedFileName || '',
    })
    setError('')
    setModalOpen(true)
  }

  const validate = () => {
    if (!form.title.trim()) return 'Please enter assignment title.'
    if (!form.dueDate) return 'Please select due date.'

    if (form.sourceType === 'modules' && form.selectedModuleIds.length === 0) {
      return 'Please select at least one module.'
    }

    if (form.sourceType === 'upload' && !form.uploadedFileName.trim()) {
      return 'Please enter uploaded document mock name.'
    }

    return ''
  }

  const submit = () => {
    const validationError = validate()

    if (validationError) {
      setError(validationError)
      return
    }

    if (modalMode === 'create') {
      createTrainerAssignment(classId, form)
    } else {
      updateTrainerAssignment(editingId, form)
    }

    refresh()
    setModalOpen(false)
  }

  const generateAi = () => {
    const validationError = validate()

    if (validationError) {
      setError(validationError)
      return
    }

    generateTrainerAssignmentWithAi(classId, form)
    refresh()
    setModalOpen(false)
  }

  const remove = (assignmentId) => {
    deleteTrainerAssignment(classId, assignmentId)
    refresh()
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Assignment List</span>
          <h2>Class assignments</h2>
        </div>

        <button type="button" className="demo-primary-action" onClick={openCreate}>
          <Plus size={16} />
          Create assignment
        </button>
      </div>

      {assignments.length === 0 ? (
        <DataState
          type="empty"
          title="No assignments"
          description="Create an assignment manually or generate one from modules/documents."
        />
      ) : (
        <div className="mt-5 grid gap-4">
          {assignments.map((assignment) => (
            <article
              key={assignment.id}
              className="rounded-xl border border-slate-100 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <StatusBadge status={assignment.status} />
                  <h3 className="mt-2 font-bold text-slate-900">
                    {assignment.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {assignment.description}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Due date: {formatDate(assignment.dueDate)} · Source:{' '}
                    {assignment.sourceType}
                  </p>
                </div>

                <div className="demo-actions">
                  <button
                    type="button"
                    className="demo-secondary-action"
                    onClick={() => openUpdate(assignment)}
                  >
                    <Edit3 size={16} />
                    Update
                  </button>

                  <button
                    type="button"
                    className="demo-secondary-action"
                    onClick={() => remove(assignment.id)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <AssignmentModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        modules={modules}
        error={error}
        onChange={setForm}
        onClose={() => setModalOpen(false)}
        onSubmit={submit}
        onGenerateAi={generateAi}
      />
    </section>
  )
}

function TestsTab({ classId }) {
  const tests = getTrainerClassTests(classId)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="demo-kicker">Class Test</span>
      <h2>Tests connected to this class course</h2>

      {tests.length === 0 ? (
        <DataState
          type="empty"
          title="No class tests"
          description="Published course tests will appear here."
        />
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {tests.map((test) => (
            <article
              key={test.id}
              className="rounded-xl border border-slate-100 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <StatusBadge status={test.status} />
                  <h3 className="mt-2 font-bold text-slate-900">
                    {test.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {test.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InfoItem label="Questions" value={test.totalQuestions} />
                <InfoItem label="Duration" value={`${test.durationMinutes} min`} />
                <InfoItem label="Passing" value={`${test.passingScore}%`} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function DiscussionTab({ classId }) {
  const [message, setMessage] = useState('')
  const [discussions, setDiscussions] = useState(() =>
    getTrainerClassDiscussions(classId),
  )

  const submit = () => {
    if (!message.trim()) return

    addTrainerClassDiscussion(classId, message.trim())
    setDiscussions(getTrainerClassDiscussions(classId))
    setMessage('')
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Class Discussion</span>
          <h2>Trainer and trainee discussion</h2>
        </div>

        <MessageCircle size={22} />
      </div>

      <div className="mt-5 grid gap-3">
        {discussions.map((item) => (
          <article key={item.id} className="rounded-xl bg-slate-50 p-4">
            <strong className="text-slate-900">
              {item.authorName} · {item.authorRole}
            </strong>
            <p className="mt-1 text-sm text-slate-700">{item.message}</p>
            <small className="text-slate-500">
              {formatDateTime(item.createdAt)}
            </small>
          </article>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <input
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2"
          value={message}
          placeholder="Write class announcement or reply..."
          onChange={(event) => setMessage(event.target.value)}
        />

        <button type="button" className="demo-primary-action" onClick={submit}>
          <Send size={16} />
          Send
        </button>
      </div>
    </section>
  )
}

function InterventionTab({ classId, trainees }) {
  const [interventions, setInterventions] = useState(() =>
    getTrainerInterventions(classId),
  )

  const createFromRisk = (trainee) => {
    createInterventionFromRisk(classId, trainee)
    setInterventions(getTrainerInterventions(classId))
  }

  const markDone = (interventionId) => {
    setInterventions(markInterventionDone(classId, interventionId))
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Risk-based action creation
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Trainer can create intervention actions directly from trainee risk
          signals.
        </p>

        <RiskTable trainees={trainees} onCreateIntervention={createFromRisk} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="demo-kicker">Intervention Actions</span>
        <h2>Follow-up plan</h2>

        {interventions.length === 0 ? (
          <DataState
            type="empty"
            title="No intervention actions"
            description="Create actions from trainee risk signals."
          />
        ) : (
          <div className="mt-5 grid gap-4">
            {interventions.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={item.risk} />
                      <StatusBadge status={item.status} />
                    </div>

                    <h3 className="mt-2 font-bold text-slate-900">
                      {item.traineeName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-700">
                      {item.action}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{item.note}</p>
                  </div>

                  {item.status !== 'done' ? (
                    <button
                      type="button"
                      className="demo-primary-action"
                      onClick={() => markDone(item.id)}
                    >
                      <CheckCircle2 size={16} />
                      Mark done
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export function ClassDetailPage() {
  const { classId } = useParams()
  const [activeTab, setActiveTab] = useState('overview')

  const isLoading = false
  const error = null
  const currentClass = getTrainerClassById(classId)
  const trainees = useMemo(() => getTrainerClassTrainees(classId), [classId])

  if (isLoading) {
    return (
      <section>
        <PageHeader
          title="Class Detail"
          description="Loading class monitoring data."
        />
        <DataState
          type="loading"
          title="Loading class"
          description="Fetching trainees, progress, and risk signals."
        />
      </section>
    )
  }

  if (error) {
    return (
      <section>
        <PageHeader
          title="Class Detail"
          description="Class monitoring is temporarily unavailable."
        />
        <DataState
          type="error"
          title="Class detail unavailable"
          description={error}
        />
      </section>
    )
  }

  if (!currentClass) {
    return (
      <section>
        <PageHeader title="Class Detail" description="No matching class was found." />
        <DataState
          type="empty"
          title="Class not found"
          description="Check that the class route uses a valid class id from the assigned class list."
        />
      </section>
    )
  }

  return (
    <section>
      <PageHeader
        title={currentClass.displayName || currentClass.name}
        description={`${currentClass.course} - Trainer: ${currentClass.trainer}`}
        action={<StatusBadge status={currentClass.status} />}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard title="Trainees" value={currentClass.trainees} icon={Users} />
        <KpiCard
          title="Avg. Progress"
          value={`${currentClass.averageProgress}%`}
          icon={BarChart3}
        />
        <KpiCard
          title="Avg. Score"
          value={`${currentClass.averageScore}%`}
          icon={BarChart3}
        />
        <KpiCard
          title="At Risk"
          value={currentClass.atRiskCount}
          icon={AlertTriangle}
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            tab={tab}
            activeTab={activeTab}
            onClick={setActiveTab}
          />
        ))}
      </div>

      {activeTab === 'overview' ? (
        <OverviewTab currentClass={currentClass} trainees={trainees} />
      ) : null}

      {activeTab === 'assignments' ? (
        <AssignmentsTab classId={currentClass.id} />
      ) : null}

      {activeTab === 'tests' ? (
        <TestsTab classId={currentClass.id} />
      ) : null}

      {activeTab === 'discussion' ? (
        <DiscussionTab classId={currentClass.id} />
      ) : null}

      {activeTab === 'intervention' ? (
        <InterventionTab classId={currentClass.id} trainees={trainees} />
      ) : null}
    </section>
  )
}