import { demoCourses, demoEnrollments, demoLessons, demoModules } from './index'

const DEMO_ENROLLMENTS_KEY = 'slp.demo.enrollments'
const DEMO_COMPLETED_LESSONS_KEY = 'slp.demo.completedLessons'

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

export function createDemoEnrollment(courseId, traineeId = 'trainee-minh') {
  const existingEnrollment = getDemoEnrollmentByCourse(courseId, traineeId)

  if (existingEnrollment) {
    return existingEnrollment
  }

  const course = demoCourses.find((item) => item.id === courseId)
  const firstLesson = demoLessons.find((lesson) => lesson.courseId === courseId)

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

  return Array.from(completed)
}

export function getCourseProgress(courseId, traineeId = 'trainee-minh') {
  const courseLessons = demoLessons.filter((lesson) => lesson.courseId === courseId)

  if (courseLessons.length === 0) return 0

  const completedLessonIds = getCompletedLessonIds(courseId, traineeId)
  return Math.round((completedLessonIds.length / courseLessons.length) * 100)
}
