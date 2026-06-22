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

export const userService = {
  async listAdmin({
    role = "",
    status = "active",
    keyword = "",
    page = 0,
    size = 100,
  } = {}) {
    const response = await apiClient.get("/admin/users", {
      params: {
        page,
        size,
        ...(role && { role }),
        ...(status && { status }),
        ...(keyword && { keyword }),
      },
    });

    return normalizeUserPage(response);
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