import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Download, Plus, Sparkles } from 'lucide-react'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import {
  createClassTest,
  getClassFlowClassById,
  getClassTestAttempts,
  getClassTests,
  importCourseTest,
  updateClassTest,
} from '@/data/demo/classFlowRuntime'
import { getAllLifecycleTests } from '@/data/demo/courseLifecycleRuntime'

function formatDate(v) {
  if (!v) return 'Not set'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(v))
}

export function TrainerTests() {
  const { classId } = useOutletContext()
  const [tests, setTests] = useState(() => getClassTests(classId))
  const [mode, setMode] = useState(null) // 'create' | 'import'
  const [filters, setFilters] = useState({
    keyword: '',
    source: 'all',
    type: 'all',
    status: 'all',
    sort: 'due-date',
  })
  const [form, setForm] = useState({ title: '', type: 'Practice Test', timeLimit: 20, numberOfQuestions: 10, dueDate: '', status: 'draft' })

  const classData = getClassFlowClassById(classId)
  const courseTests = classData?.courseId
    ? getAllLifecycleTests().filter((t) => t.courseId === classData.courseId)
    : []

  const refresh = () => setTests(getClassTests(classId))
  const update = (f, v) => setForm((p) => ({ ...p, [f]: v }))
  const typeOptions = useMemo(() => {
    return ['all', ...new Set(tests.map((test) => test.type).filter(Boolean))]
  }, [tests])

  const statusOptions = useMemo(() => {
    return ['all', ...new Set(tests.map((test) => test.status).filter(Boolean))]
  }, [tests])

  const visibleTests = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return tests
      .filter((test) => {
        const source = test.source === 'imported_from_course' ? 'imported' : 'created'
        const matchesKeyword = [test.title, test.type, source, test.status]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
        const matchesSource = filters.source === 'all' || source === filters.source
        const matchesType = filters.type === 'all' || test.type === filters.type
        const matchesStatus = filters.status === 'all' || test.status === filters.status

        return matchesKeyword && matchesSource && matchesType && matchesStatus
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
    setFilters({
      keyword: '',
      source: 'all',
      type: 'all',
      status: 'all',
      sort: 'due-date',
    })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.source !== 'all' ||
    filters.type !== 'all' ||
    filters.status !== 'all' ||
    filters.sort !== 'due-date'

  const handleCreate = () => {
    if (!form.title.trim()) return
    createClassTest(classId, form)
    setMode(null)
    setForm({ title: '', type: 'Practice Test', timeLimit: 20, numberOfQuestions: 10, dueDate: '', status: 'draft' })
    refresh()
  }

  const handleGenerateAi = () => {
    createClassTest(classId, {
      ...form,
      title: form.title || `AI Practice Test – ${new Date().toLocaleDateString()}`,
      status: 'draft',
    })
    setMode(null)
    refresh()
  }

  const handleImport = (courseTest) => {
    importCourseTest(classId, courseTest.id, courseTest.title)
    refresh()
  }

  const handlePublish = (testId) => {
    updateClassTest(testId, { status: 'published' })
    refresh()
  }

  const handleCloseTest = (testId) => {
    updateClassTest(testId, { status: 'closed' })
    refresh()
  }

  return (
    <div>
      {/* Option cards */}
      <div className="classflow-option-cards">
        <button type="button" className="classflow-option-card" onClick={() => setMode('create')}>
          <div className="classflow-option-card__icon"><Plus size={24} /></div>
          <div className="classflow-option-card__title">Create New Test</div>
          <div className="classflow-option-card__desc">Create a test manually or generate by AI</div>
        </button>
        <button type="button" className="classflow-option-card" onClick={() => setMode('import')}>
          <div className="classflow-option-card__icon"><Download size={24} /></div>
          <div className="classflow-option-card__title">Import from Course</div>
          <div className="classflow-option-card__desc">Select tests from linked course</div>
        </button>
      </div>

      {/* Create form */}
      {mode === 'create' ? (
        <section className="classflow-section">
          <h2 className="classflow-section__title">Create New Test</h2>
          <div className="course-flow-form-grid" style={{ marginTop: '0.75rem' }}>
            <label className="course-flow-field course-flow-field--wide">
              <span>Test title</span>
              <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Test title" />
            </label>
            <label className="course-flow-field">
              <span>Test type</span>
              <select value={form.type} onChange={(e) => update('type', e.target.value)}>
                <option value="Practice Test">Practice Test</option>
                <option value="Module Test">Module Test</option>
                <option value="Mock Test">Mock Test</option>
                <option value="Simulation Test">Simulation Test</option>
              </select>
            </label>
            <label className="course-flow-field">
              <span>Time limit (min)</span>
              <input type="number" value={form.timeLimit} onChange={(e) => update('timeLimit', e.target.value)} />
            </label>
            <label className="course-flow-field">
              <span>Number of questions</span>
              <input type="number" value={form.numberOfQuestions} onChange={(e) => update('numberOfQuestions', e.target.value)} />
            </label>
            <label className="course-flow-field">
              <span>Due date</span>
              <input type="date" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} />
            </label>
          </div>
          <div className="demo-actions" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="demo-secondary-action" onClick={() => setMode(null)}>Cancel</button>
            <button type="button" className="demo-secondary-action" onClick={handleGenerateAi}>
              <Sparkles size={15} /> Generate by AI
            </button>
            <button type="button" className="demo-primary-action" onClick={handleCreate}>
              <Plus size={15} /> Create Test
            </button>
          </div>
        </section>
      ) : null}

      {/* Import from course */}
      {mode === 'import' ? (
        <section className="classflow-section">
          <div className="classflow-section__header">
            <h2 className="classflow-section__title">Import from Course</h2>
            <button type="button" className="demo-secondary-action" onClick={() => setMode(null)}>Close</button>
          </div>
          {courseTests.length === 0 ? (
            <p className="demo-muted">No tests found in the linked course.</p>
          ) : (
            <div className="demo-list">
              {courseTests.map((t) => (
                <div key={t.id} className="demo-list-item">
                  <div>
                    <strong>{t.title}</strong>
                    <small>{t.type} · {t.totalQuestions} questions</small>
                  </div>
                  <button type="button" className="demo-primary-action" onClick={() => handleImport(t)}>
                    <Download size={14} /> Assign to Class
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Assigned tests table */}
      <section className="classflow-section">
        <h2 className="classflow-section__title">Assigned Tests ({visibleTests.length}/{tests.length})</h2>

        <FilterToolbar>
          <SearchBox
            value={filters.keyword}
            placeholder="Search tests"
            ariaLabel="Search class tests"
            onChange={(value) => updateFilter('keyword', value)}
          />
          <SelectFilter
            value={filters.source}
            onChange={(value) => updateFilter('source', value)}
            ariaLabel="Filter tests by source"
            options={[
              { value: 'all', label: 'All sources' },
              { value: 'created', label: 'Created in class' },
              { value: 'imported', label: 'Imported from course' },
            ]}
          />
          <SelectFilter
            value={filters.type}
            onChange={(value) => updateFilter('type', value)}
            ariaLabel="Filter tests by type"
            options={typeOptions.map((type) => ({
              value: type,
              label: type === 'all' ? 'All types' : type,
            }))}
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
          <p className="demo-muted">No tests assigned yet.</p>
        ) : visibleTests.length === 0 ? (
          <div className="demo-state">
            <h2>No tests match</h2>
            <p>Adjust the class test filters or clear them.</p>
            <button type="button" className="demo-primary-action" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="course-flow-table-wrap" style={{ marginTop: '0.75rem' }}>
            <table className="course-flow-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Due Date</th>
                  <th>Time Limit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleTests.map((t) => {
                  const attempts = getClassTestAttempts(t.id)
                  const avgScore = attempts.length > 0
                    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
                    : 0
                  return (
                    <tr key={t.id}>
                      <td><strong>{t.title}</strong></td>
                      <td>{t.source === 'imported_from_course' ? 'Imported' : 'Created'}</td>
                      <td>{t.type}</td>
                      <td>{formatDate(t.dueDate)}</td>
                      <td>{t.timeLimit} min</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>
                        <div className="course-flow-row-actions">
                          {t.status === 'draft' ? (
                            <button type="button" onClick={() => handlePublish(t.id)}>Publish</button>
                          ) : t.status === 'published' ? (
                            <button type="button" onClick={() => handleCloseTest(t.id)}>Close</button>
                          ) : null}
                          <span className="demo-muted">{attempts.length} attempts · Avg: {avgScore}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
