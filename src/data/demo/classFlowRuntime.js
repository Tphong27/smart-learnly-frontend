/**
 * classFlowRuntime.js
 * Unified CRUD runtime for the Class Management module.
 * ALL roles (TMO, Trainer, Trainee) read/write the same localStorage keys.
 * Merges seed data from classFlowData.js + demoClasses with localStorage overrides.
 */

import { demoClasses, demoClassTrainees } from './demoClasses'
import { demoUsers, demoTrainees } from './demoUsers'
import { getAllLifecycleCourses, getLifecycleCourseById } from './courseLifecycleRuntime'
import { ROLES } from '@/shared/constants/roles'
import {
  seedClassAssignments,
  seedClassSubmissions,
  seedClassTests,
  seedClassTestAttempts,
  seedClassFlashcardSets,
  seedClassAnnouncements,
  seedClassDiscussions,
  seedTrainerNotes,
} from './classFlowData'

/* ── Storage Keys ─────────────────────────────────────── */

const KEYS = {
  classes: 'slp.classflow.classes',
  assignments: 'slp.classflow.assignments',
  submissions: 'slp.classflow.submissions',
  classTests: 'slp.classflow.classTests',
  classTestAttempts: 'slp.classflow.classTestAttempts',
  flashcardSets: 'slp.classflow.flashcardSets',
  announcements: 'slp.classflow.announcements',
  discussions: 'slp.classflow.discussions',
  trainerNotes: 'slp.classflow.trainerNotes',
  personalFlashcards: 'slp.classflow.personalFlashcards',
}

/* ── Helpers ──────────────────────────────────────────── */

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function mergeById(seeds, stored) {
  const map = new Map()
  seeds.forEach((item) => map.set(item.id, item))
  stored.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }))
  return Array.from(map.values())
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function now() {
  return new Date().toISOString()
}

/* ================================================================
   CLASSES
   ================================================================ */

function normalizeClass(item) {
  const course = getLifecycleCourseById(item.courseId)
  const trainer = Object.values(demoUsers).find((u) => u.id === item.trainerId)
  return {
    id: item.id,
    className: item.className || item.displayName || item.name || '',
    description: item.description || '',
    courseId: item.courseId || '',
    courseTitle: item.courseTitle || course?.title || item.course || '',
    trainerId: item.trainerId || '',
    trainerName: item.trainerName || trainer?.displayName || item.trainer || 'Unassigned',
    traineeIds: item.traineeIds || [],
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    schedule: item.schedule || '',
    timeSlot: item.timeSlot || '',
    learningMode: item.learningMode || 'online',
    maxTrainees: item.maxTrainees || item.traineeCount || item.trainees || 30,
    status: item.status || 'upcoming',
    inviteCode: item.inviteCode || '',
    meetLink: item.meetLink || '',
    averageProgress: item.averageProgress || 0,
    averageScore: item.averageScore || 0,
    weakestTopic: item.weakestTopic || 'Not enough data',
    atRiskCount: item.atRiskCount || 0,
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
  }
}

export function getClassFlowClasses() {
  const stored = readJson(KEYS.classes, [])
  const seeds = demoClasses.map(normalizeClass)
  return mergeById(seeds, stored)
}

export function getClassFlowClassById(classId) {
  return getClassFlowClasses().find((c) => c.id === classId) || null
}

export function getClassesByTrainer(trainerId) {
  return getClassFlowClasses().filter((c) => c.trainerId === trainerId)
}

export function getClassesByTrainee(traineeId) {
  return getClassFlowClasses().filter(
    (c) => Array.isArray(c.traineeIds) && c.traineeIds.includes(traineeId),
  )
}

export function createClassFlowClass(form) {
  const course = getLifecycleCourseById(form.courseId)
  const trainer = Object.values(demoUsers).find((u) => u.id === form.trainerId)

  const classItem = normalizeClass({
    id: createId('class'),
    className: form.className,
    description: form.description || '',
    courseId: form.courseId,
    courseTitle: course?.title || '',
    trainerId: form.trainerId,
    trainerName: trainer?.displayName || 'Unassigned',
    traineeIds: form.traineeIds || [],
    startDate: form.startDate,
    endDate: form.endDate,
    schedule: form.schedule || '',
    timeSlot: form.timeSlot || '',
    learningMode: form.learningMode || 'online',
    maxTrainees: Number(form.maxTrainees) || 30,
    status: form.status || 'upcoming',
    inviteCode: form.inviteCode || `SLP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    meetLink: form.meetLink || '',
    createdAt: now(),
    updatedAt: now(),
  })

  const current = readJson(KEYS.classes, [])
  writeJson(KEYS.classes, [classItem, ...current])
  return classItem
}

export function updateClassFlowClass(classId, updates) {
  const all = getClassFlowClasses()
  const existing = all.find((c) => c.id === classId)
  if (!existing) return null

  const course = updates.courseId
    ? getLifecycleCourseById(updates.courseId)
    : null
  const trainer = updates.trainerId
    ? Object.values(demoUsers).find((u) => u.id === updates.trainerId)
    : null

  const updated = normalizeClass({
    ...existing,
    ...updates,
    id: classId,
    courseTitle: course?.title || existing.courseTitle,
    trainerName: trainer?.displayName || existing.trainerName,
    updatedAt: now(),
  })

  const stored = readJson(KEYS.classes, [])
  const inStored = stored.some((c) => c.id === classId)
  if (inStored) {
    writeJson(KEYS.classes, stored.map((c) => (c.id === classId ? updated : c)))
  } else {
    writeJson(KEYS.classes, [updated, ...stored])
  }
  return updated
}

/* ── Class trainees helper ────────────────────────────── */

export function getClassTrainees(classId) {
  const cls = getClassFlowClassById(classId)
  if (!cls) return []

  const seedTrainees = demoClassTrainees.filter((t) => t.classId === classId)
  const seedByTraineeId = new Map(seedTrainees.map((t) => [t.traineeId, t]))

  return (cls.traineeIds || []).map((tid) => {
    const seedTrainee = seedByTraineeId.get(tid)
    if (seedTrainee) return seedTrainee

    const user = demoTrainees.find((u) => u.id === tid) ||
      Object.values(demoUsers).find((u) => u.id === tid)
    return {
      id: `member-${classId}-${tid}`,
      classId,
      traineeId: tid,
      name: user?.displayName || tid,
      email: user?.email || '',
      progress: Math.floor(Math.random() * 80) + 20,
      score: Math.floor(Math.random() * 60) + 40,
      lastLoginDays: Math.floor(Math.random() * 7),
      risk: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      weakTopic: 'Not enough data',
    }
  })
}

/* ── Available trainers / courses / trainees ──────────── */

export function getAvailableTrainers() {
  return Object.values(demoUsers).filter((u) => u.role === ROLES.TRAINER)
}

export function getAvailableCourses() {
  return getAllLifecycleCourses().map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    status: c.status,
  }))
}

export function getAvailableTrainees() {
  return demoTrainees
}

/* ================================================================
   ASSIGNMENTS
   ================================================================ */

export function getClassAssignments(classId) {
  const stored = readJson(KEYS.assignments, [])
  const seeds = seedClassAssignments.filter((a) => a.classId === classId)
  return mergeById(seeds, stored.filter((a) => a.classId === classId))
}

export function createClassAssignment(classId, form) {
  const assignment = {
    id: createId('cf-assign'),
    classId,
    title: form.title,
    description: form.description || '',
    dueDate: form.dueDate || '',
    submissionType: form.submissionType || 'text',
    points: Number(form.points) || 100,
    attachments: form.attachments || [],
    status: form.status || 'draft',
    createdBy: form.createdBy || 'trainer-an',
    createdAt: today(),
  }
  const current = readJson(KEYS.assignments, [])
  writeJson(KEYS.assignments, [assignment, ...current])
  return assignment
}

export function updateClassAssignment(assignmentId, updates) {
  const stored = readJson(KEYS.assignments, [])
  const all = mergeById(seedClassAssignments, stored)
  const next = all.map((a) =>
    a.id === assignmentId ? { ...a, ...updates, updatedAt: now() } : a,
  )
  writeJson(KEYS.assignments, next)
  return next.find((a) => a.id === assignmentId)
}

export function deleteClassAssignment(assignmentId) {
  const stored = readJson(KEYS.assignments, [])
  const all = mergeById(seedClassAssignments, stored)
  const next = all.filter((a) => a.id !== assignmentId)
  writeJson(KEYS.assignments, next)
  // Also remove submissions for this assignment
  const subs = readJson(KEYS.submissions, [])
  writeJson(KEYS.submissions, subs.filter((s) => s.assignmentId !== assignmentId))
}

/* ================================================================
   SUBMISSIONS
   ================================================================ */

export function getAssignmentSubmissions(assignmentId) {
  const stored = readJson(KEYS.submissions, [])
  const seeds = seedClassSubmissions.filter((s) => s.assignmentId === assignmentId)
  return mergeById(seeds, stored.filter((s) => s.assignmentId === assignmentId))
}

export function getSubmissionsByClass(classId) {
  const stored = readJson(KEYS.submissions, [])
  const seeds = seedClassSubmissions.filter((s) => s.classId === classId)
  return mergeById(seeds, stored.filter((s) => s.classId === classId))
}

export function submitAssignment(assignmentId, traineeId, data) {
  const user = demoTrainees.find((u) => u.id === traineeId) ||
    Object.values(demoUsers).find((u) => u.id === traineeId)
  const assignment = [...seedClassAssignments, ...readJson(KEYS.assignments, [])]
    .find((a) => a.id === assignmentId)

  const submission = {
    id: createId('cf-sub'),
    assignmentId,
    classId: assignment?.classId || data.classId || '',
    traineeId,
    traineeName: user?.displayName || traineeId,
    content: data.content || '',
    attachment: data.attachment || '',
    submittedAt: now(),
    status: 'submitted',
    aiGrade: null,
    aiFeedback: null,
    finalGrade: null,
    trainerFeedback: null,
  }
  const current = readJson(KEYS.submissions, [])
  writeJson(KEYS.submissions, [submission, ...current])
  return submission
}

export function aiGradeSubmission(submissionId) {
  const stored = readJson(KEYS.submissions, [])
  const all = mergeById(seedClassSubmissions, stored)
  const mockGrade = Math.floor(Math.random() * 30) + 65
  const feedbacks = [
    'Good understanding of core concepts. Consider adding more real-world examples.',
    'Solid work overall. The explanation could be more structured with clear sections.',
    'Demonstrates fundamental knowledge. Needs deeper analysis on edge cases.',
    'Well-written response. Some minor inaccuracies in technical details.',
  ]
  const mockFeedback = feedbacks[Math.floor(Math.random() * feedbacks.length)]

  const next = all.map((s) =>
    s.id === submissionId
      ? { ...s, aiGrade: mockGrade, aiFeedback: mockFeedback, updatedAt: now() }
      : s,
  )
  writeJson(KEYS.submissions, next)
  return next.find((s) => s.id === submissionId)
}

export function saveSubmissionGrade(submissionId, finalGrade, trainerFeedback) {
  const stored = readJson(KEYS.submissions, [])
  const all = mergeById(seedClassSubmissions, stored)
  const next = all.map((s) =>
    s.id === submissionId
      ? {
          ...s,
          finalGrade: Number(finalGrade),
          trainerFeedback,
          status: 'graded',
          updatedAt: now(),
        }
      : s,
  )
  writeJson(KEYS.submissions, next)
  return next.find((s) => s.id === submissionId)
}

/* ================================================================
   CLASS TESTS
   ================================================================ */

export function getClassTests(classId) {
  const stored = readJson(KEYS.classTests, [])
  const seeds = seedClassTests.filter((t) => t.classId === classId)
  return mergeById(seeds, stored.filter((t) => t.classId === classId))
}

export function getClassTestById(testId) {
  const stored = readJson(KEYS.classTests, [])
  const all = mergeById(seedClassTests, stored)
  return all.find((t) => t.id === testId) || null
}

export function createClassTest(classId, form) {
  const test = {
    id: createId('cf-test'),
    classId,
    source: 'created_in_class',
    courseTestId: null,
    title: form.title,
    description: form.description || '',
    type: form.type || 'Practice Test',
    timeLimit: Number(form.timeLimit) || 20,
    dueDate: form.dueDate || '',
    startTime: form.startTime || '',
    endTime: form.endTime || '',
    numberOfQuestions: Number(form.numberOfQuestions) || 10,
    questions: form.questions || [],
    shuffleQuestions: form.shuffleQuestions || false,
    shuffleAnswers: form.shuffleAnswers || false,
    showCorrectAnswers: form.showCorrectAnswers !== false,
    allowRetake: form.allowRetake !== false,
    maxAttempts: Number(form.maxAttempts) || 0,
    passingScore: Number(form.passingScore) || 70,
    status: form.status || 'draft',
    createdBy: form.createdBy || 'trainer-an',
    createdAt: today(),
  }
  const current = readJson(KEYS.classTests, [])
  writeJson(KEYS.classTests, [test, ...current])
  return test
}

export function importCourseTest(classId, courseTestId, courseTestTitle) {
  const test = {
    id: createId('cf-test'),
    classId,
    source: 'imported_from_course',
    courseTestId,
    title: courseTestTitle || 'Imported Test',
    type: 'Module Test',
    timeLimit: 30,
    dueDate: '',
    numberOfQuestions: 15,
    questions: [],
    status: 'published',
    createdBy: 'trainer-an',
    createdAt: today(),
  }
  const current = readJson(KEYS.classTests, [])
  writeJson(KEYS.classTests, [test, ...current])
  return test
}

export function updateClassTest(testId, updates) {
  const stored = readJson(KEYS.classTests, [])
  const all = mergeById(seedClassTests, stored)
  const next = all.map((t) =>
    t.id === testId ? { ...t, ...updates, updatedAt: now() } : t,
  )
  writeJson(KEYS.classTests, next)
  return next.find((t) => t.id === testId)
}

export function deleteClassTest(testId) {
  const stored = readJson(KEYS.classTests, [])
  const all = mergeById(seedClassTests, stored)
  writeJson(KEYS.classTests, all.filter((t) => t.id !== testId))
  // Also remove attempts
  const attempts = readJson(KEYS.classTestAttempts, [])
  writeJson(KEYS.classTestAttempts, attempts.filter((a) => a.classTestId !== testId))
}

/* ── Class Test Attempts ──────────────────────────────── */

export function getClassTestAttempts(classTestId) {
  const stored = readJson(KEYS.classTestAttempts, [])
  const seeds = seedClassTestAttempts.filter((a) => a.classTestId === classTestId)
  return mergeById(seeds, stored.filter((a) => a.classTestId === classTestId))
}

export function getTraineeTestAttempts(classId, traineeId) {
  const stored = readJson(KEYS.classTestAttempts, [])
  const seeds = seedClassTestAttempts.filter(
    (a) => a.classId === classId && a.traineeId === traineeId,
  )
  return mergeById(seeds, stored.filter(
    (a) => a.classId === classId && a.traineeId === traineeId,
  ))
}

export function submitClassTest(classTestId, classId, traineeId, answers) {
  const test = getClassTests(classId).find((t) => t.id === classTestId)
  const user = demoTrainees.find((u) => u.id === traineeId) ||
    Object.values(demoUsers).find((u) => u.id === traineeId)

  const questions = test?.questions || []
  let correctCount = 0
  answers.forEach((ans, idx) => {
    if (questions[idx] && questions[idx].correctIndex === ans) {
      correctCount++
    }
  })
  const total = questions.length || answers.length || 1
  const score = Math.round((correctCount / total) * 100)

  const attempt = {
    id: createId('cf-attempt'),
    classTestId,
    classId,
    traineeId,
    traineeName: user?.displayName || traineeId,
    answers,
    score,
    totalQuestions: total,
    correctCount,
    startedAt: now(),
    completedAt: now(),
    status: 'completed',
  }
  const current = readJson(KEYS.classTestAttempts, [])
  writeJson(KEYS.classTestAttempts, [attempt, ...current])
  return attempt
}

/* ================================================================
   FLASHCARD SETS
   ================================================================ */

export function getClassFlashcardSets(classId) {
  const stored = readJson(KEYS.flashcardSets, [])
  const seeds = seedClassFlashcardSets.filter((s) => s.classId === classId)
  return mergeById(seeds, stored.filter((s) => s.classId === classId))
}

export function getSharedFlashcardSets(classId) {
  return getClassFlashcardSets(classId).filter((s) => s.shared)
}

export function createFlashcardSet(classId, form) {
  const set = {
    id: createId('cf-fc-set'),
    classId,
    title: form.title,
    source: form.source || 'trainer_created',
    cards: form.cards || [],
    shared: form.shared || false,
    createdBy: form.createdBy || 'trainer-an',
    createdAt: today(),
  }
  const current = readJson(KEYS.flashcardSets, [])
  writeJson(KEYS.flashcardSets, [set, ...current])
  return set
}

export function generateFlashcardsAi(classId) {
  const aiCards = [
    { id: createId('fc'), front: 'What is cloud computing?', back: 'On-demand delivery of IT resources over the internet with pay-as-you-go pricing.' },
    { id: createId('fc'), front: 'What are the 3 cloud deployment models?', back: 'Public cloud, private cloud, and hybrid cloud.' },
    { id: createId('fc'), front: 'What is elasticity in cloud?', back: 'The ability to automatically scale resources up or down based on demand.' },
    { id: createId('fc'), front: 'What is high availability?', back: 'A system designed to be operational and accessible with minimal downtime.' },
  ]
  return createFlashcardSet(classId, {
    title: `AI Generated – ${new Date().toLocaleDateString()}`,
    source: 'ai_generated',
    cards: aiCards,
    shared: false,
  })
}

export function importFlashcardsFromCourse(classId, title, cards) {
  return createFlashcardSet(classId, {
    title: title || 'Imported from Course',
    source: 'imported_from_course',
    cards: cards || [],
    shared: false,
  })
}

export function shareFlashcardSet(setId) {
  const stored = readJson(KEYS.flashcardSets, [])
  const all = mergeById(seedClassFlashcardSets, stored)
  const next = all.map((s) =>
    s.id === setId ? { ...s, shared: !s.shared } : s,
  )
  writeJson(KEYS.flashcardSets, next)
  return next.find((s) => s.id === setId)
}

export function getFlashcardSetById(setId) {
  const stored = readJson(KEYS.flashcardSets, [])
  const all = mergeById(seedClassFlashcardSets, stored)
  return all.find((s) => s.id === setId) || null
}

export function updateFlashcardSet(setId, updates) {
  const stored = readJson(KEYS.flashcardSets, [])
  const all = mergeById(seedClassFlashcardSets, stored)
  const next = all.map((s) =>
    s.id === setId ? { ...s, ...updates, updatedAt: now() } : s,
  )
  writeJson(KEYS.flashcardSets, next)
  return next.find((s) => s.id === setId)
}

export function deleteFlashcardSet(setId) {
  const stored = readJson(KEYS.flashcardSets, [])
  const all = mergeById(seedClassFlashcardSets, stored)
  writeJson(KEYS.flashcardSets, all.filter((s) => s.id !== setId))
}

export function saveFlashcardsToPersonal(setId, traineeId) {
  const set = [...seedClassFlashcardSets, ...readJson(KEYS.flashcardSets, [])]
    .find((s) => s.id === setId)
  if (!set) return null

  const saved = readJson(KEYS.personalFlashcards, [])
  const entry = {
    id: createId('personal-fc'),
    originalSetId: setId,
    traineeId,
    title: set.title,
    cards: set.cards,
    savedAt: now(),
  }
  writeJson(KEYS.personalFlashcards, [entry, ...saved])
  return entry
}

export function getPersonalFlashcards(traineeId) {
  return readJson(KEYS.personalFlashcards, []).filter(
    (f) => f.traineeId === traineeId,
  )
}

/* ================================================================
   ANNOUNCEMENTS
   ================================================================ */

export function getClassAnnouncements(classId) {
  const stored = readJson(KEYS.announcements, [])
  const seeds = seedClassAnnouncements.filter((a) => a.classId === classId)
  const merged = mergeById(seeds, stored.filter((a) => a.classId === classId))
  return merged.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
}

export function createAnnouncement(classId, form) {
  const announcement = {
    id: createId('cf-ann'),
    classId,
    title: form.title,
    content: form.content,
    attachment: form.attachment || '',
    pinned: form.pinned || false,
    createdBy: form.createdBy || 'trainer-an',
    createdByName: form.createdByName || 'An Tran',
    createdAt: now(),
  }
  const current = readJson(KEYS.announcements, [])
  writeJson(KEYS.announcements, [announcement, ...current])
  return announcement
}

export function pinAnnouncement(announcementId) {
  const stored = readJson(KEYS.announcements, [])
  const all = mergeById(seedClassAnnouncements, stored)
  const next = all.map((a) =>
    a.id === announcementId ? { ...a, pinned: !a.pinned } : a,
  )
  writeJson(KEYS.announcements, next)
  return next.find((a) => a.id === announcementId)
}

/* ================================================================
   DISCUSSIONS
   ================================================================ */

export function getClassDiscussions(classId) {
  const stored = readJson(KEYS.discussions, [])
  const seeds = seedClassDiscussions.filter((d) => d.classId === classId)
  return mergeById(seeds, stored.filter((d) => d.classId === classId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function createDiscussion(classId, form) {
  const discussion = {
    id: createId('cf-disc'),
    classId,
    title: form.title,
    content: form.content,
    attachments: form.attachments || [],
    category: form.category || 'general',
    createdBy: form.createdBy || 'trainee-minh',
    createdByName: form.createdByName || 'Minh Nguyen',
    createdByRole: form.createdByRole || 'trainee',
    createdAt: now(),
    replies: [],
  }
  const current = readJson(KEYS.discussions, [])
  writeJson(KEYS.discussions, [discussion, ...current])
  return discussion
}

export function addDiscussionReply(discussionId, reply) {
  const stored = readJson(KEYS.discussions, [])
  const all = mergeById(seedClassDiscussions, stored)
  const next = all.map((d) => {
    if (d.id !== discussionId) return d
    return {
      ...d,
      replies: [
        ...(d.replies || []),
        {
          id: createId('cf-reply'),
          content: reply.content,
          attachments: reply.attachments || [],
          createdBy: reply.createdBy || 'trainee-minh',
          createdByName: reply.createdByName || 'Minh Nguyen',
          createdByRole: reply.createdByRole || 'trainee',
          createdAt: now(),
        },
      ],
    }
  })
  writeJson(KEYS.discussions, next)
  return next.find((d) => d.id === discussionId)
}

/* ================================================================
   TRAINER NOTES
   ================================================================ */

export function getTrainerNotes(classId, traineeId) {
  const stored = readJson(KEYS.trainerNotes, [])
  const seeds = seedTrainerNotes.filter(
    (n) => n.classId === classId && (!traineeId || n.traineeId === traineeId),
  )
  return mergeById(seeds, stored.filter(
    (n) => n.classId === classId && (!traineeId || n.traineeId === traineeId),
  ))
}

export function addTrainerNote(classId, traineeId, note) {
  const entry = {
    id: createId('cf-note'),
    classId,
    traineeId,
    note,
    createdBy: 'trainer-an',
    createdAt: today(),
  }
  const current = readJson(KEYS.trainerNotes, [])
  writeJson(KEYS.trainerNotes, [entry, ...current])
  return entry
}

/* ================================================================
   ANALYTICS
   ================================================================ */

export function getClassAnalytics(classId) {
  const trainees = getClassTrainees(classId)
  const assignments = getClassAssignments(classId)
  const allSubmissions = getSubmissionsByClass(classId)
  const tests = getClassTests(classId)

  const avgProgress = trainees.length > 0
    ? Math.round(trainees.reduce((s, t) => s + (t.progress || 0), 0) / trainees.length)
    : 0

  const publishedAssignments = assignments.filter((a) => a.status === 'published')
  const assignmentCompletionRate = publishedAssignments.length > 0
    ? Math.round(
        (allSubmissions.filter((s) => s.status === 'submitted' || s.status === 'graded').length /
          (publishedAssignments.length * Math.max(trainees.length, 1))) *
          100,
      )
    : 0

  const gradedSubmissions = allSubmissions.filter((s) => s.finalGrade != null)
  const avgTestScore = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((s, g) => s + g.finalGrade, 0) / gradedSubmissions.length)
    : 0

  const atRiskTrainees = trainees.filter((t) => t.risk === 'high' || t.risk === 'medium')

  return {
    totalTrainees: trainees.length,
    averageProgress: avgProgress,
    assignmentCompletionRate,
    averageTestScore: avgTestScore,
    totalAssignments: assignments.length,
    totalTests: tests.length,
    atRiskTrainees,
    weakTopics: [
      { topic: 'Cloud Pricing Models', score: 52 },
      { topic: 'Security & Compliance', score: 58 },
      { topic: 'Shared Responsibility Model', score: 61 },
    ],
    aiRecommendations: [
      { type: 'review', text: 'Schedule a focused review session on Cloud Pricing Models.' },
      { type: 'support', text: 'Provide 1:1 support for high-risk trainees on Security topics.' },
    ],
  }
}

export function getTraineeClassProgress(classId, traineeId) {
  const trainee = getClassTrainees(classId).find((t) => t.traineeId === traineeId)
  const assignments = getClassAssignments(classId).filter((a) => a.status === 'published')
  const submissions = getSubmissionsByClass(classId).filter((s) => s.traineeId === traineeId)
  const attempts = getTraineeTestAttempts(classId, traineeId)

  const completedAssignments = submissions.filter(
    (s) => s.status === 'submitted' || s.status === 'graded',
  )
  const gradedSubmissions = submissions.filter((s) => s.finalGrade != null)
  const avgGrade = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((s, g) => s + g.finalGrade, 0) / gradedSubmissions.length)
    : 0

  const avgTestScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
    : 0

  return {
    courseProgress: trainee?.progress || 0,
    assignmentTotal: assignments.length,
    assignmentCompleted: completedAssignments.length,
    assignmentAvgGrade: avgGrade,
    testAttempts: attempts.length,
    testAvgScore: avgTestScore,
    flashcardStudied: 0,
    weakAreas: trainee?.weakTopic ? [trainee.weakTopic] : [],
    suggestions: [
      'Review Cloud Pricing Models lessons before the next test.',
      'Practice flashcards on Security & Compliance.',
    ],
  }
}
