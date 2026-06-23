import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

export const learningService = {
  async getLearningContent(courseId) {
    const response = await apiClient.get(`/learning/courses/${courseId}`)
    return unwrap(response)
  },

  async getPreviewContent(courseId) {
    const response = await apiClient.get(`/courses/${courseId}/preview`, {
      skipAuthorization: true,
      skipAuthRedirect: true,
    })
    return unwrap(response)
  },
}
