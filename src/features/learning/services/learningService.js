import apiClient from "@/services/api-client";

/** Lấy payload nghiệp vụ từ response chuẩn của API. */
function unwrap(response) {
  return response?.data ?? response;
}

export const learningService = {
  /** Lấy nội dung học thật theo khóa và phạm vi lớp nếu học viên đã có quyền truy cập. */
  async getLearningContent(courseId, classId) {
    const response = await apiClient.get(`/learning/courses/${courseId}`, {
      params: classId ? { classId } : {},
    });
    return unwrap(response);
  },

  /** Lấy nội dung xem trước công khai của khóa học. */
  async getPreviewContent(courseId) {
    const response = await apiClient.get(`/courses/${courseId}/preview`, {
      skipAuthorization: true,
      skipAuthRedirect: true,
    });
    return unwrap(response);
  },

  /** Lấy nội dung xem trước dành cho quản trị theo đúng course hoặc lớp được chọn. */
  async getAdminPreviewContent(courseId, classId) {
    const response = await apiClient.get(
      `/admin/courses/${courseId}/learning-preview`,
      { params: classId ? { classId } : {} },
    );
    return unwrap(response);
  },

  /** Cập nhật trạng thái hoàn thành của lesson trong phạm vi học hiện tại. */
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

  /** Láº¥y bá»™ flashcard gáº¯n vá»›i lesson Ä‘ang hiá»ƒn thá»‹ trong workspace há»c. */
  async getLessonFlashcards(courseId, lessonId, classId) {
    const response = await apiClient.get(
      `/learning/courses/${courseId}/lessons/${lessonId}/flashcards`,
      {
        params: classId ? { classId } : {},
      },
    );
    return unwrap(response);
  },

  /** LÆ°u káº¿t quáº£ Ã´n tháº» trong luá»“ng flashcard cá»§a course/lesson. */
  async submitFlashcardProgress(cardId, result, classId) {
    const response = await apiClient.post(
      `/learning/flashcards/${cardId}/progress`,
      { result },
      { params: classId ? { classId } : {} },
    );
    return unwrap(response);
  },
};
