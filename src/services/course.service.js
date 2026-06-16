import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

function normalizeList(payload) {
  const data = unwrap(payload);
  const items = data?.items ?? data?.categories ?? data;

  return Array.isArray(items) ? items : [];
}

function normalizePage(payload) {
  const data = unwrap(payload);

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
  const data = unwrap(payload);
  return data?.course ?? data;
}

export const courseService = {
  async listAdmin({ page = 0, size = 20 } = {}) {
    const response = await apiClient.get("/admin/courses", {
      params: { page, size },
    });
    const data = unwrap(response);
    return data || { items: [], page: 0, size, totalItems: 0, totalPages: 0 };
  },

  async getAdmin(courseId) {
    const response = await apiClient.get(`/admin/courses/${courseId}`);
    return unwrap(response);
  },

  async create(payload) {
    const response = await apiClient.post("/admin/courses", payload);
    return unwrap(response);
  },

  async update(courseId, payload) {
    const response = await apiClient.patch(
      `/admin/courses/${courseId}`,
      payload,
    );
    return unwrap(response);
  },

  async remove(courseId) {
    return apiClient.delete(`/admin/courses/${courseId}`);
  },

  // Public catalog endpoints (used by preview lessons UX)
  async listPublic({ page = 0, size = 20 } = {}) {
    // /courses returns Spring Page<CourseListItemResponse> directly (not ApiResponse wrapper)
    return apiClient.get("/courses", { params: { page, size } });
  },

  async getPublicDetail(slug) {
    // /courses/{slug} returns CourseDetailResponse directly (not ApiResponse wrapper)
    return apiClient.get(`/courses/${slug}`);
  },

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
