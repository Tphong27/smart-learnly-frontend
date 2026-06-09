import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CheckCircle2, Clock, Edit3, FileUp, Paperclip, Plus, Send, Sparkles, Trash2, X } from 'lucide-react'
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
  deleteClassAssignment,
  getAssignmentSubmissions,
  getClassAssignments,
  saveSubmissionGrade,
  updateClassAssignment,
} from '@/data/demo/classFlowRuntime'

function formatDateTime(v) {
  if (!v) return 'Not set'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(v))
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
            Submitted: {formatDateTime(submission.submittedAt)}
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
      {submission.files && submission.files.length > 0 ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {submission.files.map((f, i) => (
            <span key={i} className="classflow-attachment-chip">
              <Paperclip size={12} /> {f}
            </span>
          ))}
        </div>
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

const emptyForm = { title: '', description: '', dueDate: '', points: 100, status: 'draft', attachments: [] }

export function TrainerAssignments() {
  const { classId } = useOutletContext()
  const [assignments, setAssignments] = useState(() => getClassAssignments(classId))
  const [mode, setMode] = useState(null) // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
    due: 'all',
    sort: 'due-date',
  })
  const [form, setForm] = useState(emptyForm)

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

  const visibleAssignments = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return assignments
      .filter((assignment) => {
        const matchesKeyword = [assignment.title, assignment.description]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
        const matchesStatus =
          filters.status === 'all' || assignment.status === filters.status
        const dueTime = assignment.dueDate ? new Date(assignment.dueDate).getTime() : null
        const matchesDue =
          filters.due === 'all' ||
          (filters.due === 'overdue' && dueTime && dueTime < today.getTime()) ||
          (filters.due === 'upcoming' && dueTime && dueTime >= today.getTime()) ||
          (filters.due === 'no-date' && !dueTime)

        return matchesKeyword && matchesStatus && matchesDue
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
    setFilters({ keyword: '', status: 'all', due: 'all', sort: 'due-date' })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.status !== 'all' ||
    filters.due !== 'all' ||
    filters.sort !== 'due-date'

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []).map((f) => f.name)
    update('attachments', [...(form.attachments || []), ...files])
  }

  const removeAttachment = (idx) => {
    update('attachments', form.attachments.filter((_, i) => i !== idx))
  }

  const openCreate = () => {
    setMode('create')
    setEditingId(null)
    setForm(emptyForm)
  }

  const openEdit = (a) => {
    setMode('edit')
    setEditingId(a.id)
    setForm({
      title: a.title,
      description: a.description || '',
      dueDate: a.dueDate || '',
      points: a.points || 100,
      status: a.status || 'draft',
      attachments: a.attachments || [],
    })
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    if (mode === 'create') {
      createClassAssignment(classId, form)
    } else {
      updateClassAssignment(editingId, form)
    }
    setForm(emptyForm)
    setMode(null)
    setEditingId(null)
    refresh()
  }

  const handleDelete = (id) => {
    deleteClassAssignment(id)
    setDeleteConfirmId(null)
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
          <button type="button" className="demo-primary-action" onClick={openCreate}>
            <Plus size={15} /> Create Assignment
          </button>
        </div>

        {/* Create / Edit form */}
        {mode ? (
          <div className="classflow-submission-panel" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {mode === 'create' ? 'Create Assignment' : 'Edit Assignment'}
              </h3>
              <button type="button" className="demo-secondary-action" onClick={() => { setMode(null); setEditingId(null) }} style={{ padding: '0.25rem 0.5rem' }}>
                <X size={14} />
              </button>
            </div>
            <div className="course-flow-form-grid">
              <label className="course-flow-field course-flow-field--wide">
                <span>Title *</span>
                <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Assignment title" />
              </label>
              <label className="course-flow-field course-flow-field--wide">
                <span>Description</span>
                <textarea rows="3" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe the assignment..." />
              </label>
              <label className="course-flow-field">
                <span>Due date & time</span>
                <input type="datetime-local" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} />
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
              <div className="course-flow-field">
                <span>Attachments</span>
                <label className="classflow-file-upload-btn">
                  <FileUp size={14} /> Upload files
                  <input type="file" multiple hidden onChange={handleFileChange} />
                </label>
                {form.attachments && form.attachments.length > 0 ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {form.attachments.map((name, i) => (
                      <span key={i} className="classflow-attachment-chip">
                        <Paperclip size={12} /> {name}
                        <button type="button" onClick={() => removeAttachment(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '4px', color: '#94a3b8' }}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="demo-actions" style={{ marginTop: '0.75rem' }}>
              <button type="button" className="demo-secondary-action" onClick={() => { setMode(null); setEditingId(null) }}>Cancel</button>
              <button type="button" className="demo-primary-action" onClick={handleSave}>
                <CheckCircle2 size={15} /> {mode === 'create' ? 'Create' : 'Save Changes'}
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
                        <Clock size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                        Due: {formatDateTime(a.dueDate)} · {a.points} pts
                      </small>
                      {a.attachments && a.attachments.length > 0 ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          {a.attachments.map((name, i) => (
                            <span key={i} className="classflow-attachment-chip">
                              <Paperclip size={12} /> {name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="demo-actions" style={{ flexShrink: 0 }}>
                      {a.status === 'draft' ? (
                        <button type="button" className="demo-primary-action" onClick={() => handlePublish(a.id)}>Publish</button>
                      ) : a.status === 'published' ? (
                        <button type="button" className="demo-secondary-action" onClick={() => handleClose(a.id)}>Close</button>
                      ) : null}
                      <button type="button" className="demo-secondary-action" onClick={() => openEdit(a)}>
                        <Edit3 size={14} /> Edit
                      </button>
                      <button type="button" className="demo-secondary-action" onClick={() => setDeleteConfirmId(a.id)} style={{ color: '#ef4444' }}>
                        <Trash2 size={14} /> Delete
                      </button>
                      <button type="button" className="demo-secondary-action" onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                        {isExpanded ? 'Hide' : 'View'} Submissions
                      </button>
                    </div>
                  </div>

                  {/* Delete confirmation */}
                  {deleteConfirmId === a.id ? (
                    <div className="classflow-submission-panel" style={{ marginTop: '0.75rem', background: '#fef2f2', borderColor: '#fecaca' }}>
                      <p style={{ fontWeight: 600, color: '#991b1b' }}>Are you sure you want to delete this assignment?</p>
                      <p className="demo-muted" style={{ fontSize: '0.8125rem' }}>This will also delete all submissions. This action cannot be undone.</p>
                      <div className="demo-actions" style={{ marginTop: '0.5rem' }}>
                        <button type="button" className="demo-secondary-action" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                        <button type="button" className="demo-primary-action" onClick={() => handleDelete(a.id)} style={{ background: '#dc2626' }}>
                          <Trash2 size={14} /> Confirm Delete
                        </button>
                      </div>
                    </div>
                  ) : null}

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
