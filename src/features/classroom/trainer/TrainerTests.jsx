import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Clock, Edit3, Eye, Plus, Trash2, Target, Users } from 'lucide-react'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import {
  deleteClassTest,
  getClassTestAttempts,
  getClassTests,
  updateClassTest,
} from '@/data/demo/classFlowRuntime'

function formatDateTime(v) {
  if (!v) return 'Not set'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(v))
}

export function TrainerTests() {
  const { classId } = useOutletContext()
  const navigate = useNavigate()
  const [tests, setTests] = useState(() => getClassTests(classId))
  const [expandedId, setExpandedId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
    sort: 'due-date',
  })

  const refresh = () => setTests(getClassTests(classId))

  const statusOptions = useMemo(() => {
    return ['all', ...new Set(tests.map((test) => test.status).filter(Boolean))]
  }, [tests])

  const visibleTests = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return tests
      .filter((test) => {
        const matchesKeyword = [test.title, test.type, test.status]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
        const matchesStatus = filters.status === 'all' || test.status === filters.status
        return matchesKeyword && matchesStatus
      })
      .sort((a, b) => {
        if (filters.sort === 'due-desc') return new Date(b.dueDate || 0) - new Date(a.dueDate || 0)
        if (filters.sort === 'title') return a.title.localeCompare(b.title)
        if (filters.sort === 'questions') return Number(b.numberOfQuestions || 0) - Number(a.numberOfQuestions || 0)
        return new Date(a.dueDate || 0) - new Date(b.dueDate || 0)
      })
  }, [filters, tests])

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({ keyword: '', status: 'all', sort: 'due-date' })
  }

  const hasActiveFilters =
    filters.keyword || filters.status !== 'all' || filters.sort !== 'due-date'

  const handlePublish = (testId) => {
    updateClassTest(testId, { status: 'published' })
    refresh()
  }

  const handleCloseTest = (testId) => {
    updateClassTest(testId, { status: 'closed' })
    refresh()
  }

  const handleDelete = (testId) => {
    deleteClassTest(testId)
    setDeleteConfirmId(null)
    refresh()
  }

  return (
    <div>
      <section className="classflow-section">
        <div className="classflow-section__header">
          <h2 className="classflow-section__title">Tests ({tests.length})</h2>
          <button
            type="button"
            className="demo-primary-action"
            onClick={() => navigate(`/trainer/classes/${classId}/tests/create`)}
          >
            <Plus size={15} /> Create New Test
          </button>
        </div>

        <FilterToolbar>
          <SearchBox
            value={filters.keyword}
            placeholder="Search tests"
            ariaLabel="Search class tests"
            onChange={(value) => updateFilter('keyword', value)}
          />
          <SelectFilter
            value={filters.status}
            onChange={(value) => updateFilter('status', value)}
            ariaLabel="Filter tests by status"
            options={statusOptions.map((status) => ({
              value: status,
              label: status === 'all' ? 'All status' : status,
            }))}
          />
          <SelectFilter
            value={filters.sort}
            onChange={(value) => updateFilter('sort', value)}
            ariaLabel="Sort tests"
            options={[
              { value: 'due-date', label: 'Due date' },
              { value: 'due-desc', label: 'Latest due date' },
              { value: 'questions', label: 'Question count' },
              { value: 'title', label: 'Title A-Z' },
            ]}
          />
          <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
        </FilterToolbar>

        {tests.length === 0 ? (
          <p className="demo-muted">No tests assigned yet. Click "Create New Test" to get started.</p>
        ) : visibleTests.length === 0 ? (
          <div className="demo-state">
            <h2>No tests match</h2>
            <p>Adjust the class test filters or clear them.</p>
            <button type="button" className="demo-primary-action" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            {visibleTests.map((t) => {
              const attempts = getClassTestAttempts(t.id)
              const avgScore = attempts.length > 0
                ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
                : 0
              const isExpanded = expandedId === t.id

              return (
                <div key={t.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <StatusBadge status={t.status} />
                        <span style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                          {t.source === 'imported_from_course' ? 'Imported' : 'Created'}
                        </span>
                      </div>
                      <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>{t.title}</h3>
                      {t.description ? <p className="demo-muted" style={{ margin: '0.25rem 0', fontSize: '0.8125rem' }}>{t.description}</p> : null}
                      <div className="demo-chip-list" style={{ marginTop: '0.5rem' }}>
                        <span><Target size={13} /> {t.numberOfQuestions || t.questions?.length || 0} questions</span>
                        <span><Clock size={13} /> {t.timeLimit} min</span>
                        <span><Users size={13} /> {attempts.length} attempts · Avg: {avgScore}%</span>
                      </div>
                    </div>
                    <div className="demo-actions" style={{ flexShrink: 0 }}>
                      {t.status === 'draft' ? (
                        <button type="button" className="demo-primary-action" onClick={() => handlePublish(t.id)}>Publish</button>
                      ) : t.status === 'published' ? (
                        <button type="button" className="demo-secondary-action" onClick={() => handleCloseTest(t.id)}>Close</button>
                      ) : null}
                      <button
                        type="button"
                        className="demo-secondary-action"
                        onClick={() => navigate(`/trainer/classes/${classId}/tests/${t.id}/edit`)}
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button type="button" className="demo-secondary-action" onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                        <Eye size={14} /> {isExpanded ? 'Hide' : 'Details'}
                      </button>
                      <button type="button" className="demo-secondary-action" onClick={() => setDeleteConfirmId(t.id)} style={{ color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Delete confirm */}
                  {deleteConfirmId === t.id ? (
                    <div className="classflow-submission-panel" style={{ marginTop: '0.75rem', background: '#fef2f2', borderColor: '#fecaca' }}>
                      <p style={{ fontWeight: 600, color: '#991b1b' }}>Delete this test?</p>
                      <div className="demo-actions" style={{ marginTop: '0.5rem' }}>
                        <button type="button" className="demo-secondary-action" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                        <button type="button" className="demo-primary-action" onClick={() => handleDelete(t.id)} style={{ background: '#dc2626' }}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Expanded details */}
                  {isExpanded ? (
                    <div style={{ marginTop: '1rem' }}>
                      <div className="classflow-info-grid" style={{ marginBottom: '1rem' }}>
                        <div className="classflow-info-item">
                          <div className="classflow-info-item__label">Type</div>
                          <div className="classflow-info-item__value">{t.type}</div>
                        </div>
                        <div className="classflow-info-item">
                          <div className="classflow-info-item__label">Due Date</div>
                          <div className="classflow-info-item__value">{formatDateTime(t.dueDate)}</div>
                        </div>
                        <div className="classflow-info-item">
                          <div className="classflow-info-item__label">Passing Score</div>
                          <div className="classflow-info-item__value">{t.passingScore || 70}%</div>
                        </div>
                        <div className="classflow-info-item">
                          <div className="classflow-info-item__label">Settings</div>
                          <div className="classflow-info-item__value" style={{ fontSize: '0.8125rem' }}>
                            {t.shuffleQuestions ? '🔀 Shuffle Q ' : ''}
                            {t.shuffleAnswers ? '🔀 Shuffle A ' : ''}
                            {t.allowRetake ? '🔁 Retake ' : ''}
                          </div>
                        </div>
                      </div>

                      {t.questions && t.questions.length > 0 ? (
                        <div>
                          <h4 style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Questions Preview</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {t.questions.slice(0, 5).map((q, idx) => (
                              <div key={q.id} style={{ padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '0.5rem', fontSize: '0.8125rem' }}>
                                <strong style={{ color: '#2563eb' }}>Q{idx + 1}.</strong> {q.text}
                              </div>
                            ))}
                            {t.questions.length > 5 ? (
                              <p className="demo-muted" style={{ fontSize: '0.8125rem' }}>
                                ...and {t.questions.length - 5} more questions
                              </p>
                            ) : null}
                          </div>
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
