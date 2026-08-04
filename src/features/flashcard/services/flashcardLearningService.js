import apiClient from "@/services/api-client";

/** Lấy payload nghiệp vụ từ response chuẩn của API. */
function unwrap(response) {
  return response?.data ?? response;
}

/** Thêm dấu thời điểm để mỗi lần đọc practice lấy trạng thái tiến độ mới nhất. */
function practiceReadParams(params = {}) {
  return {
    ...params,
    _progressReadAt: Date.now(),
  };
}

export const flashcardLearningService = {
  /** Lấy danh sách lesson flashcard học viên có thể luyện tập. */
  async listLearningFlashcards() {
    const response = await apiClient.get("/learning/flashcards");
    const payload = unwrap(response);
    const items = payload?.data ?? payload;
    return Array.isArray(items) ? items : [];
  },

  /** Lấy bộ flashcard hiệu lực của lesson trong course online hoặc lớp học. */
  async getLessonPractice(lessonId, classId) {
    const response = await apiClient.get(
      `/learning/lessons/${lessonId}/flashcards`,
      {
        params: practiceReadParams({ classId }),
      },
    );
    return unwrap(response);
  },

  /** Lấy dữ liệu luyện tập của một flashcard set theo id. */
  async getSetPractice(setId) {
    const response = await apiClient.get(`/learning/flashcard-sets/${setId}`, {
      params: practiceReadParams(),
    });
    return unwrap(response);
  },

  /** Lưu kết quả ôn thẻ để backend cập nhật spaced repetition. */
  async submitProgress(cardId, result) {
    const response = await apiClient.post(
      `/learning/flashcards/${cardId}/progress`,
      { result },
    );
    return unwrap(response);
  },
};
