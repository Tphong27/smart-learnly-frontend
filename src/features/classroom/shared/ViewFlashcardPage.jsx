import { useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Image, RotateCcw } from 'lucide-react'
import { getCurrentUser } from '@/services/api-client'
import { getFlashcardSetById } from '@/data/demo/classFlowRuntime'

export function ViewFlashcardPage() {
  const navigate = useNavigate()
  const { classId, setId } = useParams()
  const context = useOutletContext()
  const user = getCurrentUser()
  const role = user?.role || 'trainee'

  const set = getFlashcardSetById(setId)
  const cards = set?.cards || []

  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [viewMode, setViewMode] = useState('study') // 'study' | 'list'

  const backPath = role === 'trainer'
    ? `/trainer/classes/${classId}/flashcards`
    : `/my-classes/${classId}/flashcards`

  const currentCard = cards[currentIndex]

  const goNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1)
      setFlipped(false)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setFlipped(false)
    }
  }

  if (!set) {
    return (
      <section className="classflow-section">
        <p className="demo-muted">Flashcard set not found.</p>
        <button type="button" className="demo-secondary-action" onClick={() => navigate(backPath)}>
          <ArrowLeft size={14} /> Back
        </button>
      </section>
    )
  }

  return (
    <div>
      <div className="classflow-section" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" className="demo-secondary-action" onClick={() => navigate(backPath)} style={{ padding: '0.35rem 0.75rem' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h2 style={{ fontWeight: 700, color: '#0f172a', margin: 0, flex: 1 }}>
            {set.title}
          </h2>
          <span className="demo-muted">{cards.length} cards</span>
        </div>

        {/* View mode toggle */}
        <div className="classflow-tabs" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={`classflow-tab${viewMode === 'study' ? ' active' : ''}`}
            onClick={() => setViewMode('study')}
          >
            Study
          </button>
          <button
            type="button"
            className={`classflow-tab${viewMode === 'list' ? ' active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            All Cards
          </button>
        </div>
      </div>

      {/* Study mode */}
      {viewMode === 'study' && cards.length > 0 ? (
        <div className="classflow-section">
          {/* Progress bar */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.35rem' }}>
              <span>Card {currentIndex + 1} of {cards.length}</span>
              <span>{Math.round(((currentIndex + 1) / cards.length) * 100)}%</span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((currentIndex + 1) / cards.length) * 100}%`, background: '#2563eb', borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Flashcard */}
          <div className="classflow-flashcard-study">
            <button
              type="button"
              className={`classflow-flashcard-card${flipped ? ' is-flipped' : ''}`}
              onClick={() => setFlipped((v) => !v)}
              style={{ minHeight: '240px' }}
            >
              <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                {flipped ? 'Definition' : 'Term'}
              </div>
              <div style={{ fontSize: '1.125rem' }}>
                {flipped ? currentCard.back : currentCard.front}
              </div>
              {currentCard.image && !flipped ? (
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                  <Image size={14} /> {currentCard.image}
                </div>
              ) : null}
              <div style={{ marginTop: 'auto', paddingTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                Click to flip
              </div>
            </button>

            <div className="demo-actions">
              <button type="button" className="demo-secondary-action" onClick={goPrev} disabled={currentIndex === 0}>
                <ChevronLeft size={16} /> Previous
              </button>
              <button type="button" className="demo-secondary-action" onClick={() => setFlipped((v) => !v)}>
                <RotateCcw size={15} /> Flip
              </button>
              <button type="button" className="demo-primary-action" onClick={goNext} disabled={currentIndex >= cards.length - 1}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Card thumbnails */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', justifyContent: 'center' }}>
            {cards.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setCurrentIndex(i); setFlipped(false) }}
                style={{
                  width: '28px', height: '28px',
                  borderRadius: '0.375rem',
                  border: i === currentIndex ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: i === currentIndex ? '#eff6ff' : '#fff',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: i === currentIndex ? '#2563eb' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* List mode */}
      {viewMode === 'list' ? (
        <div className="classflow-section">
          <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>All Cards ({cards.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cards.map((card, i) => (
              <div key={card.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr', gap: '1rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#fff', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.8125rem', textAlign: 'center' }}>{i + 1}</span>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Term</span>
                  <p style={{ fontWeight: 600, color: '#0f172a', margin: '0.15rem 0 0', fontSize: '0.875rem' }}>{card.front}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Definition</span>
                  <p style={{ color: '#334155', margin: '0.15rem 0 0', fontSize: '0.875rem' }}>{card.back}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
