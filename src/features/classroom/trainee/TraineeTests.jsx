import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CheckCircle2, Clock, Play } from 'lucide-react'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import { getCurrentUser } from '@/services/api-client'
import {
  getClassTests,
  getTraineeTestAttempts,
  submitClassTest,
} from '@/data/demo/classFlowRuntime'

function formatDate(v) {
  if (!v) return 'Not set'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(v))
}

export function TraineeTests() {
  const { classId } = useOutletContext()
  const user = getCurrentUser()
  const traineeId = user?.id || 'trainee-minh'

  const tests = useMemo(() => getClassTests(classId).filter((t) => t.status === 'published' || t.status === 'closed'), [classId])
  const [attempts, setAttempts] = useState(() => getTraineeTestAttempts(classId, traineeId))
  const [filters, setFilters] = useState({
    keyword: '',
    source: 'all',
    status: 'all',
    sort: 'due-date',
  })
  const [takingTestId, setTakingTestId] = useState(null)
  const [answers, setAnswers] = useState({})
  const [resultId, setResultId] = useState(null)

  const takingTest = tests.find((t) => t.id === takingTestId)
  const resultAttempt = attempts.find((a) => a.id === resultId)
  const visibleTests = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return tests
      .filter((test) => {
        const source = test.source === 'imported_from_course' ? 'imported' : 'class'
        const attempted = attempts.some((attempt) => attempt.classTestId === test.id)
        const status = attempted ? 'completed' : test.status === 'closed' ? 'closed' : 'not_started'
        const matchesKeyword = [test.title, test.type, source, status]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
        const matchesSource = filters.source === 'all' || source === filters.source
        const matchesStatus = filters.status === 'all' || status === filters.status

        return matchesKeyword && matchesSource && matchesStatus
      })
      .sort((a, b) => {
        if (filters.sort === 'score') {
          const scoreA = attempts.find((attempt) => attempt.classTestId === a.id)?.score || 0
          const scoreB = attempts.find((attempt) => attempt.classTestId === b.id)?.score || 0
          return scoreB - scoreA
        }
        if (filters.sort === 'title') return a.title.localeCompare(b.title)
        if (filters.sort === 'due-desc') return new Date(b.dueDate || 0) - new Date(a.dueDate || 0)
        return new Date(a.dueDate || 0) - new Date(b.dueDate || 0)
      })
  }, [attempts, filters, tests])

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      source: 'all',
      status: 'all',
      sort: 'due-date',
    })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.source !== 'all' ||
    filters.status !== 'all' ||
    filters.sort !== 'due-date'

  const handleStartTest = (testId) => {
    setTakingTestId(testId)
    setAnswers({})
  }

  const handleAnswer = (questionIndex, optionIndex) => {
    setAnswers((p) => ({ ...p, [questionIndex]: optionIndex }))
  }

  const handleSubmitTest = () => {
    if (!takingTest) return
    const answerArray = takingTest.questions.map((_, i) => answers[i] ?? -1)
    const attempt = submitClassTest(takingTestId, classId, traineeId, answerArray)
    setAttempts(getTraineeTestAttempts(classId, traineeId))
    setTakingTestId(null)
    setResultId(attempt.id)
  }

  // Taking test UI
  if (takingTest) {
    return (
      <div>
        <section className="classflow-section">
          <div className="classflow-section__header">
            <h2 className="classflow-section__title">{takingTest.title}</h2>
            <div className="demo-actions">
              <span className="demo-muted"><Clock size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {takingTest.timeLimit} min</span>
              <button type="button" className="demo-secondary-action" onClick={() => setTakingTestId(null)}>Cancel</button>
            </div>
          </div>

          {takingTest.questions.length === 0 ? (
            <div>
              <p className="demo-muted">This test has no questions loaded (mock imported test). Auto-generating a score...</p>
              <button type="button" className="demo-primary-action" style={{ marginTop: '0.75rem' }} onClick={handleSubmitTest}>
                <CheckCircle2 size={15} /> Submit (Mock Score)
              </button>
            </div>
          ) : (
            <div>
              {takingTest.questions.map((q, qi) => (
                <div key={q.id} style={{ marginBottom: '1.25rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#fff' }}>
                  <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
                    {qi + 1}. {q.text}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {q.options.map((opt, oi) => (
                      <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: '0.375rem', cursor: 'pointer', background: answers[qi] === oi ? '#eff6ff' : 'transparent', border: answers[qi] === oi ? '1px solid #2563eb' : '1px solid transparent' }}>
                        <input
                          type="radio"
                          name={`q-${qi}`}
                          checked={answers[qi] === oi}
                          onChange={() => handleAnswer(qi, oi)}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#334155' }}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" className="demo-primary-action" onClick={handleSubmitTest}>
                <CheckCircle2 size={15} /> Submit Test
              </button>
            </div>
          )}
        </section>
      </div>
    )
  }

  // Result view
  if (resultAttempt) {
    return (
      <div>
        <section className="classflow-section">
          <div className="classflow-section__header">
            <h2 className="classflow-section__title">Test Result</h2>
            <button type="button" className="demo-secondary-action" onClick={() => setResultId(null)}>Back to Tests</button>
          </div>

          <div className="classflow-info-grid" style={{ marginTop: '0.75rem' }}>
            <div className="classflow-info-item">
              <div className="classflow-info-item__label">Score</div>
              <div className="classflow-info-item__value" style={{ fontSize: '1.5rem', color: resultAttempt.score >= 70 ? '#16a34a' : '#dc2626' }}>
                {resultAttempt.score}%
              </div>
            </div>
            <div className="classflow-info-item">
              <div className="classflow-info-item__label">Correct</div>
              <div className="classflow-info-item__value">{resultAttempt.correctCount} / {resultAttempt.totalQuestions}</div>
            </div>
            <div className="classflow-info-item">
              <div className="classflow-info-item__label">Status</div>
              <div className="classflow-info-item__value">{resultAttempt.score >= 70 ? '✅ Passed' : '❌ Failed'}</div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div>
      <section className="classflow-section">
        <h2 className="classflow-section__title">My Tests</h2>

        <FilterToolbar>
          <SearchBox
            value={filters.keyword}
            placeholder="Search tests"
            ariaLabel="Search my class tests"
            onChange={(value) => updateFilter('keyword', value)}
          />
          <SelectFilter
            value={filters.source}
            onChange={(value) => updateFilter('source', value)}
            ariaLabel="Filter tests by source"
            options={[
              { value: 'all', label: 'All sources' },
              { value: 'class', label: 'Created in class' },
              { value: 'imported', label: 'Imported from course' },
            ]}
          />
          <SelectFilter
            value={filters.status}
            onChange={(value) => updateFilter('status', value)}
            ariaLabel="Filter tests by status"
            options={[
              { value: 'all', label: 'All status' },
              { value: 'not_started', label: 'Not Started' },
              { value: 'completed', label: 'Completed' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
          <SelectFilter
            value={filters.sort}
            onChange={(value) => updateFilter('sort', value)}
            ariaLabel="Sort my class tests"
            options={[
              { value: 'due-date', label: 'Due date' },
              { value: 'due-desc', label: 'Latest due date' },
              { value: 'score', label: 'Score high to low' },
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
            <p>Adjust the test filters or clear them.</p>
            <button type="button" className="demo-primary-action" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            {visibleTests.map((t) => {
              const myAttempt = attempts.find((a) => a.classTestId === t.id)
              return (
                <div key={t.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontWeight: 700, color: '#0f172a' }}>{t.title}</h3>
                      <p className="demo-muted" style={{ margin: '0.25rem 0' }}>
                        {t.type} · {t.source === 'imported_from_course' ? 'From Course' : 'Class Test'} · {t.timeLimit} min
                      </p>
                      <small className="demo-muted">Due: {formatDate(t.dueDate)}</small>
                    </div>
                    <div className="demo-actions">
                      {myAttempt ? (
                        <>
                          <span className="demo-muted">Score: {myAttempt.score}%</span>
                          <button type="button" className="demo-secondary-action" onClick={() => setResultId(myAttempt.id)}>
                            View Result
                          </button>
                        </>
                      ) : t.status !== 'closed' ? (
                        <button type="button" className="demo-primary-action" onClick={() => handleStartTest(t.id)}>
                          <Play size={14} /> Start Test
                        </button>
                      ) : (
                        <span className="demo-muted">Closed</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
