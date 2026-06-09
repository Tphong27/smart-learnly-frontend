import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, BookOpen, ClipboardCheck, Eye, Send, UploadCloud } from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { DataState } from '@/shared/components/ui/DataState'
import { Modal } from '@/shared/components/ui/Modal/Modal'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
  StatusTabs,
} from '@/shared/components/ui/ListControls'
import {
  assignCourseToSme,
  getAllLifecycleCourses,
  getSmeOptions,
  publishCourse,
  unpublishCourse,
} from '@/data/demo/courseLifecycleRuntime'
import { COURSE_STATUSES } from '@/data/demo/courseLifecycle'
import { CourseStatusBadge } from './CourseStatusBadge'

function formatPrice(course) {
  if (!course?.price) return 'Free'
  return `${new Intl.NumberFormat('vi-VN').format(course.price)} ${course.currency || 'VND'}`
}

function getCourseCounts(courses) {
  return {
    total: courses.length,
    draft: courses.filter((course) => course.status === COURSE_STATUSES.DRAFT).length,
    review: courses.filter((course) => course.status === COURSE_STATUSES.SUBMITTED_FOR_REVIEW).length,
    published: courses.filter((course) => course.status === COURSE_STATUSES.PUBLISHED).length,
  }
}

function AssignSmeModal({ course, open, onClose, onAssigned }) {
  const smeOptions = getSmeOptions()
  const [selectedSmeId, setSelectedSmeId] = useState(course?.assignedSmeId || smeOptions[0]?.id || '')

  const handleAssign = () => {
    if (!course || !selectedSmeId) return
    assignCourseToSme(course.id, selectedSmeId)
    onAssigned?.()
    onClose?.()
  }

  return (
    <Modal
      open={open}
      title="Assign SME"
      description={course ? `Choose the SME responsible for ${course.title}.` : ''}
      footer={
        <div className="course-flow-modal-actions">
          <button type="button" className="demo-secondary-action" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="demo-primary-action" onClick={handleAssign}>
            Assign SME
          </button>
        </div>
      }
      onClose={onClose}
    >
      <label className="course-flow-field">
        <span>Assigned SME</span>
        <select
          value={selectedSmeId}
          onChange={(event) => setSelectedSmeId(event.target.value)}
        >
          {smeOptions.map((sme) => (
            <option key={sme.id} value={sme.id}>
              {sme.displayName} - {sme.email}
            </option>
          ))}
        </select>
      </label>
    </Modal>
  )
}

function CourseTable({ courses, onAssign, onPublish, onUnpublish }) {
  if (courses.length === 0) {
    return (
      <DataState
        type="empty"
        title="No courses found"
        description="Try changing the search text, status, category, or SME filter."
      />
    )
  }

  return (
    <div className="course-flow-table-wrap">
      <table className="course-flow-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Assigned SME</th>
            <th>Level</th>
            <th>Price</th>
            <th>Modules</th>
            <th>Lessons</th>
            <th>Status</th>
            <th>Last Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id}>
              <td>
                <div className="course-flow-course-cell">
                  <img src={course.thumbnail} alt="" />
                  <span>
                    <strong>{course.title}</strong>
                    <small>{course.category}</small>
                  </span>
                </div>
              </td>
              <td>{course.assignedSmeName || 'Unassigned'}</td>
              <td>{course.level}</td>
              <td>{formatPrice(course)}</td>
              <td>{course.moduleCount || course.modules || 0}</td>
              <td>{course.lessonCount || course.lessons || 0}</td>
              <td><CourseStatusBadge status={course.status} /></td>
              <td>{course.updatedAt}</td>
              <td>
                <div className="course-flow-row-actions">
                  <Link to={`/tmo/courses/${course.id}`} title="View detail">
                    <Eye size={15} />
                    View
                  </Link>
                  <button type="button" onClick={() => onAssign(course)}>
                    <Send size={15} />
                    Assign
                  </button>
                  {course.status === COURSE_STATUSES.SUBMITTED_FOR_REVIEW && (
                    <Link to={`/tmo/courses/${course.id}/review`}>
                      <ClipboardCheck size={15} />
                      Review
                    </Link>
                  )}
                  {course.status === COURSE_STATUSES.VERIFIED && (
                    <button type="button" onClick={() => onPublish(course.id)}>
                      <UploadCloud size={15} />
                      Publish
                    </button>
                  )}
                  {course.status === COURSE_STATUSES.PUBLISHED && (
                    <button type="button" onClick={() => onUnpublish(course.id)}>
                      Unpublish
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TmoCourseManagementPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') || 'All statuses'
  const [courses, setCourses] = useState(() => getAllLifecycleCourses())
  const [filters, setFilters] = useState({
    keyword: '',
    status: initialStatus,
    category: 'All categories',
    sme: 'All SMEs',
    sort: 'updated-desc',
  })
  const [assignCourse, setAssignCourse] = useState(null)

  const refreshCourses = () => setCourses(getAllLifecycleCourses())

  const categories = useMemo(() => {
    return ['All categories', ...new Set(courses.map((course) => course.category).filter(Boolean))]
  }, [courses])

  const smeOptions = useMemo(() => {
    return ['All SMEs', ...new Set(courses.map((course) => course.assignedSmeName || 'Unassigned'))]
  }, [courses])

  const visibleCourses = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return courses
      .filter((course) => {
      const matchesKeyword = [course.title, course.category, course.assignedSmeName]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
      const matchesStatus = filters.status === 'All statuses' || course.status === filters.status
      const matchesCategory = filters.category === 'All categories' || course.category === filters.category
      const matchesSme = filters.sme === 'All SMEs' || (course.assignedSmeName || 'Unassigned') === filters.sme

      return matchesKeyword && matchesStatus && matchesCategory && matchesSme
    })
      .sort((a, b) => {
        if (filters.sort === 'updated-asc') {
          return new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0)
        }
        if (filters.sort === 'title') return a.title.localeCompare(b.title)
        if (filters.sort === 'price-high') return Number(b.price || 0) - Number(a.price || 0)
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
      })
  }, [courses, filters])

  const counts = getCourseCounts(courses)
  const statusTabs = useMemo(
    () => [
      { key: 'All statuses', label: 'All', count: courses.length },
      ...Object.values(COURSE_STATUSES).map((status) => ({
        key: status,
        label: status,
        count: courses.filter((course) => course.status === status).length,
      })),
    ],
    [courses],
  )

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      status: 'All statuses',
      category: 'All categories',
      sme: 'All SMEs',
      sort: 'updated-desc',
    })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.status !== 'All statuses' ||
    filters.category !== 'All categories' ||
    filters.sme !== 'All SMEs' ||
    filters.sort !== 'updated-desc'

  const handlePublish = (courseId) => {
    publishCourse(courseId)
    refreshCourses()
  }

  const handleUnpublish = (courseId) => {
    unpublishCourse(courseId)
    refreshCourses()
  }

  return (
    <section>
      <PageHeader
        title="Course Management"
        description="Create, assign, review, and publish courses for the SLP platform."
        action={
          <button
            type="button"
            className="dev2-primary-button"
            onClick={() => navigate('/tmo/courses/create')}
          >
            <BookOpen size={16} />
            Create Course
          </button>
        }
      />

      {location.state?.successMessage ? (
        <div className="demo-inline-alert">
          {location.state.successMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Courses" value={counts.total} icon={BookOpen} />
        <KpiCard title="Draft Courses" value={counts.draft} icon={BookOpen} />
        <KpiCard title="Waiting for Review" value={counts.review} icon={ClipboardCheck} />
        <KpiCard title="Published Courses" value={counts.published} icon={UploadCloud} />
      </div>

      <StatusTabs
        tabs={statusTabs}
        activeKey={filters.status}
        onChange={(status) => updateFilter('status', status)}
        ariaLabel="Course lifecycle status"
      />

      <FilterToolbar>
        <SearchBox
          value={filters.keyword}
          placeholder="Search course title, category, SME"
          ariaLabel="Search managed courses"
          onChange={(value) => updateFilter('keyword', value)}
        />

        <SelectFilter
          value={filters.category}
          onChange={(value) => updateFilter('category', value)}
          ariaLabel="Filter courses by category"
          options={categories}
        />

        <SelectFilter
          value={filters.sme}
          onChange={(value) => updateFilter('sme', value)}
          ariaLabel="Filter courses by SME"
          options={smeOptions}
        />

        <SelectFilter
          value={filters.sort}
          onChange={(value) => updateFilter('sort', value)}
          ariaLabel="Sort managed courses"
          options={[
            { value: 'updated-desc', label: 'Last updated' },
            { value: 'updated-asc', label: 'Oldest updated' },
            { value: 'title', label: 'Name A-Z' },
            { value: 'price-high', label: 'Price high to low' },
          ]}
        />

        <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
      </FilterToolbar>

      <CourseTable
        courses={visibleCourses}
        onAssign={setAssignCourse}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
      />

      <AssignSmeModal
        course={assignCourse}
        open={Boolean(assignCourse)}
        onClose={() => setAssignCourse(null)}
        onAssigned={refreshCourses}
      />

      <div className="course-flow-note-card">
        <strong>Lifecycle demo path</strong>
        <span>
          TMO creates and assigns the course, SME edits and submits, TMO verifies and publishes, then trainees see it in the catalog.
        </span>
        <ArrowRight size={16} />
      </div>
    </section>
  )
}
