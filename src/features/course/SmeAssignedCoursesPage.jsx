import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  Layers3,
} from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { DataState } from '@/shared/components/ui/DataState'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import { getAllLifecycleCourses } from '@/data/demo/courseLifecycleRuntime'
import { COURSE_STATUSES } from '@/data/demo/courseLifecycle'
import { getCurrentUser } from '@/services'
import { ROLES } from '@/shared/constants/roles'
import { CourseStatusBadge } from './CourseStatusBadge'

function getCounts(courses) {
  return {
    assigned: courses.length,
    editing: courses.filter(
      (course) => course.status === COURSE_STATUSES.CONTENT_EDITING,
    ).length,
    waiting: courses.filter(
      (course) => course.status === COURSE_STATUSES.SUBMITTED_FOR_REVIEW,
    ).length,
    revision: courses.filter(
      (course) => course.status === COURSE_STATUSES.REVISION_REQUIRED,
    ).length,
  }
}

function RevisionNoteCard({ note }) {
  if (!note) return null

  return (
    <div className="course-flow-revision-note">
      <AlertTriangle size={16} />
      <span>{note}</span>
    </div>
  )
}

function AssignedCourseCard({ course }) {
  return (
    <article className="demo-card assigned-course-card">
      <div className="demo-row demo-row--between">
        <span className="demo-kicker">{course.category}</span>
        <CourseStatusBadge status={course.status} />
      </div>

      <h2>{course.title}</h2>
      <p>{course.shortDescription}</p>

      <RevisionNoteCard
        note={
          course.status === COURSE_STATUSES.REVISION_REQUIRED
            ? course.revisionReason
            : ''
        }
      />

      <dl className="course-flow-mini-grid">
        <div>
          <dt>Assigned by TMO</dt>
          <dd>{course.createdByTmoName}</dd>
        </div>

        <div>
          <dt>Modules</dt>
          <dd>{course.moduleCount || course.modules || 0}</dd>
        </div>

        <div>
          <dt>Lessons</dt>
          <dd>{course.lessonCount || course.lessons || 0}</dd>
        </div>

        <div>
          <dt>Last updated</dt>
          <dd>{course.updatedAt}</dd>
        </div>
      </dl>

      <Link
        className="demo-primary-action"
        to={`/sme/courses/${course.id}/edit`}
      >
        Edit Content
      </Link>
    </article>
  )
}

export function SmeAssignedCoursesPage() {
  const currentUser = getCurrentUser()
  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
    category: 'all',
    sort: 'updated-desc',
  })

  const allCourses = useMemo(() => getAllLifecycleCourses(), [])

  const baseAssignedCourses = useMemo(() => {
    const smeId = currentUser?.role === ROLES.ADMIN ? null : currentUser?.id

    return allCourses.filter((course) => {
      const assignedToCurrentSme = !smeId || course.assignedSmeId === smeId

      const operationalStatus =
        course.status !== COURSE_STATUSES.PUBLISHED &&
        course.status !== COURSE_STATUSES.UNPUBLISHED

      return assignedToCurrentSme && operationalStatus
    })
  }, [allCourses, currentUser])

  const categories = useMemo(() => {
    return ['all', ...new Set(baseAssignedCourses.map((course) => course.category).filter(Boolean))]
  }, [baseAssignedCourses])

  const assignedCourses = useMemo(() => {
    const normalizedKeyword = filters.keyword.trim().toLowerCase()

    return baseAssignedCourses
      .filter((course) => {
      const matchesKeyword = [course.title, course.category, course.status]
        .join(' ')
        .toLowerCase()
        .includes(normalizedKeyword)

      const matchesStatus =
        filters.status === 'all' || course.status === filters.status
      const matchesCategory =
        filters.category === 'all' || course.category === filters.category

      return matchesKeyword && matchesStatus && matchesCategory
    })
      .sort((a, b) => {
        if (filters.sort === 'updated-asc') {
          return new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0)
        }
        if (filters.sort === 'title') return a.title.localeCompare(b.title)
        if (filters.sort === 'status') return a.status.localeCompare(b.status)
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
      })
  }, [baseAssignedCourses, filters])

  const counts = getCounts(baseAssignedCourses)

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      status: 'all',
      category: 'all',
      sort: 'updated-desc',
    })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.status !== 'all' ||
    filters.category !== 'all' ||
    filters.sort !== 'updated-desc'

  return (
    <section>
      <PageHeader
        title="Assigned Courses"
        description="Edit course content, lessons, questions, flashcards, and tests assigned to you."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Assigned Courses"
          value={counts.assigned}
          icon={BookOpen}
        />

        <KpiCard
          title="In Editing"
          value={counts.editing}
          icon={Layers3}
        />

        <KpiCard
          title="Waiting for TMO Review"
          value={counts.waiting}
          icon={ClipboardCheck}
        />

        <KpiCard
          title="Revision Required"
          value={counts.revision}
          icon={AlertTriangle}
        />
      </div>

      <FilterToolbar>
        <SearchBox
          value={filters.keyword}
          placeholder="Search assigned courses"
          ariaLabel="Search assigned courses"
          onChange={(value) => updateFilter('keyword', value)}
        />

        <SelectFilter
          value={filters.status}
          onChange={(value) => updateFilter('status', value)}
          ariaLabel="Filter assigned courses by status"
          options={[
            { value: 'all', label: 'All status' },
            { value: COURSE_STATUSES.ASSIGNED_TO_SME, label: 'Assigned to SME' },
            { value: COURSE_STATUSES.CONTENT_EDITING, label: 'Content Editing' },
            { value: COURSE_STATUSES.SUBMITTED_FOR_REVIEW, label: 'Submitted for Review' },
            { value: COURSE_STATUSES.REVISION_REQUIRED, label: 'Revision Required' },
            { value: COURSE_STATUSES.VERIFIED, label: 'Verified' },
          ]}
        />

        <SelectFilter
          value={filters.category}
          onChange={(value) => updateFilter('category', value)}
          ariaLabel="Filter assigned courses by category"
          options={categories.map((category) => ({
            value: category,
            label: category === 'all' ? 'All categories' : category,
          }))}
        />

        <SelectFilter
          value={filters.sort}
          onChange={(value) => updateFilter('sort', value)}
          ariaLabel="Sort assigned courses"
          options={[
            { value: 'updated-desc', label: 'Last updated' },
            { value: 'updated-asc', label: 'Oldest updated' },
            { value: 'title', label: 'Name A-Z' },
            { value: 'status', label: 'Status A-Z' },
          ]}
        />

        <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
      </FilterToolbar>

      {assignedCourses.length === 0 ? (
        <DataState
          type="empty"
          title="No assigned courses"
          description="Courses assigned by TMO will appear here, or adjust the current filters."
          action={
            <button type="button" className="demo-primary-action" onClick={resetFilters}>
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="assigned-course-grid">
          {assignedCourses.map((course) => (
            <AssignedCourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </section>
  )
}
