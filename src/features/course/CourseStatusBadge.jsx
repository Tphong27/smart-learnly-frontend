import {
  COURSE_STATUSES,
  normalizeCourseStatus,
} from '@/data/demo/courseLifecycle'

const toneByStatus = {
  [COURSE_STATUSES.DRAFT]: 'gray',
  [COURSE_STATUSES.ASSIGNED_TO_SME]: 'blue',
  [COURSE_STATUSES.CONTENT_EDITING]: 'indigo',
  [COURSE_STATUSES.SUBMITTED_FOR_REVIEW]: 'amber',
  [COURSE_STATUSES.REVISION_REQUIRED]: 'red',
  [COURSE_STATUSES.VERIFIED]: 'green',
  [COURSE_STATUSES.PUBLISHED]: 'green',
  [COURSE_STATUSES.UNPUBLISHED]: 'gray',
}

export function CourseStatusBadge({ status }) {
  const normalizedStatus = normalizeCourseStatus(status)
  const tone = toneByStatus[normalizedStatus] || 'gray'

  return (
    <span className={`course-status-badge course-status-badge--${tone}`}>
      {normalizedStatus}
    </span>
  )
}

