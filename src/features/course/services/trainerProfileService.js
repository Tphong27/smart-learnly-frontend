import apiClient from "@/services/api-client";

/** Lấy hồ sơ trainer ra khỏi ApiResponse một hoặc hai lớp data. */
function unwrapProfile(response) {
  const root = response?.data ?? response;
  return root?.data ?? root;
}

export const trainerProfileService = {
  /** Tải hồ sơ công khai của trainer mà không chuyển hướng khi khách chưa đăng nhập. */
  async getPublicProfile(trainerId) {
    const response = await apiClient.get(
      `/users/trainers/${trainerId}/profile`,
      { skipAuthRedirect: true },
    );

    return unwrapProfile(response);
  },
};
