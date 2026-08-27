import apiClient from "@/services/api-client";
import { unwrapApiData as unwrap } from "@/services/api-response";

export const learningService = {
  /** Lấy nội dung học thật theo khóa và phạm vi lớp nếu học viên đã có quyền truy cập. */
  async getLearningContent(courseId, classId) {
    const response = await apiClient.get(`/learning/courses/${courseId}`, {
      params: classId ? { classId } : {},
    });
    return unwrap(response);
  },

  /** Lấy nội dung xem trước công khai của khóa học. */
  // async getPreviewContent(courseId) {
  //   const response = await apiClient.get(`/courses/${courseId}/preview`, {
  //     skipAuthorization: true,
  //     skipAuthRedirect: true,
  //   });
  //   return unwrap(response);
  // },

  /**
   * Lấy curriculum preview công khai.
   * Có classId thì backend sẽ ưu tiên curriculum đã publish của class.
   */
  async getPreviewContent(courseId, classId = null) {
    const response = await apiClient.get(`/courses/${courseId}/preview`, {
      params: classId ? { classId } : {},
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

  async getLessonFlashcards(courseId, lessonId, classId) {
    const response = await apiClient.get(
      `/learning/courses/${courseId}/lessons/${lessonId}/flashcards`,
      {
        params: classId ? { classId } : {},
      },
    );
    return unwrap(response);
  },

  async submitFlashcardProgress(cardId, result, classId) {
    const response = await apiClient.post(
      `/learning/flashcards/${cardId}/progress`,
      { result },
      { params: classId ? { classId } : {} },
    );
    return unwrap(response);
  },

  /**
   * Lấy danh sách câu hỏi chỉ đọc của lesson QUIZ được phép preview.
   *
   * Response không có đáp án đúng và không tạo attempt.
   */
  async getPreviewTestQuestions(courseId, lessonId, classId = null) {
    const response = await apiClient.get(
      `/courses/${courseId}/preview-lessons/${lessonId}/questions`,
      {
        params: classId ? { classId } : {},
        skipAuthorization: true,
        skipAuthRedirect: true,
      },
    );

    return unwrap(response) || [];
  },

  /** Lấy câu hỏi chỉ đọc của quiz trong staff preview, kể cả course đang draft. */
  async getAdminPreviewTestQuestions(courseId, lessonId, classId = null) {
    const response = await apiClient.get(
      `/admin/courses/${courseId}/learning-preview-lessons/${lessonId}/questions`,
      { params: classId ? { classId } : {} },
    );

    return unwrap(response) || [];
  },

  /**
   * Lấy bộ flashcard chỉ đọc của lesson được phép preview.
   */
  async getPreviewLessonFlashcards(courseId, lessonId, classId = null) {
    const response = await apiClient.get(
      `/courses/${courseId}/preview-lessons/${lessonId}/flashcards`,
      {
        params: classId ? { classId } : {},
        skipAuthorization: true,
        skipAuthRedirect: true,
      },
    );

    return unwrap(response);
  },
};
