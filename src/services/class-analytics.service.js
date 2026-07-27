import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

function unwrapData(response) {
  const root = unwrap(response);

  return root?.data ?? root;
}

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
  getAdmin(classId, params = {}) {
    return getAnalytics("/admin/classes", classId, params);
  },

  getTrainer(classId, params = {}) {
    return getAnalytics("/trainer/classes", classId, params);
  },
};