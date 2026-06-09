import apiClient, {
  clearAuthSession,
  setAuthSession,
} from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

export const authService = {
  async register(payload) {
    return apiClient.post('/auth/register', payload)
  },

  async login(payload) {
    const response = await apiClient.post('/auth/login', payload)
    const data = unwrap(response)

    setAuthSession({
      accessToken: data.accessToken,
      user: data.user,
    })

    return data
  },

  async loginGoogle(idToken) {
    const response = await apiClient.post('/auth/google', { idToken })
    const data = unwrap(response)

    setAuthSession({
      accessToken: data.accessToken,
      user: data.user,
    })

    return data
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      clearAuthSession()
    }
  },

  async forgotPassword(email) {
    return apiClient.post('/auth/forgot-password', { email })
  },

  async resetPassword(payload) {
    return apiClient.post('/auth/reset-password', payload)
  },

  async verifyEmail(token) {
    return apiClient.post('/auth/verify-email', { token })
  },

  async resendVerification(email) {
    return apiClient.post('/auth/resend-verification', { email })
  },

  async getProfile() {
    const response = await apiClient.get('/auth/profile')
    return unwrap(response)
  },

  async updateProfile(payload) {
    const response = await apiClient.patch('/auth/profile', payload)
    return unwrap(response)
  },

  async changePassword(payload) {
    return apiClient.post('/auth/change-password', payload)
  },
}
