import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

function normalizeList(payload) {
  const data = unwrap(payload);
  const items =
    data?.data ?? data?.items ?? data?.categories ?? data?.courses ?? data;
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

function normalizeCourse(payload) {
  const data = unwrap(payload);
  return data?.course ?? data;
}

export const courseService = {
  async listAdmin({ page = 0, size = 20 } = {}) {
    const response = await apiClient.get("/admin/courses", {
      params: { page, size },
    });

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
    return apiClient.get("/courses", {
      skipAuthorization: true,
      skipAuthRedirect: true,
      params: { page, size },
    });
  },

  async getPublicDetail(slug) {
    return apiClient.get(`/courses/${slug}`, {
      skipAuthorization: true,
      skipAuthRedirect: true,
    });
  },

  async getPublicCourses(params = {}) {
    const page = params.page ?? 0;
    const size = params.size ?? 12;
    const keyword = params.keyword?.trim();
    const categorySlug = params.categorySlug || params.categoryId;

    let response;

    if (keyword) {
      response = await apiClient.get("/courses/search", {
        skipAuthorization: true,
        skipAuthRedirect: true,
        params: {
          keyword,
          page,
          size,
        },
      });
    } else if (categorySlug) {
      response = await apiClient.get(`/courses/category/${categorySlug}`, {
        skipAuthorization: true,
        skipAuthRedirect: true,
        params: {
          page,
          size,
        },
      });
    } else {
      response = await apiClient.get("/courses", {
        skipAuthorization: true,
        skipAuthRedirect: true,
        params: {
          page,
          size,
        },
      });
    }

    return normalizePage(response);
  },

  async getPublicCoursesWithDetails(params = {}) {
    const pageData = await this.getPublicCourses(params);

    const enrichedItems = await Promise.allSettled(
      pageData.items.map(async (course) => {
        const slugOrId = course.slug || course.id;

        if (!slugOrId) {
          return course;
        }

        const detail = await this.getPublicDetail(slugOrId);

        const modules = Array.isArray(detail?.modules) ? detail.modules : [];

        const lessonCount = modules.reduce(
          (sum, module) => sum + (module.lessons?.length || 0),
          0,
        );

        return {
          ...course,
          modules,
          moduleCount: modules.length,
          lessonCount,
        };
      }),
    ); // ✔️ ĐÃ SỬA: Sửa lại định dạng đóng ngoặc chuẩn xác của Promise.allSettled ở đây

    return {
      ...pageData,
      items: enrichedItems.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        }

        return pageData.items[index];
      }),
    };
  },

  async getCategories() {
    const response = await apiClient.get("/categories", {
      skipAuthorization: true,
      skipAuthRedirect: true,
    });

    return normalizeList(response);
  },

  async getCourseDetail(slugOrId) {
    const response = await apiClient.get(`/courses/${slugOrId}`, {
      skipAuthorization: true,
      skipAuthRedirect: true,
    });
    return normalizeCourse(response);
  },

  async getMyCourses() {
    const response = await apiClient.get("/enrollments/my-courses");
    return normalizeList(response);
  },

  async getMyEnrolledCourseIds() {
    const courses = await this.getMyCourses();

    return new Set(courses.map((course) => course.id).filter(Boolean));
  },

  async isCourseEnrolled(courseIdOrSlug) {
    if (!courseIdOrSlug) {
      return false;
    }

    const courses = await this.getMyCourses();

    return courses.some((course) => {
      return course.id === courseIdOrSlug || course.slug === courseIdOrSlug;
    });
  },

  // =====================================================================
  // CÁC API KHỚP CHUẨN VỚI AdminCourseContentController.java
  // =====================================================================

  async uploadThumbnail(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      "/admin/uploads/course-thumbnails",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return unwrap(response);
  },

  async uploadLessonMaterial(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      "/admin/uploads/lesson-material",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return unwrap(response);
  },

  async uploadLessonResource(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      "/admin/uploads/lesson-resource",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return unwrap(response);
  },

  async uploadSummaryImage(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post(
      "/admin/uploads/lesson-resource",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return unwrap(response);
  },

  async uploadSummaryVideo(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post(
      "/admin/uploads/lesson-material",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return unwrap(response);
  },

  // Khớp với @GetMapping("/courses/{courseId}/sections")
  async getCourseContent(courseId) {
    const response = await apiClient.get(`/admin/courses/${courseId}/sections`);
    return unwrap(response);
  },

  // Khớp với @PostMapping("/courses/{courseId}/sections")
  async createSection(courseId, payload) {
    const response = await apiClient.post(
      `/admin/courses/${courseId}/sections`,
      payload,
    );
    return unwrap(response);
  },

  // Khớp với @PutMapping("/sections/{sectionId}")
  async updateSection(sectionId, payload) {
    const response = await apiClient.put(
      `/admin/sections/${sectionId}`,
      payload,
    );
    return unwrap(response);
  },

  // Khớp với @DeleteMapping("/sections/{sectionId}")
  async deleteSection(sectionId) {
    const response = await apiClient.delete(`/admin/sections/${sectionId}`);
    return unwrap(response);
  },

  // Khớp với @PutMapping("/courses/{courseId}/sections/order")
  async reorderSections(courseId, orderedIds) {
    const response = await apiClient.put(
      `/admin/courses/${courseId}/sections/order`,
      { orderedIds },
    );
    return unwrap(response);
  },

  // Khớp với @PostMapping("/sections/{sectionId}/lessons")
  async createLesson(sectionId, payload) {
    const response = await apiClient.post(
      `/admin/sections/${sectionId}/lessons`,
      payload,
    );
    return unwrap(response);
  },

  // Khớp với endpoint lấy chi tiết 1 bài học của Spring Boot Admin
  async getLessonDetail(lessonId) {
    const response = await apiClient.get(`/admin/lessons/${lessonId}`);
    return unwrap(response);
  },

  // Cập nhật cấu hình Header cho phép nhận cả FormData (chứa File dữ liệu) xuống backend
  // Khớp với @PutMapping("/lessons/{lessonId}") của Spring Boot
  // Khớp chuẩn xác với @PutMapping("/lessons/{lessonId}") nhận @RequestBody của Spring Boot
  async updateLesson(lessonId, payload) {
    const response = await apiClient.put(
      `/admin/lessons/${lessonId}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return unwrap(response);
  },

  // Khớp với @DeleteMapping("/lessons/{lessonId}")
  async deleteLesson(lessonId) {
    const response = await apiClient.delete(`/admin/lessons/${lessonId}`);
    return unwrap(response);
  },

  // Khớp với @PutMapping("/sections/{sectionId}/lessons/order")
  async reorderLessons(sectionId, orderedIds) {
    const response = await apiClient.put(
      `/admin/sections/${sectionId}/lessons/order`,
      { orderedIds },
    );
    return unwrap(response);
  },

  // Khớp với @GetMapping("/sections/{sectionId}/lessons")
  async getLessonsBySection(sectionId) {
    const response = await apiClient.get(
      `/admin/sections/${sectionId}/lessons`,
    );
    const data = unwrap(response);
    return Array.isArray(data) ? data : data?.items || data?.content || [];
  },

  // =====================================================================
  // API lấy lịch sử Audit Log cho Lesson
  // =====================================================================
  async getLessonAuditLogs(lessonId, page = 0, size = 50) {
    const response = await apiClient.get("/admin/audit-logs", {
      params: {
        targetType: "LESSON",
        targetId: lessonId,
        page: page,
        size: size,
      },
    });
    // Trả về normalizePage để đồng bộ chuẩn PageResponse với các list khác
    // Nếu API trả thẳng mảng hoặc dạng khác, bạn có thể sửa thành return unwrap(response)
    return normalizePage(response);
  },
};
