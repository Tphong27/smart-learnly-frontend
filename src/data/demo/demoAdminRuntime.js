import { demoUsers } from './demoUsers'
import { ROLES } from '@/shared/constants/roles'

const STORAGE_KEYS = {
  users: 'slp.demo.admin.users',
  settings: 'slp.demo.admin.settings',
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

function normalizeUser(user) {
  return {
    id: user.id,
    name: user.displayName || user.name,
    email: user.email,
    role: user.role,
    status: user.status || 'active',
    lastLoginAt: user.lastLoginAt || '',
    createdAt: user.createdAt || '2026-06-01',
  }
}

const defaultUsers = [
  normalizeUser({
    ...demoUsers[ROLES.ADMIN],
    status: 'active',
    lastLoginAt: '2026-06-08T09:30:00.000Z',
  }),
  normalizeUser({
    ...demoUsers[ROLES.TMO],
    status: 'active',
    lastLoginAt: '2026-06-08T08:15:00.000Z',
  }),
  normalizeUser({
    ...demoUsers[ROLES.SME],
    status: 'active',
    lastLoginAt: '2026-06-07T17:20:00.000Z',
  }),
  normalizeUser({
    ...demoUsers[ROLES.TRAINER],
    status: 'active',
    lastLoginAt: '2026-06-07T20:10:00.000Z',
  }),
  normalizeUser({
    ...demoUsers[ROLES.TRAINEE],
    status: 'inactive',
    lastLoginAt: '2026-06-01T11:45:00.000Z',
  }),
]

export function getAdminUsers() {
  const stored = readJson(STORAGE_KEYS.users, [])
  const storedById = new Map(stored.map((user) => [user.id, user]))

  const baseUsers = defaultUsers.map((user) => ({
    ...user,
    ...(storedById.get(user.id) || {}),
  }))

  const baseIds = new Set(baseUsers.map((user) => user.id))
  const localOnly = stored.filter((user) => !baseIds.has(user.id))

  return [...baseUsers, ...localOnly]
}

export function createAdminUser(form) {
  const user = {
    id: createId('user'),
    name: form.name,
    email: form.email,
    role: form.role,
    status: form.status || 'active',
    createdAt: new Date().toISOString().slice(0, 10),
    lastLoginAt: '',
  }

  const current = readJson(STORAGE_KEYS.users, [])
  writeJson(STORAGE_KEYS.users, [user, ...current])

  return user
}

export function updateAdminUser(userId, payload) {
  const current = readJson(STORAGE_KEYS.users, [])
  const existing = getAdminUsers().find((user) => user.id === userId)

  if (!existing) return null

  const updatedUser = {
    ...existing,
    ...payload,
    updatedAt: new Date().toISOString(),
  }

  const existsInStored = current.some((user) => user.id === userId)

  if (existsInStored) {
    writeJson(
      STORAGE_KEYS.users,
      current.map((user) => (user.id === userId ? updatedUser : user)),
    )
  } else {
    writeJson(STORAGE_KEYS.users, [updatedUser, ...current])
  }

  return updatedUser
}

export function getAdminSettings() {
  const defaultSettings = {
    ai: {
      provider: 'OpenAI / Gemini mock',
      model: 'gpt-4o-mini-demo',
      status: 'active',
      ragEnabled: true,
      ragSource: 'Course materials and question bank',
      tokenLimit: 4096,
      temperature: 0.4,
      dailyLimit: 1000,
    },
    payment: {
      primaryGateway: 'VNPay',
      secondaryGateway: 'PayOS',
      sandboxMode: true,
      autoVerify: false,
      refundPolicy: 'Manual review required',
      status: 'active',
    },
    email: {
      provider: 'SMTP mock',
      sender: 'noreply@slp.vn',
      status: 'active',
    },
    security: {
      rbacPolicy: 'Default SLP roles protected',
      sessionTimeoutMinutes: 60,
      status: 'active',
    },
  }

  return {
    ...defaultSettings,
    ...readJson(STORAGE_KEYS.settings, {}),
  }
}

export function updateAdminSettings(section, payload) {
  const current = getAdminSettings()

  const next = {
    ...current,
    [section]: {
      ...current[section],
      ...payload,
      updatedAt: new Date().toISOString(),
    },
  }

  writeJson(STORAGE_KEYS.settings, next)

  return next
}