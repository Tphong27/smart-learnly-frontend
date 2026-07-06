import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_URL
  || import.meta.env.VITE_API_BASE_URL
  || 'http://localhost:8080/api/v1'

const ACCESS_TOKEN_KEY = 'accessToken'
const USER_KEY = 'user'

let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve(token)
    }
  })

  failedQueue = []
}

export function getAccessToken() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  // Loại bỏ triệt để chuỗi rác lọt vào hệ thống
  if (!token || token === 'undefined' || token === 'null') {
    return null
  }
  return token
}

function normalizeUser(user) {
  if (!user) return user
  return {
    ...user,
    role: typeof user.role === 'string' ? user.role.toUpperCase() : user.role,
  }
}

export function setAuthSession({ accessToken, user }) {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(normalizeUser(user)))
  }
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getCurrentUser() {
  const rawUser = localStorage.getItem(USER_KEY)

  if (!rawUser) return null

  try {
    return JSON.parse(rawUser)
  } catch {
    clearAuthSession()
    return null
  }
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

function normalizeApiError(error) {
  const responseData = error.response?.data;

  if (!responseData) {
    return {
      code: "UNKNOWN_ERROR",
      message: "An unknown error occurred. Please try again.",
      originalError: error,
    };
  }

  if (responseData.error) {
    return {
      ...responseData.error,
      message:
        responseData.error.message ||
        responseData.message ||
        "An unknown error occurred. Please try again.",
      originalError: error,
    };
  }

  return {
    ...responseData,
    message:
      responseData.message ||
      responseData.errorMessage ||
      responseData.detail ||
      "An unknown error occurred. Please try again.",
    originalError: error,
  };
}

// Cấu hình instance chính dùng axios
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Cấu hình instance phục vụ riêng việc làm mới token
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Neo bằng "/" đứng trước "auth" để tránh khớp nhầm các path như "/oauth/google".
const PUBLIC_AUTH_ENDPOINTS = /\/auth\/(login|register|google|refresh|forgot-password|reset-password|verify-email|resend-verification)/
const PUBLIC_COURSE_ENDPOINTS = /courses\/[^/]+\/(preview|preview-lessons)(?:\/[^/]+)?$/

function removeAuthorizationHeader(config) {
  if (!config.headers) return

  if (typeof config.headers.delete === 'function') {
    config.headers.delete('Authorization')
    config.headers.delete('authorization')
  }

  delete config.headers.Authorization
  delete config.headers.authorization
}

apiClient.interceptors.request.use(
  (config) => {
    const url = config?.url || ''
    const isPublicAuth = PUBLIC_AUTH_ENDPOINTS.test(url)
    const isPublicCourseEndpoint = PUBLIC_COURSE_ENDPOINTS.test(url)
    const shouldSkipAuthorization = config?.skipAuthorization === true
    const isFormData =
      typeof FormData !== 'undefined' && config?.data instanceof FormData

    if (isFormData && config.headers) {
      if (typeof config.headers?.delete === 'function') {
        config.headers.delete('Content-Type')
        config.headers.delete('content-type')
      }
      delete config.headers['Content-Type']
      delete config.headers['content-type']
    }

    // Public requests must never carry a stale or invalid bearer token.
    if (isPublicAuth || isPublicCourseEndpoint || shouldSkipAuthorization) {
      removeAuthorizationHeader(config)
      return config
    }

    const accessToken = getAccessToken()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    } else {
      removeAuthorizationHeader(config)
    }
    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config
    
    if (!error.response) {
      return Promise.reject({
        code: 'NETWORK_ERROR',
        message: 'Can not connect to server. Please check your internet connection.',
        originalError: error,
      })
    }

    const status = error.response?.status
    const url = originalRequest?.url || ''
    const isAuthEndpoint = PUBLIC_AUTH_ENDPOINTS.test(url)
    const shouldSkipAuthRedirect = originalRequest?.skipAuthRedirect === true
    const shouldSkipAuthorization = originalRequest?.skipAuthorization === true

    // Xử lý tự động Refresh Token khi hết hạn (Mã 401)
    if (
      status === 401
      && !originalRequest._retry
      && !isAuthEndpoint
      && !shouldSkipAuthRedirect
      && !shouldSkipAuthorization
    ) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((newAccessToken) => {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
            return apiClient(originalRequest)
          })
          .catch((queueError) => Promise.reject(queueError))
      }

      isRefreshing = true

      try {
        const refreshResponse = await refreshClient.post('/auth/refresh')
        const responseData = refreshResponse.data?.data || refreshResponse.data

        const newAccessToken = responseData.accessToken

        if (!newAccessToken) {
          throw new Error('Invalid refresh token response')
        }

        setAuthSession({
          accessToken: newAccessToken,
          user: responseData.user || getCurrentUser(),
        })

        processQueue(null, newAccessToken)

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearAuthSession()
        redirectToLogin()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
)

export default apiClient
