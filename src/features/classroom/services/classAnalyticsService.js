import apiClient from "@/services/api-client";

// Bóc envelope HTTP một lớp nếu interceptor chưa trả thẳng payload.
function unwrap(response) {
  return response?.data ?? response;
}

// Bóc payload analytics trong ApiResponse backend.
function unwrapData(response) {
  const root = unwrap(response);

  return root?.data ?? root;
}

// Chuẩn hóa bộ lọc analytics thành query params ổn định.
function buildAnalyticsParams(params = {}) {
  const keyword = String(params.keyword ?? "").trim();

  return {
    inactiveDays: Number(params.inactiveDays ?? 7),
    keyword: keyword || undefined,
    progress: params.progress || "all",
    indicator: params.indicator || "all",
    page: Number(params.page ?? 0),
    size: Number(params.size ?? 10),
  };
}

// Gọi endpoint analytics chung cho phạm vi admin hoặc trainer.
async function getAnalytics(basePath, classId, params) {
  if (!classId) {
    throw new Error("Class ID is required");
  }

  const response = await apiClient.get(`${basePath}/${classId}/analytics`, {
    params: buildAnalyticsParams(params),
  });

  return unwrapData(response);
}

export const classAnalyticsService = {
  // Tải hiệu suất học viên của lớp trong phạm vi admin.
  getAdmin(classId, params = {}) {
    return getAnalytics("/admin/classes", classId, params);
  },

  // Tải hiệu suất học viên của lớp trong phạm vi trainer.
  getTrainer(classId, params = {}) {
    return getAnalytics("/trainer/classes", classId, params);
  },
};
