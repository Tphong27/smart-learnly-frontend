const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

let accessToken = null
let refreshSession = null
let refreshPromise = null

export class ApiError extends Error {
  constructor(response, payload) {
    super(payload?.message ?? `Request failed with status ${response.status}`)
    this.name = 'ApiError'
    this.status = response.status
    this.code = payload?.code
    this.fieldErrors = payload?.errors ?? []
  }
}

export function configureAuthClient({ getAccessToken, refresh }) {
  accessToken = getAccessToken
  refreshSession = refresh
}

async function parseResponse(response) {
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') ?? ''
  return contentType.includes('application/json') ? response.json() : null
}

async function send(path, options, retryOnUnauthorized) {
  const token = accessToken?.()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (response.status === 401 && retryOnUnauthorized && refreshSession) {
    refreshPromise ??= refreshSession().finally(() => {
      refreshPromise = null
    })
    await refreshPromise
    return send(path, options, false)
  }

  const payload = await parseResponse(response)
  if (!response.ok) throw new ApiError(response, payload)
  return payload
}

export function request(path, options = {}) {
  return send(path, options, options.retryOnUnauthorized !== false)
}

export function applyFieldErrors(error, setError) {
  error?.fieldErrors?.forEach(({ field, message }) => {
    setError(field, { type: 'server', message })
  })
}
