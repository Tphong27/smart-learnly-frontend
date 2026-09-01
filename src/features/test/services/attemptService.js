import apiClient from "@/services/api-client";
import { normalizeList, unwrap } from "./assessmentApiUtils";

/** Gọi API bắt đầu, lưu và chấm attempt của quiz nhúng trong course. */
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
    const response = await apiClient.post("/course-quiz-attempts/start", {
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
      `/course-quiz-attempts/${attemptId}/submit`,
      submitData,
    );
    return unwrap(response);
  },

  /** Mở quyền tạo một attempt mới từ attempt đã kết thúc. */
  async reopen(attemptId) {
    const response = await apiClient.put(
      `/course-quiz-attempts/${attemptId}/reopen`,
    );
    return unwrap(response);
  },

  /** Lấy lịch sử làm một đề của một học viên. */
  async getHistory(testId, studentId, params = {}) {
    const response = await apiClient.get(
      `/course-quiz-attempts/quiz/${testId}/student/${studentId}`,
      { params },
    );
    return normalizeList(response);
  },

  /** Lấy chi tiết một lượt làm bài. */
  async getByTest(testId, params = {}) {
    const response = await apiClient.get(
      `/course-quiz-attempts/quiz/${testId}`,
      { params },
    );
    return normalizeList(response);
  },

  /** Lấy chi tiết một lượt làm bài để đồng bộ trạng thái và thời gian kết thúc. */
  async getById(attemptId, params = {}) {
    const response = await apiClient.get(`/course-quiz-attempts/${attemptId}`, {
      params,
    });
    return unwrap(response);
  },

  /** Lưu câu trả lời tạm thời của học viên trong lúc làm bài. */
  async saveAnswer(attemptId, questionId, selectedAnswerId, essayAnswer = "") {
    const response = await apiClient.post("/course-quiz-answers/save", {
      attemptId,
      questionId,
      selectedAnswerId,
      essayAnswer,
    });
    return unwrap(response);
  },

  /** Lấy các đáp án đã lưu của một lượt làm bài. */
  async getStudentAnswers(attemptId) {
    const response = await apiClient.get(
      `/course-quiz-answers/attempt/${attemptId}`,
    );
    return normalizeList(response);
  },
};
