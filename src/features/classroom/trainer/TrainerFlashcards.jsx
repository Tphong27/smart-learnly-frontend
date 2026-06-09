import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Eye, Plus, Share2, Sparkles, RotateCcw } from 'lucide-react'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import {
  createFlashcardSet,
  generateFlashcardsAi,
  getClassFlashcardSets,
  shareFlashcardSet,
} from '@/data/demo/classFlowRuntime'

export function TrainerFlashcards() {
  const { classId } = useOutletContext()
  const [sets, setSets] = useState(() => getClassFlashcardSets(classId))
  const [creating, setCreating] = useState(false)
  const [previewSetId, setPreviewSetId] = useState(null)
  const [filters, setFilters] = useState({
    keyword: '',
    source: 'all',
    shared: 'all',
    sort: 'created-desc',
  })
  const [studyIndex, setStudyIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [form, setForm] = useState({ title: '', cardsText: '' })

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
    setFilters({
      keyword: '',
      source: 'all',
      shared: 'all',
      sort: 'created-desc',
    })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.source !== 'all' ||
    filters.shared !== 'all' ||
    filters.sort !== 'created-desc'

  const handleCreate = () => {
    if (!form.title.trim()) return
    const cards = form.cardsText
      .split('\n')
      .filter((line) => line.includes('|'))
      .map((line, i) => {
        const [front, back] = line.split('|').map((s) => s.trim())
        return { id: `manual-fc-${Date.now()}-${i}`, front, back: back || '' }
      })
    createFlashcardSet(classId, { title: form.title, cards, shared: false })
    setCreating(false)
    setForm({ title: '', cardsText: '' })
    refresh()
  }

  const handleGenerateAi = () => {
    generateFlashcardsAi(classId)
    refresh()
  }

  const handleShareToggle = (setId) => {
    shareFlashcardSet(setId)
    refresh()
  }

  const previewSet = sets.find((s) => s.id === previewSetId)
  const previewCard = previewSet?.cards?.[studyIndex]

  return (
    <div>
      <section className="classflow-section">
        <div className="classflow-section__header">
          <h2 className="classflow-section__title">Flashcard Sets</h2>
          <div className="demo-actions">
            <button type="button" className="demo-secondary-action" onClick={handleGenerateAi}>
              <Sparkles size={15} /> AI Generate
            </button>
            <button type="button" className="demo-primary-action" onClick={() => setCreating(true)}>
              <Plus size={15} /> Create Set
            </button>
          </div>
        </div>

        {creating ? (
          <div className="classflow-submission-panel" style={{ marginBottom: '1rem' }}>
            <label className="course-flow-field">
              <span>Set title</span>
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Flashcard set title" />
            </label>
            <label className="course-flow-field" style={{ marginTop: '0.5rem' }}>
              <span>Cards (one per line, format: front | back)</span>
              <textarea
                rows="6"
                value={form.cardsText}
                onChange={(e) => setForm((p) => ({ ...p, cardsText: e.target.value }))}
                placeholder={"What is IAM? | Identity and Access Management\nWhat is MFA? | Multi-Factor Authentication"}
              />
            </label>
            <div className="demo-actions" style={{ marginTop: '0.75rem' }}>
              <button type="button" className="demo-secondary-action" onClick={() => setCreating(false)}>Cancel</button>
              <button type="button" className="demo-primary-action" onClick={handleCreate}>Create Set</button>
            </div>
          </div>
        ) : null}

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
              label: source === 'all' ? 'All sources' : source,
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
          <div className="demo-list" style={{ marginTop: '0.75rem' }}>
            {visibleSets.map((s) => (
              <div key={s.id} className="demo-list-item">
                <div>
                  <strong>{s.title}</strong>
                  <small>
                    {s.cards.length} cards · {s.source} · {s.shared ? '✅ Shared' : '🔒 Not shared'}
                  </small>
                </div>
                <div className="demo-actions">
                  <button type="button" className="demo-secondary-action" onClick={() => { setPreviewSetId(s.id); setStudyIndex(0); setFlipped(false) }}>
                    <Eye size={14} /> Preview
                  </button>
                  <button type="button" className="demo-secondary-action" onClick={() => handleShareToggle(s.id)}>
                    <Share2 size={14} /> {s.shared ? 'Unshare' : 'Share'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Preview / Study */}
      {previewSet ? (
        <section className="classflow-section">
          <div className="classflow-section__header">
            <h2 className="classflow-section__title">Preview: {previewSet.title}</h2>
            <button type="button" className="demo-secondary-action" onClick={() => setPreviewSetId(null)}>Close</button>
          </div>
          {previewCard ? (
            <div className="classflow-flashcard-study">
              <p className="demo-muted">{studyIndex + 1} / {previewSet.cards.length}</p>
              <button
                type="button"
                className={`classflow-flashcard-card${flipped ? ' is-flipped' : ''}`}
                onClick={() => setFlipped((v) => !v)}
              >
                {flipped ? previewCard.back : previewCard.front}
              </button>
              <div className="demo-actions">
                <button type="button" className="demo-secondary-action" onClick={() => setFlipped((v) => !v)}>
                  <RotateCcw size={15} /> Flip
                </button>
                <button
                  type="button"
                  className="demo-primary-action"
                  onClick={() => { setStudyIndex((i) => (i + 1) % previewSet.cards.length); setFlipped(false) }}
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
