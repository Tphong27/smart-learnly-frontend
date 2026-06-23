import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

export const AUDIT_DOMAINS = [
  'AUTH',
  'USER',
  'CATEGORY',
  'COURSE',
  'CONTENT',
  'CLASS',
  'ENROLLMENT',
  'ORDER',
  'PAYMENT',
  'SECURITY',
  'SYSTEM',
]

export const AUDIT_RESULTS = ['SUCCESS', 'FAILURE', 'DENIED']

export const AUDIT_ACTIONS = [
  'ACCOUNT_REGISTERED',
  'LOGIN_SUCCEEDED',
  'LOGIN_FAILED',
  'LOGIN_BLOCKED',
  'GOOGLE_LOGIN_SUCCEEDED',
  'LOGOUT_SUCCEEDED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'PASSWORD_CHANGED',
  'EMAIL_VERIFIED',
  'PROFILE_UPDATED',
  'CATEGORY_CREATED',
  'CATEGORY_UPDATED',
  'CATEGORY_DELETED',
  'COURSE_CREATED',
  'COURSE_UPDATED',
  'COURSE_PUBLISHED',
  'COURSE_DEACTIVATED',
  'COURSE_DELETED',
  'COURSE_ACCESS_BLOCKED',
  'COURSE_ACCESS_UNBLOCKED',
  'SECTION_CREATED',
  'SECTION_UPDATED',
  'SECTION_DELETED',
  'SECTIONS_REORDERED',
  'LESSON_CREATED',
  'LESSON_UPDATED',
  'LESSON_DEACTIVATED',
  'LESSONS_REORDERED',
  'CLASS_CREATED',
  'CLASS_UPDATED',
  'CLASS_CANCELLED',
  'CLASS_DELETED',
  'ENROLLMENT_CREATED',
  'ENROLLMENT_REACTIVATED',
  'ENROLLMENT_STATUS_CHANGED',
  'ORDER_CREATED',
  'ORDER_CANCELLED',
  'PAYMENT_CREATED',
  'PAYMENT_CALLBACK_RECEIVED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_MISMATCHED',
  'PAYMENT_FAILED',
  'PAYMENT_RECONCILED',
]

export const auditLogService = {
  async list(params = {}) {
    const response = await apiClient.get('/admin/audit-logs', {
      params: cleanParams(params),
    })

    return unwrap(response) || { items: [], page: 0, size: params.size ?? 20, totalItems: 0, totalPages: 0 }
  },

  async get(auditLogId) {
    const response = await apiClient.get(`/admin/audit-logs/${auditLogId}`)
    return unwrap(response)
  },
}
