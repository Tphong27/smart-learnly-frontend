import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { BookmarkPlus, Edit3, Eye, Layers3, Plus, Share2, Trash2 } from 'lucide-react'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import { getCurrentUser } from '@/services/api-client'
import {
  deleteFlashcardSet,
  getClassFlashcardSets,
  getSharedFlashcardSets,
  saveFlashcardsToPersonal,
  shareFlashcardSet,
} from '@/data/demo/classFlowRuntime'

export function TraineeFlashcards() {
  const { classId } = useOutletContext()
  const navigate = useNavigate()
  const user = getCurrentUser()
  const traineeId = user?.id || 'trainee-minh'

  // Show all sets: shared ones + ones created by this trainee
  const [allSets, setAllSets] = useState(() => {
    const classSets = getClassFlashcardSets(classId)
    return classSets.filter((s) => s.shared || s.createdBy === traineeId)
  })
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [savedSets, setSavedSets] = useState(new Set())
  const [filters, setFilters] = useState({
    keyword: '',
    source: 'all',
    sort: 'created-desc',
  })

  const refresh = () => {
    const classSets = getClassFlashcardSets(classId)
    setAllSets(classSets.filter((s) => s.shared || s.createdBy === traineeId))
  }

  const sourceOptions = useMemo(() => {
    return ['all', ...new Set(allSets.map((set) => set.source).filter(Boolean))]
  }, [allSets])

  const visibleSets = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return allSets
      .filter((set) => {
        const cardText = (set.cards || []).flatMap((card) => [card.front, card.back]).join(' ')
        const matchesKeyword = [set.title, set.source, cardText]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
        const matchesSource = filters.source === 'all' || set.source === filters.source

        return matchesKeyword && matchesSource
      })
      .sort((a, b) => {
        if (filters.sort === 'created-asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        if (filters.sort === 'cards') return Number((b.cards || []).length) - Number((a.cards || []).length)
        if (filters.sort === 'title') return a.title.localeCompare(b.title)
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      })
  }, [filters, allSets])

  const handleSave = (setId) => {
    saveFlashcardsToPersonal(setId, traineeId)
    setSavedSets((p) => new Set([...p, setId]))
  }

  const handleDelete = (setId) => {
    deleteFlashcardSet(setId)
    setDeleteConfirmId(null)
    refresh()
  }

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({ keyword: '', source: 'all', sort: 'created-desc' })
  }

  const hasActiveFilters =
    filters.keyword || filters.source !== 'all' || filters.sort !== 'created-desc'

  const isOwner = (set) => set.createdBy === traineeId

  return (
    <div>
      <section className="classflow-section">
        <div className="classflow-section__header">
          <h2 className="classflow-section__title">Flashcard Sets</h2>
          <button
            type="button"
            className="demo-primary-action"
            onClick={() => navigate(`/my-classes/${classId}/flashcards/create`)}
          >
            <Plus size={15} /> Create Set
          </button>
        </div>

        <FilterToolbar>
          <SearchBox
            value={filters.keyword}
            placeholder="Search set or card content"
            ariaLabel="Search flashcards"
            onChange={(value) => updateFilter('keyword', value)}
          />
          <SelectFilter
            value={filters.source}
            onChange={(value) => updateFilter('source', value)}
            ariaLabel="Filter flashcards by source"
            options={sourceOptions.map((source) => ({
              value: source,
              label: source === 'all' ? 'All sources' : source.replaceAll('_', ' '),
            }))}
          />
          <SelectFilter
            value={filters.sort}
            onChange={(value) => updateFilter('sort', value)}
            ariaLabel="Sort flashcards"
            options={[
              { value: 'created-desc', label: 'Newest created' },
              { value: 'created-asc', label: 'Oldest created' },
              { value: 'cards', label: 'Most cards' },
              { value: 'title', label: 'Title A-Z' },
            ]}
          />
          <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
        </FilterToolbar>

        {allSets.length === 0 ? (
          <p className="demo-muted">No flashcard sets available. Create one or wait for shared sets.</p>
        ) : visibleSets.length === 0 ? (
          <div className="demo-state">
            <h2>No flashcard sets match</h2>
            <p>Adjust the search or source filter.</p>
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
                  {isOwner(s) ? (
                    <span style={{ fontSize: '0.6875rem', padding: '0.15rem 0.5rem', borderRadius: '0.375rem', background: '#dbeafe', color: '#2563eb', fontWeight: 600 }}>
                      My Set
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.6875rem', padding: '0.15rem 0.5rem', borderRadius: '0.375rem', background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>
                      Shared
                    </span>
                  )}
                </div>
                <div className="demo-actions" style={{ marginTop: 'auto' }}>
                  <button type="button" className="demo-primary-action" onClick={() => navigate(`/my-classes/${classId}/flashcards/${s.id}`)}>
                    <Eye size={14} /> Study
                  </button>
                  {isOwner(s) ? (
                    <>
                      <button type="button" className="demo-secondary-action" onClick={() => navigate(`/my-classes/${classId}/flashcards/${s.id}/edit`)}>
                        <Edit3 size={14} /> Edit
                      </button>
                      <button type="button" className="demo-secondary-action" onClick={() => setDeleteConfirmId(s.id)} style={{ color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="demo-secondary-action"
                      disabled={savedSets.has(s.id)}
                      onClick={() => handleSave(s.id)}
                    >
                      <BookmarkPlus size={14} />
                      {savedSets.has(s.id) ? 'Saved' : 'Save'}
                    </button>
                  )}
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
