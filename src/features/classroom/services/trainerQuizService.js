import apiClient from "@/services/api-client";
import { unwrapNestedApiData as unwrapData } from "@/services/api-response";
import { requireTrainerResourceId } from "./trainerServiceUtils";

// Tạo service quản lý quiz question được giới hạn theo một lớp trainer.
export function createTrainerQuizService(classId) {
  requireTrainerResourceId(classId, "Class ID");

  // Tạo URL question đã giới hạn theo lớp và lesson.
  const buildPath = (lessonId, suffix = "") => {
    requireTrainerResourceId(lessonId, "Lesson ID");
    return `/trainer/classes/${classId}/curriculum/lessons/${lessonId}/questions${suffix}`;
  };

  return {
    // Tải toàn bộ question đã gắn vào lesson.
    async getQuestions(lessonId) {
      const response = await apiClient.get(buildPath(lessonId));
      const data = unwrapData(response);
      return Array.isArray(data) ? data : (data?.items ?? []);
    },

    // Gắn một question vào lesson curriculum.
    async attachQuestion(lessonId, body) {
      const response = await apiClient.post(buildPath(lessonId), body);
      return unwrapData(response);
    },

    // Cập nhật cấu hình question đã gắn trong lesson.
    async updateQuestion(lessonId, questionId, body) {
      requireTrainerResourceId(questionId, "Question ID");
      const response = await apiClient.put(
        buildPath(lessonId, `/${questionId}`),
        body,
      );
      return unwrapData(response);
    },

    // Gỡ question khỏi lesson mà không xóa question bank gốc.
    async detachQuestion(lessonId, questionId) {
      requireTrainerResourceId(questionId, "Question ID");
      await apiClient.delete(buildPath(lessonId, `/${questionId}`));
      return true;
    },

    // Lưu thứ tự question mới trong lesson.
    async reorderQuestions(lessonId, ids) {
      const response = await apiClient.post(buildPath(lessonId, "/reorder"), {
        ids,
      });
      return unwrapData(response);
    },
  };
}
