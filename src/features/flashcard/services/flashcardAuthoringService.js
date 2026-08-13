import apiClient from "@/services/api-client";
import { unwrapApiData as unwrap } from "@/services/api-response";

/** Chỉ thêm trường có giá trị để request tạo thẻ không gửi dữ liệu rỗng. */
function appendIfPresent(formData, key, value) {
  if (value !== undefined && value !== null && value !== "") {
    formData.append(key, value);
  }
}

/** Chuyển dữ liệu sinh thẻ từ tệp thành FormData mà API AI tiếp nhận. */
function toGenerationFormData({
  file,
  desiredCount,
  language,
  generationMode,
}) {
  const formData = new FormData();
  formData.append("file", file);
  appendIfPresent(formData, "desiredCount", desiredCount);
  appendIfPresent(formData, "language", language);
  appendIfPresent(formData, "generationMode", generationMode);
  return formData;
}

export const flashcardAuthoringService = {
  /** Tạo lesson flashcard mới trong section của khóa học. */
  async createLesson(courseId, sectionId, payload) {
    const response = await apiClient.post(
      `/admin/courses/${courseId}/sections/${sectionId}/flashcard-lessons`,
      payload,
    );
    return unwrap(response);
  },

  /** Lấy một bộ flashcard để giảng viên quản trị. */
  async getAdminSet(setId) {
    const response = await apiClient.get(`/admin/flashcard-sets/${setId}`);
    return unwrap(response);
  },

  /** Lấy bộ flashcard gắn với lesson để xem trước trong màn quản trị. */
  async getAdminSetByLesson(lessonId) {
    const response = await apiClient.get(
      `/admin/lessons/${lessonId}/flashcards`,
    );
    return unwrap(response);
  },

  /** Cập nhật thông tin chung của một bộ flashcard. */
  async updateSet(setId, payload) {
    const response = await apiClient.patch(
      `/admin/flashcard-sets/${setId}`,
      payload,
    );
    return unwrap(response);
  },

  /** Xóa một bộ flashcard trong màn quản trị. */
  async deleteSet(setId) {
    const response = await apiClient.delete(`/admin/flashcard-sets/${setId}`);
    return unwrap(response);
  },

  /** Thêm một thẻ mới vào bộ flashcard. */
  async addCard(setId, payload) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/cards`,
      payload,
    );
    return unwrap(response);
  },

  /** Cập nhật nội dung của một thẻ flashcard. */
  async updateCard(cardId, payload) {
    const response = await apiClient.patch(
      `/admin/flashcard-cards/${cardId}`,
      payload,
    );
    return unwrap(response);
  },

  /** Xóa một thẻ khỏi bộ flashcard. */
  async deleteCard(cardId) {
    const response = await apiClient.delete(`/admin/flashcard-cards/${cardId}`);
    return unwrap(response);
  },

  /** Lưu thứ tự thẻ do giảng viên sắp xếp lại. */
  async reorderCards(setId, ids) {
    const response = await apiClient.patch(
      `/admin/flashcard-sets/${setId}/cards/reorder`,
      { ids },
    );
    return unwrap(response);
  },

  /** Tải ảnh minh họa lên bộ flashcard. */
  async uploadImage(setId, file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/images`,
      formData,
    );
    return unwrap(response);
  },

  /** Lấy câu hỏi nguồn có thể nhập vào khu vực duyệt thẻ. */
  async listSourceQuestions(setId, params = {}) {
    const response = await apiClient.get(
      `/admin/flashcard-sets/${setId}/staging/source-questions`,
      { params },
    );
    const payload = unwrap(response);
    const items = payload?.data ?? payload;
    return Array.isArray(items) ? items : [];
  },

  /** Nhập các câu hỏi của khóa học vào khu vực duyệt staging. */
  async importCourseQuestionsToStaging(setId, questionIds) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/import-course-questions`,
      { questionIds },
    );
    return unwrap(response);
  },

  /** Nhập câu hỏi khóa học vào khu vực duyệt tạm thời. */
  async importCourseQuestionsToTemporaryReview(setId, questionIds) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/temporary-review/import-course-questions`,
      { questionIds },
    );
    return unwrap(response);
  },

  /** Sinh thẻ nháp từ văn bản để giảng viên duyệt trước khi công bố. */
  async generateStagingFromText(setId, payload) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/generate-from-text`,
      payload,
    );
    return unwrap(response);
  },

  /** Sinh thẻ nháp từ tệp, kể cả tệp quét cần thời gian xử lý lâu hơn. */
  async generateStagingFromFile(setId, payload) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/generate-from-file`,
      toGenerationFormData(payload),
      // Scanned documents can require image reading followed by card generation.
      { timeout: 390000 },
    );
    return unwrap(response);
  },

  /** Sinh thẻ vào khu vực duyệt tạm thời từ một tệp. */
  async generateTemporaryFromFile(setId, payload) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/temporary-review/generate-from-file`,
      toGenerationFormData(payload),
      { timeout: 390000 },
    );
    return unwrap(response);
  },

  /** Sinh thẻ nháp từ transcript đã có sẵn. */
  async generateStagingFromTranscript(setId, payload) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/generate-from-transcript`,
      payload,
    );
    return unwrap(response);
  },

  /** Sinh thẻ nháp từ tệp transcript. */
  async generateStagingFromTranscriptFile(setId, payload) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/generate-from-transcript-file`,
      toGenerationFormData(payload),
      { timeout: 150000 },
    );
    return unwrap(response);
  },

  /** Lấy toàn bộ thẻ nháp đang chờ giảng viên duyệt. */
  async listStaging(setId) {
    const response = await apiClient.get(
      `/admin/flashcard-sets/${setId}/staging`,
    );
    const payload = unwrap(response);
    const items = payload?.data ?? payload;
    return Array.isArray(items) ? items : [];
  },

  /** Chỉnh sửa nội dung của một thẻ nháp trước khi duyệt. */
  async updateStagingCard(stagingCardId, payload) {
    const response = await apiClient.patch(
      `/admin/flashcard-staging-cards/${stagingCardId}`,
      payload,
    );
    return unwrap(response);
  },

  /** Loại bỏ một thẻ nháp không đạt yêu cầu. */
  async rejectStagingCard(stagingCardId) {
    const response = await apiClient.delete(
      `/admin/flashcard-staging-cards/${stagingCardId}`,
    );
    return unwrap(response);
  },

  /** Loại bỏ nhiều thẻ nháp cùng lúc. */
  async rejectStagingCards(setId, stagingCardIds) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/reject`,
      { stagingCardIds },
    );
    return unwrap(response);
  },

  /** Duyệt nhiều thẻ nháp để chuyển chúng vào bộ flashcard chính thức. */
  async approveStagingCards(setId, stagingCardIds) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/approve`,
      { stagingCardIds },
    );
    return unwrap(response);
  },

  /** Duyệt các thẻ từ khu vực tạm thời vào bộ flashcard chính thức. */
  async approveTemporaryCards(setId, cards) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/temporary-review/approve`,
      { cards },
    );
    return unwrap(response);
  },

};
