import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, Send, UploadCloud } from 'lucide-react'
import { DataState } from '@/shared/components/ui/DataState'
import { Modal } from '@/shared/components/ui/Modal/Modal'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import {
  assignCourseToSme,
  getCourseReviewHistory,
  getLifecycleCourseById,
  getLifecycleModules,
  getSmeOptions,
  publishCourse,
  unpublishCourse,
  updateCourseStatus,
} from '@/data/demo/courseLifecycleRuntime'
import {
  COURSE_STATUSES,
  COURSE_STATUS_SEQUENCE,
} from '@/data/demo/courseLifecycle'
import { CourseStatusBadge } from './CourseStatusBadge'

function formatPrice(course) {
  if (!course?.price) return 'Free'
  return `${new Intl.NumberFormat('vi-VN').format(course.price)} ${course.currency || 'VND'}`
}

function CourseInfoCard({ course }) {
  return (
    <section className="course-flow-info-card">
      <img src={course.thumbnail} alt="" />
      <div>
        <CourseStatusBadge status={course.status} />
        <h2>{course.title}</h2>
        <p>{course.fullDescription || course.shortDescription}</p>
        <dl className="course-flow-info-grid">
          <div><dt>Category</dt><dd>{course.category}</dd></div>
          <div><dt>Level</dt><dd>{course.level}</dd></div>
          <div><dt>Price</dt><dd>{formatPrice(course)}</dd></div>
          <div><dt>Assigned SME</dt><dd>{course.assignedSmeName || 'Unassigned'}</dd></div>
          <div><dt>Created</dt><dd>{course.createdAt}</dd></div>
          <div><dt>Last updated</dt><dd>{course.updatedAt}</dd></div>
        </dl>
      </div>
    </section>
  )
}

function CourseStatusTimeline({ status }) {
  const timelineStatus =
    status === COURSE_STATUSES.REVISION_REQUIRED
      ? COURSE_STATUSES.SUBMITTED_FOR_REVIEW
      : status === COURSE_STATUSES.UNPUBLISHED
        ? COURSE_STATUSES.PUBLISHED
        : status
  const currentIndex = COURSE_STATUS_SEQUENCE.indexOf(timelineStatus)

  return (
    <section className="demo-card">
      <h2>Status Timeline</h2>
      <div className="course-flow-timeline">
        {COURSE_STATUS_SEQUENCE.map((item, index) => {
          const active = index <= currentIndex
          return (
            <div key={item} className={active ? 'is-active' : ''}>
              <span>{index + 1}</span>
              <strong>{item}</strong>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function AssignedSmeCard({ course, onAssign }) {
  return (
    <section className="demo-card course-flow-side-card">
      <span className="demo-kicker">Assigned SME</span>
      <h2>{course.assignedSmeName || 'Unassigned'}</h2>
      <p>SME edits modules, lessons, materials, questions, flashcards, and tests before submitting to TMO.</p>
      <button type="button" className="demo-secondary-action" onClick={onAssign}>
        <Send size={16} />
        Assign SME
      </button>
    </section>
  )
}

function CurriculumPreview({ modules }) {
  return (
    <section className="demo-card">
      <h2>Course Curriculum Preview</h2>
      {modules.length === 0 ? (
        <DataState type="empty" title="No modules yet" description="SME will add modules and lessons in the content workspace." />
      ) : (
        <div className="course-flow-curriculum">
          {modules.map((module) => (
            <article key={module.id}>
              <div className="demo-row demo-row--between">
                <strong>{module.title}</strong>
                <CourseStatusBadge status={module.status} />
              </div>
              <div>
                {module.lessons.map((lesson) => (
                  <span key={lesson.id}>
                    {lesson.title}
                    <small>{lesson.type} | {lesson.durationMinutes || lesson.duration} min | {lesson.status}</small>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function ReviewHistoryCard({ history }) {
  return (
    <section className="demo-card">
      <h2>Review History</h2>
      <div className="course-flow-history">
        {history.map((item) => (
          <article key={item.id}>
            <strong>{item.action.replaceAll('_', ' ')}</strong>
            <span>{item.comment}</span>
            <small>{item.reviewerName} | {new Date(item.createdAt).toLocaleString('vi-VN')}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

function AssignSmeModal({ course, open, onClose, onAssigned }) {
  const smeOptions = getSmeOptions()
  const [selectedSmeId, setSelectedSmeId] = useState(course?.assignedSmeId || smeOptions[0]?.id || '')

  const handleAssign = () => {
    assignCourseToSme(course.id, selectedSmeId)
    onAssigned?.()
    onClose?.()
  }

  return (
    <Modal
      open={open}
      title="Assign SME"
      description="Choose the SME who owns content editing for this course."
      footer={
        <div className="course-flow-modal-actions">
          <button type="button" className="demo-secondary-action" onClick={onClose}>Cancel</button>
          <button type="button" className="demo-primary-action" onClick={handleAssign}>Assign SME</button>
        </div>
      }
      onClose={onClose}
    >
      <label className="course-flow-field">
        <span>SME</span>
        <select value={selectedSmeId} onChange={(event) => setSelectedSmeId(event.target.value)}>
          {smeOptions.map((sme) => <option key={sme.id} value={sme.id}>{sme.displayName}</option>)}
        </select>
      </label>
    </Modal>
  )
}

export function TmoCourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(() => getLifecycleCourseById(courseId))
  const [assignOpen, setAssignOpen] = useState(false)

  if (!course) {
    return (
      <section>
        <PageHeader title="Course Detail" description="No matching course was found." />
        <DataState type="empty" title="Course not found" description="Open a course from TMO Course Management." />
      </section>
    )
  }

  const modules = getLifecycleModules(course.id)
  const history = getCourseReviewHistory(course.id)

  const refresh = () => setCourse(getLifecycleCourseById(courseId))

  const handleRequestUpdate = () => {
    const nextCourse = updateCourseStatus(course.id, COURSE_STATUSES.CONTENT_EDITING)
    setCourse(nextCourse)
  }

  const handlePublish = () => {
    publishCourse(course.id)
    refresh()
  }

  const handleUnpublish = () => {
    unpublishCourse(course.id)
    refresh()
  }

  return (
    <section>
      <PageHeader
        title="Course Detail"
        description="View course information, assigned SME, curriculum, and review history."
        action={
          <button type="button" className="dev2-secondary-button" onClick={() => navigate('/tmo/courses')}>
            <ArrowLeft size={16} />
            Back
          </button>
        }
      />

      <div className="course-flow-detail-layout">
        <div className="course-flow-main-stack">
          <CourseInfoCard course={course} />
          <CourseStatusTimeline status={course.status} />
          <CurriculumPreview modules={modules} />
          <ReviewHistoryCard history={history} />
        </div>

        <aside className="course-flow-side-stack">
          <AssignedSmeCard course={course} onAssign={() => setAssignOpen(true)} />
          <section className="demo-card course-flow-side-card">
            <span className="demo-kicker">TMO Actions</span>
            <button type="button" className="demo-secondary-action" onClick={() => setAssignOpen(true)}>
              Assign SME
            </button>
            <button type="button" className="demo-secondary-action" onClick={handleRequestUpdate}>
              Request SME Update
            </button>
            {course.status === COURSE_STATUSES.SUBMITTED_FOR_REVIEW && (
              <Link className="demo-primary-action" to={`/tmo/courses/${course.id}/review`}>
                <ClipboardCheck size={16} />
                Review Content
              </Link>
            )}
            {course.status === COURSE_STATUSES.VERIFIED && (
              <button type="button" className="demo-primary-action" onClick={handlePublish}>
                <UploadCloud size={16} />
                Publish
              </button>
            )}
            {course.status === COURSE_STATUSES.PUBLISHED && (
              <button type="button" className="demo-secondary-action" onClick={handleUnpublish}>
                Unpublish
              </button>
            )}
          </section>
        </aside>
      </div>

      <AssignSmeModal
        course={course}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssigned={refresh}
      />
    </section>
  )
}
