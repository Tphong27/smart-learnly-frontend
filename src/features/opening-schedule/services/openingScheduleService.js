import apiClient from "@/services/api-client";

// Bóc payload lịch khai giảng trong ApiResponse backend.
function unwrapData(response) {
  const root = response?.data ?? response;
  return root?.data ?? root;
}

// Chuẩn hóa danh sách lịch khai giảng và metadata phân trang.
function normalizePage(response) {
  const data = unwrapData(response);
  const content = data?.content ?? data?.items ?? [];

  return {
    content: Array.isArray(content) ? content : [],
    page: Number(data?.page ?? data?.number ?? 0),
    size: Number(data?.size ?? 12),
    totalElements: Number(
      data?.totalElements ?? data?.totalItems ?? content.length,
    ),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

export const openingScheduleService = {
  // Tải lịch khai giảng công khai theo khóa học, thời gian và khoảng giá.
  async list({
    page = 0,
    size = 12,
    keyword = "",
    courseId = "",
    startFrom = "",
    startTo = "",
    minPrice = "",
    maxPrice = "",
  } = {}) {
    const response = await apiClient.get("/opening-schedules", {
      skipAuthorization: true,
      skipAuthRedirect: true,
      params: {
        page,
        size,
        ...(keyword && { keyword }),
        ...(courseId && { courseId }),
        ...(startFrom && { startFrom }),
        ...(startTo && { startTo }),
        ...(minPrice !== "" && { minPrice }),
        ...(maxPrice !== "" && { maxPrice }),
      },
    });

    return normalizePage(response);
  },

  // Tải chi tiết một lớp đang mở đăng ký.
  async getDetail(classId) {
    if (!classId) {
      throw new Error("Class ID is required");
    }

    const response = await apiClient.get(`/opening-schedules/${classId}`, {
      skipAuthorization: true,
      skipAuthRedirect: true,
    });

    return unwrapData(response);
  },
};
