import { ArrowRight, BookOpen, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { demoCourses } from '@/data/demo'
import { getAllDemoEnrollments, getCourseProgress } from '@/data/demo/demoRuntime'
import { PageState } from '@/shared/components/PageState'
import { ProgressBar } from '@/shared/components/ProgressBar'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

export function MyCoursesPage() {
  useDocumentTitle('My courses')

  const { loading, error } = useDemoPageState()
  const enrollments = getAllDemoEnrollments()
  const enrolledCourses = enrollments
    .map((enrollment) => ({
      enrollment,
      course: demoCourses.find((course) => course.id === enrollment.courseId),
    }))
    .filter((item) => item.course)

  if (loading) {
    return <PageState state="loading" title="Loading your courses" description="Fetching enrolled courses from demo data." />
  }

  if (error) {
    return <PageState state="error" title="Could not load courses" description={error.message} />
  }

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Trainee workspace</span>
          <h1>My Courses</h1>
          <p>Continue enrolled courses, review progress, and jump back into the next lesson.</p>
        </div>
      </section>

      {enrolledCourses.length === 0 ? (
        <PageState
          state="empty"
          title="No enrolled courses"
          description="Enroll in a published course to start learning."
          action={<Link className="demo-primary-action" to="/courses">Explore courses <ArrowRight size={16} /></Link>}
        />
      ) : (
        <section className="demo-card-grid">
          {enrolledCourses.map(({ course, enrollment }) => {
            const progress = Math.max(enrollment.progress, getCourseProgress(course.id))

            return (
              <article className="demo-card my-course-card" key={enrollment.id}>
                <div className="demo-row demo-row--between">
                  <StatusBadge status={enrollment.status} />
                  <small>{enrollment.enrolledAt}</small>
                </div>
                <h2>{course.title}</h2>
                <p>{course.shortDescription}</p>
                <div className="demo-meta-grid">
                  <span><BookOpen size={15} /> {course.lessonCount} lessons</span>
                  <span><Clock3 size={15} /> {course.duration}</span>
                </div>
                <ProgressBar value={progress} label={`${course.title} progress`} />
                <Link className="demo-primary-action" to={`/learning/${course.id}`}>
                  Continue learning <ArrowRight size={16} />
                </Link>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}
