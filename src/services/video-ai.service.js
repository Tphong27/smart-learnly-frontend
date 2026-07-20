import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

function normalizeJob(value) {
  const job = unwrap(value) || {};
  return {
    ...job,
    id: job.id ?? job.jobId ?? null,
    status: String(job.status ?? job.jobStatus ?? "").toUpperCase(),
    stage: job.stage ?? job.currentStage ?? job.currentStep ?? "",
    progress: Number(job.progress ?? job.progressPercent ?? 0),
    errorMessage: job.errorMessage ?? job.error ?? job.message ?? "",
  };
}

export function normalizeVideoAiStatus(value) {
  const status = unwrap(value) || {};
  const activeJob = status.activeJob || status.job;
  return {
    ...status,
    enabled: status.enabled ?? status.featureEnabled ?? true,
    eligible: status.eligible ?? status.canGenerate ?? false,
    hlsReady: status.hlsReady ?? status.videoReady ?? false,
    reason: status.reason ?? status.eligibilityReason ?? "",
    activeJob: activeJob ? normalizeJob(activeJob) : null,
    contentId:
      status.contentId ?? status.currentContentId ?? status.draftContentId ?? null,
    contentStatus: String(
      status.contentStatus ?? status.aiStatus ?? "",
    ).toUpperCase(),
  };
}

export function normalizeVideoAiContent(value) {
  const content = unwrap(value) || {};
  const keyPoints = content.keyPoints ?? content.highlights ?? [];
  const chapters = content.chapters ?? [];
  const segments =
    content.transcriptSegments ?? content.segments ?? content.transcript?.segments ?? [];

  return {
    ...content,
    id: content.id ?? content.contentId ?? null,
    revision: Number(content.revision ?? content.version ?? 0),
    status: String(content.status ?? content.contentStatus ?? "DRAFT").toUpperCase(),
    language: content.language ?? content.sourceLanguage ?? "vi",
    summary: content.summary ?? "",
    keyPoints: Array.isArray(keyPoints) ? keyPoints : [],
    chapters: Array.isArray(chapters)
      ? chapters.map((chapter, index) => ({
          ...chapter,
          id: chapter.id ?? chapter.chapterId ?? `chapter-${index}`,
          title: chapter.title ?? "",
          summary: chapter.summary ?? "",
          startMs: Number(chapter.startMs ?? chapter.startTimeMs ?? 0),
          endMs: Number(chapter.endMs ?? chapter.endTimeMs ?? 0),
        }))
      : [],
    transcriptSegments: Array.isArray(segments)
      ? segments.map((segment, index) => ({
          ...segment,
          id: segment.id ?? segment.segmentId ?? `segment-${index}`,
          text: segment.text ?? segment.content ?? "",
          startMs: Number(segment.startMs ?? segment.startTimeMs ?? 0),
          endMs: Number(segment.endMs ?? segment.endTimeMs ?? 0),
        }))
      : [],
  };
}

export function normalizeLearnerVideoAiResponse(value) {
  const response = unwrap(value) || {};
  if (response.available === false) return { available: false };
  return {
    available: response.available ?? true,
    ...normalizeVideoAiContent(response.content ?? response),
  };
}

function createAuthoringService(basePath) {
  return {
    async getStatus({ signal } = {}) {
      return normalizeVideoAiStatus(
        await apiClient.get(`${basePath}/status`, { signal }),
      );
    },
    async createJob(payload = { sourceLanguage: "auto" }) {
      return normalizeJob(await apiClient.post(`${basePath}/jobs`, payload));
    },
    async getJob(jobId) {
      return normalizeJob(await apiClient.get(`${basePath}/jobs/${jobId}`));
    },
    async retryJob(jobId) {
      return normalizeJob(await apiClient.post(`${basePath}/jobs/${jobId}/retry`));
    },
    async getCurrentContent() {
      return normalizeVideoAiContent(await apiClient.get(`${basePath}/contents/current`));
    },
    async saveContent(contentId, payload) {
      return normalizeVideoAiContent(
        await apiClient.put(`${basePath}/contents/${contentId}`, payload),
      );
    },
    async publishContent(contentId, revision) {
      return normalizeVideoAiContent(
        await apiClient.post(`${basePath}/contents/${contentId}/publish`, { revision }),
      );
    },
    async getFlashcardTargets() {
      const response = unwrap(await apiClient.get(`${basePath}/flashcard-targets`));
      return Array.isArray(response) ? response : response?.items ?? [];
    },
    async createFlashcardJob(contentId, payload) {
      return normalizeJob(
        await apiClient.post(`${basePath}/contents/${contentId}/flashcard-jobs`, payload),
      );
    },
  };
}

export function createAdminVideoAiService(courseId, lessonId) {
  return createAuthoringService(
    `/admin/courses/${courseId}/lessons/${lessonId}/video-ai`,
  );
}

export function createTrainerVideoAiService(classId, lessonId) {
  return createAuthoringService(
    `/trainer/classes/${classId}/curriculum/lessons/${lessonId}/video-ai`,
  );
}

export const learnerVideoAiService = {
  async getContent(courseId, lessonId, classId) {
    const response = await apiClient.get(
      `/learning/courses/${courseId}/lessons/${lessonId}/video-ai`,
      { params: classId ? { classId } : {} },
    );
    return normalizeLearnerVideoAiResponse(response);
  },
};
