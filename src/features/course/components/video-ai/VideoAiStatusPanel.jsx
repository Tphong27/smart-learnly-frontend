import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui";
import "./video-ai.css";

const ACTIVE_JOB_STATUSES = new Set(["PENDING", "QUEUED", "RUNNING", "PROCESSING", "TRANSCRIBING", "GENERATING"]);
const STATUS_REQUEST_TIMEOUT_MS = 10000;
const STATUS_TIMEOUT_MESSAGE =
  "We could not check the study guide right now. Please try again.";

function statusLabel(status) {
  switch (status) {
    case "FAILED": return "Needs attention";
    case "PUBLISHED": return "Published";
    case "DRAFT": return "Ready to review";
    case "PENDING":
    case "QUEUED": return "Waiting";
    case "RUNNING":
    case "PROCESSING":
    case "TRANSCRIBING":
    case "GENERATING": return "In progress";
    default: return "Not started";
  }
}

function reasonLabel(reason) {
  switch (reason) {
    case "VIDEO_AI_DISABLED": return "Study guide creation is currently unavailable.";
    case "HLS_NOT_READY": return "Wait until the lesson video is ready, then try again.";
    case "SOURCE_VERSION_MISSING": return "Upload this video again before creating a study guide.";
    case "AI_AUDIO_NOT_READY": return "Upload this video again so we can prepare its study guide.";
    case "AI_RUNTIME_NOT_READY":
    case "TRANSCRIPTION_NOT_CONFIGURED":
    case "GENERATION_NOT_CONFIGURED":
      return "Study guide creation is temporarily unavailable. Please try again later.";
    default: return "This video is not ready for a study guide yet.";
  }
}

function statusErrorMessage(error) {
  const status = error?.response?.status || error?.originalError?.response?.status;
  if (status === 401) return "Your session has expired. Sign in again to continue.";
  if (status === 403) return "You do not have permission to manage this study guide.";
  if (status === 404) return "This lesson is no longer available. Refresh the page and try again.";
  return "We could not check the study guide right now. Please try again.";
}

function failedJobMessage(errorMessage) {
  const detail = String(errorMessage || "").toLowerCase();
  if (
    detail.includes("no segments") ||
    detail.includes("no speech") ||
    detail.includes("transcription returned")
  ) {
    return "We could not detect clear speech in this video. Check the audio, then try again.";
  }
  return "We could not create the study guide from this video. Please try again.";
}

function progressDescription(progress) {
  if (progress >= 85) return "Finishing your study guide...";
  if (progress >= 40) return "Organizing the key ideas from the lesson...";
  return "Creating your study guide. You can leave this page and come back later.";
}

export function VideoAiStatusPanel({ service, reviewPath, hlsStatus, showToast }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const requestSequenceRef = useRef(0);
  const activeRequestRef = useRef(null);
  const previousHlsReadyRef = useRef(
    String(hlsStatus?.hlsStatus || "").toLowerCase() === "ready",
  );

  const loadStatus = useCallback(async ({ quiet = false } = {}) => {
    if (!service || typeof service.getStatus !== "function") {
      if (!quiet) setLoading(false);
      setError("Study guide creation is not available for this lesson.");
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
          reject(new Error(STATUS_TIMEOUT_MESSAGE));
        }, STATUS_REQUEST_TIMEOUT_MS);
      });
      const next = await Promise.race([
        service.getStatus({ signal: controller.signal }),
        timeout,
      ]);
      if (!mountedRef.current || requestSequence !== requestSequenceRef.current) return null;
      setStatus(next);
      setError("");
      return next;
    } catch (loadError) {
      if (!mountedRef.current || requestSequence !== requestSequenceRef.current) return null;
      setError(
        timedOut
          ? STATUS_TIMEOUT_MESSAGE
          : statusErrorMessage(loadError),
      );
      return null;
    } finally {
      window.clearTimeout(timeoutId);
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
      if (mountedRef.current && requestSequence === requestSequenceRef.current && !quiet) setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    mountedRef.current = true;
    async function initialize() {
      await loadStatus();
    }
    initialize();
    return () => {
      mountedRef.current = false;
      requestSequenceRef.current += 1;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
    };
  }, [loadStatus]);

  const activeJob = status?.activeJob;
  const polling = ACTIVE_JOB_STATUSES.has(activeJob?.status);

  useEffect(() => {
    if (!polling) return undefined;
    let cancelled = false;
    let timerId;
    const poll = async () => {
      const next = await loadStatus({ quiet: true });
      if (cancelled) return;
      if (!next || ACTIVE_JOB_STATUSES.has(next?.activeJob?.status)) {
        timerId = window.setTimeout(poll, 5000);
      }
    };
    timerId = window.setTimeout(poll, 5000);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [polling, loadStatus]);

  const hlsReady = String(hlsStatus?.hlsStatus || "").toLowerCase() === "ready";
  const eligible = Boolean(status?.eligible);
  const hasContent = Boolean(status?.contentId);
  const jobStatus = activeJob?.status || "";
  const contentReady = hasContent && (
    jobStatus === "COMPLETED" ||
    (!jobStatus && ["DRAFT", "PUBLISHED"].includes(status?.contentStatus))
  );
  const displayStatus = polling || jobStatus === "FAILED"
    ? jobStatus
    : status?.contentStatus || jobStatus;
  const progress = Math.min(100, Math.max(0, activeJob?.progress || 0));

  useEffect(() => {
    if (hlsReady && !previousHlsReadyRef.current) loadStatus({ quiet: true });
    previousHlsReadyRef.current = hlsReady;
  }, [hlsReady, loadStatus]);

  const description = useMemo(() => {
    if (loading) return "Checking whether a study guide can be created...";
    if (error) return "We could not check this right now. Try again when you are ready.";
    if (!status?.enabled) return "Study guide creation is currently unavailable.";
    if (polling) return progressDescription(progress);
    if (contentReady) return "Review the study guide before sharing it with learners.";
    if (status?.reason) return reasonLabel(status.reason);
    if (!eligible && !hlsReady) return "Wait until the lesson video is ready, then try again.";
    return "Create a summary, key moments and lesson notes from this video.";
  }, [contentReady, eligible, error, hlsReady, loading, polling, progress, status]);

  async function generate() {
    setActionLoading(true);
    try {
      await service.createJob({ sourceLanguage: "auto" });
      showToast?.("Study guide creation started. You can leave this page and come back later.", "success");
      await loadStatus({ quiet: true });
    } catch (generateError) {
      console.error("Unable to start study guide creation:", generateError);
      showToast?.("We could not start the study guide. Please try again.", "error");
    } finally {
      if (mountedRef.current) setActionLoading(false);
    }
  }

  async function retry() {
    if (!activeJob?.id) return;
    setActionLoading(true);
    try {
      await service.retryJob(activeJob.id);
      showToast?.("We are trying to create the study guide again.", "success");
      await loadStatus({ quiet: true });
    } catch (retryError) {
      console.error("Unable to retry study guide creation:", retryError);
      showToast?.("We could not try again right now. Please wait a moment.", "error");
    } finally {
      if (mountedRef.current) setActionLoading(false);
    }
  }

  return (
    <section className="video-ai-panel" aria-labelledby="video-ai-panel-title">
      <div className="video-ai-panel__header">
        <div>
          <h3 id="video-ai-panel-title"><Sparkles size={19} aria-hidden="true" />AI study assistant</h3>
          <p>{description}</p>
        </div>
        {!loading && !error && <span className={`video-ai-status video-ai-status--${displayStatus.toLowerCase() || "idle"}`}>{statusLabel(displayStatus)}</span>}
      </div>

      {loading && <div className="video-ai-panel__state" role="status" aria-live="polite"><Loader2 className="video-ai-spin" size={18} aria-hidden="true" />Checking study guide...</div>}
      {error && <div className="video-ai-alert video-ai-alert--error" role="alert"><AlertCircle size={18} /><span>{error}</span><Button variant="secondary" size="sm" onClick={() => loadStatus()}>Try again</Button></div>}
      {polling && (
        <div className="video-ai-progress" role="progressbar" aria-label="Study guide creation progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      {displayStatus === "FAILED" && !error && (
        <div className="video-ai-alert video-ai-alert--error" role="alert"><AlertCircle size={18} /><span>{failedJobMessage(activeJob?.errorMessage)}</span></div>
      )}
      {contentReady && displayStatus !== "FAILED" && (
        <div className="video-ai-alert video-ai-alert--success"><CheckCircle2 size={18} /><span>{status?.contentStatus === "PUBLISHED" ? "Learners can now use this study guide." : "The study guide is ready for your review."}</span></div>
      )}

      {!loading && !error && (
        <div className="video-ai-panel__actions">
          {contentReady && <Button to={reviewPath} variant="secondary">Review study guide</Button>}
          {displayStatus === "FAILED" ? (
            <Button onClick={retry} loading={actionLoading} leftIcon={<RefreshCw size={17} />}>Try again</Button>
          ) : (
            !polling && !hasContent && <Button onClick={generate} loading={actionLoading} disabled={!eligible} leftIcon={<Sparkles size={17} />}>Create study guide</Button>
          )}
        </div>
      )}
    </section>
  );
}
