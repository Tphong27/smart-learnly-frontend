import apiClient from "./api-client";
import { flashcardService as sharedFlashcardService } from "./flashcard.service";

function unwrap(response) {
  return response?.data ?? response;
}

function unwrapData(response) {
  const root = unwrap(response);
  return root?.data ?? root;
}

function requireId(value, label) {
  if (!value) {
    throw new Error(`${label} is required`);
  }
}

function readSetId(payload) {
  const data = payload?.data ?? payload;
  return data?.id ?? data?.setId ?? null;
}

/**
 * Trainer flashcard service, scoped to a single class + lesson.
 *
 * All endpoints live under the trainer curriculum subprefix:
 *   /api/v1/trainer/classes/{classId}/curriculum/lessons/{lessonId}/flashcards
 *
 * FlashcardLessonEditor's contract only passes `cardId` (no setId) to
 * `updateCard`/`deleteCard`. Backend routes card ops through
 * `/set/{setId}/cards/{cardId}` for clean tenant boundaries, so the
 * service tracks the currently loaded setId internally and builds the
 * full path from it.
 */
export function createTrainerFlashcardService(classId, lessonId) {
  requireId(classId, "Class ID");
  requireId(lessonId, "Lesson ID");

  const basePath = `/trainer/classes/${classId}/curriculum/lessons/${lessonId}/flashcards`;
  let activeSetId = null;

  function rememberSet(payload) {
    const nextSetId = readSetId(payload);
    if (nextSetId) activeSetId = nextSetId;
    return payload;
  }

  function resolveSetId(explicitSetId) {
    const setId = explicitSetId || activeSetId;
    requireId(setId, "Flashcard set ID");
    return setId;
  }

  return {
    // Staging endpoints are shared with the admin editor. The backend resolves
    // the set's curriculum scope and re-authorizes trainer ownership.
    listSourceQuestions: (...args) => sharedFlashcardService.listSourceQuestions(...args),
    importQuestionBankToStaging: (...args) => sharedFlashcardService.importQuestionBankToStaging(...args),
    generateStagingFromText: (...args) => sharedFlashcardService.generateStagingFromText(...args),
    generateStagingFromFile: (...args) => sharedFlashcardService.generateStagingFromFile(...args),
    generateStagingFromTranscript: (...args) => sharedFlashcardService.generateStagingFromTranscript(...args),
    generateStagingFromTranscriptFile: (...args) => sharedFlashcardService.generateStagingFromTranscriptFile(...args),
    listStaging: (...args) => sharedFlashcardService.listStaging(...args),
    updateStagingCard: (...args) => sharedFlashcardService.updateStagingCard(...args),
    rejectStagingCard: (...args) => sharedFlashcardService.rejectStagingCard(...args),
    approveStagingCards: (...args) => sharedFlashcardService.approveStagingCards(...args),
    async createLesson(payload) {
      const response = await apiClient.post(basePath, payload);
      const data = unwrapData(response);
      rememberSet(data);
      return data;
    },

    async getAdminSet(setId) {
      const resolved = resolveSetId(setId);
      const response = await apiClient.get(`${basePath}/set/${resolved}`);
      const data = unwrapData(response);
      rememberSet(data);
      return data;
    },

    async getAdminSetByLesson() {
      const response = await apiClient.get(`${basePath}/set`);
      const data = unwrapData(response);
      rememberSet(data);
      return data;
    },

    async updateSet(setId, payload) {
      const resolved = resolveSetId(setId);
      const response = await apiClient.patch(
        `${basePath}/set/${resolved}`,
        payload,
      );
      const data = unwrapData(response);
      rememberSet(data);
      return data;
    },

    async deleteSet(setId) {
      const resolved = resolveSetId(setId);
      await apiClient.delete(`${basePath}/set/${resolved}`);
      if (activeSetId === resolved) activeSetId = null;
      return true;
    },

    async addCard(setId, payload) {
      const resolved = resolveSetId(setId);
      const response = await apiClient.post(
        `${basePath}/set/${resolved}/cards`,
        payload,
      );
      return unwrapData(response);
    },

    async updateCard(cardId, payload) {
      requireId(cardId, "Flashcard card ID");
      const resolved = resolveSetId();
      const response = await apiClient.patch(
        `${basePath}/set/${resolved}/cards/${cardId}`,
        payload,
      );
      return unwrapData(response);
    },

    async deleteCard(cardId) {
      requireId(cardId, "Flashcard card ID");
      const resolved = resolveSetId();
      await apiClient.delete(`${basePath}/set/${resolved}/cards/${cardId}`);
      return true;
    },

    async reorderCards(setId, ids) {
      const resolved = resolveSetId(setId);
      const response = await apiClient.patch(
        `${basePath}/set/${resolved}/cards/reorder`,
        { ids },
      );
      const data = unwrapData(response);
      rememberSet(data);
      return data;
    },
  };
}
