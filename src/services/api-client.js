import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

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
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAuthSession({ accessToken, user }) {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
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

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken()

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    if (!error.response) {
      return Promise.reject({
        code: 'NETWORK_ERROR',
        message: 'Can not connect to server. Please check your internet connection.',
        originalError: error,
      })
    }

    const isAuthEndpoint = typeof originalRequest?.url === 'string'
      && /\/auth\/(login|register|google|refresh|forgot-password|reset-password|verify-email|resend-verification)/.test(originalRequest.url)

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
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

    if (status === 403) {
      redirectToForbidden()
    }

    if (status >= 500) {
      console.error('Server error:', error.response?.data)
    }

    const apiError = error.response?.data?.error || error.response?.data || {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred. Please try again.',
    }

    return Promise.reject(apiError)
  },
)

export default apiClient
