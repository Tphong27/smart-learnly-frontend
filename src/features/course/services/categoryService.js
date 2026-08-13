import apiClient from "@/services/api-client";
import { unwrapApiData as unwrap } from "@/services/api-response";

export const categoryService = {
  // Tải danh sách category quản trị theo keyword, trạng thái và category cha.
  async list(params = {}) {
    const search = new URLSearchParams();
    if (params.keyword) search.append("keyword", params.keyword);
    if (typeof params.active === "boolean") search.append("active", String(params.active));
    if (params.parentId) search.append("parentId", params.parentId);
    const query = search.toString();
    const response = await apiClient.get(`/admin/categories${query ? `?${query}` : ""}`);
    return unwrap(response) || [];
  },

  // Tải category công khai dùng cho menu và bộ lọc catalog.
  async listPublic() {
    const response = await apiClient.get("/categories", {
      skipAuthorization: true,
      skipAuthRedirect: true,
    });
    const data = unwrap(response);
    const items = data?.data ?? data?.items ?? data?.categories ?? data;
    return Array.isArray(items) ? items : [];
  },

  // Tải chi tiết category quản trị.
  async get(categoryId) {
    const response = await apiClient.get(`/admin/categories/${categoryId}`);
    return unwrap(response);
  },

  // Tạo category mới.
  async create(payload) {
    const response = await apiClient.post("/admin/categories", payload);
    return unwrap(response);
  },

  // Cập nhật category hiện có.
  async update(categoryId, payload) {
    const response = await apiClient.patch(`/admin/categories/${categoryId}`, payload);
    return unwrap(response);
  },

  // Xóa category theo endpoint quản trị hiện tại.
  async remove(categoryId) {
    return apiClient.delete(`/admin/categories/${categoryId}`);
  },
};
