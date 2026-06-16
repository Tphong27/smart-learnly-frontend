import { apiClient } from "@/services/api-client";

function unwrapResponse(response) {
  return response?.data ?? response;
}

function normalizeList(payload) {
  const data = unwrapResponse(payload);
  const items = data?.items ?? data?.categories ?? data;

  return Array.isArray(items) ? items : [];
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
    const page = params.page ?? 0;
    const size = params.size ?? 12;
    const keyword = params.keyword?.trim();
    const categorySlug = params.categorySlug || params.categoryId;

    let response;

    if (keyword) {
      response = await apiClient.get("/courses/search", {
        skipAuthRedirect: true,
        params: {
          keyword,
          page,
          size,
        },
      });
    } else if (categorySlug) {
      response = await apiClient.get(`/courses/category/${categorySlug}`, {
        skipAuthRedirect: true,
        params: {
          page,
          size,
        },
      });
    } else {
      response = await apiClient.get("/courses", {
        skipAuthRedirect: true,
        params: {
          page,
          size,
        },
      });
    }

    return normalizePage(response);
  },

  async getCategories() {
    const response = await apiClient.get("/categories", {
      skipAuthRedirect: true,
    });

    return normalizeList(response);
  },

  async getCourseDetail(slugOrId) {
    const response = await apiClient.get(`/courses/${slugOrId}`, {
      skipAuthRedirect: true,
    });
    return normalizeCourse(response);
  },

  async getMyCourses() {
    const response = await apiClient.get("/enrollments/my-courses");
    return normalizeList(response);
  },
};
