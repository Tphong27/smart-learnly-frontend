import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

function appendIfPresent(formData, key, value) {
  if (value !== undefined && value !== null && value !== "") {
    formData.append(key, value);
  }
}

function toGenerationFormData({ file, desiredCount, language, difficulty, generationMode }) {
  const formData = new FormData();
  formData.append("file", file);
  appendIfPresent(formData, "desiredCount", desiredCount);
  appendIfPresent(formData, "language", language);
  appendIfPresent(formData, "difficulty", difficulty);
  appendIfPresent(formData, "generationMode", generationMode);
  return formData;
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

  async uploadImage(setId, file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/images`,
      formData,
    );
    return unwrap(response);
  },

  async listSourceQuestions(setId, params = {}) {
    const response = await apiClient.get(
      `/admin/flashcard-sets/${setId}/staging/source-questions`,
      { params },
    );
    const payload = unwrap(response);
    const items = payload?.data ?? payload;
    return Array.isArray(items) ? items : [];
  },

  async importQuestionBankToStaging(setId, questionIds) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/import-question-bank`,
      { questionIds },
    );
    return unwrap(response);
  },

  async generateStagingFromText(setId, payload) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/generate-from-text`,
      payload,
    );
    return unwrap(response);
  },

  async generateStagingFromFile(setId, payload) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/generate-from-file`,
      toGenerationFormData(payload),
    );
    return unwrap(response);
  },

  async generateStagingFromTranscript(setId, payload) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/generate-from-transcript`,
      payload,
    );
    return unwrap(response);
  },

  async generateStagingFromTranscriptFile(setId, payload) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/generate-from-transcript-file`,
      toGenerationFormData(payload),
    );
    return unwrap(response);
  },

  async listStaging(setId) {
    const response = await apiClient.get(
      `/admin/flashcard-sets/${setId}/staging`,
    );
    const payload = unwrap(response);
    const items = payload?.data ?? payload;
    return Array.isArray(items) ? items : [];
  },

  async updateStagingCard(stagingCardId, payload) {
    const response = await apiClient.patch(
      `/admin/flashcard-staging-cards/${stagingCardId}`,
      payload,
    );
    return unwrap(response);
  },

  async rejectStagingCard(stagingCardId) {
    const response = await apiClient.delete(
      `/admin/flashcard-staging-cards/${stagingCardId}`,
    );
    return unwrap(response);
  },

  async approveStagingCards(setId, stagingCardIds) {
    const response = await apiClient.post(
      `/admin/flashcard-sets/${setId}/staging/approve`,
      { stagingCardIds },
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
