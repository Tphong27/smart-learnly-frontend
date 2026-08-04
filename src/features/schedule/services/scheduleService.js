import apiClient from "@/services/api-client";

// Bóc payload lịch học trong ApiResponse backend.
function unwrapData(response) {
  const root = response?.data ?? response;
  return root?.data ?? root;
}

// Đảm bảo tuần và danh sách session luôn có giá trị an toàn cho calendar.
function normalizeSchedule(data, fallbackWeekStart) {
  return {
    weekStart: data?.weekStart || fallbackWeekStart,
    weekEnd: data?.weekEnd || fallbackWeekStart,
    sessions: Array.isArray(data?.sessions) ? data.sessions : [],
  };
}

export const scheduleService = {
  // Tải lịch tuần của trainee/trainer đang đăng nhập.
  async getMyWeek(weekStart) {
    const response = await apiClient.get("/learning/schedule", {
      params: {
        ...(weekStart && { weekStart }),
      },
    });

    return normalizeSchedule(unwrapData(response), weekStart);
  },

  // Tải lịch tuần tổng hợp cho staff, có thể giới hạn theo trainer.
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
