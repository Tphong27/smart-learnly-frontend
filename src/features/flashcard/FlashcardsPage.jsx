import { useMemo, useState } from 'react'
import { Plus, RotateCcw, Sparkles } from 'lucide-react'
import { getAllDemoEnrollments } from '@/data/demo/demoRuntime'
import {
  createManualFlashcard,
  getGeneratedResources,
  getLifecycleCourseById,
  getLifecycleModules,
} from '@/data/demo/courseLifecycleRuntime'
import { PageState } from '@/shared/components/PageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

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

  const enrollments = getAllDemoEnrollments()
  const enrolledCourses = enrollments
    .map((enrollment) => getLifecycleCourseById(enrollment.courseId))
    .filter(Boolean)
  const [courseId, setCourseId] = useState(enrolledCourses[0]?.id || '')
  const [lessonId, setLessonId] = useState('all')
  const [manualFront, setManualFront] = useState('')
  const [manualBack, setManualBack] = useState('')
  const [resources, setResources] = useState(() => getGeneratedResources({}))

  const lessons = useMemo(() => {
    if (!courseId) return []
    return getLifecycleModules(courseId).flatMap((module) => module.lessons)
  }, [courseId])

  const flashcards = useMemo(() => {
    return flattenFlashcards(resources).filter((card) => {
      const matchesCourse = !courseId || card.courseId === courseId
      const matchesLesson = lessonId === 'all' || card.lessonId === lessonId
      return matchesCourse && matchesLesson
    })
  }, [courseId, lessonId, resources])

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

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Flashcards</span>
          <h1>Review generated and manual flashcards</h1>
          <p>Flashcards generated from the Learning Workspace are saved here for active recall practice.</p>
        </div>
      </section>

      <section className="course-flow-filter-card">
        <select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
          {enrolledCourses.map((course) => (
            <option key={course.id} value={course.id}>{course.title}</option>
          ))}
        </select>
        <select value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
          <option value="all">All lessons</option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
          ))}
        </select>
      </section>

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
          description="Generate flashcards from a lesson in the Learning Workspace or create one manually."
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
