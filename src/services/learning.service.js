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

  async getAdminPreviewContent(courseId) {
    const response = await apiClient.get(`/admin/courses/${courseId}/learning-preview`)
    return unwrap(response)
  },

  async updateLessonProgress(lessonId, completed) {
    const response = await apiClient.patch(`/learning/progress/lessons/${lessonId}`, {
      completed,
    })
    return unwrap(response)
  },
}