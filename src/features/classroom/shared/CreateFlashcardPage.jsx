import { useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, FileText, Image, Plus, Trash2, X,
} from 'lucide-react'
import { getCurrentUser } from '@/services/api-client'
import {
  createFlashcardSet,
  getFlashcardSetById,
  updateFlashcardSet,
} from '@/data/demo/classFlowRuntime'

const emptyCard = () => ({
  id: `card-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  front: '',
  back: '',
  image: '',
})

export function CreateFlashcardPage() {
  const navigate = useNavigate()
  const { classId, setId } = useParams()
  const context = useOutletContext()
  const user = getCurrentUser()
  const role = user?.role || 'trainee'

  const isEdit = !!setId
  const existingSet = isEdit ? getFlashcardSetById(setId) : null

  const [title, setTitle] = useState(existingSet?.title || '')
  const [cards, setCards] = useState(
    existingSet?.cards?.length ? existingSet.cards.map((c) => ({ ...c, image: c.image || '' })) : [emptyCard(), emptyCard(), emptyCard()],
  )
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [termSep, setTermSep] = useState('tab')
  const [cardSep, setCardSep] = useState('newline')
  const [customTermSep, setCustomTermSep] = useState(':')
  const [customCardSep, setCustomCardSep] = useState(';')

  const backPath = role === 'trainer'
    ? `/trainer/classes/${classId}/flashcards`
    : `/my-classes/${classId}/flashcards`

  const updateCard = (index, field, value) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  const addCard = () => {
    setCards((prev) => [...prev, emptyCard()])
  }

  const removeCard = (index) => {
    if (cards.length <= 1) return
    setCards((prev) => prev.filter((_, i) => i !== index))
  }

  const handleImageChange = (index, e) => {
    const file = e.target.files?.[0]
    if (file) {
      updateCard(index, 'image', file.name)
    }
  }

  const getTermSeparator = () => {
    if (termSep === 'tab') return '\t'
    if (termSep === 'comma') return ','
    return customTermSep
  }

  const getCardSeparator = () => {
    if (cardSep === 'newline') return '\n'
    if (cardSep === 'semicolon') return ';'
    return customCardSep
  }

  const parseImport = () => {
    const tSep = getTermSeparator()
    const cSep = getCardSeparator()
    const rawCards = importText.split(cSep).filter((s) => s.trim())
    const parsed = rawCards.map((raw) => {
      const parts = raw.split(tSep).map((s) => s.trim())
      return {
        id: `imp-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        front: parts[0] || '',
        back: parts[1] || '',
        image: '',
      }
    }).filter((c) => c.front || c.back)
    return parsed
  }

  const handleImport = () => {
    const parsed = parseImport()
    if (parsed.length > 0) {
      setCards((prev) => [...prev.filter((c) => c.front || c.back), ...parsed])
    }
    setShowImport(false)
    setImportText('')
  }

  const handleSave = () => {
    if (!title.trim()) return
    const validCards = cards.filter((c) => c.front.trim() || c.back.trim())
    if (validCards.length === 0) return

    if (isEdit) {
      updateFlashcardSet(setId, { title, cards: validCards })
    } else {
      createFlashcardSet(classId, {
        title,
        cards: validCards,
        shared: false,
        createdBy: user?.id || 'trainer-an',
        source: role === 'trainer' ? 'trainer_created' : 'trainee_created',
      })
    }
    navigate(backPath)
  }

  const previewImported = importText ? parseImport() : []

  return (
    <div>
      <div className="classflow-section" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" className="demo-secondary-action" onClick={() => navigate(backPath)} style={{ padding: '0.35rem 0.75rem' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h2 style={{ fontWeight: 700, color: '#0f172a', margin: 0, flex: 1 }}>
            {isEdit ? 'Edit Flashcard Set' : 'Create Flashcard Set'}
          </h2>
        </div>

        {/* Title */}
        <label className="course-flow-field" style={{ marginBottom: '1rem' }}>
          <span>Title *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='Enter a title, like "Biology - Chapter 22: Evolution"'
            style={{ fontSize: '1rem', fontWeight: 600 }}
          />
        </label>

        {/* Import button */}
        <div className="demo-actions" style={{ marginBottom: '1rem' }}>
          <button type="button" className="demo-secondary-action" onClick={() => setShowImport(true)}>
            <FileText size={14} /> Import from Text
          </button>
        </div>
      </div>

      {/* Import modal */}
      {showImport ? (
        <div className="classflow-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontWeight: 700, color: '#0f172a', margin: 0 }}>Import Text</h3>
            <button type="button" className="demo-secondary-action" onClick={() => setShowImport(false)} style={{ padding: '0.25rem 0.5rem' }}>
              <X size={14} />
            </button>
          </div>

          <label className="course-flow-field">
            <span>Paste your text here</span>
            <textarea
              rows="6"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"Word 1\tDefinition 1\nWord 2\tDefinition 2"}
              style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
            />
          </label>

          <div className="course-flow-form-grid course-flow-form-grid--compact" style={{ marginTop: '0.75rem' }}>
            <label className="course-flow-field">
              <span>Between term and definition</span>
              <select value={termSep} onChange={(e) => setTermSep(e.target.value)}>
                <option value="tab">Tab</option>
                <option value="comma">Comma (,)</option>
                <option value="custom">Custom</option>
              </select>
              {termSep === 'custom' ? (
                <input
                  style={{ marginTop: '0.25rem' }}
                  value={customTermSep}
                  onChange={(e) => setCustomTermSep(e.target.value)}
                  placeholder="Custom separator"
                />
              ) : null}
            </label>
            <label className="course-flow-field">
              <span>Between cards</span>
              <select value={cardSep} onChange={(e) => setCardSep(e.target.value)}>
                <option value="newline">New line</option>
                <option value="semicolon">Semicolon (;)</option>
                <option value="custom">Custom</option>
              </select>
              {cardSep === 'custom' ? (
                <input
                  style={{ marginTop: '0.25rem' }}
                  value={customCardSep}
                  onChange={(e) => setCustomCardSep(e.target.value)}
                  placeholder="Custom separator"
                />
              ) : null}
            </label>
          </div>

          {/* Preview */}
          {previewImported.length > 0 ? (
            <div style={{ marginTop: '0.75rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                Preview: {previewImported.length} cards found
              </p>
              <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.5rem', background: '#f8fafc' }}>
                {previewImported.slice(0, 10).map((c, i) => (
                  <div key={i} style={{ fontSize: '0.8125rem', padding: '0.25rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <strong>{c.front}</strong> → {c.back}
                  </div>
                ))}
                {previewImported.length > 10 ? <p className="demo-muted">...and {previewImported.length - 10} more</p> : null}
              </div>
            </div>
          ) : null}

          <div className="demo-actions" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="demo-secondary-action" onClick={() => setShowImport(false)}>Cancel</button>
            <button type="button" className="demo-primary-action" onClick={handleImport} disabled={previewImported.length === 0}>
              <Plus size={14} /> Import {previewImported.length} Cards
            </button>
          </div>
        </div>
      ) : null}

      {/* Card Editor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {cards.map((card, index) => (
          <div key={card.id} className="classflow-section" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#2563eb' }}>{index + 1}</span>
              <div className="demo-actions">
                <label style={{ cursor: 'pointer' }} className="demo-secondary-action" title="Add image">
                  <Image size={14} />
                  <input type="file" accept="image/*" hidden onChange={(e) => handleImageChange(index, e)} />
                </label>
                <button
                  type="button"
                  className="demo-secondary-action"
                  onClick={() => removeCard(index)}
                  disabled={cards.length <= 1}
                  style={{ color: cards.length <= 1 ? '#cbd5e1' : '#ef4444', padding: '0.25rem 0.5rem' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: card.image ? '1fr 1fr 120px' : '1fr 1fr', gap: '1rem' }}>
              <label className="course-flow-field">
                <span>Term</span>
                <input
                  value={card.front}
                  onChange={(e) => updateCard(index, 'front', e.target.value)}
                  placeholder="Enter term"
                />
              </label>
              <label className="course-flow-field">
                <span>Definition</span>
                <input
                  value={card.back}
                  onChange={(e) => updateCard(index, 'back', e.target.value)}
                  placeholder="Enter definition"
                />
              </label>
              {card.image ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '100px', height: '60px', background: '#f1f5f9', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                    <Image size={24} color="#94a3b8" />
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.image}</span>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Add card + Save */}
      <div className="classflow-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="demo-secondary-action" onClick={addCard}>
          <Plus size={14} /> Add Card
        </button>
        <div className="demo-actions">
          <button type="button" className="demo-secondary-action" onClick={() => navigate(backPath)}>Cancel</button>
          <button type="button" className="demo-primary-action" onClick={handleSave} disabled={!title.trim() || !cards.some((c) => c.front.trim())}>
            <CheckCircle2 size={14} /> {isEdit ? 'Save Changes' : 'Create Set'}
          </button>
        </div>
      </div>
    </div>
  )
}
