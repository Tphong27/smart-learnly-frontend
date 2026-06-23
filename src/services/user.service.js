import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

function unwrapData(response) {
  const root = unwrap(response);
  return root?.data ?? root;
}

function normalizeUserPage(response) {
  const data = unwrapData(response);
  const content = data?.content ?? data?.items ?? data?.users ?? [];

  return {
    content: Array.isArray(content) ? content : [],
    page: Number(data?.page ?? 0),
    size: Number(data?.size ?? 20),
    totalElements: Number(data?.totalElements ?? data?.totalItems ?? content.length ?? 0),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined),
  );
}

export const userService = {
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

  async getAdmin(userId) {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return unwrapData(response);
  },

  async create(payload) {
    const response = await apiClient.post("/admin/users", payload);
    return unwrapData(response);
  },

  async update(userId, payload) {
    const response = await apiClient.patch(`/admin/users/${userId}`, payload);
    return unwrapData(response);
  },

  async remove(userId) {
    await apiClient.delete(`/admin/users/${userId}`);
    return true;
  },

  async listActiveTrainers({ page = 0, size = 100, keyword = "" } = {}) {
    return this.listAdmin({
      role: "TRAINER",
      status: "active",
      keyword,
      page,
      size,
    });
  },
};
