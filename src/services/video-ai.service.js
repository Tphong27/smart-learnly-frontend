import apiClient from "./api-client";

const DEFAULT_VIDEO_AI_TIMEOUT_MS = 200000;
const MIN_VIDEO_AI_TIMEOUT_MS = 30000;
const MAX_VIDEO_AI_TIMEOUT_MS = 600000;

function resolveVideoAiTimeoutMs(value) {
  if (value == null || String(value).trim() === "") {
    return DEFAULT_VIDEO_AI_TIMEOUT_MS;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_VIDEO_AI_TIMEOUT_MS;
  }

  return Math.min(
    MAX_VIDEO_AI_TIMEOUT_MS,
    Math.max(MIN_VIDEO_AI_TIMEOUT_MS, Math.trunc(parsed)),
  );
}

const VIDEO_AI_TIMEOUT_MS = resolveVideoAiTimeoutMs(
  import.meta.env.VITE_VIDEO_AI_TIMEOUT_MS,
);

function unwrap(response) {
  return response?.data ?? response;
}

export const videoAiService = {
  async generateSummary(youtubeUrl) {
    return unwrap(
      await apiClient.post(
        "/video-summary/generate",
        { youtubeUrl },
        { timeout: VIDEO_AI_TIMEOUT_MS },
      ),
    );
  },
};
