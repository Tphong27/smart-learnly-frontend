import { ArrowRight, BookOpenCheck, CheckCircle2, Lock, PlayCircle } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { demoCourses } from '@/data/demo'
import {
  getAllDemoEnrollments,
  getCompletedLessonIds,
  getCourseProgress,
  getDemoCourseModules,
  getDemoEnrollmentByCourse,
} from '@/data/demo/demoRuntime'
import { PageState } from '@/shared/components/PageState'
import { ProgressBar } from '@/shared/components/ProgressBar'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

export function LearningWorkspacePage() {
  const { courseId } = useParams()
  const { loading, error } = useDemoPageState()
  const enrollments = getAllDemoEnrollments()
  const resolvedCourseId = courseId || enrollments[0]?.courseId
  const course = demoCourses.find((item) => item.id === resolvedCourseId)
  const enrollment = getDemoEnrollmentByCourse(resolvedCourseId)
  const modules = getDemoCourseModules(resolvedCourseId)
  const completedLessonIds = getCompletedLessonIds(resolvedCourseId)
  const progress = getCourseProgress(resolvedCourseId)

  useDocumentTitle(course ? `${course.title} learning` : 'Learning workspace')

  if (!courseId && resolvedCourseId) {
    return <Navigate to={`/learning/${resolvedCourseId}`} replace />
  }

  if (loading) {
    return <PageState state="loading" title="Loading workspace" description="Preparing modules, lessons, and learning progress." />
  }

  if (error) {
    return <PageState state="error" title="Learning workspace unavailable" description={error.message} />
  }

  if (!course) {
    return <PageState state="empty" title="No course selected" description="Choose an enrolled course to open the learning workspace." />
  }

  if (!enrollment) {
    return (
      <PageState
        state="error"
        title="Enrollment required"
        description="This trainee is not enrolled in the selected course."
        action={<Link className="demo-primary-action" to={`/checkout/${course.id}`}>Enroll now <ArrowRight size={16} /></Link>}
      />
    )
  }

  return (
    <main className="demo-page">
      <section className="learning-header">
        <div>
          <span className="demo-kicker">Learning workspace</span>
          <h1>{course.title}</h1>
          <p>{course.shortDescription}</p>
        </div>
        <aside className="demo-card learning-summary">
          <StatusBadge status={enrollment.status} />
          <ProgressBar value={progress || enrollment.progress} label="Course progress" />
          <Link className="demo-secondary-action" to="/tests">View tests</Link>
        </aside>
      </section>

      {modules.length === 0 ? (
        <PageState state="empty" title="No lessons yet" description="Published lessons will appear here after SME review." />
      ) : (
        <section className="learning-module-list">
          {modules.map((module) => (
            <article key={module.id} className="demo-card learning-module">
              <div className="demo-row demo-row--between">
                <div>
                  <h2>{module.title}</h2>
                  <p>{module.lessons.length} lessons</p>
                </div>
                <StatusBadge status={module.status} />
              </div>

              <div className="lesson-row-list">
                {module.lessons.map((lesson) => {
                  const completed = completedLessonIds.includes(lesson.id)
                  const locked = module.status !== 'published' || lesson.status !== 'published'

                  return (
                    <Link
                      key={lesson.id}
                      className={locked ? 'lesson-row is-locked' : 'lesson-row'}
                      to={locked ? '#' : `/learning/${course.id}/lessons/${lesson.id}`}
                      aria-disabled={locked}
                    >
                      <span className={completed ? 'lesson-row__icon is-complete' : 'lesson-row__icon'}>
                        {locked ? <Lock size={18} /> : completed ? <CheckCircle2 size={18} /> : <PlayCircle size={18} />}
                      </span>
                      <span>
                        <strong>{lesson.title}</strong>
                        <small>{lesson.type} | {lesson.durationMinutes} min</small>
                      </span>
                      <BookOpenCheck size={18} />
                    </Link>
                  )
                })}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
