import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CheckCircle2, Plus, Send, Sparkles } from 'lucide-react'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
  StatusTabs,
} from '@/shared/components/ui/ListControls'
import {
  aiGradeSubmission,
  createClassAssignment,
  getAssignmentSubmissions,
  getClassAssignments,
  saveSubmissionGrade,
  updateClassAssignment,
} from '@/data/demo/classFlowRuntime'

function formatDate(v) {
  if (!v) return 'Not set'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(v))
}

function SubmissionPanel({ submission, onRefresh }) {
  const [grade, setGrade] = useState(submission.finalGrade ?? submission.aiGrade ?? '')
  const [feedback, setFeedback] = useState(submission.trainerFeedback || submission.aiFeedback || '')
  const [aiDone, setAiDone] = useState(submission.aiGrade != null)

  const handleAiGrade = () => {
    const updated = aiGradeSubmission(submission.id)
    if (updated) {
      setGrade(updated.aiGrade)
      setFeedback(updated.aiFeedback)
      setAiDone(true)
    }
  }

  const handleSave = () => {
    saveSubmissionGrade(submission.id, grade, feedback)
    onRefresh()
  }

  return (
    <div className="classflow-submission-panel">
      <div className="classflow-submission-panel__header">
        <div>
          <strong>{submission.traineeName}</strong>
          <small style={{ display: 'block', color: '#94a3b8' }}>
            Submitted: {formatDate(submission.submittedAt)}
          </small>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      {submission.content ? (
        <div className="classflow-submission-panel__content">{submission.content}</div>
      ) : null}
      {submission.attachment ? (
        <p className="demo-muted">📎 {submission.attachment}</p>
      ) : null}

      <div className="classflow-grade-row">
        {!aiDone ? (
          <button type="button" className="demo-secondary-action" onClick={handleAiGrade}>
            <Sparkles size={15} /> AI Grade
          </button>
        ) : (
          <span className="demo-muted" style={{ fontSize: '0.75rem' }}>
            AI: {submission.aiGrade ?? grade}/100
          </span>
        )}
        <label>
          Grade
          <input type="number" min="0" max="100" value={grade} onChange={(e) => setGrade(e.target.value)} />
        </label>
        <label style={{ flex: 1 }}>
          Feedback
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Write feedback..." />
        </label>
        <button type="button" className="demo-primary-action" onClick={handleSave} style={{ alignSelf: 'flex-end' }}>
          <Send size={15} /> Save & Return
        </button>
      </div>
    </div>
  )
}

export function TrainerAssignments() {
  const { classId } = useOutletContext()
  const [assignments, setAssignments] = useState(() => getClassAssignments(classId))
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
    submissionType: 'all',
    due: 'all',
    sort: 'due-date',
  })
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', submissionType: 'text', points: 100, status: 'draft' })

  const refresh = () => setAssignments(getClassAssignments(classId))
  const update = (f, v) => setForm((p) => ({ ...p, [f]: v }))
  const statusTabs = useMemo(() => {
    const statuses = ['all', 'draft', 'published', 'closed']
    return statuses.map((status) => ({
      key: status,
      label: status === 'all' ? 'All' : status,
      count: status === 'all' ? assignments.length : assignments.filter((item) => item.status === status).length,
    }))
  }, [assignments])

  const submissionTypes = useMemo(() => {
    return ['all', ...new Set(assignments.map((item) => item.submissionType).filter(Boolean))]
  }, [assignments])

  const visibleAssignments = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return assignments
      .filter((assignment) => {
        const matchesKeyword = [assignment.title, assignment.description, assignment.submissionType]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
        const matchesStatus =
          filters.status === 'all' || assignment.status === filters.status
        const matchesType =
          filters.submissionType === 'all' || assignment.submissionType === filters.submissionType
        const dueTime = assignment.dueDate ? new Date(assignment.dueDate).getTime() : null
        const matchesDue =
          filters.due === 'all' ||
          (filters.due === 'overdue' && dueTime && dueTime < today.getTime()) ||
          (filters.due === 'upcoming' && dueTime && dueTime >= today.getTime()) ||
          (filters.due === 'no-date' && !dueTime)

        return matchesKeyword && matchesStatus && matchesType && matchesDue
      })
      .sort((a, b) => {
        if (filters.sort === 'due-desc') return new Date(b.dueDate || 0) - new Date(a.dueDate || 0)
        if (filters.sort === 'title') return a.title.localeCompare(b.title)
        if (filters.sort === 'points') return Number(b.points || 0) - Number(a.points || 0)
        return new Date(a.dueDate || 0) - new Date(b.dueDate || 0)
      })
  }, [assignments, filters])

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      status: 'all',
      submissionType: 'all',
      due: 'all',
      sort: 'due-date',
    })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.status !== 'all' ||
    filters.submissionType !== 'all' ||
    filters.due !== 'all' ||
    filters.sort !== 'due-date'

  const handleCreate = () => {
    if (!form.title.trim()) return
    createClassAssignment(classId, form)
    setForm({ title: '', description: '', dueDate: '', submissionType: 'text', points: 100, status: 'draft' })
    setCreating(false)
    refresh()
  }

  const handlePublish = (id) => {
    updateClassAssignment(id, { status: 'published' })
    refresh()
  }

  const handleClose = (id) => {
    updateClassAssignment(id, { status: 'closed' })
    refresh()
  }

  return (
    <div>
      <section className="classflow-section">
        <div className="classflow-section__header">
          <h2 className="classflow-section__title">Assignments</h2>
          <button type="button" className="demo-primary-action" onClick={() => setCreating(true)}>
            <Plus size={15} /> Create Assignment
          </button>
        </div>

        {/* Create form */}
        {creating ? (
          <div className="classflow-submission-panel" style={{ marginBottom: '1rem' }}>
            <div className="course-flow-form-grid">
              <label className="course-flow-field course-flow-field--wide">
                <span>Title</span>
                <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Assignment title" />
              </label>
              <label className="course-flow-field course-flow-field--wide">
                <span>Description</span>
                <textarea rows="3" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe the assignment..." />
              </label>
              <label className="course-flow-field">
                <span>Due date</span>
                <input type="date" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} />
              </label>
              <label className="course-flow-field">
                <span>Submission type</span>
                <select value={form.submissionType} onChange={(e) => update('submissionType', e.target.value)}>
                  <option value="text">Text</option>
                  <option value="file">File Upload</option>
                  <option value="link">Link</option>
                  <option value="essay">Essay</option>
                </select>
              </label>
              <label className="course-flow-field">
                <span>Points</span>
                <input type="number" value={form.points} onChange={(e) => update('points', e.target.value)} />
              </label>
              <label className="course-flow-field">
                <span>Status</span>
                <select value={form.status} onChange={(e) => update('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
            </div>
            <div className="demo-actions" style={{ marginTop: '0.75rem' }}>
              <button type="button" className="demo-secondary-action" onClick={() => setCreating(false)}>Cancel</button>
              <button type="button" className="demo-primary-action" onClick={handleCreate}>
                <CheckCircle2 size={15} /> Create
              </button>
            </div>
          </div>
        ) : null}

        <StatusTabs
          tabs={statusTabs}
          activeKey={filters.status}
          onChange={(value) => updateFilter('status', value)}
          ariaLabel="Assignment status"
        />

        <FilterToolbar>
          <SearchBox
            value={filters.keyword}
            placeholder="Search assignments"
            ariaLabel="Search assignments"
            onChange={(value) => updateFilter('keyword', value)}
          />
          <SelectFilter
            value={filters.submissionType}
            onChange={(value) => updateFilter('submissionType', value)}
            ariaLabel="Filter assignments by submission type"
            options={submissionTypes.map((type) => ({
              value: type,
              label: type === 'all' ? 'All submission types' : type,
            }))}
          />
          <SelectFilter
            value={filters.due}
            onChange={(value) => updateFilter('due', value)}
            ariaLabel="Filter assignments by due date"
            options={[
              { value: 'all', label: 'All due dates' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'no-date', label: 'No due date' },
            ]}
          />
          <SelectFilter
            value={filters.sort}
            onChange={(value) => updateFilter('sort', value)}
            ariaLabel="Sort assignments"
            options={[
              { value: 'due-date', label: 'Due date' },
              { value: 'due-desc', label: 'Latest due date' },
              { value: 'points', label: 'Points high to low' },
              { value: 'title', label: 'Title A-Z' },
            ]}
          />
          <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
        </FilterToolbar>

        {/* Assignment list */}
        {assignments.length === 0 ? (
          <p className="demo-muted">No assignments yet. Create one to get started.</p>
        ) : visibleAssignments.length === 0 ? (
          <div className="demo-state">
            <h2>No assignments match</h2>
            <p>Adjust the current assignment filters or clear them.</p>
            <button type="button" className="demo-primary-action" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {visibleAssignments.map((a) => {
              const isExpanded = expandedId === a.id
              const subs = isExpanded ? getAssignmentSubmissions(a.id) : []
              return (
                <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div>
                      <StatusBadge status={a.status} />
                      <h3 style={{ marginTop: '0.35rem', fontWeight: 700, color: '#0f172a' }}>{a.title}</h3>
                      <p className="demo-muted" style={{ margin: '0.25rem 0' }}>{a.description}</p>
                      <small className="demo-muted">
                        Due: {formatDate(a.dueDate)} · {a.submissionType} · {a.points} pts
                      </small>
                    </div>
                    <div className="demo-actions">
                      {a.status === 'draft' ? (
                        <button type="button" className="demo-primary-action" onClick={() => handlePublish(a.id)}>Publish</button>
                      ) : a.status === 'published' ? (
                        <button type="button" className="demo-secondary-action" onClick={() => handleClose(a.id)}>Close</button>
                      ) : null}
                      <button type="button" className="demo-secondary-action" onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                        {isExpanded ? 'Hide' : 'View'} Submissions
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div style={{ marginTop: '1rem' }}>
                      <h4 style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                        Submissions ({subs.length})
                      </h4>
                      {subs.length === 0 ? (
                        <p className="demo-muted">No submissions yet.</p>
                      ) : (
                        subs.map((s) => (
                          <SubmissionPanel key={s.id} submission={s} onRefresh={refresh} />
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
