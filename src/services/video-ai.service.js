import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

export const videoAiService = {
  async generateSummary(youtubeUrl) {
    return unwrap(
      await apiClient.post(
        "/video-summary/generate",
        { youtubeUrl },
        { timeout: 120000 },
      ),
    );
  },
};
