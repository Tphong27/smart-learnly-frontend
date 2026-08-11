import apiClient from "@/services/api-client";
import { trainerCurriculumService } from "./trainerCurriculumService";

// Chặn request thiếu định danh trước khi tạo URL API.
function requireId(value, label) {
  if (!value) {
    throw new Error(`${label} is required`);
  }
}

// Tạo service lesson giới hạn theo một lớp và tương thích với LessonDetailEditor.
export function createTrainerLessonService(classId) {
  requireId(classId, "Class ID");
  const basePath = `/trainer/classes/${classId}/curriculum`;

  return {
    // Tải chi tiết lesson trong curriculum của lớp trainer.
    async getLessonDetail(lessonId) {
      requireId(lessonId, "Lesson ID");
      const response = await apiClient.get(
        `${basePath}/lessons/${lessonId}`,
      );
      const root = response?.data ?? response;
      return root?.data ?? root;
    },

    // Cập nhật lesson qua service curriculum dùng chung của lớp.
    updateLesson(lessonId, payload) {
      return trainerCurriculumService.updateLesson(classId, lessonId, payload);
    },
  };
}

export const trainerLessonService = createTrainerLessonService;
