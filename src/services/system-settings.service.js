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
}
