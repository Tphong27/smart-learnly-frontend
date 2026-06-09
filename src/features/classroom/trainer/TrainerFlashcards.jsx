import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Edit3, Eye, Layers3, Plus, Share2, Sparkles, Trash2 } from 'lucide-react'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import {
  deleteFlashcardSet,
  generateFlashcardsAi,
  getClassFlashcardSets,
  shareFlashcardSet,
} from '@/data/demo/classFlowRuntime'

export function TrainerFlashcards() {
  const { classId } = useOutletContext()
  const navigate = useNavigate()
  const [sets, setSets] = useState(() => getClassFlashcardSets(classId))
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [filters, setFilters] = useState({
    keyword: '',
    source: 'all',
    shared: 'all',
    sort: 'created-desc',
  })

  const refresh = () => setSets(getClassFlashcardSets(classId))
  const sourceOptions = useMemo(() => {
    return ['all', ...new Set(sets.map((set) => set.source).filter(Boolean))]
  }, [sets])

  const visibleSets = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return sets
      .filter((set) => {
        const cardText = (set.cards || [])
          .flatMap((card) => [card.front, card.back])
          .join(' ')
        const matchesKeyword = [set.title, set.source, cardText]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
        const matchesSource = filters.source === 'all' || set.source === filters.source
        const matchesShared =
          filters.shared === 'all' ||
          (filters.shared === 'shared' ? set.shared : !set.shared)

        return matchesKeyword && matchesSource && matchesShared
      })
      .sort((a, b) => {
        if (filters.sort === 'created-asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        if (filters.sort === 'cards') return Number((b.cards || []).length) - Number((a.cards || []).length)
        if (filters.sort === 'title') return a.title.localeCompare(b.title)
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      })
  }, [filters, sets])

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({ keyword: '', source: 'all', shared: 'all', sort: 'created-desc' })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.source !== 'all' ||
    filters.shared !== 'all' ||
    filters.sort !== 'created-desc'

  const handleGenerateAi = () => {
    generateFlashcardsAi(classId)
    refresh()
  }

  const handleShareToggle = (setId) => {
    shareFlashcardSet(setId)
    refresh()
  }

  const handleDelete = (setId) => {
    deleteFlashcardSet(setId)
    setDeleteConfirmId(null)
    refresh()
  }

  return (
    <div>
      <section className="classflow-section">
        <div className="classflow-section__header">
          <h2 className="classflow-section__title">Flashcard Sets</h2>
          <div className="demo-actions">
            <button type="button" className="demo-secondary-action" onClick={handleGenerateAi}>
              <Sparkles size={15} /> AI Generate
            </button>
            <button
              type="button"
              className="demo-primary-action"
              onClick={() => navigate(`/trainer/classes/${classId}/flashcards/create`)}
            >
              <Plus size={15} /> Create Set
            </button>
          </div>
        </div>

        <FilterToolbar>
          <SearchBox
            value={filters.keyword}
            placeholder="Search set or card content"
            ariaLabel="Search flashcard sets"
            onChange={(value) => updateFilter('keyword', value)}
          />
          <SelectFilter
            value={filters.source}
            onChange={(value) => updateFilter('source', value)}
            ariaLabel="Filter flashcard sets by source"
            options={sourceOptions.map((source) => ({
              value: source,
              label: source === 'all' ? 'All sources' : source.replaceAll('_', ' '),
            }))}
          />
          <SelectFilter
            value={filters.shared}
            onChange={(value) => updateFilter('shared', value)}
            ariaLabel="Filter flashcard sets by shared status"
            options={[
              { value: 'all', label: 'All sharing' },
              { value: 'shared', label: 'Shared' },
              { value: 'private', label: 'Not shared' },
            ]}
          />
          <SelectFilter
            value={filters.sort}
            onChange={(value) => updateFilter('sort', value)}
            ariaLabel="Sort flashcard sets"
            options={[
              { value: 'created-desc', label: 'Newest created' },
              { value: 'created-asc', label: 'Oldest created' },
              { value: 'cards', label: 'Most cards' },
              { value: 'title', label: 'Title A-Z' },
            ]}
          />
          <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
        </FilterToolbar>

        {sets.length === 0 ? (
          <p className="demo-muted">No flashcard sets yet.</p>
        ) : visibleSets.length === 0 ? (
          <div className="demo-state">
            <h2>No flashcard sets match</h2>
            <p>Adjust the filters or clear them to see all sets.</p>
            <button type="button" className="demo-primary-action" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
            {visibleSets.map((s) => (
              <div key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', background: '#fff', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem' }}>{s.title}</h3>
                    <p className="demo-muted" style={{ fontSize: '0.8125rem', marginTop: '0.15rem' }}>
                      <Layers3 size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                      {s.cards.length} cards · {(s.source || '').replaceAll('_', ' ')}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.6875rem', padding: '0.15rem 0.5rem', borderRadius: '0.375rem', background: s.shared ? '#dcfce7' : '#f1f5f9', color: s.shared ? '#15803d' : '#64748b', fontWeight: 600 }}>
                    {s.shared ? '✅ Shared' : '🔒 Private'}
                  </span>
                </div>
                <div className="demo-actions" style={{ marginTop: 'auto' }}>
                  <button type="button" className="demo-secondary-action" onClick={() => navigate(`/trainer/classes/${classId}/flashcards/${s.id}`)}>
                    <Eye size={14} /> View
                  </button>
                  <button type="button" className="demo-secondary-action" onClick={() => navigate(`/trainer/classes/${classId}/flashcards/${s.id}/edit`)}>
                    <Edit3 size={14} /> Edit
                  </button>
                  <button type="button" className="demo-secondary-action" onClick={() => handleShareToggle(s.id)}>
                    <Share2 size={14} /> {s.shared ? 'Unshare' : 'Share'}
                  </button>
                  <button type="button" className="demo-secondary-action" onClick={() => setDeleteConfirmId(s.id)} style={{ color: '#ef4444' }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                {deleteConfirmId === s.id ? (
                  <div style={{ padding: '0.5rem', background: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#991b1b' }}>Delete this set?</p>
                    <div className="demo-actions" style={{ marginTop: '0.35rem' }}>
                      <button type="button" className="demo-secondary-action" onClick={() => setDeleteConfirmId(null)} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>Cancel</button>
                      <button type="button" className="demo-primary-action" onClick={() => handleDelete(s.id)} style={{ background: '#dc2626', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>Delete</button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
