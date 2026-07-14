import apiClient from "./api-client";

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

/**
 * Trainer quiz question CRUD, scoped to a single class.
 * Mirrors backend routes at
 *   /api/v1/trainer/classes/{classId}/curriculum/lessons/{lessonId}/questions
 */
export function createTrainerQuizService(classId) {
  requireId(classId, "Class ID");

  const buildPath = (lessonId, suffix = "") => {
    requireId(lessonId, "Lesson ID");
    return `/trainer/classes/${classId}/curriculum/lessons/${lessonId}/questions${suffix}`;
  };

  return {
    async getQuestions(lessonId) {
      const response = await apiClient.get(buildPath(lessonId));
      const data = unwrapData(response);
      return Array.isArray(data) ? data : (data?.items ?? []);
    },

    async attachQuestion(lessonId, body) {
      const response = await apiClient.post(buildPath(lessonId), body);
      return unwrapData(response);
    },

    async updateQuestion(lessonId, questionId, body) {
      requireId(questionId, "Question ID");
      const response = await apiClient.put(
        buildPath(lessonId, `/${questionId}`),
        body,
      );
      return unwrapData(response);
    },

    async detachQuestion(lessonId, questionId) {
      requireId(questionId, "Question ID");
      await apiClient.delete(buildPath(lessonId, `/${questionId}`));
      return true;
    },

    async reorderQuestions(lessonId, ids) {
      const response = await apiClient.post(buildPath(lessonId, "/reorder"), {
        ids,
      });
      return unwrapData(response);
    },
  };
}
