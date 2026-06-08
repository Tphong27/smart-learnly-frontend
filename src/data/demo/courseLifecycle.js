export const COURSE_STATUSES = {
  DRAFT: 'Draft',
  ASSIGNED_TO_SME: 'Assigned to SME',
  CONTENT_EDITING: 'Content Editing',
  SUBMITTED_FOR_REVIEW: 'Submitted for Review',
  REVISION_REQUIRED: 'Revision Required',
  VERIFIED: 'Verified',
  PUBLISHED: 'Published',
  UNPUBLISHED: 'Unpublished',
}

export const COURSE_STATUS_SEQUENCE = [
  COURSE_STATUSES.DRAFT,
  COURSE_STATUSES.ASSIGNED_TO_SME,
  COURSE_STATUSES.CONTENT_EDITING,
  COURSE_STATUSES.SUBMITTED_FOR_REVIEW,
  COURSE_STATUSES.VERIFIED,
  COURSE_STATUSES.PUBLISHED,
]

const statusLookup = new Map(
  Object.values(COURSE_STATUSES).map((status) => [
    status.toLowerCase(),
    status,
  ]),
)

statusLookup.set('assigned', COURSE_STATUSES.ASSIGNED_TO_SME)
statusLookup.set('assigned-to-sme', COURSE_STATUSES.ASSIGNED_TO_SME)
statusLookup.set('content-editing', COURSE_STATUSES.CONTENT_EDITING)
statusLookup.set('submitted-for-review', COURSE_STATUSES.SUBMITTED_FOR_REVIEW)
statusLookup.set('revision-required', COURSE_STATUSES.REVISION_REQUIRED)

export function normalizeCourseStatus(status) {
  if (!status) return COURSE_STATUSES.DRAFT

  const normalized = String(status).trim().toLowerCase()
  return statusLookup.get(normalized) || status
}

export function isCoursePublished(course) {
  return normalizeCourseStatus(course?.status) === COURSE_STATUSES.PUBLISHED
}

