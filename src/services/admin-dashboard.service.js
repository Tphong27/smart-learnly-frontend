import apiClient from './api-client'

function normalizeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function normalizeHealthComponent(component = {}) {
  return {
    status: component.status || 'UNKNOWN',
  }
}

function normalizeServices(items) {
  if (!Array.isArray(items)) return []
  return items.map((item) => ({
    id: item.id || '',
    name: item.name || item.id || 'Service',
    status: item.status || 'UNKNOWN',
    detail: item.detail || null,
  }))
}

function normalizeConfigItems(items) {
  if (!Array.isArray(items)) return []
  return items.map((item) => ({
    id: item.id || '',
    name: item.name || item.id || 'Integration',
    configured: Boolean(item.configured),
    enabled: Boolean(item.enabled),
    provider: item.provider || null,
    model: item.model || null,
  }))
}

function normalizeOverview(data = {}) {
  const systemHealth = data.systemHealth || {}
  const configurationStatus = data.configurationStatus || {}
  const accountStatus = data.accountStatus || {}

  return {
    generatedAt: data.generatedAt || null,
    systemHealth: {
      backend: normalizeHealthComponent(systemHealth.backend),
      database: normalizeHealthComponent(systemHealth.database),
      services: normalizeServices(systemHealth.services),
    },
    configurationStatus: {
      items: normalizeConfigItems(configurationStatus.items),
    },
    accountStatus: {
      active: normalizeNumber(accountStatus.active),
      pendingVerify: normalizeNumber(accountStatus.pendingVerify),
      inactive: normalizeNumber(accountStatus.inactive),
      locked: normalizeNumber(accountStatus.locked),
      banned: normalizeNumber(accountStatus.banned),
      total: normalizeNumber(accountStatus.total),
    },
  }
}

export const adminDashboardService = {
  async getOverview() {
    const response = await apiClient.get('/admin/dashboard/overview')
    return normalizeOverview(response?.data ?? response)
  },
}
