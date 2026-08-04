import apiClient from "@/services/api-client";
import { normalizeList, unwrap } from "./assessmentApiUtils";

/** Gọi API quản lý đề kiểm tra và danh sách câu hỏi thuộc đề. */
export const testService = {
  /** Lấy danh sách đề kiểm tra theo bộ lọc. */
  async getAll(params = {}) {
    const response = await apiClient.get("/tests", { params });
    return normalizeList(response);
  },

  /** Lấy các đề do giảng viên hiện tại quản lý. */
  async getMine(params = {}) {
    const response = await apiClient.get("/tests/mine", { params });
    return normalizeList(response);
  },

  /** Lấy các đề mà học viên hiện tại được phép làm. */
  async getAvailable(params = {}) {
    const response = await apiClient.get("/tests/available", { params });
    return normalizeList(response);
  },

  /** Lấy chi tiết một đề kiểm tra. */
  async getById(id) {
    const response = await apiClient.get(`/tests/${id}`);
    return unwrap(response);
  },

  /** Tạo đề kiểm tra mới. */
  async create(data) {
    const response = await apiClient.post("/tests", data);
    return unwrap(response);
  },

  /** Cập nhật thông tin đề kiểm tra. */
  async update(id, data) {
    const response = await apiClient.put(`/tests/${id}`, data);
    return unwrap(response);
  },

  /** Kiểm tra mã truy cập trước khi học viên làm đề. */
  async verifyAccessCode(id, accessCode) {
    const response = await apiClient.post(`/tests/${id}/access-code/verify`, {
      accessCode,
    });
    return unwrap(response);
  },

  /** Xóa một đề kiểm tra. */
  async remove(id) {
    return apiClient.delete(`/tests/${id}`);
  },

  /** Gắn một câu hỏi trong ngân hàng vào đề kiểm tra. */
  async addQuestion(data) {
    const response = await apiClient.post("/test-questions", data);
    return unwrap(response);
  },

  /** Lấy câu hỏi của đề theo quyền thông thường. */
  async getQuestions(testId) {
    const response = await apiClient.get(`/test-questions/test/${testId}`);
    return normalizeList(response);
  },

  /** Lấy câu hỏi học viên được phép nhìn thấy khi làm đề. */
  async getLearnerQuestions(testId) {
    const response = await apiClient.get(`/test-questions/test/${testId}`);
    return normalizeList(response);
  },

  /** Lấy toàn bộ câu hỏi đề cho giảng viên quản lý. */
  async getStaffQuestions(testId) {
    const response = await apiClient.get(
      `/admin/test-questions/test/${testId}`,
    );
    return normalizeList(response);
  },

  /** Cập nhật điểm hoặc thứ tự của câu hỏi trong đề. */
  async updateQuestionMarks(testId, questionId, data) {
    const response = await apiClient.put(
      `/test-questions/test/${testId}/question/${questionId}`,
      data,
    );
    return unwrap(response);
  },

  /** Bỏ một câu hỏi khỏi đề kiểm tra. */
  async removeQuestion(testId, questionId) {
    return apiClient.delete(
      `/test-questions/test/${testId}/question/${questionId}`,
    );
  },
};
