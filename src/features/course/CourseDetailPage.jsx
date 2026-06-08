import { ArrowRight, BookOpen, CheckCircle2, Clock3, GraduationCap, Star } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { demoCourses } from '@/data/demo'
import { getDemoCourseModules, getDemoEnrollmentByCourse } from '@/data/demo/demoRuntime'
import { PageState } from '@/shared/components/PageState'
import { ProgressBar } from '@/shared/components/ProgressBar'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

function formatPrice(course) {
  return new Intl.NumberFormat('vi-VN').format(course.price) + ' ' + course.currency
}

export function CourseDetailPage() {
  const { courseId } = useParams()
  const { loading, error } = useDemoPageState()
  const course = demoCourses.find((item) => item.id === courseId)
  const modules = getDemoCourseModules(courseId)
  const enrollment = getDemoEnrollmentByCourse(courseId)

  useDocumentTitle(course ? course.title : 'Course detail')

  if (loading) {
    return <PageState state="loading" title="Loading course detail" description="Checking course modules and enrollment state." />
  }

  if (error) {
    return <PageState state="error" title="Course unavailable" description={error.message} />
  }

  if (!course || course.status !== 'published') {
    return <PageState state="empty" title="Course not found" description="This course is not published or does not exist in demo data." />
  }

  return (
    <main className="demo-page">
      <section className="course-detail-hero">
        <div>
          <span className="demo-kicker">{course.category}</span>
          <h1>{course.title}</h1>
          <p>{course.shortDescription}</p>
          <div className="demo-meta-grid demo-meta-grid--wide">
            <span><GraduationCap size={16} /> {course.level}</span>
            <span><BookOpen size={16} /> {course.lessonCount} lessons</span>
            <span><Clock3 size={16} /> {course.duration}</span>
            <span><Star size={16} /> {course.rating}</span>
          </div>
        </div>
        <aside className="demo-card course-detail-panel">
          <StatusBadge status={enrollment?.status || 'not enrolled'} tone={enrollment ? enrollment.status : 'not-enrolled'} />
          <strong>{formatPrice(course)}</strong>
          {enrollment ? (
            <>
              <ProgressBar value={enrollment.progress} label="Course progress" />
              <Link className="demo-primary-action" to={`/learning/${course.id}`}>
                Continue learning <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <Link className="demo-primary-action" to={`/checkout/${course.id}`}>
              Enroll with mock payment <ArrowRight size={16} />
            </Link>
          )}
        </aside>
      </section>

      <section className="demo-two-column">
        <div className="demo-card">
          <h2>Learning outcomes</h2>
          <ul className="demo-check-list">
            {course.outcomes.map((outcome) => (
              <li key={outcome}><CheckCircle2 size={17} /> {outcome}</li>
            ))}
          </ul>
        </div>
        <div className="demo-card">
          <h2>Course modules</h2>
          {modules.length === 0 ? (
            <PageState state="empty" title="No modules yet" description="Published course modules will appear here." />
          ) : (
            <div className="demo-list">
              {modules.map((module) => (
                <article key={module.id} className="demo-list-item">
                  <div>
                    <strong>{module.title}</strong>
                    <small>{module.lessons.length} lessons</small>
                  </div>
                  <StatusBadge status={module.status} />
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
