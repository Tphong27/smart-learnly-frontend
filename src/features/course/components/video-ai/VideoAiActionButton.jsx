import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui";
import "./video-ai.css";

const ACTIVE_JOB_STATUSES = new Set([
  "PENDING",
  "QUEUED",
  "RUNNING",
  "PROCESSING",
  "TRANSCRIBING",
  "GENERATING",
]);
const STATUS_REQUEST_TIMEOUT_MS = 10000;
const MAX_AUTOMATIC_POLLS = 240;

function availabilityMessage(reason, videoReady) {
  switch (reason) {
    case "VIDEO_AI_DISABLED":
    case "AI_RUNTIME_NOT_READY":
    case "TRANSCRIPTION_NOT_CONFIGURED":
    case "GENERATION_NOT_CONFIGURED":
      return "AI suggestions are temporarily unavailable.";
    case "SOURCE_VERSION_MISSING":
    case "AI_AUDIO_NOT_READY":
      return "Replace this video before creating AI suggestions.";
    case "HLS_NOT_READY":
      return "AI suggestions will be available when the video is ready.";
    default:
      return videoReady
        ? "AI suggestions are not available yet."
        : "Upload a video first to create AI suggestions.";
  }
}

function requestErrorMessage(error) {
  const responseStatus =
    error?.response?.status || error?.originalError?.response?.status;

  if (responseStatus === 401) {
    return "Your session has expired. Sign in again to continue.";
  }
  if (responseStatus === 403) {
    return "You do not have permission to use AI suggestions for this lesson.";
  }
  if (responseStatus === 404) {
    return "This lesson is no longer available.";
  }
  return "We could not check the AI suggestions. Try again.";
}

function failedJobMessage(errorMessage) {
  const detail = String(errorMessage || "").toLowerCase();

  if (
    detail.includes("no segments") ||
    detail.includes("no speech") ||
    detail.includes("transcription returned")
  ) {
    return "We could not detect clear speech in this video. Check its audio, then try again.";
  }

  return "We could not create AI suggestions. Try again.";
}

function lessonSuggestions(content) {
  const timeline = [
    ...(content?.transcriptSegments || []),
    ...(content?.chapters || []),
  ];
  const maxEndMs = timeline.reduce(
    (maximum, item) => Math.max(maximum, Number(item?.endMs || 0)),
    0,
  );

  return {
    title: content?.suggestedTitle || content?.chapters?.[0]?.title || "",
    description: content?.summary || "",
    durationMinutes: maxEndMs > 0 ? Math.max(1, Math.ceil(maxEndMs / 60000)) : 0,
  };
}

export function VideoAiActionButton({
  service,
  onApplySuggestions,
  videoReady = false,
  showToast,
  onStatusChange,
}) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [automaticPollingPaused, setAutomaticPollingPaused] = useState(false);
  const mountedRef = useRef(true);
  const requestSequenceRef = useRef(0);
  const activeRequestRef = useRef(null);
  const previousVideoReadyRef = useRef(videoReady);
  const applyWhenReadyRef = useRef(false);

  const loadStatus = useCallback(
    async ({ quiet = false } = {}) => {
      if (!service || typeof service.getStatus !== "function") {
        if (!quiet) setLoading(false);
        setError("Study guide creation is unavailable for this lesson.");
        return null;
      }

      const requestSequence = ++requestSequenceRef.current;
      activeRequestRef.current?.abort();
      const controller = new AbortController();
      activeRequestRef.current = controller;
      let timeoutId;
      let timedOut = false;

      if (!quiet) {
        setLoading(true);
        setError("");
      }

      try {
        const timeout = new Promise((_, reject) => {
          timeoutId = window.setTimeout(() => {
            timedOut = true;
            controller.abort();
            reject(new Error("Study guide status request timed out"));
          }, STATUS_REQUEST_TIMEOUT_MS);
        });
        const next = await Promise.race([
          service.getStatus({ signal: controller.signal }),
          timeout,
        ]);

        if (
          !mountedRef.current ||
          requestSequence !== requestSequenceRef.current
        ) {
          return null;
        }

        setStatus(next);
        setError("");
        return next;
      } catch (loadError) {
        if (
          !mountedRef.current ||
          requestSequence !== requestSequenceRef.current
        ) {
          return null;
        }

        setError(
          timedOut
            ? "The status check took too long. Try again."
            : requestErrorMessage(loadError),
        );
        return null;
      } finally {
        window.clearTimeout(timeoutId);
        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
        }
        if (
          mountedRef.current &&
          requestSequence === requestSequenceRef.current &&
          !quiet
        ) {
          setLoading(false);
        }
      }
    },
    [service],
  );

  useEffect(() => {
    mountedRef.current = true;
    const timerId = window.setTimeout(() => {
      setStatus(null);
      setLoading(true);
      setError("");
      setAutomaticPollingPaused(false);
      applyWhenReadyRef.current = false;
      loadStatus();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
      mountedRef.current = false;
      requestSequenceRef.current += 1;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
    };
  }, [loadStatus]);

  const activeJob = status?.activeJob;
  const jobStatus = activeJob?.status || "";
  const jobType = activeJob?.jobType || "";
  const transcriptReady = Boolean(status?.transcriptReady);
  const suggestionsReady = Boolean(status?.suggestionsReady);
  const transcriptJobFailed =
    jobType === "VIDEO_TRANSCRIPT" && jobStatus === "FAILED";
  const generationJobFailed =
    jobType === "VIDEO_ARTIFACTS" && jobStatus === "FAILED";
  const transcriptBlocked = [
    "VIDEO_AI_DISABLED",
    "TRANSCRIPTION_NOT_CONFIGURED",
    "SOURCE_VERSION_MISSING",
    "AI_AUDIO_NOT_READY",
  ].includes(status?.reason);
  const waitingForAutomaticTranscript = Boolean(
    videoReady &&
      status?.enabled &&
      !transcriptReady &&
      !transcriptJobFailed &&
      !transcriptBlocked,
  );
  const polling =
    ACTIVE_JOB_STATUSES.has(jobStatus) || waitingForAutomaticTranscript;
  const generatingSuggestions =
    jobType === "VIDEO_ARTIFACTS" && ACTIVE_JOB_STATUSES.has(jobStatus);
  const progress = Math.min(
    100,
    Math.max(0, Number(activeJob?.progress || 0)),
  );

  useEffect(() => {
    onStatusChange?.({
      status,
      loading,
      error,
      polling,
      pollingPaused: automaticPollingPaused,
    });
  }, [
    automaticPollingPaused,
    error,
    loading,
    onStatusChange,
    polling,
    status,
  ]);

  const applySuggestions = useCallback(async () => {
    if (!service?.getCurrentContent || !onApplySuggestions) return;

    setActionLoading(true);
    try {
      let content = await service.getCurrentContent();
      if (
        content?.status === "DRAFT" &&
        content?.id &&
        typeof service.publishContent === "function"
      ) {
        content = await service.publishContent(content.id, content.revision);
      }
      const suggestions = lessonSuggestions(content);
      if (!suggestions.title && !suggestions.description && !suggestions.durationMinutes) {
        throw new Error("AI suggestions are empty");
      }
      onApplySuggestions(suggestions);
      applyWhenReadyRef.current = false;
      showToast?.(
        "AI suggestions were added. Review them, then save the lesson.",
        "success",
      );
    } catch (applyError) {
      console.error("Unable to apply AI lesson suggestions:", applyError);
      showToast?.("We could not add the AI suggestions. Try again.", "error");
    } finally {
      if (mountedRef.current) setActionLoading(false);
    }
  }, [onApplySuggestions, service, showToast]);

  useEffect(() => {
    if (!polling || automaticPollingPaused) return undefined;

    let cancelled = false;
    let timerId;
    let attempts = 0;

    async function poll() {
      if (attempts >= MAX_AUTOMATIC_POLLS) {
        if (!cancelled) setAutomaticPollingPaused(true);
        return;
      }

      attempts += 1;
      const next = await loadStatus({ quiet: true });
      if (cancelled) return;

      if (!next) {
        setAutomaticPollingPaused(true);
        return;
      }

      const nextJobType = next?.activeJob?.jobType || "";
      const nextJobStatus = next?.activeJob?.status || "";
      const nextTranscriptFailed =
        nextJobType === "VIDEO_TRANSCRIPT" && nextJobStatus === "FAILED";
      const nextTranscriptBlocked = [
        "VIDEO_AI_DISABLED",
        "TRANSCRIPTION_NOT_CONFIGURED",
        "SOURCE_VERSION_MISSING",
        "AI_AUDIO_NOT_READY",
      ].includes(next?.reason);
      const nextWaitingForAutomaticTranscript = Boolean(
        videoReady &&
          next?.enabled &&
          !next?.transcriptReady &&
          !nextTranscriptFailed &&
          !nextTranscriptBlocked,
      );
      if (
        ACTIVE_JOB_STATUSES.has(nextJobStatus) ||
        nextWaitingForAutomaticTranscript
      ) {
        timerId = window.setTimeout(poll, 5000);
      } else {
        setAutomaticPollingPaused(false);
      }
    }

    timerId = window.setTimeout(poll, 5000);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [automaticPollingPaused, loadStatus, polling, videoReady]);

  useEffect(() => {
    if (
      suggestionsReady &&
      applyWhenReadyRef.current &&
      jobStatus !== "FAILED"
    ) {
      applySuggestions();
    }
  }, [applySuggestions, jobStatus, suggestionsReady]);

  useEffect(() => {
    if (videoReady && !previousVideoReadyRef.current) {
      setAutomaticPollingPaused(false);
      loadStatus({ quiet: true });
    }
    previousVideoReadyRef.current = videoReady;
  }, [loadStatus, videoReady]);

  async function startSuggestions() {
    if (suggestionsReady) {
      await applySuggestions();
      return;
    }
    if (!service?.createJob) return;

    setActionLoading(true);
    try {
      applyWhenReadyRef.current = true;
      const job = await service.createJob({ sourceLanguage: "auto" });
      setStatus((current) => ({ ...current, activeJob: job }));
      setAutomaticPollingPaused(false);
      showToast?.("AI is creating suggestions from the transcript.", "success");
    } catch (startError) {
      applyWhenReadyRef.current = false;
      console.error("Unable to start AI suggestions:", startError);
      showToast?.("We could not start AI suggestions. Try again.", "error");
    } finally {
      if (mountedRef.current) setActionLoading(false);
    }
  }

  async function retryJob() {
    if (!activeJob?.id) return;

    setActionLoading(true);
    try {
      applyWhenReadyRef.current = jobType === "VIDEO_ARTIFACTS";
      await service.retryJob(activeJob.id);
      setAutomaticPollingPaused(false);
      showToast?.(
        jobType === "VIDEO_TRANSCRIPT"
          ? "Transcript preparation restarted."
          : "AI suggestion creation restarted.",
        "success",
      );
      await loadStatus({ quiet: true });
    } catch (retryError) {
      applyWhenReadyRef.current = false;
      console.error("Unable to retry video AI job:", retryError);
      showToast?.("We could not try again right now. Try again later.", "error");
    } finally {
      if (mountedRef.current) setActionLoading(false);
    }
  }

  async function checkProgress() {
    setActionLoading(true);
    setAutomaticPollingPaused(false);
    try {
      await loadStatus();
    } finally {
      if (mountedRef.current) setActionLoading(false);
    }
  }

  if (!transcriptReady) {
    if (loading && !status) return null;

    if (transcriptJobFailed) {
      return (
        <Button
          variant="secondary"
          size="sm"
          className="video-ai-action"
          loading={actionLoading}
          loadingLabel="Starting transcript..."
          title={failedJobMessage(activeJob?.errorMessage)}
          onClick={retryJob}
          leftIcon={<RefreshCw size={17} aria-hidden="true" />}
        >
          Try transcript again
        </Button>
      );
    }

    if (error || (polling && automaticPollingPaused)) {
      return (
        <Button
          variant="secondary"
          size="sm"
          className="video-ai-action"
          loading={actionLoading}
          loadingLabel="Checking..."
          title={error || "Transcript preparation is continuing."}
          onClick={checkProgress}
          leftIcon={<RefreshCw size={17} aria-hidden="true" />}
        >
          Check transcript
        </Button>
      );
    }

    return null;
  }

  if (suggestionsReady && !generationJobFailed) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="video-ai-action"
        loading={actionLoading}
        loadingLabel="Adding suggestions..."
        onClick={startSuggestions}
        leftIcon={<Sparkles size={17} aria-hidden="true" />}
      >
        Fill details with AI
      </Button>
    );
  }

  if (error || (polling && automaticPollingPaused)) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="video-ai-action"
        loading={actionLoading}
        loadingLabel="Checking..."
        title={error || "Creation is continuing. Check the latest progress."}
        onClick={checkProgress}
        leftIcon={<RefreshCw size={17} aria-hidden="true" />}
      >
        Check AI progress
      </Button>
    );
  }

  if (generatingSuggestions) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="video-ai-action video-ai-action--working"
        disabled
        title="AI is creating suggestions from the completed transcript."
        leftIcon={
          <Loader2
            className="video-ai-spin"
            size={17}
            aria-hidden="true"
          />
        }
      >
        {progress > 0
          ? `Creating AI suggestions · ${progress}%`
          : "Creating AI suggestions..."}
      </Button>
    );
  }

  if (generationJobFailed) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="video-ai-action"
        loading={actionLoading}
        loadingLabel="Starting again..."
        title={failedJobMessage(activeJob?.errorMessage)}
        onClick={retryJob}
        leftIcon={<RefreshCw size={17} aria-hidden="true" />}
      >
        Try AI suggestions again
      </Button>
    );
  }

  if (status?.eligible) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="video-ai-action"
        loading={actionLoading}
        loadingLabel="Starting AI..."
        onClick={startSuggestions}
        leftIcon={<Sparkles size={17} aria-hidden="true" />}
      >
        Fill details with AI
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className="video-ai-action"
      disabled
      title={availabilityMessage(status?.reason, videoReady)}
      leftIcon={<Sparkles size={17} aria-hidden="true" />}
    >
      AI suggestions
    </Button>
  );
}
