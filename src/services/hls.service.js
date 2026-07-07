import apiClient from "./api-client";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api/v1";

const HLS_FINGERPRINT_KEY = "smart-learnly:hls-client-id";

function unwrap(response) {
  return response?.data ?? response;
}

function toAbsoluteApiUrl(url) {
  if (!url) return "";

  try {
    return new URL(url, `${API_BASE_URL.replace(/\/+$/, "")}/`).toString();
  } catch {
    return url;
  }
}

export function generateFingerprint() {
  try {
    const existing = sessionStorage.getItem(HLS_FINGERPRINT_KEY);
    if (existing) return existing;

    const value =
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(HLS_FINGERPRINT_KEY, value);
    return value;
  } catch {
    return undefined;
  }
}

export async function getHlsPlayback(lessonId) {
  if (!lessonId) {
    throw new Error("Lesson id is required to load the video.");
  }

  const response = await apiClient.get(`/hls/token/${lessonId}`, {
    params: { fingerprint: generateFingerprint() },
    withCredentials: true,
  });
  const tokenData = unwrap(response);

  if (!tokenData?.playlistUrl) {
    throw new Error("The server did not return an HLS playlist.");
  }

  return {
    ...tokenData,
    playlistUrl: toAbsoluteApiUrl(tokenData.playlistUrl),
  };
}

export function getHlsConfig() {
  return {
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 90,
    maxBufferLength: 30,
    maxMaxBufferLength: 120,
    maxBufferSize: 60 * 1000 * 1000,
    maxBufferHole: 0.5,
    startLevel: -1,
    debug: false,
  };
}
