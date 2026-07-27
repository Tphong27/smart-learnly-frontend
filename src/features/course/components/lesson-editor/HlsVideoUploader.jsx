import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  UploadCloud,
  Video,
} from "lucide-react";
import { courseService } from "@/services/course.service";
import { Button } from "@/shared/components/ui";
import { VideoAiActionButton } from "../video-ai/VideoAiActionButton";
import "./lesson-material-uploader.css";

function videoRequestErrorMessage(error) {
  const responseStatus =
    error?.response?.status || error?.originalError?.response?.status;
  const detail = String(
    error?.message || error?.originalError?.message || "",
  ).toLowerCase();

  if (responseStatus === 401) {
    return "Your session has expired. Sign in again to continue.";
  }
  if (responseStatus === 403) {
    return "You do not have permission to update this video.";
  }
  if (responseStatus === 413) {
    return "This video is too large. Choose a file up to 500 MB.";
  }
  if (responseStatus === 409 || detail.includes("in progress")) {
    return "This video is already being prepared. Check again in a moment.";
  }
  if (detail.includes("video lesson")) {
    return "Change the lesson type to Video before uploading a video.";
  }
  return "We could not upload this video. Check the file and try again.";
}

function processingDescription(progress, statusLoading) {
  if (statusLoading) return "Checking the latest video status...";
  if (progress >= 80) return "Finishing your video...";
  if (progress >= 35) return "Optimizing the video for smooth playback...";
  return "Preparing the video for learners...";
}

/**
 * HLS video uploader shared between admin lesson detail page and trainer
 * class curriculum lesson editor modal.
 *
 * Wraps the upload -> HLS-processing polling flow. Backend endpoints under
 * /hls/... are not admin-scoped, so both roles reuse them directly.
 */
export function HlsVideoUploader({
  lessonId,
  videoUrl,
  onVideoUrlChange,
  showToast,
  getLatestVideoUrl,
  disabled = false,
  onBusyChange,
  videoAi,
  onApplyAiSuggestions,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [statusPolling, setStatusPolling] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [hlsHealth, setHlsHealth] = useState(null);
  const [videoAiState, setVideoAiState] = useState({
    status: null,
    loading: true,
    error: "",
  });
  const completionNotifiedRef = useRef(false);
  const completionToastEnabledRef = useRef(false);

  const emitToast = useCallback(
    (message, type) => {
      if (typeof showToast === "function") showToast(message, type);
    },
    [showToast],
  );

  const refreshStatus = useCallback(async () => {
    if (!lessonId) return null;
    setStatusLoading(true);
    try {
      const next = await courseService.getHlsProcessingStatus(lessonId);
      setStatusError("");
      setProcessingStatus(next);
      setStatusPolling(
        String(next?.hlsStatus || "").toLowerCase() === "processing",
      );
      return next;
    } catch {
      setStatusError("We could not check the video. Try again.");
      return null;
    } finally {
      setStatusLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const next = await courseService.getHlsProcessingStatus(lessonId);
        if (cancelled) return;
        setStatusError("");
        setProcessingStatus(next);
        setStatusPolling(
          String(next?.hlsStatus || "").toLowerCase() === "processing",
        );
      } catch {
        if (!cancelled) {
          setStatusError("We could not check the video. Try again.");
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();

    (async () => {
      try {
        const health = await courseService.checkHlsHealth();
        if (!cancelled) setHlsHealth(health);
      } catch (error) {
        if (!cancelled) {
          setHlsHealth(null);
          console.error("Error checking video upload availability:", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  useEffect(() => {
    if (!statusPolling || !lessonId) return undefined;

    let cancelled = false;
    let timerId;
    let attempts = 0;
    const maxAttempts = 240;

    async function poll() {
      try {
        const next = await courseService.getHlsProcessingStatus(lessonId);
        if (cancelled) return;

        setProcessingStatus(next);
        const normalized = String(next?.hlsStatus || "").toLowerCase();

        if (normalized === "ready") {
          setStatusPolling(false);
          try {
            if (typeof getLatestVideoUrl === "function") {
              const latest = await getLatestVideoUrl(lessonId);
              if (latest && typeof onVideoUrlChange === "function") {
                onVideoUrlChange(latest);
              }
            }
          } catch (syncError) {
            console.error("Error syncing the ready video URL:", syncError);
          }
          return;
        }

        if (normalized === "failed") {
          setStatusPolling(false);
          emitToast("We could not prepare this video. Try uploading it again.", "error");
          return;
        }

        attempts += 1;
        if (attempts >= maxAttempts) {
          setStatusPolling(false);
          emitToast(
            "Your video is still getting ready. You can leave this page and check again later.",
            "success",
          );
          return;
        }

        timerId = window.setTimeout(poll, 5000);
      } catch (pollError) {
        if (cancelled) return;
        attempts += 1;
        console.error("Error refreshing video status:", pollError);

        if (attempts >= maxAttempts) {
          setStatusPolling(false);
          setStatusError(
            "We could not refresh the video status. Check again later.",
          );
          return;
        }

        timerId = window.setTimeout(poll, 5000);
      }
    }

    poll();

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [statusPolling, lessonId, emitToast, getLatestVideoUrl, onVideoUrlChange]);

  const isProviderUnavailable = Boolean(
    hlsHealth &&
      (!hlsHealth.hlsEnabled ||
        String(hlsHealth.status || "").toLowerCase() !== "healthy"),
  );
  const normalizedHlsStatus = String(
    processingStatus?.hlsStatus || "",
  ).toLowerCase();
  const hlsReadyState = Boolean(videoUrl || normalizedHlsStatus === "ready");
  const requiresTranscript = Boolean(
    videoAi?.service &&
      normalizedHlsStatus === "ready" &&
      processingStatus?.jobId,
  );
  const currentVideoAiStatus = videoAiState.status;
  const currentVideoAiJob = currentVideoAiStatus?.activeJob;
  const transcriptReady = Boolean(currentVideoAiStatus?.transcriptReady);
  const transcriptFailed = Boolean(
    requiresTranscript &&
      currentVideoAiJob?.jobType === "VIDEO_TRANSCRIPT" &&
      currentVideoAiJob?.status === "FAILED",
  );
  const transcriptUnavailable = Boolean(
    requiresTranscript &&
      !transcriptReady &&
      [
        "VIDEO_AI_DISABLED",
        "TRANSCRIPTION_NOT_CONFIGURED",
        "SOURCE_VERSION_MISSING",
        "AI_AUDIO_NOT_READY",
      ].includes(currentVideoAiStatus?.reason),
  );
  const transcriptStatusError = Boolean(
    requiresTranscript && !transcriptReady && videoAiState.error,
  );
  const transcriptPreparing = Boolean(
    requiresTranscript &&
      !transcriptReady &&
      !transcriptFailed &&
      !transcriptUnavailable &&
      !transcriptStatusError,
  );
  const readyState = Boolean(
    hlsReadyState && (!requiresTranscript || transcriptReady),
  );
  const failedState = Boolean(
    normalizedHlsStatus === "failed" ||
      transcriptFailed ||
      transcriptUnavailable ||
      transcriptStatusError,
  );
  const isBusy =
    statusLoading || uploading || statusPolling || transcriptPreparing;

  useEffect(() => {
    if (
      readyState &&
      completionToastEnabledRef.current &&
      !completionNotifiedRef.current
    ) {
      completionNotifiedRef.current = true;
      completionToastEnabledRef.current = false;
      emitToast("Your lesson video and transcript are ready.", "success");
    }
  }, [emitToast, readyState]);

  useEffect(() => {
    if (typeof onBusyChange === "function") onBusyChange(isBusy || uploading);
  }, [isBusy, uploading, onBusyChange]);

  const doUpload = async (file) => {
    const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
    if (!file || file.size <= 0) {
      emitToast("Choose a valid video file.", "error");
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      emitToast("This video is too large. Choose a file up to 500 MB.", "error");
      return;
    }
    const isVideo =
      file.type?.startsWith("video/") ||
      /\.(mp4|mov|avi|mkv|webm|m4v|mpg|mpeg)$/i.test(file.name);
    if (!isVideo) {
      emitToast("This file format is not supported. Choose a video file.", "error");
      return;
    }

    const previousStatus = processingStatus;
    setUploading(true);
    setStatusError("");
    setVideoAiState({ status: null, loading: true, error: "" });
    completionNotifiedRef.current = false;
    completionToastEnabledRef.current = false;
    setProcessingStatus({
      hlsStatus: "uploading",
      progressPercent: 0,
      currentStep: "Preparing your video...",
    });

    try {
      const health = await courseService.checkHlsHealth();
      setHlsHealth(health);
      if (
        !health?.hlsEnabled ||
        String(health?.status || "").toLowerCase() !== "healthy"
      ) {
        emitToast(
          "Video upload is temporarily unavailable. Try again later.",
          "error",
        );
        setProcessingStatus(previousStatus);
        return;
      }

      setProcessingStatus({
        hlsStatus: "uploading",
        progressPercent: 5,
        currentStep: "Uploading your video...",
      });

      const replaceExisting = ["ready", "failed"].includes(
        String(processingStatus?.hlsStatus || "").toLowerCase(),
      );
      const uploadResult = await courseService.uploadHlsVideo(
        lessonId,
        file,
        replaceExisting,
        (progressPercent) => {
          setProcessingStatus({
            hlsStatus: "uploading",
            progressPercent,
            currentStep: "Uploading your video...",
          });
        },
      );
      emitToast(
        "Video uploaded. We are preparing playback and its transcript.",
        "success",
      );
      completionToastEnabledRef.current = true;
      setProcessingStatus({
        ...uploadResult,
        hlsStatus: uploadResult?.status || "processing",
        progressPercent: 0,
        currentStep:
          "Preparing your video...",
      });
      setStatusPolling(
        String(uploadResult?.status || "processing").toLowerCase() ===
          "processing",
      );
      await refreshStatus();
    } catch (error) {
      console.error("Video upload error:", error);
      emitToast(videoRequestErrorMessage(error), "error");
      setProcessingStatus(previousStatus);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const disabledInteraction = disabled || isBusy || isProviderUnavailable;

  const handleDrop = (e) => {
    e.preventDefault();
    if (
      !disabledInteraction &&
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      doUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      doUpload(e.target.files[0]);
      e.target.value = "";
    }
  };

  const progressPercent = processingStatus?.progressPercent || 0;
  const statusLabel = isBusy
    ? statusLoading
      ? "Checking"
      : processingStatus?.hlsStatus === "uploading"
        ? "Uploading"
        : transcriptPreparing
          ? "Creating transcript"
          : "Getting ready"
    : readyState
      ? "Ready"
      : failedState
        ? "Needs attention"
        : "Add video";

  return (
    <section
      className="sl-material-card sl-video-uploader"
      aria-labelledby="lesson-video-heading"
    >
      <div className="sl-material-card__header">
        <div>
          <h3 id="lesson-video-heading" className="sl-material-card__title">
            <Video size={20} aria-hidden="true" />
            Lesson video
          </h3>
          <p className="sl-material-card__description">
            Add the video learners will watch in this lesson.
          </p>
        </div>
        <div className="sl-material-card__actions">
          {videoAi?.service && (
            <VideoAiActionButton
              service={videoAi.service}
              onApplySuggestions={onApplyAiSuggestions}
              videoReady={hlsReadyState}
              showToast={showToast}
              onStatusChange={setVideoAiState}
            />
          )}
          <span
            className={`sl-material-status sl-material-status--${isBusy ? "processing" : readyState ? "ready" : failedState ? "failed" : "neutral"}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {isProviderUnavailable && (
        <div className="sl-material-alert sl-material-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>Video upload is temporarily unavailable. Try again later.</span>
        </div>
      )}

      {statusError && (
        <div className="sl-material-alert sl-material-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{statusError}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={refreshStatus}
            disabled={statusLoading}
          >
            Try again
          </Button>
        </div>
      )}

      {processingStatus?.hlsStatus === "failed" && (
        <div className="sl-material-alert sl-material-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>We could not prepare this video</strong>
            <p>Check the video file, then upload it again.</p>
          </div>
        </div>
      )}

      {(transcriptFailed || transcriptUnavailable) && (
        <div className="sl-material-alert sl-material-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>We could not prepare the video transcript</strong>
            <p>
              {transcriptUnavailable
                ? "Transcript processing is temporarily unavailable. Check the server configuration, then try again."
                : "Check that the video contains clear speech, then try the transcript again."}
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() =>
          !disabledInteraction && fileInputRef.current?.click()
        }
        disabled={disabledInteraction}
        className={`sl-video-uploader__dropzone ${isBusy ? "is-processing" : readyState ? "is-ready" : "is-empty"}`}
        aria-label={
          readyState
            ? "Replace lesson video"
            : isBusy
              ? "Video is being processed"
              : "Upload lesson video"
        }
      >
        {isBusy ? (
          <>
            <div className="sl-video-uploader__state-row">
              <span className="sl-video-uploader__state-icon">
                <Loader2 className="animate-spin" size={22} aria-hidden="true" />
              </span>
              <div className="sl-video-uploader__state-copy">
                <strong>
                  {processingStatus?.hlsStatus === "uploading"
                    ? "Uploading video"
                    : statusLoading
                      ? "Checking video"
                      : transcriptPreparing
                        ? "Creating video transcript"
                        : "Getting video ready"}
                </strong>
                <span>
                  {transcriptPreparing
                    ? "Listening to the video so AI suggestions will be ready when you need them."
                    : processingDescription(progressPercent, statusLoading)}
                </span>
              </div>
              {!statusLoading && !transcriptPreparing && (
                <strong className="sl-video-uploader__percentage">
                  {progressPercent}%
                </strong>
              )}
            </div>
            {!statusLoading && !transcriptPreparing && (
              <div
                className="sl-video-uploader__progress"
                role="progressbar"
                aria-label="Video preparation progress"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progressPercent}
              >
                <span style={{ width: `${progressPercent}%` }} />
              </div>
            )}
            <p className="sl-video-uploader__footnote">
              {statusLoading
                ? "This usually takes only a moment."
                : transcriptPreparing
                  ? "This runs automatically. You can leave this page and return later."
                  : "You can leave this page while we finish preparing the video."}
            </p>
          </>
        ) : readyState ? (
          <div className="sl-video-uploader__state-row">
            <span className="sl-video-uploader__state-icon sl-video-uploader__state-icon--ready">
              <CheckCircle2 size={22} aria-hidden="true" />
            </span>
            <div className="sl-video-uploader__state-copy">
              <strong>
                {processingStatus?.hlsStatus === "ready"
                  ? "Video ready"
                  : "Video uploaded"}
              </strong>
              <span>
                Learners can now watch this video.
              </span>
            </div>
            <span className="sl-video-uploader__replace-action">
              Replace video
            </span>
          </div>
        ) : (
          <div className="sl-video-uploader__empty-state">
            <span className="sl-video-uploader__upload-icon">
              <UploadCloud size={24} aria-hidden="true" />
            </span>
            <div>
              <strong>Upload lesson video</strong>
              <p>
                Drag and drop a file here or <span>browse your device</span>
              </p>
              <small>MP4, MOV, AVI or MKV · Maximum 500 MB</small>
            </div>
          </div>
        )}
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        disabled={disabledInteraction}
        className="sl-material-visually-hidden"
        accept=".mp4,.webm,.mov,.avi,.mkv,.m4v,.mpg,.mpeg"
        tabIndex={-1}
      />

      {!videoUrl &&
        (!processingStatus?.hlsStatus ||
          processingStatus.hlsStatus === "not_found") && (
          <div className="sl-video-uploader__external-url">
            <label htmlFor="lesson-external-video-url">
              Or use an external video URL
            </label>
            <input
              id="lesson-external-video-url"
              type="url"
              value={videoUrl || ""}
              onChange={(e) => onVideoUrlChange?.(e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}
    </section>
  );
}

export default HlsVideoUploader;
