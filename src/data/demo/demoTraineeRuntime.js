import { demoClasses } from './demoClasses'
import { demoCourseFeedback } from './demoFeedback'
import { getAllDemoEnrollments, getMockPayments } from './demoRuntime'
import {
  getLifecycleCourseById,
  getLifecycleModules,
} from './courseLifecycleRuntime'
import {
  getClassAssignments,
  getClassFlowClasses,
  updateClassFlowClass,
} from './classFlowRuntime'

const TRAINEE_ID = 'trainee-minh'

const STORAGE_KEYS = {
  payments: 'slp.demo.trainee.payments',
  classEnrollments: 'slp.demo.trainee.classEnrollments',
  discussions: 'slp.demo.trainee.discussions',
  tests: 'slp.demo.trainee.tests',
  feedback: 'slp.demo.trainee.feedback',
}

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

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatPaymentMethod(method) {
  return String(method || 'bank_transfer')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function toTraineeClassCard(classItem, enrollmentStatus) {
  return {
    ...classItem,
    name: classItem.name || classItem.className || classItem.displayName,
    displayName: classItem.displayName || classItem.className || classItem.name,
    courseTitle: classItem.courseTitle || classItem.course,
    trainerName: classItem.trainerName || classItem.trainer || 'Unassigned',
    traineeCount:
      classItem.traineeCount ||
      (Array.isArray(classItem.traineeIds) ? classItem.traineeIds.length : 0),
    maxTrainees: classItem.maxTrainees || classItem.traineeCount || classItem.trainees,
    assignments: getClassAssignments(classItem.id),
    enrollmentStatus,
    canJoinMeet: classItem.status === 'running',
  }
}

export function getTraineeClassEnrollments(traineeId = TRAINEE_ID) {
  const stored = readJson(STORAGE_KEYS.classEnrollments, [])

  const defaultEnrollments = [
    {
      id: 'class-enrollment-aws-minh',
      traineeId,
      classId: 'class-aws-01',
      courseId: 'course-aws',
      status: 'enrolled',
      enrolledAt: '2026-05-10',
    },
  ]

  const storedIds = new Set(stored.map((item) => item.id))

  return [
    ...defaultEnrollments.filter((item) => !storedIds.has(item.id)),
    ...stored,
  ]
}

export function getTraineeClasses(traineeId = TRAINEE_ID) {
  const classEnrollments = getTraineeClassEnrollments(traineeId)
  const legacyEnrollmentIds = new Set(classEnrollments.map((item) => item.classId))
  const classFlowClasses = getClassFlowClasses()

  const enrolledClasses = classFlowClasses
    .filter(
      (item) =>
        legacyEnrollmentIds.has(item.id) ||
        (Array.isArray(item.traineeIds) && item.traineeIds.includes(traineeId)),
    )
    .map((item) => toTraineeClassCard(item, 'enrolled'))

  const enrolledClassIds = new Set(enrolledClasses.map((item) => item.id))

  const availableClasses = classFlowClasses
    .filter(
      (item) =>
        !enrolledClassIds.has(item.id) &&
        item.status !== 'completed' &&
        item.status !== 'cancelled',
    )
    .map((item) => toTraineeClassCard(item, 'available'))

  return {
    enrolledClasses,
    availableClasses,
  }
}

export function enrollTraineeClass(classId, traineeId = TRAINEE_ID) {
  const current = getTraineeClassEnrollments(traineeId)
  const classItem =
    getClassFlowClasses().find((item) => item.id === classId) ||
    demoClasses.find((item) => item.id === classId)
  const traineeIds = classItem?.traineeIds || []

  if (classItem && !traineeIds.includes(traineeId)) {
    updateClassFlowClass(classId, {
      traineeIds: [...traineeIds, traineeId],
    })
  }

  if (current.some((item) => item.classId === classId)) {
    return getTraineeClassEnrollments(traineeId)
  }

  const next = [
    ...readJson(STORAGE_KEYS.classEnrollments, []),
    {
      id: createId('class-enrollment'),
      traineeId,
      classId,
      courseId: classItem?.courseId,
      status: 'enrolled',
      enrolledAt: new Date().toISOString().slice(0, 10),
    },
  ]

  writeJson(STORAGE_KEYS.classEnrollments, next)
  return getTraineeClassEnrollments(traineeId)
}

export function getTraineePayments(traineeId = TRAINEE_ID) {
  const stored = readJson(STORAGE_KEYS.payments, [])

  const defaultPayments = [
    {
      id: 'payment-aws-minh-001',
      traineeId,
      courseId: 'course-aws',
      classId: 'class-aws-01',
      invoiceNo: 'SLP-INV-2026-0001',
      title: 'AWS Cloud Practitioner Foundation',
      amount: 2490000,
      currency: 'VND',
      method: 'VnPay',
      status: 'paid',
      paidAt: '2026-05-10',
      type: 'Course + Class Enrollment',
    },
  ]

  const runtimePayments = getMockPayments()
    .filter((payment) => payment.userId === traineeId)
    .map((payment) => {
      const course = getLifecycleCourseById(payment.courseId)

      return {
        id: payment.id,
        traineeId,
        courseId: payment.courseId,
        classId: null,
        invoiceNo: `SLP-MOCK-${payment.id.slice(-8).toUpperCase()}`,
        title: course?.title || 'Course enrollment',
        amount: payment.amount,
        currency: payment.currency,
        method: formatPaymentMethod(payment.method),
        status: payment.status,
        paidAt: payment.status === 'paid' ? payment.updatedAt || payment.createdAt : '',
        type: 'Course Enrollment',
      }
    })

  const paymentMap = new Map()
  const mergedPayments = [...defaultPayments, ...stored, ...runtimePayments]

  mergedPayments.forEach((payment) => {
    if (!paymentMap.has(payment.id)) {
      paymentMap.set(payment.id, payment)
    }
  })

  return Array.from(paymentMap.values()).sort((a, b) => {
    const aTime = new Date(a.paidAt || a.createdAt || 0).getTime()
    const bTime = new Date(b.paidAt || b.createdAt || 0).getTime()
    return bTime - aTime
  })
}

export function getTraineePaymentById(paymentId) {
  return getTraineePayments().find((item) => item.id === paymentId)
}

export function getLessonDiscussions(courseId, lessonId) {
  const stored = readJson(STORAGE_KEYS.discussions, [])

  const defaultDiscussions = [
    {
      id: 'discussion-aws-lesson-1',
      courseId: 'course-aws',
      lessonId: 'lesson-aws-1',
      authorName: 'Minh Nguyen',
      authorRole: 'Trainee',
      message: 'Can you explain the difference between elasticity and scalability?',
      createdAt: '2026-06-05T09:30:00.000Z',
    },
    {
      id: 'discussion-aws-lesson-1-reply',
      courseId: 'course-aws',
      lessonId: 'lesson-aws-1',
      authorName: 'An Tran',
      authorRole: 'Trainer',
      message:
        'Elasticity focuses on automatic adjustment based on demand. Scalability is the ability to grow capacity when needed.',
      createdAt: '2026-06-05T10:05:00.000Z',
    },
  ]

  return [...defaultDiscussions, ...stored].filter(
    (item) => item.courseId === courseId && item.lessonId === lessonId,
  )
}

export function addLessonDiscussion({ courseId, lessonId, message }) {
  const current = readJson(STORAGE_KEYS.discussions, [])

  const nextMessage = {
    id: createId('discussion'),
    courseId,
    lessonId,
    authorName: 'Minh Nguyen',
    authorRole: 'Trainee',
    message,
    createdAt: new Date().toISOString(),
  }

  writeJson(STORAGE_KEYS.discussions, [...current, nextMessage])

  return nextMessage
}

export function getTraineeCreatedTests() {
  return readJson(STORAGE_KEYS.tests, [])
}

export function createTraineeTest(form) {
  const course = getLifecycleCourseById(form.courseId)

  const test = {
    id: createId('trainee-test'),
    ownerId: TRAINEE_ID,
    ownerType: 'trainee',
    courseId: form.courseId,
    courseTitle: course?.title,
    title: form.title,
    description: form.description,
    sourceType: form.sourceType,
    selectedModuleIds: form.selectedModuleIds || [],
    uploadedFileName: form.uploadedFileName || '',
    status: 'draft',
    testStatus: 'Not Started',
    type: 'Practice Test',
    totalQuestions: Number(form.totalQuestions) || 10,
    durationMinutes: Number(form.durationMinutes) || 20,
    passingScore: Number(form.passingScore) || 70,
    attempts: 0,
    bestScore: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const current = getTraineeCreatedTests()
  writeJson(STORAGE_KEYS.tests, [test, ...current])

  return test
}

export function updateTraineeTest(testId, form) {
  const tests = getTraineeCreatedTests()

  const next = tests.map((test) =>
    test.id === testId
      ? {
          ...test,
          ...form,
          totalQuestions: Number(form.totalQuestions) || test.totalQuestions,
          durationMinutes: Number(form.durationMinutes) || test.durationMinutes,
          passingScore: Number(form.passingScore) || test.passingScore,
          updatedAt: new Date().toISOString(),
        }
      : test,
  )

  writeJson(STORAGE_KEYS.tests, next)

  return next.find((test) => test.id === testId)
}

export function deleteTraineeTest(testId) {
  const tests = getTraineeCreatedTests()
  const next = tests.filter((test) => test.id !== testId)
  writeJson(STORAGE_KEYS.tests, next)
  return next
}

export function getModulesForTraineeTest(courseId) {
  return getLifecycleModules(courseId)
}

export function getTraineeCourseOptions() {
  return getAllDemoEnrollments()
    .map((enrollment) => getLifecycleCourseById(enrollment.courseId))
    .filter(Boolean)
}

export function getCourseFeedbackWithLocal(courseId) {
  const stored = readJson(STORAGE_KEYS.feedback, [])

  return [...demoCourseFeedback, ...stored].filter(
    (feedback) => feedback.courseId === courseId,
  )
}

export function addCourseFeedback({ courseId, rating, comment }) {
  const current = readJson(STORAGE_KEYS.feedback, [])

  const feedback = {
    id: createId('feedback'),
    courseId,
    learnerId: TRAINEE_ID,
    learnerName: 'Minh Nguyen',
    rating: Number(rating),
    comment,
    createdAt: new Date().toISOString().slice(0, 10),
  }

  writeJson(STORAGE_KEYS.feedback, [feedback, ...current])

  return feedback
}
