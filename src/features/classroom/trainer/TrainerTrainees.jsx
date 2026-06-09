import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Eye, MessageSquare } from 'lucide-react'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { ProgressBar } from '@/shared/components/ui/ProgressBar'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import {
  addTrainerNote,
  getClassAssignments,
  getClassTrainees,
  getSubmissionsByClass,
  getTrainerNotes,
} from '@/data/demo/classFlowRuntime'

function getProgressStatus(progress) {
  if (progress >= 100) return 'completed'
  if (progress > 0) return 'in-progress'
  return 'not-started'
}

function getCompletionStatus(traineeId, submissions, assignments) {
  const total = assignments.length
  if (total === 0) return 'no-assignments'

  const completed = submissions.filter(
    (submission) =>
      submission.traineeId === traineeId &&
      (submission.status === 'submitted' || submission.status === 'graded'),
  ).length

  if (completed === 0) return 'none'
  if (completed >= total) return 'complete'
  return 'partial'
}

export function TrainerTrainees() {
  const { classId } = useOutletContext()
  const trainees = useMemo(() => getClassTrainees(classId), [classId])
  const submissions = useMemo(() => getSubmissionsByClass(classId), [classId])
  const assignments = useMemo(
    () => getClassAssignments(classId).filter((assignment) => assignment.status === 'published'),
    [classId],
  )
  const [filters, setFilters] = useState({
    keyword: '',
    progress: 'all',
    completion: 'all',
    risk: 'all',
    sort: 'progress',
  })
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectedTrainee, setSelectedTrainee] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [notes, setNotes] = useState([])

  const visibleTrainees = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return trainees
      .filter((trainee) => {
        const matchesKeyword = [trainee.name, trainee.email, trainee.weakTopic]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
        const matchesProgress =
          filters.progress === 'all' || getProgressStatus(trainee.progress) === filters.progress
        const completion = getCompletionStatus(trainee.traineeId, submissions, assignments)
        const matchesCompletion =
          filters.completion === 'all' || completion === filters.completion
        const matchesRisk = filters.risk === 'all' || trainee.risk === filters.risk

        return matchesKeyword && matchesProgress && matchesCompletion && matchesRisk
      })
      .sort((a, b) => {
        if (filters.sort === 'score') return Number(b.score || 0) - Number(a.score || 0)
        if (filters.sort === 'last-activity') return Number(a.lastLoginDays || 0) - Number(b.lastLoginDays || 0)
        if (filters.sort === 'risk') return String(a.risk).localeCompare(String(b.risk))
        if (filters.sort === 'name') return a.name.localeCompare(b.name)
        return Number(b.progress || 0) - Number(a.progress || 0)
      })
  }, [assignments, filters, submissions, trainees])

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      progress: 'all',
      completion: 'all',
      risk: 'all',
      sort: 'progress',
    })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.progress !== 'all' ||
    filters.completion !== 'all' ||
    filters.risk !== 'all' ||
    filters.sort !== 'progress'

  const toggleSelected = (traineeId) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(traineeId)) {
        next.delete(traineeId)
      } else {
        next.add(traineeId)
      }
      return next
    })
  }

  const handleMessageSelected = () => {
    window.alert(`Mock message prepared for ${selectedIds.size} selected trainee(s).`)
  }

  const handleExportSelected = () => {
    const payload = trainees.filter((trainee) => selectedIds.has(trainee.traineeId))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'slp-selected-trainees-demo.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const openProfile = (trainee) => {
    setSelectedTrainee(trainee)
    setNotes(getTrainerNotes(classId, trainee.traineeId))
  }

  const handleAddNote = () => {
    if (!noteText.trim() || !selectedTrainee) return
    addTrainerNote(classId, selectedTrainee.traineeId, noteText)
    setNotes(getTrainerNotes(classId, selectedTrainee.traineeId))
    setNoteText('')
  }

  return (
    <div>
      <section className="classflow-section">
        <div className="classflow-section__header">
          <h2 className="classflow-section__title">Trainees ({visibleTrainees.length}/{trainees.length})</h2>
        </div>

        <FilterToolbar>
          <SearchBox
            value={filters.keyword}
            placeholder="Search name, email, weak topic"
            ariaLabel="Search trainees"
            onChange={(value) => updateFilter('keyword', value)}
          />
          <SelectFilter
            value={filters.progress}
            onChange={(value) => updateFilter('progress', value)}
            ariaLabel="Filter trainees by progress"
            options={[
              { value: 'all', label: 'All progress' },
              { value: 'not-started', label: 'Not Started' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
          <SelectFilter
            value={filters.completion}
            onChange={(value) => updateFilter('completion', value)}
            ariaLabel="Filter trainees by assignment completion"
            options={[
              { value: 'all', label: 'All assignment completion' },
              { value: 'none', label: 'No submissions' },
              { value: 'partial', label: 'Partial submissions' },
              { value: 'complete', label: 'Complete submissions' },
              { value: 'no-assignments', label: 'No assignments' },
            ]}
          />
          <SelectFilter
            value={filters.risk}
            onChange={(value) => updateFilter('risk', value)}
            ariaLabel="Filter trainees by risk"
            options={[
              { value: 'all', label: 'All risk' },
              { value: 'low', label: 'Low risk' },
              { value: 'medium', label: 'Medium risk' },
              { value: 'high', label: 'High risk' },
            ]}
          />
          <SelectFilter
            value={filters.sort}
            onChange={(value) => updateFilter('sort', value)}
            ariaLabel="Sort trainees"
            options={[
              { value: 'progress', label: 'Progress high to low' },
              { value: 'score', label: 'Score high to low' },
              { value: 'last-activity', label: 'Last activity' },
              { value: 'risk', label: 'Risk A-Z' },
              { value: 'name', label: 'Name A-Z' },
            ]}
          />
          <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
        </FilterToolbar>

        {selectedIds.size > 0 ? (
          <div className="course-flow-note-card">
            <strong>{selectedIds.size} selected trainee(s)</strong>
            <div className="demo-actions">
              <button type="button" className="demo-secondary-action" onClick={handleMessageSelected}>
                Message selected mock
              </button>
              <button type="button" className="demo-secondary-action" onClick={handleExportSelected}>
                Export selected mock
              </button>
            </div>
          </div>
        ) : null}

        {trainees.length === 0 ? (
          <p className="demo-muted">No trainees in this class.</p>
        ) : visibleTrainees.length === 0 ? (
          <div className="demo-state">
            <h2>No trainees match</h2>
            <p>Adjust the trainee filters or clear them.</p>
            <button type="button" className="demo-primary-action" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="course-flow-table-wrap" style={{ marginTop: '0.75rem' }}>
            <table className="course-flow-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Name</th>
                  <th>Progress</th>
                  <th>Score</th>
                  <th>Last Login</th>
                  <th>Weak Topic</th>
                  <th>Risk</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleTrainees.map((t) => {
                  return (
                    <tr key={t.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.traineeId)}
                          onChange={() => toggleSelected(t.traineeId)}
                          aria-label={`Select ${t.name}`}
                        />
                      </td>
                      <td><strong>{t.name}</strong></td>
                      <td>
                        <div style={{ width: 120 }}>
                          <ProgressBar value={t.progress} />
                        </div>
                      </td>
                      <td>{t.score}%</td>
                      <td>{t.lastLoginDays} day(s) ago</td>
                      <td>{t.weakTopic}</td>
                      <td><StatusBadge status={t.risk} /></td>
                      <td>
                        <button type="button" className="demo-secondary-action" onClick={() => openProfile(t)}>
                          <Eye size={14} /> Profile
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Profile modal */}
      {selectedTrainee ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setSelectedTrainee(null)}>
          <section className="demo-card w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="demo-row demo-row--between" style={{ marginBottom: '1rem' }}>
              <div>
                <span className="demo-kicker">Trainee Profile</span>
                <h2>{selectedTrainee.name}</h2>
              </div>
              <button type="button" className="demo-secondary-action" onClick={() => setSelectedTrainee(null)}>
                Close
              </button>
            </div>

            <div className="classflow-info-grid" style={{ marginBottom: '1rem' }}>
              <div className="classflow-info-item">
                <div className="classflow-info-item__label">Progress</div>
                <div className="classflow-info-item__value">{selectedTrainee.progress}%</div>
              </div>
              <div className="classflow-info-item">
                <div className="classflow-info-item__label">Score</div>
                <div className="classflow-info-item__value">{selectedTrainee.score}%</div>
              </div>
              <div className="classflow-info-item">
                <div className="classflow-info-item__label">Risk Level</div>
                <div className="classflow-info-item__value"><StatusBadge status={selectedTrainee.risk} /></div>
              </div>
              <div className="classflow-info-item">
                <div className="classflow-info-item__label">Weak Topic</div>
                <div className="classflow-info-item__value">{selectedTrainee.weakTopic}</div>
              </div>
            </div>

            {/* Submissions */}
            <h3 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>Submissions</h3>
            {(() => {
              const traineeSubs = submissions.filter((s) => s.traineeId === selectedTrainee.traineeId)
              return traineeSubs.length === 0 ? (
                <p className="demo-muted">No submissions.</p>
              ) : (
                <div className="demo-list" style={{ marginBottom: '1rem' }}>
                  {traineeSubs.map((s) => (
                    <div key={s.id} className="demo-list-item">
                      <div>
                        <strong>Assignment submission</strong>
                        <small>Grade: {s.finalGrade ?? 'Pending'}</small>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Trainer Notes */}
            <h3 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>Trainer Notes</h3>
            {notes.length > 0 ? (
              <div className="demo-list" style={{ marginBottom: '0.75rem' }}>
                {notes.map((n) => (
                  <div key={n.id} className="demo-list-item">
                    <div>
                      <p style={{ fontSize: '0.875rem', color: '#334155' }}>{n.note}</p>
                      <small className="demo-muted">{n.createdAt}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="demo-muted" style={{ marginBottom: '0.75rem' }}>No notes yet.</p>
            )}

            <div className="classflow-reply-input" style={{ marginLeft: 0 }}>
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note about this trainee..."
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote() }}
              />
              <button type="button" className="demo-primary-action" onClick={handleAddNote}>
                <MessageSquare size={14} /> Add
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
