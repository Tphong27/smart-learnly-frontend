import { ArrowRight, BookOpen, Clock3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CourseCatalogSection } from '@/features/course/CourseCatalogSection'
import { getCourseProgress, getEnrollmentsByUser } from '@/data/demo/demoRuntime'
import { getLifecycleCourseById } from '@/data/demo/courseLifecycleRuntime'
import { getCurrentUser } from '@/services'
import { PageState } from '@/shared/components/PageState'
import { ProgressBar } from '@/shared/components/ProgressBar'
import { StatusBadge } from '@/shared/components/StatusBadge'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

function getProgressStatus(progress) {
  if (progress >= 100) return 'completed'
  if (progress > 0) return 'in-progress'
  return 'not-started'
}

export function MyCoursesPage() {
  useDocumentTitle('My courses')

  const { loading, error } = useDemoPageState()
  const [filters, setFilters] = useState({
    keyword: '',
    progress: 'all',
    sort: 'last-accessed',
  })

  const currentUser = getCurrentUser()
  const traineeId = currentUser?.id || 'trainee-minh'
  const enrollments = getEnrollmentsByUser(traineeId)

  const enrolledCourses = useMemo(() => {
    return enrollments
      .map((enrollment) => {
        const course = getLifecycleCourseById(enrollment.courseId)
        const progress = course
          ? Math.max(enrollment.progress, getCourseProgress(course.id, traineeId))
          : 0

        return {
          enrollment,
          course,
          progress,
          progressStatus: getProgressStatus(progress),
          lastAccessedAt: enrollment.lastActivityAt || enrollment.enrolledAt || '',
        }
      })
      .filter((item) => item.course)
      .sort((a, b) => new Date(b.lastAccessedAt || 0) - new Date(a.lastAccessedAt || 0))
  }, [enrollments, traineeId])

  const visibleEnrolledCourses = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return enrolledCourses
      .filter(({ course, progressStatus }) => {
        const matchesKeyword = [
          course.title,
          course.category,
          course.level,
          course.shortDescription,
        ]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
        const matchesProgress =
          filters.progress === 'all' || progressStatus === filters.progress

        return matchesKeyword && matchesProgress
      })
      .sort((a, b) => {
        if (filters.sort === 'progress-high') return b.progress - a.progress
        if (filters.sort === 'progress-low') return a.progress - b.progress
        if (filters.sort === 'title') return a.course.title.localeCompare(b.course.title)
        return new Date(b.lastAccessedAt || 0) - new Date(a.lastAccessedAt || 0)
      })
  }, [enrolledCourses, filters])

  const enrolledCourseIds = enrolledCourses.map(({ course }) => course.id)
  const continueItem = enrolledCourses[0]

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      progress: 'all',
      sort: 'last-accessed',
    })
  }

  const hasActiveFilters =
    filters.keyword || filters.progress !== 'all' || filters.sort !== 'last-accessed'

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

        {continueItem && (
          <article className="demo-card continue-learning-card">
            <div>
              <span className="demo-kicker">Continue learning</span>
              <h2>{continueItem.course.title}</h2>
              <p>{continueItem.course.shortDescription}</p>
            </div>
            <ProgressBar
              value={continueItem.progress}
              label="Course progress"
            />
            <Link
              className="demo-primary-action"
              to={`/learning/${continueItem.course.id}`}
            >
              Continue Learning <ArrowRight size={16} />
            </Link>
          </article>
        )}

        {enrolledCourses.length === 0 ? (
          <PageState
            state="empty"
            title="No enrolled courses"
            description="Enroll in a published course to start learning."
            action={
              <a className="demo-primary-action" href="#available-courses">
                Explore available courses <ArrowRight size={16} />
              </a>
            }
          />
        ) : visibleEnrolledCourses.length === 0 ? (
          <>
            <FilterToolbar>
              <SearchBox
                value={filters.keyword}
                placeholder="Search enrolled courses"
                ariaLabel="Search enrolled courses"
                onChange={(value) => updateFilter('keyword', value)}
              />
              <SelectFilter
                value={filters.progress}
                onChange={(value) => updateFilter('progress', value)}
                ariaLabel="Filter courses by progress"
                options={[
                  { value: 'all', label: 'All progress' },
                  { value: 'not-started', label: 'Not Started' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
              <SelectFilter
                value={filters.sort}
                onChange={(value) => updateFilter('sort', value)}
                ariaLabel="Sort enrolled courses"
                options={[
                  { value: 'last-accessed', label: 'Last accessed' },
                  { value: 'progress-high', label: 'Progress high to low' },
                  { value: 'progress-low', label: 'Progress low to high' },
                  { value: 'title', label: 'Name A-Z' },
                ]}
              />
              <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
            </FilterToolbar>

            <PageState
              state="empty"
              title="No enrolled courses match"
              description="Try a different keyword or progress filter."
              action={
                <button type="button" className="demo-primary-action" onClick={resetFilters}>
                  Clear filters
                </button>
              }
            />
          </>
        ) : (
          <>
            <FilterToolbar>
              <SearchBox
                value={filters.keyword}
                placeholder="Search enrolled courses"
                ariaLabel="Search enrolled courses"
                onChange={(value) => updateFilter('keyword', value)}
              />
              <SelectFilter
                value={filters.progress}
                onChange={(value) => updateFilter('progress', value)}
                ariaLabel="Filter courses by progress"
                options={[
                  { value: 'all', label: 'All progress' },
                  { value: 'not-started', label: 'Not Started' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
              <SelectFilter
                value={filters.sort}
                onChange={(value) => updateFilter('sort', value)}
                ariaLabel="Sort enrolled courses"
                options={[
                  { value: 'last-accessed', label: 'Last accessed' },
                  { value: 'progress-high', label: 'Progress high to low' },
                  { value: 'progress-low', label: 'Progress low to high' },
                  { value: 'title', label: 'Name A-Z' },
                ]}
              />
              <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
            </FilterToolbar>

            <section className="demo-card-grid">
              {visibleEnrolledCourses.map(({ course, enrollment, progress }) => {

              return (
                <article className="demo-card my-course-card" key={enrollment.id}>
                  <div className="demo-row demo-row--between">
                    <StatusBadge status={enrollment.status} />
                    <small>{enrollment.enrolledAt}</small>
                  </div>

                  <h2>{course.title}</h2>
                  <p>{course.shortDescription}</p>

                  <div className="demo-meta-grid">
                    <span>
                    <BookOpen size={15} /> {course.lessonCount || course.lessons || 0} lessons
                    </span>
                    <span>
                      <Clock3 size={15} /> {course.duration}
                    </span>
                  </div>

                  <ProgressBar
                    value={progress}
                    label={`${course.title} progress`}
                  />

                  <Link
                    className="demo-primary-action"
                    to={`/learning/${course.id}`}
                  >
                    Continue learning <ArrowRight size={16} />
                  </Link>
                </article>
              )
            })}
            </section>
          </>
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
