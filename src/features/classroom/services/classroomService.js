import apiClient from "@/services/api-client";
import { unwrapNestedApiData as unwrapData } from "@/services/api-response";

// Chuẩn hóa page lớp học để list admin/trainer dùng cùng cấu trúc.
function normalizePage(response) {
  const data = unwrapData(response);
  const content = data?.content ?? data?.items ?? data?.data ?? [];
  const normalizedContent = Array.isArray(content) ? content : [];

  return {
    content: normalizedContent,
    page: Number(data?.page ?? data?.number ?? 0),
    size: Number(data?.size ?? normalizedContent.length ?? 20),
    totalElements: Number(
      data?.totalElements ??
        data?.totalItems ??
        data?.total ??
        normalizedContent.length,
    ),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

export const classroomService = {
  // Tải danh sách lớp cho admin theo bộ lọc và phân trang.
  async listAdmin({
    page = 0,
    size = 20,
    keyword = "",
    courseId = "",
    trainerId = "",
    status = "",
  } = {}) {
    const response = await apiClient.get("/admin/classes", {
      params: {
        page,
        size,
        ...(keyword && { keyword }),
        ...(courseId && { courseId }),
        ...(trainerId && { trainerId }),
        ...(status && { status }),
      },
    });

    return normalizePage(response);
  },

  // Tải chi tiết một lớp trong phạm vi admin.
  async getAdmin(classId) {
    const response = await apiClient.get(`/admin/classes/${classId}`);
    return unwrapData(response);
  },

  // Tải các trạng thái lớp hợp lệ để dựng bộ lọc/form.
  async listStatusOptions() {
    const response = await apiClient.get("/admin/classes/statuses");
    return unwrapData(response);
  },

  // Yêu cầu backend sinh đường dẫn phòng học trực tuyến mới.
  async generateMeetingUrl() {
    const response = await apiClient.post("/admin/classes/meeting-links");
    return unwrapData(response);
  },

  // Tạo lớp học mới từ form staff.
  async create(payload) {
    const response = await apiClient.post("/admin/classes", payload);
    return unwrapData(response);
  },

  // Chỉ gửi các trường lớp đã thay đổi và từ chối payload rỗng.
  async update(classId, payload) {
    if (!classId) {
      throw new Error("Class ID is required");
    }

    const cleanedPayload = Object.fromEntries(
      Object.entries(payload || {}).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(cleanedPayload).length === 0) {
      throw new Error("No class field was changed");
    }

    const response = await apiClient.patch(
      `/admin/classes/${classId}`,
      cleanedPayload,
    );

    return unwrapData(response);
  },

  // Hủy một lớp đang hoạt động theo quy tắc lifecycle backend.
  async cancel(classId) {
    if (!classId) {
      throw new Error("Class ID is required");
    }
    const response = await apiClient.post(`/admin/classes/${classId}/cancel`);
    return unwrapData(response);
  },

  // Khôi phục lớp đã hủy với lịch ngày mới do staff cung cấp.
  async restore(classId, payload) {
    if (!classId) {
      throw new Error("Class ID is required");
    }

    const response = await apiClient.post(
      `/admin/classes/${classId}/restore`,
      payload,
    );

    return unwrapData(response);
  },

  // Xóa lớp theo endpoint admin hiện tại.
  async delete(classId) {
    await apiClient.delete(`/admin/classes/${classId}`);
    return true;
  },

  // Tải danh sách lớp được phân công cho trainer theo bộ lọc.
  async listTrainer({
    page = 0,
    size = 20,
    keyword = "",
    status = "",
    courseId = "",
  } = {}) {
    const response = await apiClient.get("/trainer/classes", {
      params: {
        page,
        size,
        ...(keyword && { keyword }),
        ...(status && { status }),
        ...(courseId && { courseId }),
      },
    });

    return normalizePage(response);
  },

  // Tải chi tiết lớp trong phạm vi trainer hiện tại.
  async getTrainer(classId) {
    if (!classId) {
      throw new Error("Class ID is required");
    }

    const response = await apiClient.get(`/trainer/classes/${classId}`);
    return unwrapData(response);
  },
};
