import { useMemo, useState } from 'react'
import { Plus, RotateCcw, Sparkles } from 'lucide-react'
import { getEnrollmentsByUser } from '@/data/demo/demoRuntime'
import {
  createManualFlashcard,
  getGeneratedResources,
  getLifecycleCourseById,
  getLifecycleModules,
} from '@/data/demo/courseLifecycleRuntime'
import { PageState } from '@/shared/components/PageState'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { getCurrentUser } from '@/services'

function flattenFlashcards(resources) {
  return resources
    .filter((resource) => resource.type === 'flashcard')
    .flatMap((resource) =>
      (Array.isArray(resource.content) ? resource.content : []).map((card) => ({
        ...card,
        courseId: resource.courseId,
        lessonId: resource.lessonId,
      })),
    )
}

function FlashcardCard({ card }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <button
      type="button"
      className={flipped ? 'flashcard-card is-flipped' : 'flashcard-card'}
      onClick={() => setFlipped((current) => !current)}
    >
      <span>{card.source || 'AI'}</span>
      <strong>{flipped ? card.back : card.front}</strong>
      <small>{flipped ? 'Click to see question' : 'Click to flip'}</small>
    </button>
  )
}

function FlashcardStudyMode({ cards }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const current = cards[index]

  if (!current) return null

  const goNext = () => {
    setIndex((currentIndex) => (currentIndex + 1) % cards.length)
    setFlipped(false)
  }

  return (
    <section className="demo-card flashcard-study-mode">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Study mode</span>
          <h2>{index + 1} / {cards.length}</h2>
        </div>
        <Sparkles size={24} />
      </div>
      <button type="button" className="flashcard-study-card" onClick={() => setFlipped((value) => !value)}>
        {flipped ? current.back : current.front}
      </button>
      <div className="demo-actions">
        <button type="button" className="demo-secondary-action" onClick={() => setFlipped((value) => !value)}>
          <RotateCcw size={16} />
          Flip
        </button>
        <button type="button" className="demo-primary-action" onClick={goNext}>
          Next flashcard
        </button>
      </div>
    </section>
  )
}

export function FlashcardsPage() {
  useDocumentTitle('Flashcards')

  const traineeId = getCurrentUser()?.id || 'trainee-minh'
  const enrollments = getEnrollmentsByUser(traineeId)
  const enrolledCourses = enrollments
    .map((enrollment) => getLifecycleCourseById(enrollment.courseId))
    .filter(Boolean)
  const [courseId, setCourseId] = useState(enrolledCourses[0]?.id || '')
  const [lessonId, setLessonId] = useState('all')
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [sort, setSort] = useState('created-desc')
  const [manualFront, setManualFront] = useState('')
  const [manualBack, setManualBack] = useState('')
  const [resources, setResources] = useState(() => getGeneratedResources({}))

  const lessons = useMemo(() => {
    if (!courseId) return []
    return getLifecycleModules(courseId).flatMap((module) => module.lessons)
  }, [courseId])

  const flashcards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return flattenFlashcards(resources).filter((card) => {
      const matchesCourse = !courseId || card.courseId === courseId
      const matchesLesson = lessonId === 'all' || card.lessonId === lessonId
      const matchesSource = source === 'all' || card.source === source
      const matchesQuery = [card.front, card.back, card.source]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)

      return matchesCourse && matchesLesson && matchesSource && matchesQuery
    })
      .sort((a, b) => {
        if (sort === 'created-asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        if (sort === 'front') return String(a.front || '').localeCompare(String(b.front || ''))
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      })
  }, [courseId, lessonId, query, resources, sort, source])

  const sourceOptions = useMemo(() => {
    return ['all', ...new Set(flattenFlashcards(resources).map((card) => card.source).filter(Boolean))]
  }, [resources])

  const handleCreateManual = () => {
    if (!manualFront.trim() || !manualBack.trim() || !courseId) return

    createManualFlashcard({
      courseId,
      lessonId: lessonId === 'all' ? lessons[0]?.id : lessonId,
      front: manualFront.trim(),
      back: manualBack.trim(),
    })
    setManualFront('')
    setManualBack('')
    setResources(getGeneratedResources({}))
  }

  const updateCourse = (value) => {
    setCourseId(value)
    setLessonId('all')
  }

  const resetFilters = () => {
    setCourseId(enrolledCourses[0]?.id || '')
    setLessonId('all')
    setQuery('')
    setSource('all')
    setSort('created-desc')
  }

  const hasActiveFilters =
    courseId !== (enrolledCourses[0]?.id || '') ||
    lessonId !== 'all' ||
    query ||
    source !== 'all' ||
    sort !== 'created-desc'

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Flashcards</span>
          <h1>Review generated and manual flashcards</h1>
          <p>Flashcards generated from the Learning Workspace are saved here for active recall practice.</p>
        </div>
      </section>

      <FilterToolbar>
        <SearchBox
          value={query}
          placeholder="Search front or back"
          ariaLabel="Search flashcards"
          onChange={setQuery}
        />
        <SelectFilter
          value={courseId}
          onChange={updateCourse}
          ariaLabel="Filter flashcards by course"
          options={enrolledCourses.map((course) => ({
            value: course.id,
            label: course.title,
          }))}
          disabled={enrolledCourses.length === 0}
        />
        <SelectFilter
          value={lessonId}
          onChange={setLessonId}
          ariaLabel="Filter flashcards by lesson"
          options={[
            { value: 'all', label: 'All lessons' },
            ...lessons.map((lesson) => ({ value: lesson.id, label: lesson.title })),
          ]}
        />
        <SelectFilter
          value={source}
          onChange={setSource}
          ariaLabel="Filter flashcards by source"
          options={sourceOptions.map((item) => ({
            value: item,
            label: item === 'all' ? 'All sources' : item,
          }))}
        />
        <SelectFilter
          value={sort}
          onChange={setSort}
          ariaLabel="Sort flashcards"
          options={[
            { value: 'created-desc', label: 'Newest created' },
            { value: 'created-asc', label: 'Oldest created' },
            { value: 'front', label: 'Front A-Z' },
          ]}
        />
        <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
      </FilterToolbar>

      <section className="demo-card manual-flashcard-form">
        <h2>Create manual flashcard</h2>
        <input value={manualFront} placeholder="Front" onChange={(event) => setManualFront(event.target.value)} />
        <input value={manualBack} placeholder="Back" onChange={(event) => setManualBack(event.target.value)} />
        <button type="button" className="demo-primary-action" onClick={handleCreateManual}>
          <Plus size={16} />
          Create Flashcard
        </button>
      </section>

      {flashcards.length === 0 ? (
        <PageState
          state="empty"
          title="No flashcards yet"
          description="Generate flashcards from a lesson in the Learning Workspace, create one manually, or clear filters."
          action={
            hasActiveFilters ? (
              <button type="button" className="demo-primary-action" onClick={resetFilters}>
                Clear filters
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <FlashcardStudyMode cards={flashcards} />
          <section className="flashcard-grid">
            {flashcards.map((card) => (
              <FlashcardCard key={card.id} card={card} />
            ))}
          </section>
        </>
      )}
    </main>
  )
}
