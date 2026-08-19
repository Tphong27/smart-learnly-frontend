import apiClient from "@/services/api-client";
import { normalizeList, unwrap } from "./assessmentApiUtils";

export const testService = {
  async getMine(params = {}) {
    const response = await apiClient.get("/course-quizzes", {
      params: { ...params, scope: "managed" },
    });
    return normalizeList(response);
  },

  async getAvailable(params = {}) {
    const response = await apiClient.get("/course-quizzes", {
      params: { ...params, scope: "available" },
    });
    return normalizeList(response);
  },

  async getById(id, params = {}) {
    const response = await apiClient.get(`/course-quizzes/${id}`, { params });
    return unwrap(response);
  },

  async create(data) {
    const response = await apiClient.post("/course-quizzes", data);
    return unwrap(response);
  },

  async update(id, data) {
    const response = await apiClient.put(`/course-quizzes/${id}`, data);
    return unwrap(response);
  },

  /** Cập nhật thời lượng và số phút còn lại của các lượt đang làm. */
  async updateDuration(id, durationMinutes) {
    const response = await apiClient.patch(`/course-quizzes/${id}/duration`, {
      durationMinutes,
    });
    return unwrap(response);
  },

  async remove(id) {
    const response = await apiClient.delete(`/course-quizzes/${id}`);
    return unwrap(response);
  },

  async verifyAccessCode(id, accessCode, params = {}) {
    const response = await apiClient.post(
      `/course-quizzes/${id}/access-code/verify`,
      { accessCode },
      { params },
    );
    return unwrap(response);
  },

  async addQuestion(data) {
    const response = await apiClient.post("/course-quizzes/questions", data);
    return unwrap(response);
  },

  async getStaffQuestions(testId) {
    const response = await apiClient.get(
      `/course-quizzes/${testId}/staff-questions`,
    );
    return normalizeList(response);
  },

  async getLearnerQuestions(testId) {
    const response = await apiClient.get(
      `/course-quizzes/${testId}/questions`,
    );
    return normalizeList(response);
  },

  async updateQuestionMarks(testId, questionId, data) {
    const response = await apiClient.put(
      `/course-quizzes/${testId}/questions/${questionId}`,
      {
        orderIndex: data?.orderIndex,
        marks: data?.marks,
      },
    );
    return unwrap(response);
  },

  async removeQuestion(testId, questionId) {
    const response = await apiClient.delete(
      `/course-quizzes/${testId}/questions/${questionId}`,
    );
    return unwrap(response);
  },
};
