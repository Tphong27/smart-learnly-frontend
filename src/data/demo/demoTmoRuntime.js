import { demoClasses } from './demoClasses'
import { getAllLifecycleCourses, getLifecycleCourseById } from './courseLifecycleRuntime'
import { getMockPayments } from './demoRuntime'
import { demoUsers } from './demoUsers'
import { ROLES } from '@/shared/constants/roles'

const STORAGE_KEYS = {
  classes: 'slp.demo.tmo.classes',
  payments: 'slp.demo.tmo.payments',
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

function getUserById(userId) {
  return Object.values(demoUsers).find((user) => user.id === userId)
}

export function getTrainerOptions() {
  return Object.values(demoUsers).filter((user) => user.role === ROLES.TRAINER)
}

export function getTmoCourseOptions() {
  return getAllLifecycleCourses().map((course) => ({
    id: course.id,
    title: course.title,
    category: course.category,
    status: course.status,
  }))
}

function normalizeClass(classItem) {
  return {
    id: classItem.id,
    name: classItem.name || classItem.displayName,
    displayName: classItem.displayName || classItem.name,
    courseId: classItem.courseId,
    courseTitle: classItem.courseTitle || classItem.course,
    course: classItem.course || classItem.courseTitle,
    trainerId: classItem.trainerId || '',
    trainerName: classItem.trainerName || classItem.trainer || 'Unassigned',
    trainer: classItem.trainer || classItem.trainerName || 'Unassigned',
    status: classItem.status || 'upcoming',
    trainees: classItem.trainees || classItem.traineeCount || 0,
    traineeCount: classItem.traineeCount || classItem.trainees || 0,
    startDate: classItem.startDate || '',
    endDate: classItem.endDate || '',
    schedule: classItem.schedule || '',
    meetLink: classItem.meetLink || '',
    averageProgress: classItem.averageProgress || 0,
    averageScore: classItem.averageScore || 0,
    weakestTopic: classItem.weakestTopic || 'Not enough data',
    atRiskCount: classItem.atRiskCount || 0,
    assignments: classItem.assignments || [],
    createdAt: classItem.createdAt || '',
    updatedAt: classItem.updatedAt || '',
  }
}

export function getTmoClasses() {
  const storedClasses = readJson(STORAGE_KEYS.classes, [])
  const storedById = new Map(storedClasses.map((item) => [item.id, item]))

  const baseClasses = demoClasses.map((item) => ({
    ...normalizeClass(item),
    ...(storedById.get(item.id) || {}),
  }))

  const baseIds = new Set(baseClasses.map((item) => item.id))
  const localOnly = storedClasses.filter((item) => !baseIds.has(item.id))

  return [...baseClasses, ...localOnly].map(normalizeClass)
}

export function getTmoClassById(classId) {
  return getTmoClasses().find((item) => item.id === classId)
}

export function createTmoClass(form) {
  const course = getLifecycleCourseById(form.courseId)
  const trainer = getTrainerOptions().find((item) => item.id === form.trainerId)

  const classItem = normalizeClass({
    id: createId('tmo-class'),
    name: form.name,
    displayName: form.name,
    courseId: form.courseId,
    courseTitle: course?.title || '',
    course: course?.title || '',
    trainerId: form.trainerId,
    trainerName: trainer?.displayName || 'Unassigned',
    trainer: trainer?.displayName || 'Unassigned',
    status: form.status || 'upcoming',
    trainees: Number(form.traineeCount) || 0,
    traineeCount: Number(form.traineeCount) || 0,
    startDate: form.startDate,
    endDate: form.endDate,
    schedule: form.schedule,
    meetLink: form.meetLink,
    averageProgress: 0,
    averageScore: 0,
    atRiskCount: 0,
    weakestTopic: 'Not enough data',
    assignments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const current = readJson(STORAGE_KEYS.classes, [])
  writeJson(STORAGE_KEYS.classes, [classItem, ...current])

  return classItem
}

export function updateTmoClass(classId, form) {
  const current = readJson(STORAGE_KEYS.classes, [])
  const existing = getTmoClassById(classId)
  const course = getLifecycleCourseById(form.courseId)
  const trainer = getTrainerOptions().find((item) => item.id === form.trainerId)

  if (!existing) return null

  const updatedClass = normalizeClass({
    ...existing,
    ...form,
    id: classId,
    displayName: form.name,
    courseTitle: course?.title || existing.courseTitle,
    course: course?.title || existing.course,
    trainerName: trainer?.displayName || existing.trainerName,
    trainer: trainer?.displayName || existing.trainer,
    trainees: Number(form.traineeCount) || existing.trainees,
    traineeCount: Number(form.traineeCount) || existing.traineeCount,
    updatedAt: new Date().toISOString(),
  })

  const existsInStored = current.some((item) => item.id === classId)

  if (existsInStored) {
    writeJson(
      STORAGE_KEYS.classes,
      current.map((item) => (item.id === classId ? updatedClass : item)),
    )
  } else {
    writeJson(STORAGE_KEYS.classes, [updatedClass, ...current])
  }

  return updatedClass
}

export function deleteTmoClass(classId) {
  const current = readJson(STORAGE_KEYS.classes, [])
  writeJson(
    STORAGE_KEYS.classes,
    current.filter((item) => item.id !== classId),
  )

  return getTmoClasses()
}

export function getTmoPayments() {
  const storedPayments = readJson(STORAGE_KEYS.payments, [])

  const defaultPayments = [
    {
      id: 'payment-aws-minh-001',
      invoiceNo: 'SLP-INV-2026-0001',
      traineeName: 'Minh Nguyen',
      traineeEmail: 'minh.nguyen@example.com',
      courseId: 'course-aws',
      courseTitle: 'AWS Cloud Practitioner Foundation',
      classId: 'class-aws-01',
      className: 'AWS Foundation - Evening Class',
      amount: 2490000,
      currency: 'VND',
      method: 'VnPay',
      status: 'paid',
      paidAt: '2026-05-10',
      note: 'Course + Class Enrollment',
    },
    {
      id: 'payment-data-huyen-001',
      invoiceNo: 'SLP-INV-2026-0002',
      traineeName: 'Huyen Tran',
      traineeEmail: 'huyen.tran@example.com',
      courseId: 'course-data',
      courseTitle: 'Data Modeling for Business Systems',
      classId: 'class-data-01',
      className: 'Data Modeling Business Class',
      amount: 1800000,
      currency: 'VND',
      method: 'PayOS',
      status: 'pending',
      paidAt: '',
      note: 'Waiting for payment confirmation',
    },
    {
      id: 'payment-aws-bao-001',
      invoiceNo: 'SLP-INV-2026-0003',
      traineeName: 'Bao Le',
      traineeEmail: 'bao.le@example.com',
      courseId: 'course-aws',
      courseTitle: 'AWS Cloud Practitioner Foundation',
      classId: 'class-aws-01',
      className: 'AWS Foundation - Evening Class',
      amount: 2490000,
      currency: 'VND',
      method: 'VnPay',
      status: 'refund_requested',
      paidAt: '2026-05-15',
      note: 'Learner requested refund before class start.',
    },
  ]

  const storedById = new Map(storedPayments.map((item) => [item.id, item]))

  const basePayments = defaultPayments.map((item) => ({
    ...item,
    ...(storedById.get(item.id) || {}),
  }))

  const runtimePayments = getMockPayments().map((payment) => {
    const user = getUserById(payment.userId)
    const course = getLifecycleCourseById(payment.courseId)
    const normalizedPayment = {
      id: payment.id,
      invoiceNo: `SLP-MOCK-${payment.id.slice(-8).toUpperCase()}`,
      traineeName: user?.displayName || payment.userId,
      traineeEmail: user?.email || '',
      courseId: payment.courseId,
      courseTitle: course?.title || 'Course enrollment',
      classId: null,
      className: 'Self-paced learning',
      amount: payment.amount,
      currency: payment.currency,
      method: formatPaymentMethod(payment.method),
      status: payment.status,
      paidAt: payment.status === 'paid' ? payment.updatedAt || payment.createdAt : '',
      note: 'Created from trainee checkout simulation.',
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }

    return {
      ...normalizedPayment,
      ...(storedById.get(payment.id) || {}),
    }
  })

  const knownIds = new Set([
    ...basePayments.map((payment) => payment.id),
    ...runtimePayments.map((payment) => payment.id),
  ])
  const localOnlyPayments = storedPayments.filter((payment) => !knownIds.has(payment.id))

  return [...basePayments, ...runtimePayments, ...localOnlyPayments]
}

export function updateTmoPaymentStatus(paymentId, status) {
  const payments = getTmoPayments()
  const nextPayments = payments.map((payment) =>
    payment.id === paymentId
      ? {
          ...payment,
          status,
          verifiedAt: status === 'paid' ? new Date().toISOString() : payment.verifiedAt,
          refundedAt: status === 'refunded' ? new Date().toISOString() : payment.refundedAt,
        }
      : payment,
  )

  writeJson(STORAGE_KEYS.payments, nextPayments)

  return nextPayments
}

export function getTmoPaymentSummary() {
  const payments = getTmoPayments()

  const paidPayments = payments.filter((item) => item.status === 'paid')
  const pendingPayments = payments.filter((item) => item.status === 'pending')
  const refundPayments = payments.filter(
    (item) => item.status === 'refund_requested' || item.status === 'refunded',
  )

  const revenue = paidPayments.reduce((sum, item) => sum + item.amount, 0)

  return {
    total: payments.length,
    paid: paidPayments.length,
    pending: pendingPayments.length,
    refund: refundPayments.length,
    revenue,
  }
}
