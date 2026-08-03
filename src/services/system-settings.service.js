import apiClient from './api-client'

function unwrap(response) {
  // apiClient response interceptor returns the ApiResponse envelope; we want its data.
  return response?.data ?? response
}

export const systemSettingsService = {
  async getEmailSettings() {
    const response = await apiClient.get('/admin/settings/email')
    return unwrap(response)
  },

  async updateEmailSettings(payload) {
    const response = await apiClient.put('/admin/settings/email', payload)
    return unwrap(response)
  },

  async testEmail(payload = {}) {
    const response = await apiClient.post('/admin/settings/email/test', payload)
    return unwrap(response)
  },

  async getGoogleOAuth() {
    const response = await apiClient.get('/admin/settings/oauth/google')
    return unwrap(response)
  },

  async updateGoogleOAuth(payload) {
    const response = await apiClient.put('/admin/settings/oauth/google', payload)
    return unwrap(response)
  },

  async getGoogleMeetSettings() {
    const response = await apiClient.get('/admin/settings/integrations/google-meet')
    return unwrap(response)
  },

  async updateGoogleMeetSettings(payload) {
    const response = await apiClient.put('/admin/settings/integrations/google-meet', payload)
    return unwrap(response)
  },

  async getSePayBankDisplaySettings() {
    const response = await apiClient.get('/admin/settings/integrations/sepay/bank-display')
    return unwrap(response)
  },

  async updateSePayBankDisplaySettings(payload) {
    const response = await apiClient.put('/admin/settings/integrations/sepay/bank-display', payload)
    return unwrap(response)
  },

  async getSePayRuntimeSettings() {
    const response = await apiClient.get('/admin/settings/integrations/sepay/runtime')
    return unwrap(response)
  },

  async updateSePayRuntimeSettings(payload) {
    const response = await apiClient.put('/admin/settings/integrations/sepay/runtime', payload)
    return unwrap(response)
  },

  async runSePayReconciliationNow() {
    const response = await apiClient.post('/admin/settings/integrations/sepay/reconciliation/run')
    return unwrap(response)
  },

  async getQuestionImageImportSettings() {
    const response = await apiClient.get('/admin/settings/ai/question-image-import')
    return unwrap(response)
  },

  async updateQuestionImageImportSettings(payload) {
    const response = await apiClient.put('/admin/settings/ai/question-image-import', payload)
    return unwrap(response)
  },

  async getAssignmentAiSettings() {
    const response = await apiClient.get('/admin/settings/ai/assignment-draft')
    return unwrap(response)
  },

  async updateAssignmentAiSettings(payload) {
    const response = await apiClient.put('/admin/settings/ai/assignment-draft', payload)
    return unwrap(response)
  },
}
