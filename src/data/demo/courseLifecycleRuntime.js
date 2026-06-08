import { demoCourses, demoModules } from './demoCourses'
import { demoQuestions } from './demoQuestions'
import { demoTests } from './demoTests'
import { demoUsers } from './demoUsers'
import { ROLES } from '@/shared/constants/roles'
import {
  COURSE_STATUSES,
  isCoursePublished,
  normalizeCourseStatus,
} from './courseLifecycle'

const LOCAL_COURSES_KEY = 'slp.courseflow.courses'
const COURSE_REVIEW_KEY = 'slp.courseflow.reviews'
const LESSON_DRAFTS_KEY = 'slp.courseflow.lessonDrafts'
const LOCAL_MODULES_KEY = 'slp.courseflow.modules'
const GENERATED_RESOURCES_KEY = 'slp.courseflow.generatedResources'
const GENERATED_TESTS_KEY = 'slp.courseflow.generatedTests'
const LESSON_NOTES_KEY = 'slp.courseflow.lessonNotes'

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

function nowIso() {
  return new Date().toISOString()
}

function today() {
  return nowIso().slice(0, 10)
}

function slugify(value) {
  return String(value || 'course')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function getDefaultCourseStatus(course) {
  const statusByCourseId = {
    'course-aws': COURSE_STATUSES.PUBLISHED,
    'course-data': COURSE_STATUSES.SUBMITTED_FOR_REVIEW,
    'course-ai-literacy': COURSE_STATUSES.REVISION_REQUIRED,
    'course-react-product-ui': COURSE_STATUSES.PUBLISHED,
    'course-java-spring-api': COURSE_STATUSES.VERIFIED,
    'course-sql-analytics': COURSE_STATUSES.PUBLISHED,
    'course-ux-research': COURSE_STATUSES.ASSIGNED_TO_SME,
    'course-cybersecurity-basics': COURSE_STATUSES.CONTENT_EDITING,
  }

  return statusByCourseId[course.id] || normalizeCourseStatus(course.status)
}

function enrichCourse(course) {
  const status = normalizeCourseStatus(getDefaultCourseStatus(course))
  const assignedSmeId = course.assignedSmeId || course.ownerId || 'sme-lan'

  return {
    ...course,
    fullDescription:
      course.fullDescription ||
      `${course.shortDescription} The course is managed through the SLP course lifecycle and reviewed before publication.`,
    targetLearners:
      course.targetLearners ||
      'Trainees who need structured practice and AI-supported review.',
    requirements:
      course.requirements ||
      'Basic familiarity with the course topic and access to the SLP learning workspace.',
    learningOutcomes: course.learningOutcomes || course.outcomes || [],
    thumbnail:
      course.thumbnail ||
      `https://placehold.co/720x405/eaf2ff/1d4ed8?text=${encodeURIComponent(course.category || 'SLP')}`,
    status,
    assignedSmeId,
    assignedSmeName: demoUsers[ROLES.SME]?.displayName || 'Lan Pham',
    createdByTmoId: course.createdByTmoId || demoUsers[ROLES.TMO]?.id || 'tmo-ha',
    createdByTmoName: course.createdByTmoName || demoUsers[ROLES.TMO]?.displayName || 'Ha Le',
    revisionReason:
      course.revisionReason ||
      (status === COURSE_STATUSES.REVISION_REQUIRED
        ? 'Please complete the AI resource review notes and add clearer lesson outcomes before resubmitting.'
        : ''),
    createdAt: course.createdAt || course.updatedAt || today(),
    updatedAt: course.updatedAt || today(),
    learnerCount: course.learnerCount || course.enrolledCount || 0,
    modules: course.moduleCount || course.modules || 0,
    lessons: course.lessonCount || course.lessons || 0,
    rating: course.rating,
    owner: course.owner || demoUsers[ROLES.SME]?.displayName || 'Lan Pham',
  }
}

function getStoredCourses() {
  return readJson(LOCAL_COURSES_KEY, []).filter((course) => {
    return course && course.id && course.title
  })
}

function setStoredCourses(courses) {
  writeJson(LOCAL_COURSES_KEY, courses)
}

export function getAllLifecycleCourses() {
  const storedCourses = getStoredCourses()
  const storedById = new Map(storedCourses.map((course) => [course.id, course]))
  const baseCourses = demoCourses.map((course) => ({
    ...enrichCourse(course),
    ...(storedById.get(course.id) || {}),
  }))

  const baseIds = new Set(baseCourses.map((course) => course.id))
  const localOnlyCourses = storedCourses.filter((course) => !baseIds.has(course.id))

  return [...baseCourses, ...localOnlyCourses].map((course) => ({
    ...course,
    status: normalizeCourseStatus(course.status),
  }))
}

export function getPublishedLifecycleCourses() {
  return getAllLifecycleCourses().filter(isCoursePublished)
}

export function getLifecycleCourseById(courseId) {
  return getAllLifecycleCourses().find((course) => course.id === courseId)
}

export function saveLifecycleCourse(course) {
  const storedCourses = getStoredCourses()
  const index = storedCourses.findIndex((item) => item.id === course.id)
  const nextCourse = {
    ...course,
    status: normalizeCourseStatus(course.status),
    updatedAt: today(),
  }

  if (index >= 0) {
    storedCourses[index] = nextCourse
    setStoredCourses(storedCourses)
    return nextCourse
  }

  setStoredCourses([...storedCourses, nextCourse])
  return nextCourse
}

export function createLifecycleCourse(payload, status = COURSE_STATUSES.DRAFT) {
  const id = `course-${slugify(payload.title)}-${Date.now()}`
  const course = {
    id,
    slug: slugify(payload.title),
    title: payload.title,
    shortDescription: payload.shortDescription,
    fullDescription: payload.fullDescription,
    category: payload.category,
    level: payload.level,
    status,
    price: Number(payload.price) || 0,
    currency: 'VND',
    thumbnail: payload.thumbnail,
    targetLearners: payload.targetLearners,
    requirements: payload.requirements,
    outcomes: payload.learningOutcomes,
    learningOutcomes: payload.learningOutcomes,
    assignedSmeId: payload.assignedSmeId || '',
    assignedSmeName: getSmeName(payload.assignedSmeId),
    expectedCompletionDate: payload.expectedCompletionDate || '',
    createdByTmoId: demoUsers[ROLES.TMO]?.id || 'tmo-ha',
    createdByTmoName: demoUsers[ROLES.TMO]?.displayName || 'Ha Le',
    createdAt: today(),
    updatedAt: today(),
    duration: payload.duration || 'To be planned',
    moduleCount: 0,
    lessonCount: 0,
    modules: 0,
    lessons: 0,
    learnerCount: 0,
    enrolledCount: 0,
    rating: null,
    ownerId: payload.assignedSmeId || '',
    owner: getSmeName(payload.assignedSmeId),
    revisionReason: '',
  }

  addReviewHistory(id, {
    reviewerId: course.createdByTmoId,
    reviewerName: course.createdByTmoName,
    action: status === COURSE_STATUSES.DRAFT ? 'created_draft' : 'assigned_to_sme',
    comment:
      status === COURSE_STATUSES.DRAFT
        ? 'Course structure created as draft.'
        : 'Course structure created and assigned to SME.',
  })

  return saveLifecycleCourse(course)
}

export function updateCourseStatus(courseId, status, extras = {}) {
  const course = getLifecycleCourseById(courseId)
  if (!course) return null

  return saveLifecycleCourse({
    ...course,
    ...extras,
    status,
  })
}

export function assignCourseToSme(courseId, smeId) {
  const course = getLifecycleCourseById(courseId)
  if (!course) return null

  addReviewHistory(courseId, {
    reviewerId: demoUsers[ROLES.TMO]?.id || 'tmo-ha',
    reviewerName: demoUsers[ROLES.TMO]?.displayName || 'Ha Le',
    action: 'assigned_to_sme',
    comment: `Assigned course content ownership to ${getSmeName(smeId)}.`,
  })

  return saveLifecycleCourse({
    ...course,
    status:
      normalizeCourseStatus(course.status) === COURSE_STATUSES.DRAFT
        ? COURSE_STATUSES.ASSIGNED_TO_SME
        : course.status,
    assignedSmeId: smeId,
    assignedSmeName: getSmeName(smeId),
    ownerId: smeId,
    owner: getSmeName(smeId),
  })
}

export function submitCourseForTmoReview(courseId) {
  addReviewHistory(courseId, {
    reviewerId: demoUsers[ROLES.SME]?.id || 'sme-lan',
    reviewerName: demoUsers[ROLES.SME]?.displayName || 'Lan Pham',
    action: 'submitted_for_review',
    comment: 'SME submitted course content for TMO review.',
  })

  return updateCourseStatus(courseId, COURSE_STATUSES.SUBMITTED_FOR_REVIEW, {
    revisionReason: '',
  })
}

export function verifyCourseContent(courseId, comment = 'Content verified by TMO.') {
  addReviewHistory(courseId, {
    reviewerId: demoUsers[ROLES.TMO]?.id || 'tmo-ha',
    reviewerName: demoUsers[ROLES.TMO]?.displayName || 'Ha Le',
    action: 'verified',
    comment,
  })

  return updateCourseStatus(courseId, COURSE_STATUSES.VERIFIED)
}

export function requestCourseRevision(courseId, comment) {
  addReviewHistory(courseId, {
    reviewerId: demoUsers[ROLES.TMO]?.id || 'tmo-ha',
    reviewerName: demoUsers[ROLES.TMO]?.displayName || 'Ha Le',
    action: 'revision_required',
    comment,
  })

  return updateCourseStatus(courseId, COURSE_STATUSES.REVISION_REQUIRED, {
    revisionReason: comment,
  })
}

export function publishCourse(courseId) {
  addReviewHistory(courseId, {
    reviewerId: demoUsers[ROLES.TMO]?.id || 'tmo-ha',
    reviewerName: demoUsers[ROLES.TMO]?.displayName || 'Ha Le',
    action: 'published',
    comment: 'Course published to public catalog.',
  })

  return updateCourseStatus(courseId, COURSE_STATUSES.PUBLISHED)
}

export function unpublishCourse(courseId) {
  addReviewHistory(courseId, {
    reviewerId: demoUsers[ROLES.TMO]?.id || 'tmo-ha',
    reviewerName: demoUsers[ROLES.TMO]?.displayName || 'Ha Le',
    action: 'unpublished',
    comment: 'Course hidden from public catalog.',
  })

  return updateCourseStatus(courseId, COURSE_STATUSES.UNPUBLISHED)
}

export function getSmeOptions() {
  return Object.values(demoUsers).filter((user) => user.role === ROLES.SME)
}

export function getSmeName(smeId) {
  if (!smeId) return 'Unassigned'
  return Object.values(demoUsers).find((user) => user.id === smeId)?.displayName || smeId
}

function getReviewHistoryStore() {
  return readJson(COURSE_REVIEW_KEY, {})
}

function addReviewHistory(courseId, item) {
  const history = getReviewHistoryStore()
  const entry = {
    id: `review-${courseId}-${Date.now()}`,
    courseId,
    createdAt: nowIso(),
    ...item,
  }

  writeJson(COURSE_REVIEW_KEY, {
    ...history,
    [courseId]: [...(history[courseId] || []), entry],
  })

  return entry
}

export function getCourseReviewHistory(courseId) {
  const stored = getReviewHistoryStore()[courseId] || []

  if (stored.length > 0) return stored

  const course = getLifecycleCourseById(courseId)
  if (!course) return []

  return [
    {
      id: `review-seed-${courseId}`,
      courseId,
      reviewerId: course.createdByTmoId,
      reviewerName: course.createdByTmoName,
      action: 'created',
      comment: 'Initial course structure available in demo data.',
      createdAt: course.createdAt,
    },
  ]
}

function getLessonDrafts() {
  return readJson(LESSON_DRAFTS_KEY, {})
}

function getLocalModules() {
  return readJson(LOCAL_MODULES_KEY, [])
}

function setLocalModules(modules) {
  writeJson(LOCAL_MODULES_KEY, modules)
}

export function saveLessonDraft(courseId, lessonId, draft) {
  const drafts = getLessonDrafts()
  const key = `${courseId}:${lessonId}`

  writeJson(LESSON_DRAFTS_KEY, {
    ...drafts,
    [key]: {
      ...(drafts[key] || {}),
      ...draft,
      updatedAt: nowIso(),
    },
  })

  updateCourseStatus(courseId, COURSE_STATUSES.CONTENT_EDITING)
  return getLifecycleLesson(courseId, lessonId)
}

export function getLifecycleModules(courseId) {
  const drafts = getLessonDrafts()
  const localModules = getLocalModules().filter((module) => module.courseId === courseId)
  const localModuleById = new Map(localModules.map((module) => [module.id, module]))
  const baseModules = demoModules.filter((module) => module.courseId === courseId)
  const baseModuleIds = new Set(baseModules.map((module) => module.id))
  const localOnlyModules = localModules.filter((module) => !baseModuleIds.has(module.id))
  const mergedModules = [
    ...baseModules.map((module) => ({
      ...module,
      ...(localModuleById.get(module.id) || {}),
    })),
    ...localOnlyModules,
  ]

  return mergedModules
    .sort((a, b) => a.order - b.order)
    .map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({
        ...lesson,
        ...(drafts[`${courseId}:${lesson.id}`] || {}),
      })),
    }))
}

export function addMockCourseModule(courseId, title) {
  const currentModules = getLifecycleModules(courseId)
  const module = {
    id: `module-${courseId.replace('course-', '')}-${Date.now()}`,
    courseId,
    title: title || `Module ${currentModules.length + 1}: New Module`,
    order: currentModules.length + 1,
    status: 'draft',
    lessons: [],
  }

  setLocalModules([...getLocalModules(), module])
  updateCourseStatus(courseId, COURSE_STATUSES.CONTENT_EDITING)

  const course = getLifecycleCourseById(courseId)
  if (course) {
    saveLifecycleCourse({
      ...course,
      moduleCount: currentModules.length + 1,
      modules: currentModules.length + 1,
    })
  }

  return module
}

export function addMockCourseLesson(courseId, moduleId, payload = {}) {
  const localModules = getLocalModules()
  const moduleIsLocal = localModules.some((module) => module.id === moduleId)
  const modules = getLifecycleModules(courseId)
  const targetModule = modules.find((module) => module.id === moduleId) || modules[0]

  if (!targetModule) return null

  const lesson = {
    id: `lesson-${courseId.replace('course-', '')}-${Date.now()}`,
    courseId,
    moduleId: targetModule.id,
    title: payload.title || 'New Lesson',
    type: payload.type || 'Reading',
    durationMinutes: Number(payload.durationMinutes) || 15,
    status: 'draft',
    completed: false,
    summary: payload.summary || 'Draft lesson summary.',
    content: payload.content || '',
    videoUrl: '',
    uploadedVideos: [],
    materials: [],
    learningObjectives: [],
    internalNotes: '',
  }

  if (moduleIsLocal) {
    setLocalModules(
      localModules.map((module) =>
        module.id === targetModule.id
          ? { ...module, lessons: [...module.lessons, lesson] }
          : module,
      ),
    )
  } else {
    const moduleClone = {
      ...targetModule,
      lessons: [...targetModule.lessons, lesson],
    }

    setLocalModules([...localModules, moduleClone])
  }

  updateCourseStatus(courseId, COURSE_STATUSES.CONTENT_EDITING)

  const course = getLifecycleCourseById(courseId)
  if (course) {
    const nextLessonCount = getLifecycleModules(courseId).reduce(
      (sum, module) => sum + module.lessons.length,
      0,
    )

    saveLifecycleCourse({
      ...course,
      lessonCount: nextLessonCount,
      lessons: nextLessonCount,
    })
  }

  return lesson
}

export function updateMockCourseModule(courseId, moduleId, payload = {}) {
  const localModules = getLocalModules()
  const modules = getLifecycleModules(courseId)
  const targetModule = modules.find((module) => module.id === moduleId)

  if (!targetModule) return null

  const updatedModule = {
    ...targetModule,
    ...payload,
    title: payload.title || targetModule.title,
    status: payload.status || targetModule.status,
  }

  const existsInLocal = localModules.some((module) => module.id === moduleId)

  if (existsInLocal) {
    setLocalModules(
      localModules.map((module) =>
        module.id === moduleId ? updatedModule : module,
      ),
    )
  } else {
    setLocalModules([...localModules, updatedModule])
  }

  updateCourseStatus(courseId, COURSE_STATUSES.CONTENT_EDITING)

  return updatedModule
}

export function deleteMockCourseModule(courseId, moduleId) {
  const modules = getLifecycleModules(courseId)
  const localModules = getLocalModules()
  const nextModules = modules.filter((module) => module.id !== moduleId)

  setLocalModules([
    ...localModules.filter((module) => module.courseId !== courseId),
    ...nextModules.map((module, index) => ({
      ...module,
      order: index + 1,
    })),
  ])

  updateCourseStatus(courseId, COURSE_STATUSES.CONTENT_EDITING)

  const course = getLifecycleCourseById(courseId)

  if (course) {
    const nextLessonCount = nextModules.reduce(
      (sum, module) => sum + module.lessons.length,
      0,
    )

    saveLifecycleCourse({
      ...course,
      moduleCount: nextModules.length,
      modules: nextModules.length,
      lessonCount: nextLessonCount,
      lessons: nextLessonCount,
    })
  }

  return nextModules
}

export function deleteMockCourseLesson(courseId, moduleId, lessonId) {
  const modules = getLifecycleModules(courseId)
  const localModules = getLocalModules()

  const nextModules = modules.map((module) =>
    module.id === moduleId
      ? {
          ...module,
          lessons: module.lessons.filter((lesson) => lesson.id !== lessonId),
        }
      : module,
  )

  setLocalModules([
    ...localModules.filter((module) => module.courseId !== courseId),
    ...nextModules,
  ])

  updateCourseStatus(courseId, COURSE_STATUSES.CONTENT_EDITING)

  const course = getLifecycleCourseById(courseId)

  if (course) {
    const nextLessonCount = nextModules.reduce(
      (sum, module) => sum + module.lessons.length,
      0,
    )

    saveLifecycleCourse({
      ...course,
      lessonCount: nextLessonCount,
      lessons: nextLessonCount,
    })
  }

  return nextModules
}

export function addMockLessonVideo(courseId, lessonId, video = {}) {
  const lesson = getLifecycleLesson(courseId, lessonId)
  const uploadedVideos = [
    ...(lesson?.uploadedVideos || []),
    {
      id: `video-${lessonId}-${Date.now()}`,
      name: video.name || 'lesson-video.mp4',
      size: video.size || '42 MB',
      uploadedAt: nowIso(),
    },
  ]

  return saveLessonDraft(courseId, lessonId, { uploadedVideos })
}

export function addMockLessonMaterial(courseId, lessonId, material = {}) {
  const lesson = getLifecycleLesson(courseId, lessonId)
  const materials = [
    ...(Array.isArray(lesson?.materials) ? lesson.materials : []),
    {
      id: `material-${lessonId}-${Date.now()}`,
      name: material.name || 'lesson-material.pdf',
      type: material.type || 'Document',
      uploadedAt: nowIso(),
    },
  ]

  return saveLessonDraft(courseId, lessonId, { materials })
}

export function getLifecycleLesson(courseId, lessonId) {
  return getLifecycleModules(courseId)
    .flatMap((module) => module.lessons)
    .find((lesson) => lesson.id === lessonId)
}

export function getGeneratedResources(filters = {}) {
  const resources = readJson(GENERATED_RESOURCES_KEY, [])

  return resources.filter((resource) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true
      return resource[key] === value
    })
  })
}

function saveGeneratedResource(resource) {
  const resources = readJson(GENERATED_RESOURCES_KEY, [])
  writeJson(GENERATED_RESOURCES_KEY, [resource, ...resources])
  return resource
}

function getLessonTopic(lesson) {
  return lesson?.title || 'Current lesson'
}

export function generateFlashcardsForLesson(courseId, lessonId, createdByRole = ROLES.TRAINEE) {
  const lesson = getLifecycleLesson(courseId, lessonId)
  const timestamp = Date.now()
  const flashcards = [
    {
      id: `flashcard-${timestamp}-1`,
      courseId,
      lessonId,
      front: `What is the key idea of ${getLessonTopic(lesson)}?`,
      back: lesson?.summary || 'Review the lesson summary and main examples.',
      createdBy: createdByRole,
      source: 'AI',
      createdAt: nowIso(),
    },
    {
      id: `flashcard-${timestamp}-2`,
      courseId,
      lessonId,
      front: `When should you apply ${getLessonTopic(lesson)}?`,
      back: 'Use it when solving scenario-based tasks connected to this lesson.',
      createdBy: createdByRole,
      source: 'AI',
      createdAt: nowIso(),
    },
  ]

  const resource = saveGeneratedResource({
    id: `resource-flashcard-${timestamp}`,
    courseId,
    lessonId,
    type: 'flashcard',
    createdByRole,
    content: flashcards,
    createdAt: nowIso(),
  })

  return resource
}

export function createManualFlashcard(payload) {
  return saveGeneratedResource({
    id: `resource-flashcard-manual-${Date.now()}`,
    type: 'flashcard',
    createdByRole: ROLES.TRAINEE,
    content: [
      {
        id: `flashcard-manual-${Date.now()}`,
        source: 'Manual',
        createdBy: ROLES.TRAINEE,
        createdAt: nowIso(),
        ...payload,
      },
    ],
    courseId: payload.courseId,
    lessonId: payload.lessonId,
    createdAt: nowIso(),
  })
}

export function generateSummaryForLesson(courseId, lessonId, createdByRole = ROLES.TRAINEE) {
  const lesson = getLifecycleLesson(courseId, lessonId)

  return saveGeneratedResource({
    id: `resource-summary-${Date.now()}`,
    courseId,
    lessonId,
    type: 'summary',
    createdByRole,
    content: {
      title: `Summary for ${getLessonTopic(lesson)}`,
      text:
        lesson?.summary ||
        'This summary highlights the key concepts, examples, and decisions from the current lesson.',
    },
    createdAt: nowIso(),
  })
}

export function generateExplanationForLesson(courseId, lessonId, createdByRole = ROLES.SME) {
  const lesson = getLifecycleLesson(courseId, lessonId)

  return saveGeneratedResource({
    id: `resource-explanation-${Date.now()}`,
    courseId,
    lessonId,
    type: 'explanation',
    createdByRole,
    content: {
      title: `Improved explanation for ${getLessonTopic(lesson)}`,
      text: `Draft improvement: introduce the concept, show one concrete example, then ask learners to compare it with a real scenario.`,
    },
    createdAt: nowIso(),
  })
}

export function generateKeyPointsForLesson(courseId, lessonId, createdByRole = ROLES.TRAINEE) {
  const lesson = getLifecycleLesson(courseId, lessonId)

  return saveGeneratedResource({
    id: `resource-keypoints-${Date.now()}`,
    courseId,
    lessonId,
    type: 'key_points',
    createdByRole,
    content: [
      `Review the core definition of ${getLessonTopic(lesson)}.`,
      'Connect the concept to one practical scenario.',
      'Check weak areas with a short practice question.',
    ],
    createdAt: nowIso(),
  })
}

export function generateQuizQuestionsForLesson(courseId, lessonId, createdByRole = ROLES.SME) {
  const lesson = getLifecycleLesson(courseId, lessonId)

  return saveGeneratedResource({
    id: `resource-questions-${Date.now()}`,
    courseId,
    lessonId,
    type: 'questions',
    createdByRole,
    content: [
      {
        question: `Which idea best represents ${getLessonTopic(lesson)}?`,
        answer: lesson?.summary || 'The main concept described in the lesson.',
      },
      {
        question: `What is one learner mistake to watch for in ${getLessonTopic(lesson)}?`,
        answer: 'Confusing the definition with a loosely related example.',
      },
    ],
    createdAt: nowIso(),
  })
}

function getGeneratedTests() {
  return readJson(GENERATED_TESTS_KEY, [])
}

function saveGeneratedTest(test) {
  writeJson(GENERATED_TESTS_KEY, [test, ...getGeneratedTests()])
  return test
}

export function generatePracticeTestForLesson(courseId, lessonId, createdByRole = ROLES.TRAINEE) {
  const lesson = getLifecycleLesson(courseId, lessonId)
  const timestamp = Date.now()
  const questionId = `q-generated-${timestamp}`
  const test = saveGeneratedTest({
    id: `test-generated-${timestamp}`,
    courseId,
    lessonId,
    type: 'Practice Test',
    title: `${getLessonTopic(lesson)} Practice Test`,
    description: 'AI-generated practice test from the current lesson.',
    status: 'published',
    durationMinutes: 10,
    passingScore: 70,
    totalQuestions: 1,
    questionIds: [questionId],
    topicTags: [getLessonTopic(lesson)],
    generated: true,
    testStatus: 'Not Started',
    questions: [
      {
        id: questionId,
        courseId,
        lessonId,
        question: `Which statement best matches ${getLessonTopic(lesson)}?`,
        type: 'single_choice',
        topic: getLessonTopic(lesson),
        difficulty: 'medium',
        bloom: 'Understand',
        clo: 'CLO-AI',
        status: 'published',
        source: 'AI-generated practice test',
        isAiGenerated: true,
        options: [
          { id: `${questionId}-a`, text: lesson?.summary || 'The lesson concept and its practical use.' },
          { id: `${questionId}-b`, text: 'An unrelated administrative setting.' },
          { id: `${questionId}-c`, text: 'A payment gateway configuration only.' },
          { id: `${questionId}-d`, text: 'A user role that bypasses review.' },
        ],
        correctOptionIds: [`${questionId}-a`],
        explanation: 'The generated answer is based on the current lesson summary.',
      },
    ],
    createdAt: nowIso(),
  })

  saveGeneratedResource({
    id: `resource-test-${timestamp}`,
    courseId,
    lessonId,
    type: 'test',
    createdByRole,
    content: test,
    createdAt: nowIso(),
  })

  return test
}

export function getAllLifecycleTests() {
  return [...demoTests, ...getGeneratedTests()]
}

export function getLifecycleTestById(testId) {
  return getAllLifecycleTests().find((test) => test.id === testId)
}

export function getLifecycleQuestionsForTest(test) {
  if (!test) return []
  if (test.questions) return test.questions

  return test.questionIds
    .map((questionId) => demoQuestions.find((question) => question.id === questionId))
    .filter(Boolean)
}

export function saveLessonNote(courseId, lessonId, text) {
  const notes = readJson(LESSON_NOTES_KEY, [])
  const note = {
    id: `note-${courseId}-${lessonId}-${Date.now()}`,
    courseId,
    lessonId,
    text,
    createdAt: nowIso(),
  }

  writeJson(LESSON_NOTES_KEY, [note, ...notes])
  return note
}

export function getLessonNotes(courseId, lessonId) {
  return readJson(LESSON_NOTES_KEY, []).filter(
    (note) => note.courseId === courseId && note.lessonId === lessonId,
  )
}
