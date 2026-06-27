import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

export const flashcardService = {
  async createLesson(courseId, sectionId, payload) {
    const response = await apiClient.post(
      `/admin/courses/${courseId}/sections/${sectionId}/flashcard-lessons`,
      payload,
    );
    return unwrap(response);
  },

  async getAdminSet(setId) {
    const response = await apiClient.get(`/admin/flashcard-sets/${setId}`);
    return unwrap(response);
  },

  async getAdminSetByLesson(lessonId) {
    const response = await apiClient.get(
      `/admin/lessons/${lessonId}/flashcards`,
    );
    return unwrap(response);
  },

  async updateSet(setId, payload) {
    const response = await apiClient.patch(
      `/admin/flashcard-sets/${setId}`,
      payload,
    );
    return unwrap(response);
  },

  async deleteSet(setId) {
    const response = await apiClient.delete(`/admin/flashcard-sets/${setId}`);
    return unwrap(response);
  },

  async addCard(setId, payload) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/cards`,
      payload,
    );
    return unwrap(response);
  },

  async updateCard(cardId, payload) {
    const response = await apiClient.patch(
      `/admin/flashcard-cards/${cardId}`,
      payload,
    );
    return unwrap(response);
  },

  async deleteCard(cardId) {
    const response = await apiClient.delete(`/admin/flashcard-cards/${cardId}`);
    return unwrap(response);
  },

  async reorderCards(setId, ids) {
    const response = await apiClient.patch(
      `/admin/flashcard-sets/${setId}/cards/reorder`,
      { ids },
    );
    return unwrap(response);
  },

  async listLearningFlashcards() {
    const response = await apiClient.get("/learning/flashcards");
    const payload = unwrap(response);
    const items = payload?.data ?? payload;
    return Array.isArray(items) ? items : [];
  },

  async getLessonPractice(lessonId) {
    const response = await apiClient.get(
      `/learning/lessons/${lessonId}/flashcards`,
    );
    return unwrap(response);
  },

  async getSetPractice(setId) {
    const response = await apiClient.get(`/learning/flashcard-sets/${setId}`);
    return unwrap(response);
  },

  async submitProgress(cardId, result) {
    const response = await apiClient.post(
      `/learning/flashcards/${cardId}/progress`,
      { result },
    );
    return unwrap(response);
  },
};
