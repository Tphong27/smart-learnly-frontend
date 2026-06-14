import { apiClient } from "@/services/api-client";

function unwrapResponse(response) {
  return response?.data ?? response;
}

function normalizePage(payload) {
  const data = unwrapResponse(payload);

  const items =
    data?.content ?? data?.items ?? data?.courses ?? data?.data ?? [];

  return {
    items: Array.isArray(items) ? items : [],
    page: Number(data?.page ?? data?.number ?? 0),
    size: Number(data?.size ?? 12),
    totalElements: Number(
      data?.totalElements ?? data?.total ?? items.length ?? 0,
    ),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

function normalizeCourse(payload) {
  const data = unwrapResponse(payload);
  return data?.course ?? data;
}

export const courseService = {
  async getPublicCourses(params = {}) {
    const response = await apiClient.get("/courses", {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 12,
        keyword: params.keyword || undefined,
        categoryId: params.categoryId || undefined,
        sort: params.sort || "createdAt,desc",
      },
    });

    return normalizePage(response);
  },

  async getCategories() {
    const response = await apiClient.get("/categories", {
      params: {
        active: true,
      },
    });

    const data = unwrapResponse(response);
    return data?.items ?? data?.categories ?? data ?? [];
  },

  async getCourseDetail(slugOrId) {
    const response = await apiClient.get(`/courses/${slugOrId}`);
    return normalizeCourse(response);
  },

  async getMyCourses() {
    const response = await apiClient.get("/enrollments/my-courses");

    const data = unwrapResponse(response);

    return data?.items ?? data?.courses ?? data?.data ?? data ?? [];
  },
};
