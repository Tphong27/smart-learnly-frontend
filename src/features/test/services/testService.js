import apiClient from "@/services/api-client";
import { normalizeList, unwrap } from "./assessmentApiUtils";

/** Đọc cấu hình và câu hỏi an toàn của quiz nhúng trong course. */
export const testService = {
  /** Lấy cấu hình course quiz theo quyền enrollment hiện tại. */
  async getById(id, params = {}) {
    const response = await apiClient.get(`/course-quizzes/${id}`, { params });
    return unwrap(response);
  },

  /** Lấy câu hỏi course quiz ở dạng không lộ đáp án đúng. */
  async getLearnerQuestions(testId) {
    const response = await apiClient.get(
      `/course-quizzes/${testId}/questions`,
    );
    return normalizeList(response);
  },
};
