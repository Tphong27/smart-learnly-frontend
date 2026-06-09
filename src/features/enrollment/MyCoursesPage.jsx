import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CourseCatalogSection } from '@/features/course/CourseCatalogSection'
import { getCourseProgress, getEnrollmentsByUser } from '@/data/demo/demoRuntime'
import { getLifecycleCourseById } from '@/data/demo/courseLifecycleRuntime'
import { getCurrentUser } from '@/services'
import { PageState } from '@/shared/components/PageState'
import { ProgressBar } from '@/shared/components/ProgressBar'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

export function MyCoursesPage() {
  useDocumentTitle('My courses')

  const { loading, error } = useDemoPageState()

  const currentUser = getCurrentUser()
  const traineeId = currentUser?.id || 'trainee-minh'
  const enrollments = getEnrollmentsByUser(traineeId)

  const enrolledCourses = enrollments
    .map((enrollment) => ({
      enrollment,
      course: getLifecycleCourseById(enrollment.courseId),
    }))
    .filter((item) => item.course)

  const enrolledCourseIds = enrolledCourses.map(({ course }) => course.id)

  if (loading) {
    return (
      <PageState
        state="loading"
        title="Loading your courses"
        description="Fetching enrolled courses from demo data."
      />
    )
  }

  if (error) {
    return (
      <PageState
        state="error"
        title="Could not load courses"
        description={error.message}
      />
    )
  }

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Trainee workspace</span>
          <h1>My Courses</h1>
          <p>
            Continue enrolled courses, review progress, and discover more
            published courses to join.
          </p>
        </div>
      </section>

      <section className="my-courses-section">
        <div className="demo-row demo-row--between my-courses-section__heading">
          <div>
            <span className="demo-kicker">Registered learning</span>
            <h2>Enrolled courses</h2>
            <p>
              Courses you have already registered for. Continue learning from
              your latest progress.
            </p>
          </div>

          <span className="course-result-count">
            {enrolledCourses.length} enrolled
          </span>
        </div>

        {enrolledCourses.length > 0 && (
          <article className="demo-card continue-learning-card">
            <div>
              <span className="demo-kicker">Continue learning</span>
              <h2>{enrolledCourses[0].course.title}</h2>
              <p>{enrolledCourses[0].course.shortDescription}</p>
            </div>
            <ProgressBar
              value={getCourseProgress(enrolledCourses[0].course.id, traineeId)}
              label="Course progress"
            />
            <Link
              className="demo-primary-action"
              to={`/learning/${enrolledCourses[0].course.id}`}
            >
              Continue Learning <ArrowRight size={16} />
            </Link>
          </article>
        )}
      </section>

      <CourseCatalogSection
        id="available-courses"
        embedded
        eyebrow="Available courses"
        title="Explore more courses"
        description="Browse published courses that you have not enrolled in yet."
        excludeCourseIds={enrolledCourseIds}
      />
    </main>
  )
}
