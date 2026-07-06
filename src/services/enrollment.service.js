import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

export const enrollmentService = {
  async enrollFree({ courseId, classId }) {
    const response = await apiClient.post("/enrollments/free", {
      courseId,
      classId,
    });
    return unwrap(response);
  },

  async getMyCourses() {
    const response = await apiClient.get('/enrollments/my-courses')
    return unwrap(response) || []
  },

  async getHistory({ page = 0, size = 20 } = {}) {
    const response = await apiClient.get('/enrollments', { params: { page, size } })
    return unwrap(response) || { items: [], page: 0, size, totalItems: 0, totalPages: 0 }
  },

  async getStatusHistory(enrollmentId) {
    const response = await apiClient.get(`/enrollments/${enrollmentId}/status-history`)
    return unwrap(response) || []
  },
}
