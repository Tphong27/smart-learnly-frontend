import apiClient from "@/services/api-client";

// Chuẩn hóa page catalog để page luôn nhận cùng một cấu trúc.
function normalizePage(payload) {
  const data = payload?.data ?? payload;
  const items = data?.content ?? data?.items ?? data?.courses ?? data?.data ?? [];

  return {
    items: Array.isArray(items) ? items : [],
    page: Number(data?.page ?? data?.number ?? 0),
    size: Number(data?.size ?? 12),
    totalElements: Number(data?.totalElements ?? data?.total ?? items.length ?? 0),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

export const courseCatalogService = {
  // Tải danh sách khóa học công khai theo tìm kiếm, giá, category và cách sắp xếp.
  async list(params = {}) {
    const requestParams = {
      page: params.page ?? 0,
      size: params.size ?? 12,
      sort: params.sort || "POPULAR",
    };
    const keyword = params.keyword?.trim();
    const categorySlug = params.categorySlug || params.categoryId;

    if (keyword) requestParams.keyword = keyword;
    if (categorySlug) requestParams.categorySlug = categorySlug;
    if (params.minPrice !== undefined && params.minPrice !== null) {
      requestParams.minPrice = params.minPrice;
    }
    if (params.maxPrice !== undefined && params.maxPrice !== null) {
      requestParams.maxPrice = params.maxPrice;
    }
    if (params.onSale) requestParams.onSale = true;
    if (params.featured) requestParams.featured = true;

    const response = await apiClient.get("/courses", {
      skipAuthorization: true,
      skipAuthRedirect: true,
      params: requestParams,
    });
    return normalizePage(response);
  },

  // Tải chi tiết khóa học công khai bằng slug hoặc ID.
  async getDetail(slugOrId) {
    return apiClient.get(`/courses/${slugOrId}`, {
      skipAuthorization: true,
      skipAuthRedirect: true,
    });
  },

  // Lấy khóa học phổ biến nhất để hiển thị ở trang chủ.
  async getMostEnrolled() {
    const pageData = await this.list({ page: 0, size: 1, sort: "POPULAR" });
    return pageData.items[0] ?? null;
  },

  // Bổ sung module và số bài học cho từng course card mà vẫn giữ item khi detail lỗi.
  async listWithDetails(params = {}) {
    const pageData = await this.list(params);
    const enrichedItems = await Promise.allSettled(
      pageData.items.map(async (course) => {
        const slugOrId = course.slug || course.id;
        if (!slugOrId) return course;

        const detail = await this.getDetail(slugOrId);
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
    );

    return {
      ...pageData,
      items: enrichedItems.map((result, index) =>
        result.status === "fulfilled" ? result.value : pageData.items[index],
      ),
    };
  },
};
