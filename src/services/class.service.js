import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

function unwrapData(response) {
  const root = unwrap(response);
  return root?.data ?? root;
}

function normalizePage(response) {
  const data = unwrapData(response);

  const content = data?.content ?? data?.items ?? data?.data ?? [];

  return {
    content: Array.isArray(content) ? content : [],
    page: Number(data?.page ?? data?.number ?? 0),
    size: Number(data?.size ?? 20),
    totalElements: Number(
      data?.totalElements ?? data?.total ?? content.length ?? 0,
    ),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

export const classService = {
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

  async getAdmin(classId) {
    const response = await apiClient.get(`/admin/classes/${classId}`);
    return unwrapData(response);
  },

  async listStatusOptions() {
    const response = await apiClient.get("/admin/classes/statuses");
    return unwrapData(response);
  },

  async create(payload) {
    const response = await apiClient.post("/admin/classes", payload);
    return unwrapData(response);
  },

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

  async cancel(classId) {
    const response = await apiClient.post(`/admin/classes/${classId}/cancel`);
    return unwrapData(response);
  },

  async delete(classId) {
    await apiClient.delete(`/admin/classes/${classId}`);
    return true;
  },

  // Placeholder methods for trainee-specific APIs
  async listTrainer({ page = 0, size = 20, keyword = "", status = "" } = {}) {
    const response = await apiClient.get("/trainer/classes", {
      params: {
        page,
        size,
        ...(keyword && { keyword }),
        ...(status && { status }),
      },
    });

    return normalizePage(response);
  },

  async getTrainer(classId) {
    if (!classId) {
      throw new Error("Class ID is required");
    }

    const response = await apiClient.get(`/trainer/classes/${classId}`);
    return unwrapData(response);
  },
};
