import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

export const courseService = {
  async listAdmin({ page = 0, size = 20 } = {}) {
    const response = await apiClient.get('/admin/courses', { params: { page, size } })
    const data = unwrap(response)
    return data || { items: [], page: 0, size, totalItems: 0, totalPages: 0 }
  },

  async getAdmin(courseId) {
    const response = await apiClient.get(`/admin/courses/${courseId}`)
    return unwrap(response)
  },

  async create(payload) {
    const response = await apiClient.post('/admin/courses', payload)
    return unwrap(response)
  },

  async update(courseId, payload) {
    const response = await apiClient.patch(`/admin/courses/${courseId}`, payload)
    return unwrap(response)
  },

  async remove(courseId) {
    return apiClient.delete(`/admin/courses/${courseId}`)
  },

  // Public catalog endpoints (used by preview lessons UX)
  async listPublic({ page = 0, size = 20 } = {}) {
    // /courses returns Spring Page<CourseListItemResponse> directly (not ApiResponse wrapper)
    const response = await apiClient.get('/courses', { params: { page, size } })
    return response?.data ?? response
  },

  async getPublicDetail(slug) {
    const response = await apiClient.get(`/courses/${slug}`)
    return response?.data ?? response
  },
}
