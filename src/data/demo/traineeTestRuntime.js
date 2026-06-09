import { demoAttempts } from './demoAttempts'
import { demoQuestions } from './demoQuestions'
import { getEnrollmentsByUser } from './demoRuntime'
import {
  getAllLifecycleTests,
  getLifecycleCourseById,
  getLifecycleModules,
  getLifecycleQuestionsForTest,
} from './courseLifecycleRuntime'
import {
  getClassFlowClassById,
  getClassesByTrainee,
  getClassTests,
  getTraineeTestAttempts,
} from './classFlowRuntime'

const KEYS = {
  personalTests: 'slp.demo.unifiedTests.personal',
  attempts: 'slp.demo.unifiedTests.attempts',
  issues: 'slp.demo.unifiedTests.issues',
}

export const TEST_TYPES = ['simulation', 'mock', 'module', 'practice']
export const QUESTION_TYPES = ['single_choice', 'multiple_response', 'fill_blank', 'matching']

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
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function now() {
  return new Date().toISOString()
}

function normalizeType(type, fallback = 'module') {
  const value = String(type || '').toLowerCase()
  if (value.includes('simulation')) return 'simulation'
  if (value.includes('mock')) return 'mock'
  if (value.includes('practice')) return 'practice'
  if (value.includes('module')) return 'module'
  return fallback
}

function normalizeQuestion(question, index = 0) {
  const type = question.type === 'multiple_choice' ? 'multiple_response' : question.type
  const id = question.id || `question-${index}`

  if (type === 'matching') {
    return {
      ...question,
      id,
      type,
      status: 'published',
      pairs: (question.pairs || []).map((pair, pairIndex) => ({
        id: pair.id || `${id}-pair-${pairIndex + 1}`,
        prompt: pair.prompt,
        answer: pair.answer,
      })),
    }
  }

  return {
    ...question,
    id,
    type: QUESTION_TYPES.includes(type) ? type : 'single_choice',
    status: 'published',
  }
}

function normalizeCourseTest(test) {
  const questions = getLifecycleQuestionsForTest(test)
    .filter((question) => question.status === 'published')
    .map(normalizeQuestion)

  return {
    ...test,
    type: normalizeType(test.type, 'module'),
    source: 'official_course',
    ownerType: 'official',
    status: test.status === 'published' ? 'published' : test.status,
    durationMinutes: Number(test.durationMinutes) || 20,
    totalQuestions: questions.length,
    questions,
  }
}

function normalizeClassQuestion(question, index) {
  return normalizeQuestion({
    id: question.id || `class-question-${index}`,
    question: question.question || question.text,
    type: question.type || 'single_choice',
    topic: question.topic || 'Class assessment',
    difficulty: question.difficulty || 'medium',
    options: (question.options || []).map((option, optionIndex) =>
      typeof option === 'string'
        ? { id: `${question.id || `class-question-${index}`}-${optionIndex}`, text: option }
        : option,
    ),
    correctOptionIds: question.correctOptionIds || (
      Number.isInteger(question.correctIndex)
        ? [`${question.id || `class-question-${index}`}-${question.correctIndex}`]
        : []
    ),
    correctAnswers: question.correctAnswers,
    pairs: question.pairs,
    explanation: question.explanation || 'Review the related class materials for more detail.',
    source: 'Official class test',
  }, index)
}

function normalizeClassTest(test, classData) {
  const linkedCourseTest = test.courseTestId
    ? getAllLifecycleTests().find((item) => item.id === test.courseTestId)
    : null
  const rawQuestions = test.questions?.length
    ? test.questions
    : linkedCourseTest
      ? getLifecycleQuestionsForTest(linkedCourseTest)
      : []
  const questions = rawQuestions
    .filter((question) => !question.status || question.status === 'published')
    .map(normalizeClassQuestion)

  return {
    ...test,
    courseId: classData?.courseId,
    courseTitle: classData?.courseTitle,
    classId: classData?.id,
    className: classData?.className,
    type: normalizeType(test.type, 'module'),
    source: 'official_class',
    ownerType: 'official',
    status: test.status,
    durationMinutes: Number(test.timeLimit) || 20,
    dueAt: test.dueDate,
    totalQuestions: questions.length,
    passingScore: Number(test.passingScore) || 70,
    questions,
  }
}

function getStoredAttempts() {
  return readJson(KEYS.attempts, [])
}

function setStoredAttempts(attempts) {
  writeJson(KEYS.attempts, attempts)
}

function getSeedAttempts(traineeId) {
  return demoAttempts
    .filter((attempt) => attempt.traineeId === traineeId && attempt.status === 'completed')
    .map((attempt) => {
      const savedAnswers = attempt.answers || []
      return {
        ...attempt,
        answers: Object.fromEntries(
          savedAnswers.map((answer) => [
            answer.questionId,
            answer.selectedOptionIds?.length === 1
              ? answer.selectedOptionIds[0]
              : answer.selectedOptionIds || [],
          ]),
        ),
        correctness: Object.fromEntries(savedAnswers.map((answer) => [answer.questionId, answer.isCorrect])),
        questionSnapshot: savedAnswers
          .map((answer) => demoQuestions.find((question) => question.id === answer.questionId))
          .filter(Boolean)
          .map(normalizeQuestion),
        status: 'completed',
        updatedAt: attempt.submittedAt,
      }
    })
}

function getClassSeedAttempts(traineeId) {
  return getAccessibleClasses(traineeId).flatMap((classData) => {
    const tests = getClassTests(classData.id).map((test) => normalizeClassTest(test, classData))
    return getTraineeTestAttempts(classData.id, traineeId).map((attempt) => {
      const test = tests.find((item) => item.id === attempt.classTestId)
      const answers = Object.fromEntries(
        (test?.questions || []).map((question, index) => [
          question.id,
          question.options?.[attempt.answers?.[index]]?.id || '',
        ]),
      )
      return {
        ...attempt,
        testId: attempt.classTestId,
        answers,
        correctness: Object.fromEntries((test?.questions || []).map((question) => [
          question.id,
          isQuestionCorrect(question, answers[question.id]),
        ])),
        questionSnapshot: test?.questions || [],
        submittedAt: attempt.completedAt,
        updatedAt: attempt.completedAt,
      }
    })
  })
}

export function getAttemptsForTrainee(traineeId) {
  const stored = [
    ...getStoredAttempts(),
    ...readJson('slp.demo.testAttempts', []),
  ].filter((attempt) => (attempt.traineeId || attempt.userId) === traineeId)
    .map((attempt) => ({ ...attempt, traineeId: attempt.traineeId || attempt.userId }))
  const storedIds = new Set(stored.map((attempt) => attempt.id))
  return [
    ...stored,
    ...getSeedAttempts(traineeId),
    ...getClassSeedAttempts(traineeId),
  ].filter((attempt, index) => !storedIds.has(attempt.id) || index < stored.length)
    .filter((attempt, index, items) => items.findIndex((item) => item.id === attempt.id) === index)
}

export function getAttemptsForTest(testId, traineeId) {
  return getAttemptsForTrainee(traineeId)
    .filter((attempt) => attempt.testId === testId)
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0))
}

export function getAttemptById(attemptId, traineeId) {
  return getAttemptsForTrainee(traineeId)
    .find((attempt) => attempt.id === attemptId && attempt.traineeId === traineeId)
}

export function getPersonalTests(traineeId, { includeArchived = false } = {}) {
  return readJson(KEYS.personalTests, [])
    .filter((test) => test.ownerId === traineeId && (includeArchived || test.status !== 'archived'))
}

function getAccessibleCourseIds(traineeId) {
  return new Set(getEnrollmentsByUser(traineeId).map((enrollment) => enrollment.courseId))
}

function getAccessibleClasses(traineeId) {
  const classes = getClassesByTrainee(traineeId)
  const byId = new Map(classes.map((item) => [item.id, item]))
  getEnrollmentsByUser(traineeId).forEach((enrollment) => {
    if (enrollment.classId && !byId.has(enrollment.classId)) {
      const classData = getClassFlowClassById(enrollment.classId)
      if (classData) byId.set(classData.id, classData)
    }
  })
  return Array.from(byId.values())
}

export function getTestsForTrainee(traineeId, { classId, includeArchived = false } = {}) {
  const courseIds = getAccessibleCourseIds(traineeId)
  const courseTests = getAllLifecycleTests()
    .map(normalizeCourseTest)
    .filter((test) => test.status === 'published' && courseIds.has(test.courseId) && !test.generated)
  const classTests = getAccessibleClasses(traineeId)
    .filter((classData) => !classId || classData.id === classId)
    .flatMap((classData) => getClassTests(classData.id).map((test) => normalizeClassTest(test, classData)))
    .filter((test) => ['published', 'closed'].includes(test.status))
  const personalTests = classId ? [] : getPersonalTests(traineeId, { includeArchived })

  return [...courseTests, ...classTests, ...personalTests].map((test) => {
    const attempts = getAttemptsForTest(test.id, traineeId)
    const completed = attempts.filter((attempt) => attempt.status === 'completed')
    const inProgress = attempts.find((attempt) => attempt.status === 'in_progress')
    const scores = completed.map((attempt) => attempt.score)

    return {
      ...test,
      attemptCount: completed.length,
      latestScore: completed[0]?.score ?? null,
      bestScore: scores.length ? Math.max(...scores) : null,
      inProgressAttemptId: inProgress?.id || null,
      learnerStatus: inProgress ? 'In Progress' : completed.length ? 'Completed' : 'Not Started',
    }
  })
}

export function getTestForTrainee(testId, traineeId) {
  return getTestsForTrainee(traineeId, { includeArchived: true }).find((test) => test.id === testId) || null
}

export function getTraineeCourseOptions(traineeId) {
  return getEnrollmentsByUser(traineeId)
    .map((enrollment) => getLifecycleCourseById(enrollment.courseId))
    .filter(Boolean)
}

export function getGenerationModules(courseId) {
  return getLifecycleModules(courseId)
}

function getQuestionPool(courseId) {
  const lifecycleQuestions = getAllLifecycleTests()
    .filter((test) => test.courseId === courseId)
    .flatMap(getLifecycleQuestionsForTest)
  const unique = new Map()
  ;[...demoQuestions, ...lifecycleQuestions].forEach((question, index) => {
    if (question.courseId === courseId && question.status === 'published') {
      const normalized = normalizeQuestion(question, index)
      unique.set(normalized.id, normalized)
    }
  })
  return Array.from(unique.values())
}

function createUploadQuestions(form) {
  const topic = form.uploadedFileName || 'Uploaded personal material'
  const requestedTypes = form.questionTypes?.length ? form.questionTypes : QUESTION_TYPES
  const templates = {
    single_choice: {
      question: `Which statement best summarizes ${topic}?`,
      options: [
        { id: 'a', text: 'The main concept described in the uploaded material' },
        { id: 'b', text: 'An unrelated system setting' },
        { id: 'c', text: 'A payment verification process' },
        { id: 'd', text: 'An administrative role assignment' },
      ],
      correctOptionIds: ['a'],
    },
    multiple_response: {
      question: `Which actions help review ${topic}?`,
      options: [
        { id: 'a', text: 'Identify key concepts' },
        { id: 'b', text: 'Practice recall' },
        { id: 'c', text: 'Ignore difficult sections' },
        { id: 'd', text: 'Skip all examples' },
      ],
      correctOptionIds: ['a', 'b'],
    },
    fill_blank: {
      question: `Complete the phrase: The source for this practice test is _____.`,
      correctAnswers: [topic],
    },
    matching: {
      question: `Match the review activity with its purpose for ${topic}.`,
      pairs: [
        { id: 'p1', prompt: 'Summarize', answer: 'Capture the main idea' },
        { id: 'p2', prompt: 'Practice', answer: 'Check active recall' },
      ],
    },
  }

  return requestedTypes.map((type, index) => normalizeQuestion({
    id: `upload-question-${Date.now()}-${index}`,
    type,
    topic,
    difficulty: form.difficulty === 'mixed' ? 'medium' : form.difficulty,
    source: `Demo AI-generated from ${topic}`,
    isAiGenerated: true,
    explanation: 'This is a transparent demo question generated from uploaded-file metadata.',
    ...templates[type],
  }, index))
}

function selectGeneratedQuestions(form) {
  if (form.sourceType === 'upload') return createUploadQuestions(form)

  const moduleLessonIds = new Set(
    getLifecycleModules(form.courseId)
      .filter((module) => !form.selectedModuleIds?.length || form.selectedModuleIds.includes(module.id))
      .flatMap((module) => module.lessons.map((lesson) => lesson.id)),
  )
  const requestedTypes = form.questionTypes?.length ? form.questionTypes : QUESTION_TYPES
  const basePool = getQuestionPool(form.courseId).filter((question) => {
    const moduleMatch = !form.selectedModuleIds?.length || moduleLessonIds.has(question.lessonId)
    const topicMatch = !form.topic || question.topic === form.topic
    return moduleMatch && topicMatch && requestedTypes.includes(question.type)
  })
  const difficultyPool = basePool.filter((question) =>
    !form.difficulty || form.difficulty === 'mixed' || question.difficulty === form.difficulty,
  )
  const pool = difficultyPool.length ? difficultyPool : basePool

  return pool.slice(0, Math.max(1, Number(form.totalQuestions) || 10))
}

export function createPersonalTest(traineeId, form, previousVersionId = null) {
  const questions = selectGeneratedQuestions(form)
  const timestamp = now()
  const test = {
    id: createId('personal-test'),
    ownerId: traineeId,
    ownerType: 'trainee',
    courseId: form.courseId,
    courseTitle: getLifecycleCourseById(form.courseId)?.title,
    title: form.title,
    description: form.description || 'Personal AI-generated test.',
    type: normalizeType(form.type, 'practice'),
    source: 'personal_ai',
    status: 'published',
    durationMinutes: Number(form.durationMinutes) || 20,
    passingScore: 70,
    totalQuestions: questions.length,
    requestedQuestions: Number(form.totalQuestions) || 10,
    questions,
    generationConfig: {
      sourceType: form.sourceType,
      selectedModuleIds: form.selectedModuleIds || [],
      topic: form.topic || '',
      difficulty: form.difficulty || 'mixed',
      questionTypes: form.questionTypes || [],
      purpose: form.purpose || '',
      uploadedFileName: form.uploadedFileName || '',
    },
    version: previousVersionId
      ? (getPersonalTests(traineeId, { includeArchived: true }).find((item) => item.id === previousVersionId)?.version || 1) + 1
      : 1,
    previousVersionId,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const current = readJson(KEYS.personalTests, [])
  writeJson(KEYS.personalTests, [test, ...current])
  return test
}

export function updatePersonalTest(traineeId, testId, form) {
  const attempts = getAttemptsForTest(testId, traineeId).filter((attempt) => attempt.status === 'completed')
  if (attempts.length) {
    archivePersonalTest(traineeId, testId)
    return createPersonalTest(traineeId, form, testId)
  }

  const questions = selectGeneratedQuestions(form)
  const tests = readJson(KEYS.personalTests, [])
  const next = tests.map((test) => test.id === testId && test.ownerId === traineeId
    ? {
        ...test,
        title: form.title,
        description: form.description,
        type: normalizeType(form.type, 'practice'),
        durationMinutes: Number(form.durationMinutes) || 20,
        totalQuestions: questions.length,
        requestedQuestions: Number(form.totalQuestions) || 10,
        questions,
        generationConfig: {
          sourceType: form.sourceType,
          selectedModuleIds: form.selectedModuleIds || [],
          topic: form.topic || '',
          difficulty: form.difficulty || 'mixed',
          questionTypes: form.questionTypes || [],
          purpose: form.purpose || '',
          uploadedFileName: form.uploadedFileName || '',
        },
        updatedAt: now(),
      }
    : test)
  writeJson(KEYS.personalTests, next)
  return next.find((test) => test.id === testId)
}

export function archivePersonalTest(traineeId, testId) {
  const tests = readJson(KEYS.personalTests, [])
  writeJson(KEYS.personalTests, tests.map((test) =>
    test.id === testId && test.ownerId === traineeId
      ? { ...test, status: 'archived', updatedAt: now() }
      : test,
  ))
}

export function deletePersonalTest(traineeId, testId) {
  if (getAttemptsForTest(testId, traineeId).length) {
    archivePersonalTest(traineeId, testId)
    return
  }
  writeJson(KEYS.personalTests, readJson(KEYS.personalTests, [])
    .filter((test) => !(test.id === testId && test.ownerId === traineeId)))
}

export function startOrResumeAttempt(testId, traineeId) {
  const test = getTestForTrainee(testId, traineeId)
  if (!test || !test.questions.length || ['closed', 'archived'].includes(test.status)) return null
  const existing = getAttemptsForTest(testId, traineeId).find((attempt) => attempt.status === 'in_progress')
  if (existing) {
    if (!getStoredAttempts().some((attempt) => attempt.id === existing.id)) {
      setStoredAttempts([existing, ...getStoredAttempts()])
    }
    return existing
  }

  const attempt = {
    id: createId('attempt'),
    testId,
    traineeId,
    classId: test.classId || null,
    courseId: test.courseId,
    status: 'in_progress',
    answers: {},
    questionSnapshot: test.questions,
    startedAt: now(),
    updatedAt: now(),
    submittedAt: null,
    score: null,
    correctCount: 0,
    totalQuestions: test.questions.length,
    weakTopics: [],
  }
  setStoredAttempts([attempt, ...getStoredAttempts()])
  return attempt
}

export function saveAttemptAnswers(attemptId, traineeId, answers) {
  let saved = null
  setStoredAttempts(getStoredAttempts().map((attempt) => {
    if (attempt.id !== attemptId || attempt.traineeId !== traineeId || attempt.status !== 'in_progress') return attempt
    saved = { ...attempt, answers, updatedAt: now() }
    return saved
  }))
  return saved
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function isQuestionCorrect(question, answer) {
  if (question.type === 'fill_blank') {
    return (question.correctAnswers || []).some((expected) => normalizeText(expected) === normalizeText(answer))
  }
  if (question.type === 'matching') {
    return (question.pairs || []).every((pair) => normalizeText(answer?.[pair.id]) === normalizeText(pair.answer))
  }
  const selected = Array.isArray(answer) ? answer : answer ? [answer] : []
  const expected = question.correctOptionIds || []
  return expected.length > 0 && expected.length === selected.length && expected.every((id) => selected.includes(id))
}

export function submitAttempt(attemptId, traineeId, answers) {
  const attempt = getAttemptById(attemptId, traineeId)
  if (!attempt || attempt.status !== 'in_progress') return null
  const correctness = Object.fromEntries(
    attempt.questionSnapshot.map((question) => [question.id, isQuestionCorrect(question, answers[question.id])]),
  )
  const correctCount = Object.values(correctness).filter(Boolean).length
  const totalQuestions = attempt.questionSnapshot.length
  const score = Math.round((correctCount / Math.max(totalQuestions, 1)) * 100)
  const weakTopics = [...new Set(
    attempt.questionSnapshot
      .filter((question) => !correctness[question.id])
      .map((question) => question.topic || 'General review'),
  )]
  let result = null
  setStoredAttempts(getStoredAttempts().map((item) => {
    if (item.id !== attemptId || item.traineeId !== traineeId) return item
    result = {
      ...item,
      answers,
      correctness,
      correctCount,
      totalQuestions,
      score,
      weakTopics,
      status: 'completed',
      updatedAt: now(),
      submittedAt: now(),
    }
    return result
  }))
  return result
}

export function reportQuestionIssue({ traineeId, testId, attemptId, questionId, message }) {
  const issue = {
    id: createId('question-issue'),
    traineeId,
    testId,
    attemptId,
    questionId,
    message: message || 'Question or answer may be unclear.',
    status: 'open',
    createdAt: now(),
  }
  writeJson(KEYS.issues, [issue, ...readJson(KEYS.issues, [])])
  return issue
}

export function getTopicsForCourse(courseId) {
  return [...new Set(getQuestionPool(courseId).map((question) => question.topic).filter(Boolean))]
}
