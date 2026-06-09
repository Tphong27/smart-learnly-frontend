import { CalendarDays, ExternalLink, GraduationCap, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  enrollTraineeClass,
  getTraineeClasses,
} from '@/data/demo/demoTraineeRuntime'
import { useMemo, useState } from 'react'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

function formatDate(value) {
  if (!value) return 'Not scheduled'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function ClassCard({ classItem, enrolled, onEnroll }) {
  const className =
    classItem.displayName || classItem.className || classItem.name || 'Class'
  const traineeCount =
    classItem.traineeCount ??
    (Array.isArray(classItem.traineeIds) ? classItem.traineeIds.length : 0)
  const capacity = classItem.maxTrainees || classItem.trainees

  return (
    <article className="demo-card">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">
            {enrolled ? 'Registered class' : 'Available class'}
          </span>
          <h2>
            {className} - {classItem.courseTitle}
          </h2>
        </div>

        <StatusBadge status={classItem.status} />
      </div>

      <p className="demo-muted">
        Trainer: {classItem.trainerName} · {traineeCount}
        {capacity ? `/${capacity}` : ''} trainees
      </p>

      <div className="demo-meta-grid demo-meta-grid--wide">
        <span>
          <CalendarDays size={15} />
          {formatDate(classItem.startDate)} - {formatDate(classItem.endDate)}
        </span>
        <span>
          <Users size={15} />
          {classItem.schedule || 'Schedule not configured'}
        </span>
        <span>
          <GraduationCap size={15} />
          {classItem.courseTitle}
        </span>
      </div>

      {enrolled && (
        <>
          <section className="demo-card">
            <span className="demo-kicker">Class learning access</span>
            <h3>Meet link</h3>

            {classItem.meetLink ? (
              <a
                className="demo-primary-action"
                href={classItem.meetLink}
                target="_blank"
                rel="noreferrer"
              >
                Join class meet <ExternalLink size={16} />
              </a>
            ) : (
              <p className="demo-muted">Meet link is not available yet.</p>
            )}
          </section>

          <section>
            <span className="demo-kicker">Assignments</span>
            {(classItem.assignments || []).length === 0 ? (
              <p className="demo-muted">No assignments have been assigned yet.</p>
            ) : (
              <div className="demo-list">
                {classItem.assignments.map((assignment) => (
                  <article className="demo-list-item" key={assignment.id}>
                    <div>
                      <strong>{assignment.title}</strong>
                      <small>Due date: {formatDate(assignment.dueDate)}</small>
                    </div>
                    <StatusBadge status={assignment.status} />
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="demo-actions">
            <Link
              className="demo-primary-action"
              to={`/my-classes/${classItem.id}/workspace`}
            >
              Go to Class Workspace
            </Link>
            <Link
              className="demo-secondary-action"
              to={`/courses/${classItem.courseId}`}
            >
              View course
            </Link>
            <Link
              className="demo-secondary-action"
              to={`/learning/${classItem.courseId}`}
            >
              Open learning workspace
            </Link>
          </div>
        </>
      )}

      {!enrolled && (
        <button
          type="button"
          className="demo-primary-action"
          onClick={() => onEnroll(classItem.id)}
        >
          Enroll class
        </button>
      )}
    </article>
  )
}

function filterAndSortClasses(classes, filters) {
  const keyword = filters.keyword.trim().toLowerCase()

  return classes
    .filter((classItem) => {
      const matchesKeyword = [
        classItem.className,
        classItem.displayName,
        classItem.name,
        classItem.courseTitle,
        classItem.trainerName,
        classItem.schedule,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
      const matchesStatus =
        filters.status === 'all' || classItem.status === filters.status
      const matchesCourse =
        filters.course === 'all' || classItem.courseTitle === filters.course

      return matchesKeyword && matchesStatus && matchesCourse
    })
    .sort((a, b) => {
      if (filters.sort === 'progress') {
        return Number(b.averageProgress || 0) - Number(a.averageProgress || 0)
      }
      if (filters.sort === 'name') {
        return (a.className || a.displayName || a.name || '').localeCompare(
          b.className || b.displayName || b.name || '',
        )
      }
      return new Date(a.startDate || 0) - new Date(b.startDate || 0)
    })
}

export function TraineeMyClassesPage() {
  useDocumentTitle('My Classes')

  const [version, setVersion] = useState(0)
  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
    course: 'all',
    sort: 'schedule',
  })
  const classRuntime = useMemo(
    () => ({
      ...getTraineeClasses(),
      runtimeVersion: version,
    }),
    [version],
  )
  const { enrolledClasses, availableClasses } = classRuntime
  const allClasses = useMemo(
    () => [...enrolledClasses, ...availableClasses],
    [availableClasses, enrolledClasses],
  )

  const courseOptions = useMemo(() => {
    return ['all', ...new Set(allClasses.map((item) => item.courseTitle).filter(Boolean))]
  }, [allClasses])

  const statusOptions = useMemo(() => {
    return ['all', ...new Set(allClasses.map((item) => item.status).filter(Boolean))]
  }, [allClasses])

  const filteredEnrolledClasses = useMemo(() => {
    return filterAndSortClasses(enrolledClasses, filters)
  }, [enrolledClasses, filters])

  const filteredAvailableClasses = useMemo(() => {
    return filterAndSortClasses(availableClasses, filters)
  }, [availableClasses, filters])

  const handleEnroll = (classId) => {
    enrollTraineeClass(classId)
    setVersion((current) => current + 1)
  }

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      status: 'all',
      course: 'all',
      sort: 'schedule',
    })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.status !== 'all' ||
    filters.course !== 'all' ||
    filters.sort !== 'schedule'

  return (
    <main className="demo-page" data-version={version}>
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Trainee class workspace</span>
          <h1>My Classes</h1>
          <p>
            View registered classes, class schedule, meet link, assignments, and
            other active classes available for enrollment.
          </p>
        </div>
      </section>

      <FilterToolbar>
        <SearchBox
          value={filters.keyword}
          placeholder="Search class, course, trainer"
          ariaLabel="Search my classes"
          onChange={(value) => updateFilter('keyword', value)}
        />

        <SelectFilter
          value={filters.status}
          onChange={(value) => updateFilter('status', value)}
          ariaLabel="Filter classes by status"
          options={statusOptions.map((status) => ({
            value: status,
            label: status === 'all' ? 'All status' : status,
          }))}
        />

        <SelectFilter
          value={filters.course}
          onChange={(value) => updateFilter('course', value)}
          ariaLabel="Filter classes by course"
          options={courseOptions.map((course) => ({
            value: course,
            label: course === 'all' ? 'All courses' : course,
          }))}
        />

        <SelectFilter
          value={filters.sort}
          onChange={(value) => updateFilter('sort', value)}
          ariaLabel="Sort classes"
          options={[
            { value: 'schedule', label: 'Schedule' },
            { value: 'progress', label: 'Progress high to low' },
            { value: 'name', label: 'Name A-Z' },
          ]}
        />

        <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
      </FilterToolbar>

      <section className="my-courses-section">
        <div className="demo-row demo-row--between my-courses-section__heading">
          <div>
            <span className="demo-kicker">Registered classes</span>
            <h2>Classes you joined</h2>
          </div>

          <span className="course-result-count">
            {filteredEnrolledClasses.length} enrolled
          </span>
        </div>

        {enrolledClasses.length === 0 ? (
          <PageState
            state="empty"
            title="No registered classes"
            description="Enroll in an available class to see schedule, meet link, and assignments."
          />
        ) : filteredEnrolledClasses.length === 0 ? (
          <PageState
            state="empty"
            title="No registered classes match"
            description="Adjust or clear filters to see your joined classes."
            action={
              <button type="button" className="demo-primary-action" onClick={resetFilters}>
                Clear filters
              </button>
            }
          />
        ) : (
          <section className="demo-card-grid">
            {filteredEnrolledClasses.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                enrolled
                onEnroll={handleEnroll}
              />
            ))}
          </section>
        )}
      </section>

      <section className="my-courses-section">
        <div className="demo-row demo-row--between my-courses-section__heading">
          <div>
            <span className="demo-kicker">Available classes</span>
            <h2>Other active classes</h2>
          </div>

          <span className="course-result-count">
            {filteredAvailableClasses.length} available
          </span>
        </div>

        {filteredAvailableClasses.length === 0 ? (
          <PageState
            state="empty"
            title="No available classes match"
            description="Try clearing filters or checking back when TMO creates more classes."
            action={
              hasActiveFilters ? (
                <button type="button" className="demo-primary-action" onClick={resetFilters}>
                  Clear filters
                </button>
              ) : null
            }
          />
        ) : (
          <section className="demo-card-grid">
            {filteredAvailableClasses.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                enrolled={false}
                onEnroll={handleEnroll}
              />
            ))}
          </section>
        )}
      </section>
    </main>
  )
}
