import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

export const previewLessonService = {
  async list(courseId) {
    const response = await apiClient.get(`/courses/${courseId}/preview-lessons`)
    return unwrap(response) || []
  },

  async get(courseId, lessonId) {
    const response = await apiClient.get(`/courses/${courseId}/preview-lessons/${lessonId}`)
    return unwrap(response)
  },
}
