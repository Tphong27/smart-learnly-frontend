import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

function normalizeList(response) {
  const data = unwrap(response)
  const items = data?.items ?? data?.content ?? data?.data ?? data
  return Array.isArray(items) ? items : []
}

function normalizePage(response) {
  const data = unwrap(response)
  const items = data?.items ?? data?.content ?? data?.questions ?? []
  return {
    items: Array.isArray(items) ? items : [],
    page: Number(data?.page ?? data?.number ?? 0),
    size: Number(data?.size ?? 20),
    totalItems: Number(data?.totalItems ?? data?.totalElements ?? items.length ?? 0),
    totalPages: Number(data?.totalPages ?? 1),
  }
}

export const questionBankService = {
  async listBanks(params = {}) {
    const response = await apiClient.get('/admin/question-banks', { params })
    return normalizeList(response)
  },

  async getBank(bankId) {
    const response = await apiClient.get(`/admin/question-banks/${bankId}`)
    return unwrap(response)
  },

  async createBank(payload) {
    const response = await apiClient.post('/admin/question-banks', payload)
    return unwrap(response)
  },

  async updateBank(bankId, payload) {
    const response = await apiClient.put(`/admin/question-banks/${bankId}`, payload)
    return unwrap(response)
  },

  async archiveBank(bankId) {
    const response = await apiClient.delete(`/admin/question-banks/${bankId}`)
    return unwrap(response)
  },

  async listQuestions(params = {}) {
    const response = await apiClient.get('/admin/questions', { params })
    return normalizePage(response)
  },

  async getQuestion(questionId) {
    const response = await apiClient.get(`/admin/questions/${questionId}`)
    return unwrap(response)
  },

  async createQuestion(payload) {
    const response = await apiClient.post('/admin/questions', payload)
    return unwrap(response)
  },

  async updateQuestion(questionId, payload) {
    const response = await apiClient.put(`/admin/questions/${questionId}`, payload)
    return unwrap(response)
  },

  async archiveQuestion(questionId) {
    const response = await apiClient.delete(`/admin/questions/${questionId}`)
    return unwrap(response)
  },

  async approveQuestion(questionId) {
    const response = await apiClient.post(`/admin/questions/${questionId}/approve`)
    return unwrap(response)
  },

  async rejectQuestion(questionId) {
    const response = await apiClient.post(`/admin/questions/${questionId}/reject`)
    return unwrap(response)
  },

  async importQuestionsBatch(bankId, rows) {
    const response = await apiClient.post('/admin/questions/import-batch', {
      bankId,
      rows,
    })
    return unwrap(response)
  },
}
