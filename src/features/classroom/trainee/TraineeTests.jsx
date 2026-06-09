import { useMemo, useState } from 'react'
import { ArrowRight, Clock, History, Target } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { getTestsForTrainee } from '@/data/demo/traineeTestRuntime'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { getCurrentUser } from '@/services/api-client'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'

export function TraineeTests() {
  const { classId } = useOutletContext()
  const traineeId = getCurrentUser()?.id || 'trainee-minh'
  const tests = getTestsForTrainee(traineeId, { classId })
  const [filters, setFilters] = useState({
    keyword: '',
    sort: 'default',
  })

  const visibleTests = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()
    return tests
      .filter((t) =>
        [t.title, t.type, t.source].join(' ').toLowerCase().includes(keyword),
      )
      .sort((a, b) => {
        if (filters.sort === 'title') return a.title.localeCompare(b.title)
        if (filters.sort === 'questions') return b.totalQuestions - a.totalQuestions
        return 0
      })
  }, [tests, filters])

  const updateFilter = (name, value) => setFilters((c) => ({ ...c, [name]: value }))
  const resetFilters = () => setFilters({ keyword: '', sort: 'default' })
  const hasActiveFilters = filters.keyword || filters.sort !== 'default'

  if (!tests.length) {
    return (
      <section className="classflow-section">
        <h2 className="classflow-section__title">Official Class Tests</h2>
        <p className="demo-muted">No class tests available. Published official class tests will appear here.</p>
      </section>
    )
  }

  return (
    <section className="classflow-section">
      <h2 className="classflow-section__title">Official Class Tests</h2>

      <FilterToolbar>
        <SearchBox
          value={filters.keyword}
          placeholder="Search tests"
          ariaLabel="Search class tests"
          onChange={(value) => updateFilter('keyword', value)}
        />
        <SelectFilter
          value={filters.sort}
          onChange={(value) => updateFilter('sort', value)}
          ariaLabel="Sort tests"
          options={[
            { value: 'default', label: 'Default' },
            { value: 'title', label: 'Title A-Z' },
            { value: 'questions', label: 'Most questions' },
          ]}
        />
        <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
      </FilterToolbar>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
        {visibleTests.map((test) => {
          const takeTo = test.inProgressAttemptId
            ? `/my-classes/${classId}/tests/${test.id}/attempts/${test.inProgressAttemptId}`
            : `/my-classes/${classId}/tests/${test.id}/take`
          return (
            <article key={test.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <StatusBadge status={test.learnerStatus} />
                    <span style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                      {test.source.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>{test.title}</h3>
                  <p className="demo-muted" style={{ fontSize: '0.8125rem', margin: '0.15rem 0' }}>{test.type}</p>
                  <div className="demo-chip-list" style={{ marginTop: '0.5rem' }}>
                    <span><Target size={13} /> {test.totalQuestions} questions</span>
                    <span><Clock size={13} /> {test.durationMinutes} min</span>
                    <span><History size={13} /> {test.attemptCount} attempts</span>
                  </div>
                </div>
                <div className="demo-actions" style={{ flexShrink: 0 }}>
                  {test.questions.length && test.status !== 'closed' ? (
                    <Link className="demo-primary-action" to={takeTo}>
                      {test.inProgressAttemptId ? 'Resume' : test.attemptCount ? 'Retake' : 'Start Test'} <ArrowRight size={15} />
                    </Link>
                  ) : (
                    <span className="demo-muted" style={{ fontSize: '0.8125rem' }}>Closed or no questions</span>
                  )}
                  {test.attemptCount ? (
                    <Link className="demo-secondary-action" to={`/my-classes/${classId}/tests/${test.id}/results`}>
                      History
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
