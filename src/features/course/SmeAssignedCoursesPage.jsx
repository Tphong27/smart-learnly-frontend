import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BookOpen, ClipboardCheck, Layers3, Search } from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { DataState } from '@/shared/components/ui/DataState'
import { getAllLifecycleCourses } from '@/data/demo/courseLifecycleRuntime'
import { COURSE_STATUSES } from '@/data/demo/courseLifecycle'
import { getCurrentUser } from '@/services'
import { ROLES } from '@/shared/constants/roles'
import { CourseStatusBadge } from './CourseStatusBadge'

function getCounts(courses) {
  return {
    assigned: courses.length,
    editing: courses.filter((course) => course.status === COURSE_STATUSES.CONTENT_EDITING).length,
    waiting: courses.filter((course) => course.status === COURSE_STATUSES.SUBMITTED_FOR_REVIEW).length,
    revision: courses.filter((course) => course.status === COURSE_STATUSES.REVISION_REQUIRED).length,
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
      <RevisionNoteCard note={course.status === COURSE_STATUSES.REVISION_REQUIRED ? course.revisionReason : ''} />
      <dl className="course-flow-mini-grid">
        <div><dt>Assigned by TMO</dt><dd>{course.createdByTmoName}</dd></div>
        <div><dt>Modules</dt><dd>{course.moduleCount || course.modules || 0}</dd></div>
        <div><dt>Lessons</dt><dd>{course.lessonCount || course.lessons || 0}</dd></div>
        <div><dt>Last updated</dt><dd>{course.updatedAt}</dd></div>
      </dl>
      <Link className="demo-primary-action" to={`/sme/courses/${course.id}/edit`}>
        Edit Content
      </Link>
    </article>
  )
}

export function SmeAssignedCoursesPage() {
  const currentUser = getCurrentUser()
  const [keyword, setKeyword] = useState('')
  const allCourses = getAllLifecycleCourses()

  const assignedCourses = useMemo(() => {
    const smeId = currentUser?.role === ROLES.ADMIN ? null : currentUser?.id

    return allCourses.filter((course) => {
      const assignedToCurrentSme = !smeId || course.assignedSmeId === smeId
      const operationalStatus = course.status !== COURSE_STATUSES.PUBLISHED && course.status !== COURSE_STATUSES.UNPUBLISHED
      const matchesKeyword = [course.title, course.category, course.status]
        .join(' ')
        .toLowerCase()
        .includes(keyword.trim().toLowerCase())

      return assignedToCurrentSme && operationalStatus && matchesKeyword
    })
  }, [allCourses, currentUser, keyword])

  const counts = getCounts(assignedCourses)

  return (
    <section>
      <PageHeader
        title="Assigned Courses"
        description="Edit course content, lessons, questions, flashcards, and tests assigned to you."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Assigned Courses" value={counts.assigned} icon={BookOpen} />
        <KpiCard title="In Editing" value={counts.editing} icon={Layers3} />
        <KpiCard title="Waiting for TMO Review" value={counts.waiting} icon={ClipboardCheck} />
        <KpiCard title="Revision Required" value={counts.revision} icon={AlertTriangle} />
      </div>

      <div className="course-flow-filter-card course-flow-filter-card--single">
        <label className="course-flow-search">
          <Search size={17} />
          <input
            value={keyword}
            placeholder="Search assigned courses"
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
      </div>

      {assignedCourses.length === 0 ? (
        <DataState
          type="empty"
          title="No assigned courses"
          description="Courses assigned by TMO will appear here."
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

