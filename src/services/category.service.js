import apiClient from './api-client'

function unwrap(response) {
  // apiClient response interceptor returns response.data already (the ApiResponse envelope)
  // Backend wraps payload as { success, message, data, timestamp } -> we want data
  return response?.data ?? response
}

export const categoryService = {
  async list(params = {}) {
    const search = new URLSearchParams()
    if (params.keyword) search.append('keyword', params.keyword)
    if (typeof params.active === 'boolean') search.append('active', String(params.active))
    if (params.parentId) search.append('parentId', params.parentId)
    const query = search.toString()
    const response = await apiClient.get(`/admin/categories${query ? '?' + query : ''}`)
    return unwrap(response) || []
  },

  async get(categoryId) {
    const response = await apiClient.get(`/admin/categories/${categoryId}`)
    return unwrap(response)
  },

  async create(payload) {
    const response = await apiClient.post('/admin/categories', payload)
    return unwrap(response)
  },

  async update(categoryId, payload) {
    const response = await apiClient.patch(`/admin/categories/${categoryId}`, payload)
    return unwrap(response)
  },

  async remove(categoryId) {
    return apiClient.delete(`/admin/categories/${categoryId}`)
  },
}
