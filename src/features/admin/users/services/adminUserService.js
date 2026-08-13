import apiClient from "@/services/api-client";
import { unwrapNestedApiData as unwrapData } from "@/services/api-response";

/** Chuẩn hóa các tên trường phân trang cũ/mới thành một model cho trang admin. */
function normalizeUserPage(response) {
  const data = unwrapData(response);
  const content = data?.content ?? data?.items ?? data?.users ?? [];

  return {
    content: Array.isArray(content) ? content : [],
    page: Number(data?.page ?? 0),
    size: Number(data?.size ?? 20),
    totalElements: Number(
      data?.totalElements ?? data?.totalItems ?? content.length ?? 0,
    ),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

/** Loại bộ lọc rỗng trước khi gửi query string. */
function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined,
    ),
  );
}

export const adminUserService = {
  /** Tải danh sách tài khoản theo vai trò, trạng thái, từ khóa và phân trang. */
  async listAdmin({
    role = "",
    status = "",
    keyword = "",
    page = 0,
    size = 20,
  } = {}) {
    const response = await apiClient.get("/admin/users", {
      params: cleanParams({
        page,
        size,
        role,
        status,
        keyword,
      }),
    });

    return normalizeUserPage(response);
  },

  /** Tải chi tiết một tài khoản cho màn hình quản trị. */
  async getAdmin(userId) {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return unwrapData(response);
  },

  /** Tạo tài khoản mới từ màn hình quản trị. */
  async create(payload) {
    const response = await apiClient.post("/admin/users", payload);
    return unwrapData(response);
  },

  /** Cập nhật tài khoản và quyền được phép chỉnh sửa bởi admin. */
  async update(userId, payload) {
    const response = await apiClient.patch(`/admin/users/${userId}`, payload);
    return unwrapData(response);
  },

  /** Xóa hoặc vô hiệu hóa tài khoản theo contract backend hiện tại. */
  async remove(userId) {
    await apiClient.delete(`/admin/users/${userId}`);
    return true;
  },

  /** Tải danh sách trainer active để chọn trong lịch/lớp học. */
  async listActiveTrainers({ page = 0, size = 100, keyword = "" } = {}) {
    return this.listAdmin({
      role: "TRAINER",
      status: "active",
      keyword,
      page,
      size,
    });
  },

  /** Tải danh sách SME active để gán người phụ trách nội dung khóa học. */
  async listActiveSmes({ page = 0, size = 100, keyword = "" } = {}) {
    return this.listAdmin({
      role: "SME",
      status: "active",
      keyword,
      page,
      size,
    });
  },
};
