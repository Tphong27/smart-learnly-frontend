import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BookmarkPlus, RotateCcw } from 'lucide-react'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import { getCurrentUser } from '@/services/api-client'
import {
  getSharedFlashcardSets,
  saveFlashcardsToPersonal,
} from '@/data/demo/classFlowRuntime'

export function TraineeFlashcards() {
  const { classId } = useOutletContext()
  const user = getCurrentUser()
  const traineeId = user?.id || 'trainee-minh'
  const sets = useMemo(() => getSharedFlashcardSets(classId), [classId])
  const [filters, setFilters] = useState({
    keyword: '',
    source: 'all',
    sort: 'created-desc',
  })
  const [studySetId, setStudySetId] = useState(null)
  const [studyIndex, setStudyIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [savedSets, setSavedSets] = useState(new Set())

  const studySet = sets.find((s) => s.id === studySetId)
  const studyCard = studySet?.cards?.[studyIndex]
  const sourceOptions = useMemo(() => {
    return ['all', ...new Set(sets.map((set) => set.source).filter(Boolean))]
  }, [sets])

  const visibleSets = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return sets
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
  }, [filters, sets])

  const handleSave = (setId) => {
    saveFlashcardsToPersonal(setId, traineeId)
    setSavedSets((p) => new Set([...p, setId]))
  }

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      source: 'all',
      sort: 'created-desc',
    })
  }

  const hasActiveFilters =
    filters.keyword || filters.source !== 'all' || filters.sort !== 'created-desc'

  return (
    <div>
      <section className="classflow-section">
        <h2 className="classflow-section__title">Shared Flashcard Sets</h2>

        <FilterToolbar>
          <SearchBox
            value={filters.keyword}
            placeholder="Search set or card content"
            ariaLabel="Search shared flashcards"
            onChange={(value) => updateFilter('keyword', value)}
          />
          <SelectFilter
            value={filters.source}
            onChange={(value) => updateFilter('source', value)}
            ariaLabel="Filter flashcards by source"
            options={sourceOptions.map((source) => ({
              value: source,
              label: source === 'all' ? 'All sources' : source,
            }))}
          />
          <SelectFilter
            value={filters.sort}
            onChange={(value) => updateFilter('sort', value)}
            ariaLabel="Sort shared flashcards"
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
          <p className="demo-muted">No shared flashcard sets available.</p>
        ) : visibleSets.length === 0 ? (
          <div className="demo-state">
            <h2>No flashcard sets match</h2>
            <p>Adjust the search or source filter.</p>
            <button type="button" className="demo-primary-action" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="demo-list" style={{ marginTop: '0.75rem' }}>
            {visibleSets.map((s) => (
              <div key={s.id} className="demo-list-item">
                <div>
                  <strong>{s.title}</strong>
                  <small>{s.cards.length} cards · {s.source}</small>
                </div>
                <div className="demo-actions">
                  <button
                    type="button"
                    className="demo-primary-action"
                    onClick={() => { setStudySetId(s.id); setStudyIndex(0); setFlipped(false) }}
                  >
                    Study
                  </button>
                  <button
                    type="button"
                    className="demo-secondary-action"
                    disabled={savedSets.has(s.id)}
                    onClick={() => handleSave(s.id)}
                  >
                    <BookmarkPlus size={14} />
                    {savedSets.has(s.id) ? 'Saved' : 'Save to My Flashcards'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Study mode */}
      {studySet ? (
        <section className="classflow-section">
          <div className="classflow-section__header">
            <h2 className="classflow-section__title">Studying: {studySet.title}</h2>
            <button type="button" className="demo-secondary-action" onClick={() => setStudySetId(null)}>Close</button>
          </div>

          {studyCard ? (
            <div className="classflow-flashcard-study">
              <p className="demo-muted">{studyIndex + 1} / {studySet.cards.length}</p>
              <button
                type="button"
                className={`classflow-flashcard-card${flipped ? ' is-flipped' : ''}`}
                onClick={() => setFlipped((v) => !v)}
              >
                {flipped ? studyCard.back : studyCard.front}
              </button>
              <div className="demo-actions">
                <button type="button" className="demo-secondary-action" onClick={() => setFlipped((v) => !v)}>
                  <RotateCcw size={15} /> Flip
                </button>
                <button
                  type="button"
                  className="demo-primary-action"
                  onClick={() => { setStudyIndex((i) => (i + 1) % studySet.cards.length); setFlipped(false) }}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <p className="demo-muted">No cards in this set.</p>
          )}
        </section>
      ) : null}
    </div>
  )
}
