import apiClient from "./api-client";
import { trainerCurriculumService } from "./trainer-curriculum.service";

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
 * Factory returning a service object compatible with
 * `LessonDetailEditor`'s `services` contract, scoped to a single
 * trainer class. Reuses trainerCurriculumService for updateLesson.
 */
export function createTrainerLessonService(classId) {
  requireId(classId, "Class ID");
  const basePath = `/trainer/classes/${classId}/curriculum`;

  return {
    async getLessonDetail(lessonId) {
      requireId(lessonId, "Lesson ID");
      const response = await apiClient.get(
        `${basePath}/lessons/${lessonId}`,
      );
      return unwrapData(response);
    },

    updateLesson(lessonId, payload) {
      return trainerCurriculumService.updateLesson(classId, lessonId, payload);
    },
  };
}

export const trainerLessonService = createTrainerLessonService;
