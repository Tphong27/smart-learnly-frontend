import { useState } from 'react'
import { ArrowRight, CheckCircle2, FileText, PlayCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { demoLessons, demoTests } from '@/data/demo'
import {
  getCompletedLessonIds,
  getDemoCourseModules,
  getDemoEnrollmentByCourse,
  markDemoLessonCompleted,
} from '@/data/demo/demoRuntime'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

function getLessonIcon(type) {
  return type === 'Video' ? <PlayCircle size={30} /> : <FileText size={30} />
}

export function LessonDetailPage() {
  const { courseId, lessonId } = useParams()
  const { loading, error } = useDemoPageState()
  const lesson = demoLessons.find((item) => item.id === lessonId && item.courseId === courseId)
  const enrollment = getDemoEnrollmentByCourse(courseId)
  const [completedLessonIds, setCompletedLessonIds] = useState(() => getCompletedLessonIds(courseId))
  const modules = getDemoCourseModules(courseId)
  const flatLessons = modules.flatMap((module) => module.lessons)
  const currentIndex = flatLessons.findIndex((item) => item.id === lessonId)
  const nextLesson = flatLessons[currentIndex + 1]
  const relatedTest = demoTests.find((test) => test.courseId === courseId && test.status === 'published')
  const isCompleted = completedLessonIds.includes(lessonId)

  useDocumentTitle(lesson ? lesson.title : 'Lesson detail')

  const handleComplete = () => {
    setCompletedLessonIds(markDemoLessonCompleted(courseId, lessonId))
  }

  if (loading) {
    return <PageState state="loading" title="Loading lesson" description="Preparing lesson content and progress state." />
  }

  if (error) {
    return <PageState state="error" title="Lesson unavailable" description={error.message} />
  }

  if (!enrollment) {
    return (
      <PageState
        state="error"
        title="Enrollment required"
        description="You need to enroll before viewing lesson content."
        action={<Link className="demo-primary-action" to={`/checkout/${courseId}`}>Go to checkout <ArrowRight size={16} /></Link>}
      />
    )
  }

  if (!lesson || lesson.status !== 'published') {
    return <PageState state="empty" title="Lesson not available" description="This lesson is not published in demo data." />
  }

  return (
    <main className="demo-page">
      <section className="lesson-detail-layout">
        <article className="demo-card lesson-content">
          <div className="lesson-content__media">
            {getLessonIcon(lesson.type)}
            <span>{lesson.type}</span>
          </div>
          <StatusBadge status={lesson.status} />
          <h1>{lesson.title}</h1>
          <p>{lesson.summary}</p>
          <div className="lesson-content__body">
            <h2>Lesson notes</h2>
            <p>
              This demo lesson represents trainer-approved learning material. AI-generated study suggestions are shown separately as draft recommendations only.
            </p>
            <p>
              Focus on the key terms, examples, and decision criteria in this lesson before attempting the checkpoint test.
            </p>
          </div>
        </article>

        <aside className="demo-card lesson-side-panel">
          <h2>Lesson actions</h2>
          <button className="demo-primary-action" type="button" onClick={handleComplete} disabled={isCompleted}>
            <CheckCircle2 size={16} />
            {isCompleted ? 'Completed' : 'Mark as completed'}
          </button>
          {nextLesson && (
            <Link className="demo-secondary-action" to={`/learning/${courseId}/lessons/${nextLesson.id}`}>
              Next lesson <ArrowRight size={16} />
            </Link>
          )}
          {relatedTest && (
            <Link className="demo-secondary-action" to={`/tests/${relatedTest.id}`}>
              Take related test
            </Link>
          )}
        </aside>
      </section>
    </main>
  )
}
