import apiClient from "./api-client";

function unwrapData(response) {
  const root = response?.data ?? response;
  return root?.data ?? root;
}

function normalizeSchedule(data, fallbackWeekStart) {
  return {
    weekStart: data?.weekStart || fallbackWeekStart,
    weekEnd: data?.weekEnd || fallbackWeekStart,
    sessions: Array.isArray(data?.sessions) ? data.sessions : [],
  };
}

export const scheduleService = {
  async getMyWeek(weekStart) {
    const response = await apiClient.get("/learning/schedule", {
      params: {
        ...(weekStart && { weekStart }),
      },
    });

    return normalizeSchedule(unwrapData(response), weekStart);
  },

  async getStaffWeek(weekStart, trainerId = "") {
    const response = await apiClient.get("/staff/schedule", {
      params: {
        ...(weekStart && { weekStart }),
        ...(trainerId && { trainerId }),
      },
    });

    return normalizeSchedule(unwrapData(response), weekStart);
  },
};