import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

export const learningService = {
  async getLearningContent(courseId, classId) {
    const response = await apiClient.get(`/learning/courses/${courseId}`, {
      params: classId ? { classId } : {},
    });
    return unwrap(response);
  },

  async getPreviewContent(courseId) {
    const response = await apiClient.get(`/courses/${courseId}/preview`, {
      skipAuthorization: true,
      skipAuthRedirect: true,
    });
    return unwrap(response);
  },

  async getAdminPreviewContent(courseId, classId) {
    const response = await apiClient.get(
      `/admin/courses/${courseId}/learning-preview`,
      { params: classId ? { classId } : {} },
    );
    return unwrap(response);
  },

  async updateLessonProgress(lessonId, completed, classId, courseId) {
    const response = await apiClient.patch(
      `/learning/progress/lessons/${lessonId}`,
      { completed },
      {
        params: {
          ...(courseId ? { courseId } : {}),
          ...(classId ? { classId } : {}),
        },
      },
    );
    return unwrap(response);
  },
};
