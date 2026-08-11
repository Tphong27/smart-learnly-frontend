import apiClient from "@/services/api-client";

export const trainerProfileService = {
  /** Tải hồ sơ công khai của trainer mà không chuyển hướng khi khách chưa đăng nhập. */
  async getPublicProfile(trainerId) {
    const response = await apiClient.get(
      `/users/trainers/${trainerId}/profile`,
      { skipAuthRedirect: true },
    );

    const root = response?.data ?? response;
    return root?.data ?? root;
  },
};
