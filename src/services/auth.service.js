import apiClient, {
  clearAuthSession,
  setAuthSession,
  getRefreshToken,
} from './api-client'

export const authService = {
  async register(payload) {
    return apiClient.post('/auth/register', payload)
  },

  async login(payload) {
    const response = await apiClient.post('/auth/login', payload)
    const data = response.data || response

    setAuthSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    })

    return data
  },

  async loginGoogle(idToken) {
    const response = await apiClient.post('/auth/google', { idToken })
    const data = response.data || response

    setAuthSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    })

    return data
  },

  async logout() {
    const refreshToken = getRefreshToken()

    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken })
      }
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

  async verifyEmail(payload) {
    return apiClient.post('/auth/verify-email', payload)
  },

  async resendVerification(email) {
    return apiClient.post('/auth/resend-verification', { email })
  },

  async getProfile() {
    return apiClient.get('/users/me')
  },

  async updateProfile(payload) {
    return apiClient.put('/users/me', payload)
  },

  async changePassword(payload) {
    return apiClient.put('/users/me/password', payload)
  },
}