import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

function unwrapData(response) {
  const root = unwrap(response);
  return root?.data ?? root;
}

export const classAnalyticsService = {
  async getAdmin(classId, inactiveDays = 7) {
    if (!classId) {
      throw new Error("Class ID is required");
    }

    const response = await apiClient.get(
      `/admin/classes/${classId}/analytics`,
      {
        params: {
          inactiveDays,
        },
      },
    );

    return unwrapData(response);
  },

  async getTrainer(classId, inactiveDays = 7) {
    if (!classId) {
      throw new Error("Class ID is required");
    }

    const response = await apiClient.get(
      `/trainer/classes/${classId}/analytics`,
      {
        params: {
          inactiveDays,
        },
      },
    );

    return unwrapData(response);
  },
};