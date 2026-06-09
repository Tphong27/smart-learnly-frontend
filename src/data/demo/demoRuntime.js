import { demoEnrollments, demoModules } from './index'
import {
  getLifecycleCourseById,
  getLifecycleModules,
} from './courseLifecycleRuntime'

const DEMO_ENROLLMENTS_KEY = 'slp.demo.enrollments'
const DEMO_COMPLETED_LESSONS_KEY = 'slp.demo.completedLessons'
const DEMO_PAYMENTS_KEY = 'slp.demo.payments'
const DEMO_TEST_ATTEMPTS_KEY = 'slp.demo.testAttempts'

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback

  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function getStoredDemoEnrollments() {
  return readJson(DEMO_ENROLLMENTS_KEY, [])
}

export function getAllDemoEnrollments() {
  const storedEnrollments = getStoredDemoEnrollments()
  const storedIds = new Set(storedEnrollments.map((enrollment) => enrollment.id))

  return [
    ...demoEnrollments.filter((enrollment) => !storedIds.has(enrollment.id)),
    ...storedEnrollments,
  ]
}

export function getDemoEnrollmentByCourse(courseId, traineeId = 'trainee-minh') {
  return getAllDemoEnrollments().find(
    (enrollment) => enrollment.courseId === courseId && enrollment.traineeId === traineeId,
  )
}

function setStoredDemoEnrollments(enrollments) {
  writeJson(DEMO_ENROLLMENTS_KEY, enrollments)
}

export function createDemoEnrollment(courseId, traineeId = 'trainee-minh') {
  const existingEnrollment = getDemoEnrollmentByCourse(courseId, traineeId)

  if (existingEnrollment) {
    return existingEnrollment
  }

  const course = getLifecycleCourseById(courseId)
  const firstLesson = getLifecycleModules(courseId).flatMap((module) => module.lessons)[0]

  const enrollment = {
    id: `enrollment-${courseId.replace('course-', '')}-${traineeId.replace('trainee-', '')}-local`,
    traineeId,
    courseId,
    classId: null,
    status: 'enrolled',
    paymentStatus: 'paid',
    paymentId: `payment-${courseId.replace('course-', '')}-${traineeId.replace('trainee-', '')}-local`,
    progress: 0,
    completedLessonIds: [],
    nextLessonId: firstLesson?.id || null,
    enrolledAt: new Date().toISOString().slice(0, 10),
    lastActivityAt: new Date().toISOString(),
    courseTitle: course?.title,
  }

  writeJson(DEMO_ENROLLMENTS_KEY, [
    ...getStoredDemoEnrollments(),
    enrollment,
  ])

  return enrollment
}

export function updateDemoEnrollment(courseId, traineeId = 'trainee-minh', updates = {}) {
  const storedEnrollments = getStoredDemoEnrollments()
  const existingEnrollment = getDemoEnrollmentByCourse(courseId, traineeId)
  const nextEnrollment = {
    ...existingEnrollment,
    ...updates,
    lastActivityAt: new Date().toISOString(),
  }

  const storedIndex = storedEnrollments.findIndex((enrollment) => enrollment.id === existingEnrollment?.id)

  if (storedIndex >= 0) {
    setStoredDemoEnrollments(
      storedEnrollments.map((enrollment, index) => (index === storedIndex ? nextEnrollment : enrollment)),
    )
  } else if (existingEnrollment) {
    setStoredDemoEnrollments([...storedEnrollments, nextEnrollment])
  }

  return nextEnrollment
}

export function getDemoCourseModules(courseId) {
  return demoModules
    .filter((module) => module.courseId === courseId)
    .sort((a, b) => a.order - b.order)
}

export function getCompletedLessonIds(courseId, traineeId = 'trainee-minh') {
  const enrollment = getDemoEnrollmentByCourse(courseId, traineeId)
  const stored = readJson(DEMO_COMPLETED_LESSONS_KEY, {})
  const localCompleted = stored[`${traineeId}:${courseId}`] || []

  return Array.from(new Set([
    ...(enrollment?.completedLessonIds || []),
    ...localCompleted,
  ]))
}

export function markDemoLessonCompleted(courseId, lessonId, traineeId = 'trainee-minh') {
  const stored = readJson(DEMO_COMPLETED_LESSONS_KEY, {})
  const key = `${traineeId}:${courseId}`
  const completed = new Set(stored[key] || [])

  completed.add(lessonId)

  writeJson(DEMO_COMPLETED_LESSONS_KEY, {
    ...stored,
    [key]: Array.from(completed),
  })

  const completedLessonIds = Array.from(completed)
  updateDemoEnrollment(courseId, traineeId, {
    completedLessonIds,
    progress: getCourseProgress(courseId, traineeId, completedLessonIds),
    nextLessonId: getNextLessonId(courseId, completedLessonIds),
  })

  return completedLessonIds
}

function getCourseLessons(courseId) {
  return getLifecycleModules(courseId).flatMap((module) => module.lessons)
}

function getNextLessonId(courseId, completedLessonIds = []) {
  return getCourseLessons(courseId).find((lesson) => !completedLessonIds.includes(lesson.id))?.id || null
}

export function getCourseProgress(courseId, traineeId = 'trainee-minh', completedOverride = null) {
  const courseLessons = getCourseLessons(courseId)

  if (courseLessons.length === 0) return 0

  const completedLessonIds = completedOverride || getCompletedLessonIds(courseId, traineeId)
  return Math.round((completedLessonIds.length / courseLessons.length) * 100)
}

export function getEnrollmentsByUser(userId = 'trainee-minh') {
  return getAllDemoEnrollments().filter((enrollment) => enrollment.traineeId === userId)
}

export function enrollCourse(userId, courseId) {
  return createDemoEnrollment(courseId, userId)
}

export function markLessonComplete(userId, courseId, lessonId) {
  return markDemoLessonCompleted(courseId, lessonId, userId)
}

export function updateLearningProgress(userId, courseId) {
  const completedLessonIds = getCompletedLessonIds(courseId, userId)
  return updateDemoEnrollment(courseId, userId, {
    completedLessonIds,
    progress: getCourseProgress(courseId, userId, completedLessonIds),
    nextLessonId: getNextLessonId(courseId, completedLessonIds),
  })
}

function getStoredPayments() {
  return readJson(DEMO_PAYMENTS_KEY, [])
}

function setStoredPayments(payments) {
  writeJson(DEMO_PAYMENTS_KEY, payments)
}

export function createMockPayment(userId, courseId, payload = {}) {
  const payment = {
    id: `payment-${courseId}-${userId}-${Date.now()}`,
    userId,
    courseId,
    status: 'pending',
    method: payload.method || 'bank_transfer',
    amount: payload.amount || 0,
    currency: payload.currency || 'VND',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  setStoredPayments([payment, ...getStoredPayments()])
  return payment
}

export function markPaymentSuccess(paymentId) {
  let updatedPayment = null
  const payments = getStoredPayments().map((payment) => {
    if (payment.id !== paymentId) return payment

    updatedPayment = {
      ...payment,
      status: 'paid',
      updatedAt: new Date().toISOString(),
    }
    return updatedPayment
  })

  setStoredPayments(payments)

  if (updatedPayment) {
    createDemoEnrollment(updatedPayment.courseId, updatedPayment.userId)
  }

  return updatedPayment
}

export function markPaymentFailed(paymentId) {
  let updatedPayment = null
  const payments = getStoredPayments().map((payment) => {
    if (payment.id !== paymentId) return payment

    updatedPayment = {
      ...payment,
      status: 'failed',
      updatedAt: new Date().toISOString(),
    }
    return updatedPayment
  })

  setStoredPayments(payments)
  return updatedPayment
}

function getStoredTestAttempts() {
  return readJson(DEMO_TEST_ATTEMPTS_KEY, [])
}

function setStoredTestAttempts(attempts) {
  writeJson(DEMO_TEST_ATTEMPTS_KEY, attempts)
}

export function startTest(userId, testId) {
  const attempt = {
    id: `attempt-${testId}-${userId}-${Date.now()}`,
    userId,
    testId,
    status: 'started',
    startedAt: new Date().toISOString(),
  }

  setStoredTestAttempts([attempt, ...getStoredTestAttempts()])
  return attempt
}

export function submitTestAttempt(userId, testId, result) {
  const attempt = {
    id: `attempt-${testId}-${userId}-${Date.now()}`,
    userId,
    testId,
    status: 'completed',
    submittedAt: new Date().toISOString(),
    ...result,
  }

  setStoredTestAttempts([attempt, ...getStoredTestAttempts()])
  return attempt
}

export function getTestResult(attemptId) {
  return getStoredTestAttempts().find((attempt) => attempt.id === attemptId)
}
