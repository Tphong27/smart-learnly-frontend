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
  async uploadQuestionImage(questionId, file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(`/admin/questions/${questionId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return unwrap(response)
  },

  async removeQuestionImage(questionId) {
    const response = await apiClient.delete(`/admin/questions/${questionId}/image`)
    return unwrap(response)
  },

  async uploadQuestionAudio(questionId, file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(`/admin/questions/${questionId}/audio`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return unwrap(response)
  },

  async removeQuestionAudio(questionId) {
    const response = await apiClient.delete(`/admin/questions/${questionId}/audio`)
    return unwrap(response)
  },
  async listQuestionMedia(questionId) {
    const response = await apiClient.get(`/admin/questions/${questionId}/media`)
    return normalizeList(response)
  },

  async uploadQuestionMedia(questionId, mediaType, files) {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    const response = await apiClient.post(`/admin/questions/${questionId}/media`, formData, {
      params: { mediaType },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return unwrap(response)
  },

  async removeQuestionMedia(questionId, attachmentId) {
    const response = await apiClient.delete(`/admin/questions/${questionId}/media/${attachmentId}`)
    return unwrap(response)
  },

  async reorderQuestionMedia(questionId, mediaType, attachmentIds) {
    const response = await apiClient.put(`/admin/questions/${questionId}/media/reorder`, {
      mediaType,
      attachmentIds,
    })
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

  async importQuestionsBatch(bankId, rows, importSource = 'excel_import') {
    const response = await apiClient.post('/admin/questions/import-batch', {
      bankId,
      rows,
      importSource,
    })
    return unwrap(response)
  },
  async previewImageImport(bankId, files, language = 'vi') {
    const formData = new FormData()
    formData.append('bankId', bankId)
    formData.append('language', language)
    files.forEach((file) => formData.append('files', file))
    const response = await apiClient.post('/admin/question-imports/image/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000,
    })
    return unwrap(response)
  },

  async confirmImageImport(bankId, questions, mediaFiles = {}) {
    const imageFiles = Array.isArray(mediaFiles.imageFiles) ? mediaFiles.imageFiles : []
    const audioFiles = Array.isArray(mediaFiles.audioFiles) ? mediaFiles.audioFiles : []
    const hasMediaMappings = questions.some((question) => (
      (Array.isArray(question.imageFileIndexes) && question.imageFileIndexes.length > 0)
      || (Array.isArray(question.audioFileIndexes) && question.audioFileIndexes.length > 0)
    ))
    if (hasMediaMappings) {
      const formData = new FormData()
      formData.append('request', new Blob([JSON.stringify({ bankId, questions })], { type: 'application/json' }))
      imageFiles.forEach((file) => formData.append('imageFiles', file))
      audioFiles.forEach((file) => formData.append('audioFiles', file))
      const response = await apiClient.post('/admin/question-imports/image/confirm', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000,
      })
      return unwrap(response)
    }

    const response = await apiClient.post('/admin/question-imports/image/confirm', {
      bankId,
      questions,
    })
    return unwrap(response)
  },
}
