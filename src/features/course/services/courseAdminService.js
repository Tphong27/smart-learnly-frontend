import apiClient from "@/services/api-client";

// Bóc payload nghiệp vụ khỏi envelope chuẩn của backend.
function unwrap(response) {
  return response?.data ?? response;
}

// Lấy danh sách course từ các biến thể page response đang được backend hỗ trợ.
function getPageItems(data) {
  const items =
    data?.items ??
    data?.content ??
    data?.courses ??
    data?.data?.items ??
    data?.data?.content ??
    data?.data?.courses ??
    data?.data;

  return Array.isArray(items) ? items : [];
}

export const courseAdminService = {
  // Tải danh sách khóa học quản trị theo bộ lọc và chuẩn hóa metadata phân trang.
  async list({ page = 0, size = 20, keyword, status, categoryId, level } = {}) {
    const params = { page, size };
    if (keyword?.trim()) params.keyword = keyword.trim();
    if (status && status !== "all") params.status = status;
    if (categoryId && categoryId !== "all") params.categoryId = categoryId;
    if (level && level !== "all") params.level = level;

    const response = await apiClient.get("/admin/courses", { params });
    const root = unwrap(response);
    const data = root?.data ?? root;
    const items = getPageItems(data);

    return {
      items,
      page: Number(data?.page ?? page),
      size: Number(data?.size ?? size),
      totalItems: Number(
        data?.totalItems ?? data?.totalElements ?? data?.total ?? items.length,
      ),
      totalPages: Number(data?.totalPages ?? 1),
    };
  },

  // Tải chi tiết khóa học dành cho màn hình quản trị.
  async get(courseId) {
    const response = await apiClient.get(`/admin/courses/${courseId}`);
    return unwrap(response);
  },

  // Tạo khóa học mới từ dữ liệu form quản trị.
  async create(payload) {
    const response = await apiClient.post("/admin/courses", payload);
    return unwrap(response);
  },

  // Cập nhật thông tin và trạng thái xuất bản của khóa học.
  async update(courseId, payload) {
    const response = await apiClient.patch(`/admin/courses/${courseId}`, payload);
    return unwrap(response);
  },

  // Xóa khóa học theo endpoint quản trị hiện tại.
  async remove(courseId) {
    return apiClient.delete(`/admin/courses/${courseId}`);
  },

  // Tải thumbnail và trả metadata file để gắn vào khóa học.
  async uploadThumbnail(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      "/admin/uploads/course-thumbnails",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return unwrap(response);
  },
};
