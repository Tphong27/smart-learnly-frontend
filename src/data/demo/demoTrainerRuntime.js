import { demoClasses, demoClassTrainees } from './demoClasses'
import {
  getAllLifecycleTests,
  getLifecycleModules,
} from './courseLifecycleRuntime'

const STORAGE_KEYS = {
  assignments: 'slp.demo.trainer.assignments',
  discussions: 'slp.demo.trainer.discussions',
  interventions: 'slp.demo.trainer.interventions',
  tests: 'slp.demo.trainer.tests',
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

export function getTrainerClasses() {
  return demoClasses
}

export function getTrainerClassById(classId) {
  return demoClasses.find((item) => item.id === classId)
}

export function getTrainerClassTrainees(classId) {
  return demoClassTrainees.filter((item) => item.classId === classId)
}

export function getTrainerClassModules(classId) {
  const currentClass = getTrainerClassById(classId)
  if (!currentClass) return []

  return getLifecycleModules(currentClass.courseId)
}

export function getTrainerClassAssignments(classId) {
  const currentClass = getTrainerClassById(classId)

  const defaultAssignments = (currentClass?.assignments || []).map(
    (assignment) => ({
      ...assignment,
      classId,
      sourceType: assignment.sourceType || 'manual',
      description:
        assignment.description || 'Trainer-created class assignment.',
      createdBy: assignment.createdBy || currentClass.trainerName || 'Trainer',
      createdAt:
        assignment.createdAt || currentClass.startDate || '2026-06-01',
    }),
  )

  const storedAssignments = readJson(STORAGE_KEYS.assignments, [])

  return [
    ...defaultAssignments,
    ...storedAssignments.filter((item) => item.classId === classId),
  ]
}

export function createTrainerAssignment(classId, form) {
  const assignment = {
    id: createId('assignment'),
    classId,
    title: form.title,
    description: form.description,
    dueDate: form.dueDate,
    status: form.status || 'open',
    sourceType: form.sourceType || 'manual',
    selectedModuleIds: form.selectedModuleIds || [],
    uploadedFileName: form.uploadedFileName || '',
    createdBy: 'An Tran',
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  }

  const current = readJson(STORAGE_KEYS.assignments, [])
  writeJson(STORAGE_KEYS.assignments, [assignment, ...current])

  return assignment
}

export function updateTrainerAssignment(assignmentId, form) {
  const current = readJson(STORAGE_KEYS.assignments, [])

  const next = current.map((assignment) =>
    assignment.id === assignmentId
      ? {
          ...assignment,
          ...form,
          updatedAt: new Date().toISOString(),
        }
      : assignment,
  )

  writeJson(STORAGE_KEYS.assignments, next)

  return next.find((assignment) => assignment.id === assignmentId)
}

export function deleteTrainerAssignment(classId, assignmentId) {
  const current = readJson(STORAGE_KEYS.assignments, [])
  const next = current.filter((assignment) => assignment.id !== assignmentId)

  writeJson(STORAGE_KEYS.assignments, next)

  return getTrainerClassAssignments(classId)
}

export function generateTrainerAssignmentWithAi(classId, form) {
  const currentClass = getTrainerClassById(classId)

  return createTrainerAssignment(classId, {
    ...form,
    title:
      form.title?.trim() ||
      `AI practice assignment for ${currentClass?.courseTitle || 'class'}`,
    description:
      form.description?.trim() ||
      'AI-generated mock assignment based on selected modules or uploaded trainer material.',
    sourceType: form.sourceType || 'modules',
    status: 'open',
  })
}

export function getTrainerClassTests(classId) {
  const currentClass = getTrainerClassById(classId)
  if (!currentClass) return []

  return getAllLifecycleTests()
    .filter((test) => test.courseId === currentClass.courseId)
    .map((test) => ({
      ...test,
      classId,
      assignedToClass: true,
    }))
}

export function getTrainerCreatedTests(classId) {
  return readJson(STORAGE_KEYS.tests, []).filter(
    (test) => test.classId === classId,
  )
}

export function createTrainerClassTest(classId, form) {
  const currentClass = getTrainerClassById(classId)

  const test = {
    id: createId('trainer-test'),
    classId,
    courseId: currentClass?.courseId,
    courseTitle: currentClass?.courseTitle,
    title: form.title,
    description: form.description,
    sourceType: form.sourceType || 'modules',
    selectedModuleIds: form.selectedModuleIds || [],
    uploadedFileName: form.uploadedFileName || '',
    status: form.status || 'draft',
    testStatus: 'Not Started',
    type: 'Class Practice Test',
    totalQuestions: Number(form.totalQuestions) || 10,
    durationMinutes: Number(form.durationMinutes) || 20,
    passingScore: Number(form.passingScore) || 70,
    createdBy: 'An Tran',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const current = readJson(STORAGE_KEYS.tests, [])
  writeJson(STORAGE_KEYS.tests, [test, ...current])

  return test
}

export function updateTrainerClassTest(testId, form) {
  const current = readJson(STORAGE_KEYS.tests, [])

  const next = current.map((test) =>
    test.id === testId
      ? {
          ...test,
          ...form,
          totalQuestions: Number(form.totalQuestions) || test.totalQuestions,
          durationMinutes:
            Number(form.durationMinutes) || test.durationMinutes,
          passingScore: Number(form.passingScore) || test.passingScore,
          updatedAt: new Date().toISOString(),
        }
      : test,
  )

  writeJson(STORAGE_KEYS.tests, next)

  return next.find((test) => test.id === testId)
}

export function deleteTrainerClassTest(classId, testId) {
  const current = readJson(STORAGE_KEYS.tests, [])
  const next = current.filter((test) => test.id !== testId)

  writeJson(STORAGE_KEYS.tests, next)

  return getTrainerCreatedTests(classId)
}

export function getAllTrainerClassTests(classId) {
  return [
    ...getTrainerClassTests(classId),
    ...getTrainerCreatedTests(classId),
  ]
}

export function getTrainerClassDiscussions(classId) {
  const stored = readJson(STORAGE_KEYS.discussions, [])

  const defaultDiscussions = [
    {
      id: 'discussion-class-aws-01-1',
      classId: 'class-aws-01',
      authorName: 'Minh Nguyen',
      authorRole: 'Trainee',
      message:
        'Can we have one more review session for pricing models before the practice test?',
      createdAt: '2026-06-08T09:20:00.000Z',
    },
    {
      id: 'discussion-class-aws-01-2',
      classId: 'class-aws-01',
      authorName: 'An Tran',
      authorRole: 'Trainer',
      message:
        'Yes. I will add a focused pricing assignment and discuss it in the next class.',
      createdAt: '2026-06-08T10:10:00.000Z',
    },
  ]

  return [...defaultDiscussions, ...stored].filter(
    (item) => item.classId === classId,
  )
}

export function addTrainerClassDiscussion(classId, message) {
  const discussion = {
    id: createId('class-discussion'),
    classId,
    authorName: 'An Tran',
    authorRole: 'Trainer',
    message,
    createdAt: new Date().toISOString(),
  }

  const current = readJson(STORAGE_KEYS.discussions, [])
  writeJson(STORAGE_KEYS.discussions, [...current, discussion])

  return discussion
}

export function getTrainerInterventions(classId) {
  const stored = readJson(STORAGE_KEYS.interventions, [])

  const defaultInterventions = [
    {
      id: 'intervention-aws-huyen-1',
      classId: 'class-aws-01',
      traineeId: 'trainee-huyen',
      traineeName: 'Huyen Tran',
      risk: 'high',
      action: 'Schedule 1:1 support session',
      status: 'pending',
      note: 'Low progress and weak Security & Compliance score.',
      createdAt: '2026-06-07',
    },
    {
      id: 'intervention-aws-bao-1',
      classId: 'class-aws-01',
      traineeId: 'trainee-bao',
      traineeName: 'Bao Le',
      risk: 'medium',
      action: 'Assign focused review material',
      status: 'pending',
      note: 'Needs more practice on Shared Responsibility Model.',
      createdAt: '2026-06-07',
    },
  ]

  return [...defaultInterventions, ...stored].filter(
    (item) => item.classId === classId,
  )
}

export function markInterventionDone(classId, interventionId) {
  const current = readJson(STORAGE_KEYS.interventions, [])

  const existingStored = current.some((item) => item.id === interventionId)

  if (!existingStored) {
    const defaultItem = getTrainerInterventions(classId).find(
      (item) => item.id === interventionId,
    )

    if (!defaultItem) return getTrainerInterventions(classId)

    writeJson(STORAGE_KEYS.interventions, [
      ...current,
      {
        ...defaultItem,
        status: 'done',
        resolvedAt: new Date().toISOString(),
      },
    ])

    return getTrainerInterventions(classId)
  }

  const next = current.map((item) =>
    item.id === interventionId
      ? {
          ...item,
          status: 'done',
          resolvedAt: new Date().toISOString(),
        }
      : item,
  )

  writeJson(STORAGE_KEYS.interventions, next)

  return getTrainerInterventions(classId)
}

export function createInterventionFromRisk(classId, trainee) {
  const intervention = {
    id: createId('intervention'),
    classId,
    traineeId: trainee.traineeId,
    traineeName: trainee.name,
    risk: trainee.risk,
    action:
      trainee.risk === 'high'
        ? 'Schedule 1:1 support session'
        : 'Assign focused review material',
    status: 'pending',
    note: `Generated from risk signal. Weak topic: ${trainee.weakTopic}.`,
    createdAt: new Date().toISOString().slice(0, 10),
  }

  const current = readJson(STORAGE_KEYS.interventions, [])
  writeJson(STORAGE_KEYS.interventions, [intervention, ...current])

  return intervention
}