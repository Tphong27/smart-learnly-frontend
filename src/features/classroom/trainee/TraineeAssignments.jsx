import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CheckCircle2, Clock, FileUp, Paperclip, Send } from 'lucide-react'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import { getCurrentUser } from '@/services/api-client'
import {
  getAssignmentSubmissions,
  getClassAssignments,
  submitAssignment,
} from '@/data/demo/classFlowRuntime'

function formatDateTime(v) {
  if (!v) return 'Not set'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(v))
}

function getSubmissionStatus(assignment, submissions, traineeId) {
  const sub = submissions.find((s) => s.assignmentId === assignment.id && s.traineeId === traineeId)
  if (!sub && assignment.dueDate && new Date(assignment.dueDate) < new Date()) return 'late'
  if (!sub) return 'not_submitted'
  return sub.status
}

export function TraineeAssignments() {
  const { classId } = useOutletContext()
  const user = getCurrentUser()
  const traineeId = user?.id || 'trainee-minh'
  const [assignments, setAssignments] = useState(() => getClassAssignments(classId).filter((a) => a.status === 'published' || a.status === 'closed'))
  const [expandedId, setExpandedId] = useState(null)
  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
    sort: 'due-date',
  })
  const [submitForm, setSubmitForm] = useState({ content: '', files: [] })

  const getAllSubs = () => {
    const allSubs = []
    for (const a of assignments) {
      allSubs.push(...getAssignmentSubmissions(a.id))
    }
    return allSubs
  }

  const [allSubmissions, setAllSubmissions] = useState(() => getAllSubs())
  const visibleAssignments = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return assignments
      .filter((assignment) => {
        const status = getSubmissionStatus(assignment, allSubmissions, traineeId)
        const matchesKeyword = [assignment.title, assignment.description]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
        const matchesStatus = filters.status === 'all' || status === filters.status

        return matchesKeyword && matchesStatus
      })
      .sort((a, b) => {
        if (filters.sort === 'due-desc') return new Date(b.dueDate || 0) - new Date(a.dueDate || 0)
        if (filters.sort === 'title') return a.title.localeCompare(b.title)
        if (filters.sort === 'points') return Number(b.points || 0) - Number(a.points || 0)
        return new Date(a.dueDate || 0) - new Date(b.dueDate || 0)
      })
  }, [allSubmissions, assignments, filters, traineeId])

  const refresh = () => {
    setAssignments(getClassAssignments(classId).filter((a) => a.status === 'published' || a.status === 'closed'))
    setAllSubmissions(getAllSubs())
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []).map((f) => f.name)
    setSubmitForm((p) => ({ ...p, files: [...p.files, ...files] }))
  }

  const removeFile = (idx) => {
    setSubmitForm((p) => ({ ...p, files: p.files.filter((_, i) => i !== idx) }))
  }

  const handleSubmit = (assignmentId) => {
    if (!submitForm.content.trim() && submitForm.files.length === 0) return
    submitAssignment(assignmentId, traineeId, {
      content: submitForm.content,
      attachment: submitForm.files[0] || '',
      files: submitForm.files,
    })
    setSubmitForm({ content: '', files: [] })
    setExpandedId(null)
    refresh()
  }

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({ keyword: '', status: 'all', sort: 'due-date' })
  }

  const hasActiveFilters =
    filters.keyword || filters.status !== 'all' || filters.sort !== 'due-date'

  return (
    <div>
      <section className="classflow-section">
        <h2 className="classflow-section__title">My Assignments</h2>

        <FilterToolbar>
          <SearchBox
            value={filters.keyword}
            placeholder="Search assignments"
            ariaLabel="Search my assignments"
            onChange={(value) => updateFilter('keyword', value)}
          />
          <SelectFilter
            value={filters.status}
            onChange={(value) => updateFilter('status', value)}
            ariaLabel="Filter assignments by status"
            options={[
              { value: 'all', label: 'All status' },
              { value: 'not_submitted', label: 'Not Submitted' },
              { value: 'submitted', label: 'Submitted' },
              { value: 'graded', label: 'Graded' },
              { value: 'late', label: 'Late' },
            ]}
          />
          <SelectFilter
            value={filters.sort}
            onChange={(value) => updateFilter('sort', value)}
            ariaLabel="Sort my assignments"
            options={[
              { value: 'due-date', label: 'Due date' },
              { value: 'due-desc', label: 'Latest due date' },
              { value: 'points', label: 'Points high to low' },
              { value: 'title', label: 'Title A-Z' },
            ]}
          />
          <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
        </FilterToolbar>

        {assignments.length === 0 ? (
          <p className="demo-muted">No assignments available.</p>
        ) : visibleAssignments.length === 0 ? (
          <div className="demo-state">
            <h2>No assignments match</h2>
            <p>Adjust the assignment filters or clear them.</p>
            <button type="button" className="demo-primary-action" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            {visibleAssignments.map((a) => {
              const status = getSubmissionStatus(a, allSubmissions, traineeId)
              const mySub = allSubmissions.find((s) => s.assignmentId === a.id && s.traineeId === traineeId)
              const isExpanded = expandedId === a.id

              return (
                <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div>
                      <StatusBadge status={status === 'not_submitted' ? 'pending' : status} />
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
                    <div className="demo-actions">
                      {status === 'not_submitted' && a.status !== 'closed' ? (
                        <button type="button" className="demo-primary-action" onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                          <Send size={14} /> {isExpanded ? 'Cancel' : 'Submit'}
                        </button>
                      ) : null}
                      {mySub ? (
                        <button type="button" className="demo-secondary-action" onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                          {isExpanded ? 'Hide' : 'View'} Details
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Submit form — comment + file attachment */}
                  {isExpanded && status === 'not_submitted' && a.status !== 'closed' ? (
                    <div className="classflow-submission-panel" style={{ marginTop: '0.75rem' }}>
                      <label className="course-flow-field">
                        <span>Your comment / answer</span>
                        <textarea
                          rows="4"
                          value={submitForm.content}
                          onChange={(e) => setSubmitForm((p) => ({ ...p, content: e.target.value }))}
                          placeholder="Write your response, comment, or explanation..."
                        />
                      </label>
                      <div className="course-flow-field" style={{ marginTop: '0.5rem' }}>
                        <span>Attach files</span>
                        <label className="classflow-file-upload-btn">
                          <FileUp size={14} /> Choose files
                          <input type="file" multiple hidden onChange={handleFileChange} />
                        </label>
                        {submitForm.files.length > 0 ? (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {submitForm.files.map((f, i) => (
                              <span key={i} className="classflow-attachment-chip">
                                <Paperclip size={12} /> {f}
                                <button type="button" onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '4px', color: '#94a3b8' }}>×</button>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="demo-actions" style={{ marginTop: '0.75rem' }}>
                        <button type="button" className="demo-secondary-action" onClick={() => { setExpandedId(null); setSubmitForm({ content: '', files: [] }) }}>Cancel</button>
                        <button type="button" className="demo-primary-action" onClick={() => handleSubmit(a.id)}>
                          <CheckCircle2 size={15} /> Submit Assignment
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* View grade/feedback */}
                  {isExpanded && mySub ? (
                    <div className="classflow-submission-panel" style={{ marginTop: '0.75rem' }}>
                      <h4 style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Your Submission</h4>
                      {mySub.content ? <div className="classflow-submission-panel__content">{mySub.content}</div> : null}
                      {mySub.attachment ? <p className="demo-muted">📎 {mySub.attachment}</p> : null}
                      {mySub.files && mySub.files.length > 0 ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          {mySub.files.map((f, i) => (
                            <span key={i} className="classflow-attachment-chip">
                              <Paperclip size={12} /> {f}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="classflow-info-grid" style={{ marginTop: '0.75rem' }}>
                        <div className="classflow-info-item">
                          <div className="classflow-info-item__label">Status</div>
                          <div className="classflow-info-item__value"><StatusBadge status={mySub.status} /></div>
                        </div>
                        {mySub.finalGrade != null ? (
                          <div className="classflow-info-item">
                            <div className="classflow-info-item__label">Final Grade</div>
                            <div className="classflow-info-item__value">{mySub.finalGrade}/100</div>
                          </div>
                        ) : mySub.aiGrade != null ? (
                          <div className="classflow-info-item">
                            <div className="classflow-info-item__label">AI Grade (Pending Review)</div>
                            <div className="classflow-info-item__value">{mySub.aiGrade}/100</div>
                          </div>
                        ) : null}
                      </div>

                      {mySub.trainerFeedback ? (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', marginBottom: '0.25rem' }}>Trainer Feedback</p>
                          <p style={{ fontSize: '0.875rem', color: '#334155' }}>{mySub.trainerFeedback}</p>
                        </div>
                      ) : null}

                      {mySub.aiFeedback && !mySub.trainerFeedback ? (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1d4ed8', marginBottom: '0.25rem' }}>AI Feedback (Pending Review)</p>
                          <p style={{ fontSize: '0.875rem', color: '#334155' }}>{mySub.aiFeedback}</p>
                        </div>
                      ) : null}
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
