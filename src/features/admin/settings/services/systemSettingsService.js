import apiClient from '@/services/api-client'
import { unwrapApiData as unwrap } from '@/services/api-response'

export const systemSettingsService = {
  /** Tải cấu hình gửi email dành cho admin. */
  async getEmailSettings() {
    const response = await apiClient.get('/admin/settings/email')
    return unwrap(response)
  },

  /** Cập nhật cấu hình gửi email và các secret liên quan. */
  async updateEmailSettings(payload) {
    const response = await apiClient.put('/admin/settings/email', payload)
    return unwrap(response)
  },

  /** Gửi email thử để admin kiểm tra cấu hình hiện tại. */
  async testEmail(payload = {}) {
    const response = await apiClient.post('/admin/settings/email/test', payload)
    return unwrap(response)
  },

  /** Tải cấu hình Google OAuth hiện hành. */
  async getGoogleOAuth() {
    const response = await apiClient.get('/admin/settings/oauth/google')
    return unwrap(response)
  },

  /** Cập nhật Google OAuth client configuration. */
  async updateGoogleOAuth(payload) {
    const response = await apiClient.put('/admin/settings/oauth/google', payload)
    return unwrap(response)
  },

  /** Tải cấu hình tích hợp Google Meet. */
  async getGoogleMeetSettings() {
    const response = await apiClient.get('/admin/settings/integrations/google-meet')
    return unwrap(response)
  },

  /** Cập nhật cấu hình tích hợp Google Meet. */
  async updateGoogleMeetSettings(payload) {
    const response = await apiClient.put('/admin/settings/integrations/google-meet', payload)
    return unwrap(response)
  },

  /** Tải thông tin ngân hàng SePay được phép hiển thị cho người thanh toán. */
  async getSePayBankDisplaySettings() {
    const response = await apiClient.get('/admin/settings/integrations/sepay/bank-display')
    return unwrap(response)
  },

  /** Cập nhật thông tin ngân hàng SePay hiển thị trên checkout. */
  async updateSePayBankDisplaySettings(payload) {
    const response = await apiClient.put('/admin/settings/integrations/sepay/bank-display', payload)
    return unwrap(response)
  },

  /** Tải trạng thái cấu hình runtime SePay mà không làm lộ secret. */
  async getSePayRuntimeSettings() {
    const response = await apiClient.get('/admin/settings/integrations/sepay/runtime')
    return unwrap(response)
  },

  /** Cập nhật API token và webhook secret SePay qua màn hình bảo mật. */
  async updateSePayRuntimeSettings(payload) {
    const response = await apiClient.put('/admin/settings/integrations/sepay/runtime', payload)
    return unwrap(response)
  },

  /** Yêu cầu backend chạy đối soát SePay ngay lập tức. */
  async runSePayReconciliationNow() {
    const response = await apiClient.post('/admin/settings/integrations/sepay/reconciliation/run')
    return unwrap(response)
  },

  /** Tải cấu hình AI dùng để tạo bản nháp bài tập. */
  async getAssignmentAiSettings() {
    const response = await apiClient.get('/admin/settings/ai/assignment-draft')
    return unwrap(response)
  },

  /** Cập nhật cấu hình AI dùng để tạo bản nháp bài tập. */
  async updateAssignmentAiSettings(payload) {
    const response = await apiClient.put('/admin/settings/ai/assignment-draft', payload)
    return unwrap(response)
  },
}
