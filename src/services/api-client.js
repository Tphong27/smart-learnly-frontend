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

function redirectToForbidden() {
  if (window.location.pathname !== '/403') {
    window.location.href = '/403'
  }
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

// SỬA TẠI ĐÂY: Nới lỏng Regex, bỏ dấu gạch chéo đầu để ăn khớp chính xác tuyệt đối
const PUBLIC_AUTH_ENDPOINTS = /auth\/(login|register|google|refresh|forgot-password|reset-password|verify-email|resend-verification)/

apiClient.interceptors.request.use(
  (config) => {
    const url = config?.url || ''
    const isPublicAuth = PUBLIC_AUTH_ENDPOINTS.test(url)

    // Nếu gọi endpoint công khai (Login/Register), xóa sạch header Authorization để tránh bị chặn 401 ngầm
    if (isPublicAuth) {
      if (config.headers) {
        delete config.headers.Authorization
      }
      return config
    }

    const accessToken = getAccessToken()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    } else {
      if (config.headers) {
        delete config.headers.Authorization
      }
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

    // Xử lý tự động Refresh Token khi hết hạn (Mã 401)
    if (status === 401 && !originalRequest._retry && !isAuthEndpoint && !shouldSkipAuthRedirect) {
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

    const apiError = error.response?.data?.error || error.response?.data || {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred. Please try again.',
    }

    return Promise.reject(apiError)
  },
)

export default apiClient