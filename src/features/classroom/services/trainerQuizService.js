import apiClient from "@/services/api-client";

// Bóc envelope HTTP một lớp nếu interceptor chưa trả thẳng payload.
function unwrap(response) {
  return response?.data ?? response;
}

// Bóc payload question trong ApiResponse backend.
function unwrapData(response) {
  const root = unwrap(response);
  return root?.data ?? root;
}

// Chặn request thiếu định danh trước khi tạo URL API.
function requireId(value, label) {
  if (!value) {
    throw new Error(`${label} is required`);
  }
}

// Tạo service quản lý quiz question được giới hạn theo một lớp trainer.
export function createTrainerQuizService(classId) {
  requireId(classId, "Class ID");

  // Tạo URL question đã giới hạn theo lớp và lesson.
  const buildPath = (lessonId, suffix = "") => {
    requireId(lessonId, "Lesson ID");
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
      requireId(questionId, "Question ID");
      const response = await apiClient.put(
        buildPath(lessonId, `/${questionId}`),
        body,
      );
      return unwrapData(response);
    },

    // Gỡ question khỏi lesson mà không xóa question bank gốc.
    async detachQuestion(lessonId, questionId) {
      requireId(questionId, "Question ID");
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
