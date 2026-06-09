// src/data/demo/flashcardRuntime.js

import {
  demoCourseFlashcardSets,
  demoPersonalFlashcardSets,
  FLASHCARD_SET_TYPES,
} from './demoFlashcards'
import { getEnrollmentsByUser } from './demoRuntime'
import { getLifecycleCourseById, getLifecycleModules } from './courseLifecycleRuntime'

const FLASHCARD_SETS_KEY = 'slp.demo.flashcardSets'

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

function slugify(value) {
  return String(value || 'flashcard-set')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function getStoredFlashcardSets() {
  return readJson(FLASHCARD_SETS_KEY, [])
}

function setStoredFlashcardSets(sets) {
  writeJson(FLASHCARD_SETS_KEY, sets)
}

function getBaseFlashcardSets() {
  return [...demoCourseFlashcardSets, ...demoPersonalFlashcardSets]
}

function mergeFlashcardSets() {
  const storedSets = getStoredFlashcardSets()
  const storedIds = new Set(storedSets.map((set) => set.id))

  return [
    ...getBaseFlashcardSets().filter((set) => !storedIds.has(set.id)),
    ...storedSets,
  ]
}

export function getCourseFlashcardSetsForTrainee(traineeId = 'trainee-minh') {
  const enrolledCourseIds = new Set(
    getEnrollmentsByUser(traineeId).map((enrollment) => enrollment.courseId),
  )

  return mergeFlashcardSets()
    .filter((set) => set.type === FLASHCARD_SET_TYPES.COURSE)
    .filter((set) => enrolledCourseIds.has(set.courseId))
    .map(enrichFlashcardSet)
}

export function getMyFlashcardSets(traineeId = 'trainee-minh') {
  return mergeFlashcardSets()
    .filter((set) => set.type === FLASHCARD_SET_TYPES.PERSONAL)
    .filter((set) => set.createdByUserId === traineeId)
    .map(enrichFlashcardSet)
}

export function getFlashcardSetById(setId) {
  const set = mergeFlashcardSets().find((item) => item.id === setId)
  return set ? enrichFlashcardSet(set) : null
}

export function createMyFlashcardSet(payload, traineeId = 'trainee-minh') {
  const timestamp = Date.now()

  const set = {
    id: `flashcard-set-${slugify(payload.title)}-${timestamp}`,
    type: FLASHCARD_SET_TYPES.PERSONAL,
    title: payload.title,
    description: payload.description || '',
    courseId: payload.courseId || '',
    moduleId: payload.moduleId || '',
    lessonId: payload.lessonId || '',
    source: 'Manual',
    createdByUserId: traineeId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    cards: [],
  }

  setStoredFlashcardSets([set, ...getStoredFlashcardSets()])
  return enrichFlashcardSet(set)
}

export function updateMyFlashcardSet(setId, payload, traineeId = 'trainee-minh') {
  let updatedSet = null

  const nextSets = mergeFlashcardSets().map((set) => {
    const canUpdate =
      set.id === setId &&
      set.type === FLASHCARD_SET_TYPES.PERSONAL &&
      set.createdByUserId === traineeId

    if (!canUpdate) return set

    updatedSet = {
      ...set,
      title: payload.title ?? set.title,
      description: payload.description ?? set.description,
      courseId: payload.courseId ?? set.courseId,
      moduleId: payload.moduleId ?? set.moduleId,
      lessonId: payload.lessonId ?? set.lessonId,
      updatedAt: nowIso(),
    }

    return updatedSet
  })

  persistMutableSets(nextSets)
  return updatedSet ? enrichFlashcardSet(updatedSet) : null
}

export function deleteMyFlashcardSet(setId, traineeId = 'trainee-minh') {
  const nextSets = mergeFlashcardSets().filter((set) => {
    const canDelete =
      set.id === setId &&
      set.type === FLASHCARD_SET_TYPES.PERSONAL &&
      set.createdByUserId === traineeId

    return !canDelete
  })

  persistMutableSets(nextSets)
}

export function addCardToSet(setId, payload, traineeId = 'trainee-minh') {
  let updatedSet = null

  const nextSets = mergeFlashcardSets().map((set) => {
    const canUpdate =
      set.id === setId &&
      set.type === FLASHCARD_SET_TYPES.PERSONAL &&
      set.createdByUserId === traineeId

    if (!canUpdate) return set

    const card = {
      id: `card-${setId}-${Date.now()}`,
      front: payload.front,
      back: payload.back,
      difficulty: payload.difficulty || 'Medium',
      tags: normalizeTags(payload.tags),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }

    updatedSet = {
      ...set,
      cards: [...(set.cards || []), card],
      updatedAt: nowIso(),
    }

    return updatedSet
  })

  persistMutableSets(nextSets)
  return updatedSet ? enrichFlashcardSet(updatedSet) : null
}

export function updateCardInSet(setId, cardId, payload, traineeId = 'trainee-minh') {
  let updatedSet = null

  const nextSets = mergeFlashcardSets().map((set) => {
    const canUpdate =
      set.id === setId &&
      set.type === FLASHCARD_SET_TYPES.PERSONAL &&
      set.createdByUserId === traineeId

    if (!canUpdate) return set

    updatedSet = {
      ...set,
      cards: (set.cards || []).map((card) =>
        card.id === cardId
          ? {
            ...card,
            front: payload.front ?? card.front,
            back: payload.back ?? card.back,
            difficulty: payload.difficulty ?? card.difficulty,
            tags: payload.tags ? normalizeTags(payload.tags) : card.tags,
            updatedAt: nowIso(),
          }
          : card,
      ),
      updatedAt: nowIso(),
    }

    return updatedSet
  })

  persistMutableSets(nextSets)
  return updatedSet ? enrichFlashcardSet(updatedSet) : null
}

export function deleteCardFromSet(setId, cardId, traineeId = 'trainee-minh') {
  let updatedSet = null

  const nextSets = mergeFlashcardSets().map((set) => {
    const canUpdate =
      set.id === setId &&
      set.type === FLASHCARD_SET_TYPES.PERSONAL &&
      set.createdByUserId === traineeId

    if (!canUpdate) return set

    updatedSet = {
      ...set,
      cards: (set.cards || []).filter((card) => card.id !== cardId),
      updatedAt: nowIso(),
    }

    return updatedSet
  })

  persistMutableSets(nextSets)
  return updatedSet ? enrichFlashcardSet(updatedSet) : null
}

function persistMutableSets(allSets) {
  const mutableSets = allSets.filter((set) => {
    const isPersonalSet = set.type === FLASHCARD_SET_TYPES.PERSONAL
    const isStoredCourseSet = !demoCourseFlashcardSets.some((demoSet) => demoSet.id === set.id)

    return isPersonalSet || isStoredCourseSet
  })

  setStoredFlashcardSets(mutableSets)
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags

  return String(tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function enrichFlashcardSet(set) {
  const course = getLifecycleCourseById(set.courseId)
  const modules = set.courseId ? getLifecycleModules(set.courseId) : []
  const module = modules.find((item) => item.id === set.moduleId)
  const lesson = module?.lessons?.find((item) => item.id === set.lessonId)

  return {
    ...set,
    cards: Array.isArray(set.cards) ? set.cards : [],
    courseTitle: course?.title || 'Unassigned course',
    moduleTitle: module?.title || 'Unassigned module',
    lessonTitle: lesson?.title || 'Unassigned lesson',
    cardCount: Array.isArray(set.cards) ? set.cards.length : 0,
  }
}