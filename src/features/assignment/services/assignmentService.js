import apiClient from "@/services/api-client";
import { unwrapApiData as unwrap } from "@/services/api-response";

/** Chuẩn hóa response danh sách từ API thường hoặc Page của Spring. */
function normalizeList(payload) {
  const data = unwrap(payload);
  const items =
    data?.content ??
    data?.data ??
    data?.items ??
    data?.categories ??
    data?.courses ??
    data;
  return Array.isArray(items) ? items : [];
}

/** Gọi API quản lý bài tập, bài nộp và AI hỗ trợ chấm/soạn bài. */
export const assignmentService = {
  /** Lấy danh sách bài tập theo bộ lọc. */
  async getAll(params = {}) {
    const response = await apiClient.get("/assignments", { params });
    return normalizeList(response);
  },
  /** Lấy các bài tập do người dùng hiện tại quản lý. */
  async getMine(params = {}) {
    const response = await apiClient.get("/assignments/mine", { params });
    return normalizeList(response);
  },
  /** Lấy bài tập học viên hiện tại có thể thực hiện. */
  async getAvailable(params = {}) {
    const response = await apiClient.get("/assignments/available", { params });
    return normalizeList(response);
  },
  /** Lấy danh sách lớp có thể gán bài tập. */
  async getClasses(params = {}) {
    const response = await apiClient.get("/assignments/classes", { params });
    return normalizeList(response);
  },
  /** Lấy chi tiết một bài tập. */
  async getById(id) {
    const response = await apiClient.get(`/assignments/${id}`);
    return unwrap(response);
  },
  /** Lấy bài tập được gắn với lesson, có thể lọc theo lớp. */
  async getByLesson(lessonId, classId) {
    const response = await apiClient.get(`/assignments/lesson/${lessonId}`, {
      params: classId ? { classId } : undefined,
    });
    return unwrap(response);
  },
  /** Tạo bài tập mới. */
  async create(data) {
    const response = await apiClient.post("/assignments", data);
    return unwrap(response);
  },
  /** Cập nhật nội dung và cấu hình bài tập. */
  async update(id, data) {
    const response = await apiClient.put(`/assignments/${id}`, data);
    return unwrap(response);
  },
  /** Kiểm tra mã truy cập của một bài tập. */
  async verifyAccessCode(id, accessCode) {
    const response = await apiClient.post(`/assignments/${id}/access-code/verify`, {
      accessCode,
    });
    return unwrap(response);
  },
  /** Xóa một bài tập. */
  async remove(id) {
    return apiClient.delete(`/assignments/${id}`);
  },
  /** Nhờ AI tạo bản nháp bài tập để giảng viên xem và chỉnh sửa. */
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
  /** Bắt đầu một lượt nộp bài, hoặc lấy lượt nộp đang làm dở. */
  async start(data) {
    const response = await apiClient.post("/submissions/start", data);
    return unwrap(response);
  },
  /** Nộp bài làm của học viên. */
  async submit(data) {
    const response = await apiClient.post("/submissions", data);
    return unwrap(response);
  },
  /** Tải tệp đính kèm của bài nộp lên server. */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/submissions/upload-file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(response);
  },
  /** Tải tệp bài nộp, xử lý cả URL tuyệt đối và URL API tương đối. */
  async downloadFile(fileUrl) {
    const endpoint = /^https?:\/\//i.test(fileUrl)
      ? fileUrl
      : fileUrl.replace(/^\/api\/v1\/?/, "/");
    return apiClient.get(endpoint, { responseType: "blob" });
  },
  /** Cập nhật nội dung của một bài nộp chưa hoàn tất. */
  async updateSubmission(id, data) {
    const response = await apiClient.put(`/submissions/${id}`, data);
    return unwrap(response);
  },
  /** Lưu điểm và nhận xét chấm bài. */
  async gradeSubmission(id, gradeData) {
    const response = await apiClient.put(`/submissions/${id}/grade`, gradeData);
    return unwrap(response);
  },
  /** Nhờ AI đề xuất phản hồi cho bài nộp để giảng viên tham khảo. */
  async generateSubmissionFeedback(id) {
    const response = await apiClient.post(`/submissions/${id}/ai-feedback`, null, {
      timeout: 90000,
    });
    return unwrap(response);
  },
  /** Lấy các bài nộp thuộc một bài tập để giảng viên theo dõi. */
  async getSubmissionsByAssignment(assignmentId) {
    const response = await apiClient.get(
      `/submissions/assignment/${assignmentId}`,
    );
    return normalizeList(response);
  },
  /** Lấy bài nộp của một học viên, không tự chuyển trang khi bị từ chối. */
  async getSubmissionByStudent(assignmentId, studentId) {
    const response = await apiClient.get(
      `/submissions/assignment/${assignmentId}/student/${studentId}`,
      { skipAuthRedirect: true },
    );
    return unwrap(response);
  },
};
