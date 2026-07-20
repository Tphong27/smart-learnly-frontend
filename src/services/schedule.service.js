import apiClient from "./api-client";

function unwrapData(response) {
  const root = response?.data ?? response;
  return root?.data ?? root;
}

export const scheduleService = {
  async getMyWeek(weekStart) {
    const response = await apiClient.get("/learning/schedule", {
      params: {
        ...(weekStart && { weekStart }),
      },
    });

    const data = unwrapData(response);

    return {
      weekStart: data?.weekStart || weekStart,
      weekEnd: data?.weekEnd || weekStart,
      sessions: Array.isArray(data?.sessions)
        ? data.sessions
        : [],
    };
  },
};