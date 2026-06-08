import { demoQuestions } from './demoQuestions'
import {
  getGeneratedResources,
  getLifecycleCourseById,
  getLifecycleModules,
} from './courseLifecycleRuntime'
import { ROLES } from '@/shared/constants/roles'

const STORAGE_KEYS = {
  questions: 'slp.demo.sme.questions',
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

function normalizeQuestion(question) {
  return {
    id: question.id,
    courseId: question.courseId || 'course-aws',
    lessonId: question.lessonId || '',
    question: question.question,
    type: question.type || 'single_choice',
    clo: question.clo || 'CLO-AI',
    bloom: question.bloom || 'Understand',
    difficulty: question.difficulty || 'medium',
    status: question.status || 'review',
    source: question.source || 'Question bank',
    isAiGenerated: Boolean(question.isAiGenerated),
    answer: question.answer || question.explanation || '',
    explanation: question.explanation || question.answer || '',
    options: question.options || [],
    createdAt: question.createdAt || new Date().toISOString(),
    updatedAt: question.updatedAt || '',
  }
}

function getStoredQuestions() {
  return readJson(STORAGE_KEYS.questions, [])
}

function setStoredQuestions(questions) {
  writeJson(STORAGE_KEYS.questions, questions)
}

function getGeneratedQuestionDrafts() {
  return getGeneratedResources({ type: 'questions' })
    .filter((resource) => resource.createdByRole === ROLES.SME)
    .flatMap((resource) =>
      (resource.content || []).map((item, index) =>
        normalizeQuestion({
          id: `${resource.id}-question-${index}`,
          courseId: resource.courseId,
          lessonId: resource.lessonId,
          question: item.question,
          answer: item.answer,
          explanation: item.answer,
          type: 'short_answer',
          clo: 'CLO-AI',
          bloom: 'Understand',
          difficulty: 'medium',
          status: 'review',
          source: 'AI-generated from SME Course Builder',
          isAiGenerated: true,
          createdAt: resource.createdAt,
        }),
      ),
    )
}

export function getSmeQuestionBank() {
  const stored = getStoredQuestions()
  const storedById = new Map(stored.map((item) => [item.id, item]))

  const baseQuestions = demoQuestions.map((question) => ({
    ...normalizeQuestion(question),
    ...(storedById.get(question.id) || {}),
  }))

  const generatedQuestions = getGeneratedQuestionDrafts().map((question) => ({
    ...question,
    ...(storedById.get(question.id) || {}),
  }))

  const baseIds = new Set([
    ...baseQuestions.map((item) => item.id),
    ...generatedQuestions.map((item) => item.id),
  ])

  const localOnly = stored.filter((item) => !baseIds.has(item.id))

  return [...baseQuestions, ...generatedQuestions, ...localOnly]
}

export function getSmeQuestionById(questionId) {
  return getSmeQuestionBank().find((item) => item.id === questionId)
}

export function updateSmeQuestion(questionId, payload) {
  const current = getStoredQuestions()
  const existing =
    getSmeQuestionById(questionId) || current.find((item) => item.id === questionId)

  if (!existing) return null

  const updatedQuestion = {
    ...existing,
    ...payload,
    updatedAt: new Date().toISOString(),
  }

  const existsInStored = current.some((item) => item.id === questionId)

  if (existsInStored) {
    setStoredQuestions(
      current.map((item) => (item.id === questionId ? updatedQuestion : item)),
    )
  } else {
    setStoredQuestions([updatedQuestion, ...current])
  }

  return updatedQuestion
}

export function approveSmeQuestion(questionId) {
  return updateSmeQuestion(questionId, { status: 'approved' })
}

export function rejectSmeQuestion(questionId) {
  return updateSmeQuestion(questionId, { status: 'rejected' })
}

export function createAiDraftQuestion(payload = {}) {
  const course = getLifecycleCourseById(payload.courseId || 'course-aws')

  const question = normalizeQuestion({
    id: createId('sme-ai-question'),
    courseId: payload.courseId || course?.id || 'course-aws',
    lessonId: payload.lessonId || '',
    question:
      payload.question ||
      `Which statement best describes ${course?.title || 'the selected course'}?`,
    answer:
      payload.answer ||
      'The best answer should match the course learning outcome and lesson explanation.',
    explanation:
      payload.explanation ||
      'AI-generated mock explanation. SME must review before approval.',
    type: payload.type || 'single_choice',
    clo: payload.clo || 'CLO-AI',
    bloom: payload.bloom || 'Understand',
    difficulty: payload.difficulty || 'medium',
    status: 'review',
    source: 'AI-generated draft',
    isAiGenerated: true,
    createdAt: new Date().toISOString(),
  })

  setStoredQuestions([question, ...getStoredQuestions()])

  return question
}

export function getSmeContentQualityReport(courseId) {
  const course = getLifecycleCourseById(courseId)
  const modules = getLifecycleModules(courseId)
  const lessons = modules.flatMap((module) => module.lessons || [])
  const questions = getSmeQuestionBank().filter(
    (question) => question.courseId === courseId,
  )

  const missingObjectives = lessons.filter(
    (lesson) =>
      !Array.isArray(lesson.learningObjectives) ||
      lesson.learningObjectives.length === 0,
  )

  const lessonsWithoutMaterials = lessons.filter(
    (lesson) =>
      !Array.isArray(lesson.materials) ||
      lesson.materials.length === 0,
  )

  const reviewQuestions = questions.filter(
    (question) => question.status === 'review' || question.status === 'draft',
  )

  const approvedQuestions = questions.filter(
    (question) => question.status === 'approved',
  )

  const issues = [
    {
      id: 'missing-objectives',
      title: 'Lessons missing learning objectives',
      value: missingObjectives.length,
      severity: missingObjectives.length > 0 ? 'warning' : 'good',
      description:
        missingObjectives.length > 0
          ? 'Some lessons do not have clear learning objectives.'
          : 'All lessons have learning objectives.',
    },
    {
      id: 'missing-materials',
      title: 'Lessons without uploaded material',
      value: lessonsWithoutMaterials.length,
      severity: lessonsWithoutMaterials.length > 0 ? 'warning' : 'good',
      description:
        lessonsWithoutMaterials.length > 0
          ? 'Some lessons do not have supporting documents or references.'
          : 'Lesson materials are available.',
    },
    {
      id: 'question-review',
      title: 'AI questions waiting for SME review',
      value: reviewQuestions.length,
      severity: reviewQuestions.length > 0 ? 'warning' : 'good',
      description:
        reviewQuestions.length > 0
          ? 'AI-generated questions need approve/reject/edit decision.'
          : 'No pending AI question review.',
    },
    {
      id: 'approved-questions',
      title: 'Approved question coverage',
      value: approvedQuestions.length,
      severity: approvedQuestions.length >= modules.length ? 'good' : 'warning',
      description:
        approvedQuestions.length >= modules.length
          ? 'Question coverage is acceptable for demo.'
          : 'Approved question count is lower than module count.',
    },
  ]

  const warningCount = issues.filter((item) => item.severity === 'warning').length
  const score = Math.max(0, 100 - warningCount * 20)

  return {
    courseTitle: course?.title || 'Selected course',
    moduleCount: modules.length,
    lessonCount: lessons.length,
    questionCount: questions.length,
    approvedQuestionCount: approvedQuestions.length,
    pendingQuestionCount: reviewQuestions.length,
    score,
    issues,
  }
}