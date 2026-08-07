import apiClient from "@/services/api-client";
import { normalizeList, unwrap } from "./assessmentApiUtils";

/** Gọi API bắt đầu, lưu và chấm kết quả làm bài kiểm tra. */
export const attemptService = {
  /** Tạo hoặc tiếp tục lượt làm bài của học viên. */
  async start(
    testId,
    studentId,
    assignmentId = null,
    studentName = "",
    accessCode = "",
    classId = null,
  ) {
    const response = await apiClient.post("/test-attempts/start", {
      testId,
      studentId,
      assignmentId,
      studentName,
      accessCode,
      classId,
    });
    return unwrap(response);
  },

  /** Nộp toàn bộ đáp án của một lượt làm bài. */
  async submit(attemptId, submitData) {
    const response = await apiClient.put(
      `/test-attempts/${attemptId}/submit`,
      submitData,
    );
    return unwrap(response);
  },

  /** Lấy lịch sử làm một đề của một học viên. */
  async getHistory(testId, studentId, params = {}) {
    const response = await apiClient.get(
      `/test-attempts/test/${testId}/student/${studentId}`,
      { params },
    );
    return normalizeList(response);
  },

  /** Lấy tất cả lượt làm bài của một đề để giảng viên theo dõi. */
  async getByTest(testId) {
    const response = await apiClient.get(`/test-attempts/test/${testId}`);
    return normalizeList(response);
  },

  /** Lấy chi tiết một lượt làm bài. */
  async getById(attemptId, params = {}) {
    const response = await apiClient.get(`/test-attempts/${attemptId}`, {
      params,
    });
    return unwrap(response);
  },

  /** Mở lại quyền làm bài cho học viên. */
  async reopen(testId, studentId) {
    return apiClient.put(
      `/test-attempts/test/${testId}/student/${studentId}/reopen`,
    );
  },

  /** Lưu câu trả lời tạm thời của học viên trong lúc làm bài. */
  async saveAnswer(attemptId, questionId, selectedAnswerId, essayAnswer = "") {
    const response = await apiClient.post("/student-test-answers/save", {
      attemptId,
      questionId,
      selectedAnswerId,
      essayAnswer,
    });
    return unwrap(response);
  },

  /** Lưu điểm và nhận xét chấm tự luận cho một câu trả lời. */
  async gradeEssay(answerId, gradeData) {
    const response = await apiClient.put(
      `/student-test-answers/${answerId}/grade`,
      gradeData,
    );
    return unwrap(response);
  },

  /** Lấy các đáp án đã lưu của một lượt làm bài. */
  async getStudentAnswers(attemptId) {
    const response = await apiClient.get(
      `/student-test-answers/attempt/${attemptId}`,
    );
    return normalizeList(response);
  },
};
