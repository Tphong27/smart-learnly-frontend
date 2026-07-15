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
    const content = data?.content ?? data?.items ?? [];

    return {
        content: Array.isArray(content) ? content : [],
        page: Number(data?.page ?? data?.number ?? 0),
        size: Number(data?.size ?? 12),
        totalElements: Number(
            data?.totalElements ??
            data?.totalItems ??
            content.length,
        ),
        totalPages: Number(data?.totalPages ?? 1),
    };
}

export const openingScheduleService = {
    async list({
        page = 0,
        size = 12,
        keyword = "",
        courseId = "",
        startFrom = "",
        startTo = "",
        minPrice = "",
        maxPrice = "",
    } = {}) {
        const response = await apiClient.get(
            "/opening-schedules",
            {
                params: {
                    page,
                    size,
                    ...(keyword && { keyword }),
                    ...(courseId && { courseId }),
                    ...(startFrom && { startFrom }),
                    ...(startTo && { startTo }),
                    ...(minPrice !== "" && { minPrice }),
                    ...(maxPrice !== "" && { maxPrice }),
                },
            },
        );

        return normalizePage(response);
    },

    async getDetail(classId) {
        if (!classId) {
            throw new Error("Class ID is required");
        }

        const response = await apiClient.get(
            `/opening-schedules/${classId}`,
        );

        return unwrapData(response);
    },
};