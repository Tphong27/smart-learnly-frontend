import { endpoints } from '@/shared/api/endpoints'
import { request } from '@/shared/api/httpClient'

const json = (method, body, extra = {}) => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
  ...extra,
})

export const authService = {
  register: (values) => request(endpoints.auth.register, json('POST', values)),
  login: (values) =>
    request(endpoints.auth.login, json('POST', values, { retryOnUnauthorized: false })),
  loginWithGoogle: (idToken) =>
    request(endpoints.auth.google, json('POST', { idToken }, { retryOnUnauthorized: false })),
  refresh: () =>
    request(endpoints.auth.refresh, json('POST', undefined, { retryOnUnauthorized: false })),
  logout: () => request(endpoints.auth.logout, json('POST')),
  forgotPassword: (values) =>
    request(endpoints.auth.forgotPassword, json('POST', values)),
  resetPassword: (values) =>
    request(endpoints.auth.resetPassword, json('POST', values)),
  verifyEmail: (token) =>
    request(endpoints.auth.verifyEmail, json('POST', { token })),
  resendVerification: (email) =>
    request(endpoints.auth.resendVerification, json('POST', { email })),
  getProfile: () => request(endpoints.auth.profile),
  updateProfile: (values) => request(endpoints.auth.profile, json('PATCH', values)),
  changePassword: (values) =>
    request(endpoints.auth.changePassword, json('POST', values)),
}
