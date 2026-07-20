import apiClient from "./api-client";

// ==========================================
// Data normalization helpers
// ==========================================
function unwrap(response) {
  return response?.data ?? response;
}

function normalizeList(payload) {
  const data = unwrap(payload);
  // Prefer paged content first so Page<T> responses are not swallowed.
  const items =
    data?.content ??
    data?.data ??
    data?.items ??
    data?.categories ??
    data?.courses ??
    data;
  return Array.isArray(items) ? items : [];
}

function normalizePage(payload) {
  const data = unwrap(payload);

  const items =
    data?.content ?? data?.items ?? data?.courses ?? data?.data ?? [];

  return {
    items: Array.isArray(items) ? items : [],
    page: Number(data?.page ?? data?.number ?? 0),
    size: Number(data?.size ?? 12),
    totalElements: Number(
      data?.totalElements ?? data?.total ?? items.length ?? 0,
    ),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

// ==========================================
// Split service modules
// ==========================================

export const assignmentService = {
  async getAll(params = {}) {
    const response = await apiClient.get("/assignments", { params });
    return normalizeList(response);
  },
  async getMine(params = {}) {
    const response = await apiClient.get("/assignments/mine", { params });
    return normalizeList(response);
  },
  async getAvailable(params = {}) {
    const response = await apiClient.get("/assignments/available", { params });
    return normalizeList(response);
  },
  async getClasses(params = {}) {
    const response = await apiClient.get("/assignments/classes", { params });
    return normalizeList(response);
  },
  async getById(id) {
    const response = await apiClient.get(`/assignments/${id}`);
    return unwrap(response);
  },
  async getByLesson(lessonId, classId) {
    const response = await apiClient.get(`/assignments/lesson/${lessonId}`, {
      params: classId ? { classId } : undefined,
    });
    return unwrap(response);
  },
  async create(data) {
    const response = await apiClient.post("/assignments", data);
    return unwrap(response);
  },
  async update(id, data) {
    const response = await apiClient.put(`/assignments/${id}`, data);
    return unwrap(response);
  },
  async verifyAccessCode(id, accessCode) {
    const response = await apiClient.post(`/assignments/${id}/access-code/verify`, {
      accessCode,
    });
    return unwrap(response);
  },
  async remove(id) {
    return apiClient.delete(`/assignments/${id}`);
  },
  async generateAiDraft({
    message,
    mode,
    currentTitle,
    currentDescription,
    file,
    sourceCacheKey,
  }) {
    const formData = new FormData();
    formData.append("message", message);
    if (mode) formData.append("mode", mode);
    if (currentTitle) formData.append("currentTitle", currentTitle);
    if (currentDescription) {
      formData.append("currentDescription", currentDescription);
    }
    if (sourceCacheKey) formData.append("sourceCacheKey", sourceCacheKey);
    if (file) formData.append("file", file);
    const response = await apiClient.post("/assignments/ai-draft", formData, {
      timeout: 90000,
    });
    return unwrap(response);
  },

  // Submissions
  async start(data) {
    const response = await apiClient.post("/submissions/start", data);
    return unwrap(response);
  },
  async submit(data) {
    const response = await apiClient.post("/submissions", data);
    return unwrap(response);
  },
  async uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/submissions/upload-file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(response);
  },
  async downloadFile(fileUrl) {
    const endpoint = /^https?:\/\//i.test(fileUrl)
      ? fileUrl
      : fileUrl.replace(/^\/api\/v1\/?/, "/");
    return apiClient.get(endpoint, { responseType: "blob" });
  },
  async updateSubmission(id, data) {
    const response = await apiClient.put(`/submissions/${id}`, data);
    return unwrap(response);
  },
  async gradeSubmission(id, gradeData) {
    const response = await apiClient.put(`/submissions/${id}/grade`, gradeData);
    return unwrap(response);
  },
  async getSubmissionsByAssignment(assignmentId) {
    const response = await apiClient.get(
      `/submissions/assignment/${assignmentId}`,
    );
    return normalizeList(response);
  },
  async getSubmissionByStudent(assignmentId, studentId) {
    const response = await apiClient.get(
      `/submissions/assignment/${assignmentId}/student/${studentId}`,
      { skipAuthRedirect: true },
    );
    return unwrap(response);
  },
};

export const testService = {
  async getAll(params = {}) {
    const response = await apiClient.get("/tests", { params });
    return normalizeList(response);
  },
  async getMine(params = {}) {
    const response = await apiClient.get("/tests/mine", { params });
    return normalizeList(response);
  },
  async getById(id) {
    const response = await apiClient.get(`/tests/${id}`);
    return unwrap(response);
  },
  async create(data) {
    const response = await apiClient.post("/tests", data);
    return unwrap(response);
  },
  async update(id, data) {
    const response = await apiClient.put(`/tests/${id}`, data);
    return unwrap(response);
  },
  async verifyAccessCode(id, accessCode) {
    const response = await apiClient.post(`/tests/${id}/access-code/verify`, {
      accessCode,
    });
    return unwrap(response);
  },
  async remove(id) {
    return apiClient.delete(`/tests/${id}`);
  },

  // Test Questions Mapping
  async addQuestion(data) {
    const response = await apiClient.post("/test-questions", data);
    return unwrap(response);
  },
  async getQuestions(testId) {
    const response = await apiClient.get(`/test-questions/test/${testId}`);
    return normalizeList(response);
  },
  async getLearnerQuestions(testId) {
    const response = await apiClient.get(`/test-questions/test/${testId}`);
    return normalizeList(response);
  },
  async getStaffQuestions(testId) {
    const response = await apiClient.get(`/admin/test-questions/test/${testId}`);
    return normalizeList(response);
  },
  async updateQuestionMarks(testId, questionId, data) {
    const response = await apiClient.put(
      `/test-questions/test/${testId}/question/${questionId}`,
      data,
    );
    return unwrap(response);
  },
  async removeQuestion(testId, questionId) {
    return apiClient.delete(
      `/test-questions/test/${testId}/question/${questionId}`,
    );
  },
};

export const questionService = {
  async getAll(params = {}) {
    const response = await apiClient.get("/admin/questions", { params });
    return normalizePage(response).items;
  },
  async getByCourse(courseId, params = {}) {
    if (!courseId) return [];
    const response = await apiClient.get("/admin/questions", {
      params: {
        ...params,
        courseId,
        course_id: courseId,
      },
    });
    return normalizePage(response).items;
  },
  async getById(id) {
    const response = await apiClient.get(`/admin/questions/${id}`);
    return unwrap(response);
  },
  async create(data) {
    const response = await apiClient.post("/admin/questions", data);
    return unwrap(response);
  },
  async update(id, data) {
    const response = await apiClient.put(`/admin/questions/${id}`, data);
    return unwrap(response);
  },
  async remove(id) {
    return apiClient.delete(`/admin/questions/${id}`);
  },

  // Question Answers
  async createAnswer(data) {
    const response = await apiClient.post("/admin/question-answers", data);
    return unwrap(response);
  },
  async getAnswers(questionId) {
    const response = await apiClient.get(
      `/admin/question-answers/question/${questionId}`,
    );
    return normalizeList(response);
  },
  async updateAnswer(id, data) {
    const response = await apiClient.put(`/admin/question-answers/${id}`, data);
    return unwrap(response);
  },
  async deleteAnswer(id) {
    return apiClient.delete(`/admin/question-answers/${id}`);
  },
};

export const attemptService = {
  async start(
    testId,
    studentId,
    assignmentId = null,
    studentName = "",
    accessCode = "",
  ) {
    const response = await apiClient.post("/test-attempts/start", {
      testId,
      studentId,
      assignmentId,
      studentName,
      accessCode,
    });
    return unwrap(response);
  },
  async submit(attemptId, submitData) {
    const response = await apiClient.put(
      `/test-attempts/${attemptId}/submit`,
      submitData,
    );
    return unwrap(response);
  },
  async getHistory(testId, studentId) {
    const response = await apiClient.get(
      `/test-attempts/test/${testId}/student/${studentId}`,
    );
    return normalizeList(response);
  },
  async getByTest(testId) {
    const response = await apiClient.get(`/test-attempts/test/${testId}`);
    return normalizeList(response);
  },
  async reopen(testId, studentId) {
    return apiClient.put(`/test-attempts/test/${testId}/student/${studentId}/reopen`);
  },

  // Save answers
  async saveAnswer(attemptId, questionId, selectedAnswerId, essayAnswer = "") {
    const response = await apiClient.post("/student-test-answers/save", {
      attemptId,
      questionId,
      selectedAnswerId,
      essayAnswer,
    });
    return unwrap(response);
  },
  async gradeEssay(answerId, gradeData) {
    const response = await apiClient.put(
      `/student-test-answers/${answerId}/grade`,
      gradeData,
    );
    return unwrap(response);
  },
  async getStudentAnswers(attemptId) {
    const response = await apiClient.get(
      `/student-test-answers/attempt/${attemptId}`,
    );
    return normalizeList(response);
  },
};
