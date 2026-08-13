import apiClient, {
  clearAuthSession,
  setAuthSession,
} from '@/services/api-client'
import { unwrapApiData as unwrap } from '@/services/api-response'

export const authService = {
  /** Đăng ký tài khoản mới và bắt đầu luồng xác thực email. */
  async register(payload) {
    return apiClient.post('/auth/register', payload)
  },

  /** Đăng nhập bằng email/mật khẩu và lưu access token cùng user hiện tại. */
  async login(payload) {
    const response = await apiClient.post('/auth/login', payload)
    const data = unwrap(response)

    setAuthSession({
      accessToken: data.accessToken,
      user: data.user,
    })

    return data
  },

  /** Đăng nhập bằng Google ID token và lưu session frontend nhận được. */
  async loginGoogle(idToken) {
    const response = await apiClient.post('/auth/google', { idToken })
    const data = unwrap(response)

    setAuthSession({
      accessToken: data.accessToken,
      user: data.user,
    })

    return data
  },

  /** Đăng xuất backend và luôn xóa session local dù request thất bại. */
  async logout() {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      clearAuthSession()
    }
  },

  /** Yêu cầu backend gửi hướng dẫn đặt lại mật khẩu cho email. */
  async forgotPassword(email) {
    return apiClient.post('/auth/forgot-password', { email })
  },

  /** Đặt lại mật khẩu bằng token/OTP hợp lệ từ luồng quên mật khẩu. */
  async resetPassword(payload) {
    return apiClient.post('/auth/reset-password', payload)
  },

  /** Xác thực email bằng mã OTP người dùng nhập. */
  async verifyEmail(payload) {
    return apiClient.post('/auth/verify-email', payload)
  },

  /** Yêu cầu gửi lại OTP xác thực email cho tài khoản đang chờ. */
  async resendVerification(email) {
    return apiClient.post('/auth/resend-verification', { email })
  },

  /** Tải hồ sơ của người dùng đang đăng nhập. */
  async getProfile() {
    const response = await apiClient.get('/auth/profile')
    return unwrap(response)
  },

  /** Cập nhật thông tin hồ sơ được phép sửa của người dùng hiện tại. */
  async updateProfile(payload) {
    const response = await apiClient.patch('/auth/profile', payload)
    return unwrap(response)
  },

  /** Tải avatar mới bằng multipart form data và trả hồ sơ đã cập nhật. */
  async uploadAvatar(file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post('/auth/profile/avatar', formData)
    return unwrap(response)
  },

  /** Đổi mật khẩu của người dùng đã xác thực. */
  async changePassword(payload) {
    return apiClient.post('/auth/change-password', payload)
  },
}
