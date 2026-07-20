import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  UploadCloud,
  Video,
} from "lucide-react";
import { courseService } from "@/services/course.service";
import "./lesson-material-uploader.css";

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
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [statusPolling, setStatusPolling] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [hlsHealth, setHlsHealth] = useState(null);
  const completionNotifiedRef = useRef(false);

  const emitToast = useCallback(
    (message, type) => {
      if (typeof showToast === "function") showToast(message, type);
    },
    [showToast],
  );

  const getErrorMessage = (error, fallbackMessage) => {
    const validationDetails = error?.errors
      ?.map(({ field, message }) => `${field}: ${message}`)
      .join(", ");
    return validationDetails || error?.message || fallbackMessage;
  };

  const refreshStatus = useCallback(async () => {
    if (!lessonId) return null;
    try {
      const next = await courseService.getHlsProcessingStatus(lessonId);
      setStatusError("");
      setProcessingStatus(next);
      setStatusPolling(
        String(next?.hlsStatus || "").toLowerCase() === "processing",
      );
      return next;
    } catch (error) {
      setStatusError(
        error?.message || "Unable to check HLS processing status.",
      );
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
      } catch (error) {
        if (!cancelled) {
          setStatusError(
            error?.message || "Unable to check HLS processing status.",
          );
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
          console.error("Error loading HLS health:", error);
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
            console.error("Error syncing HLS ready video URL:", syncError);
          }
          if (!completionNotifiedRef.current) {
            completionNotifiedRef.current = true;
            emitToast("Video processing completed. HLS is ready.", "success");
          }
          return;
        }

        if (normalized === "failed") {
          setStatusPolling(false);
          emitToast(
            next?.message || "Video processing failed. Please try again.",
            "error",
          );
          return;
        }

        attempts += 1;
        if (attempts >= maxAttempts) {
          setStatusPolling(false);
          emitToast(
            "Video processing is taking longer than expected. It will continue on the backend; refresh the status later.",
            "error",
          );
          return;
        }

        timerId = window.setTimeout(poll, 5000);
      } catch (pollError) {
        if (cancelled) return;
        attempts += 1;
        console.error("Error polling HLS status:", pollError);

        if (attempts >= maxAttempts) {
          setStatusPolling(false);
          setStatusError(
            "Unable to refresh HLS status. Processing may still be running on the backend.",
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
  const isBusy = statusLoading || uploading || statusPolling;

  useEffect(() => {
    if (typeof onBusyChange === "function") onBusyChange(isBusy || uploading);
  }, [isBusy, uploading, onBusyChange]);

  const doUpload = async (file) => {
    const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
    if (!file || file.size <= 0) {
      emitToast("Please select a valid video file", "error");
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      emitToast("Video file too large. Maximum size is 500MB", "error");
      return;
    }
    const isVideo =
      file.type?.startsWith("video/") ||
      /\.(mp4|mov|avi|mkv|webm|m4v|mpg|mpeg)$/i.test(file.name);
    if (!isVideo) {
      emitToast("The selected file is not a supported video", "error");
      return;
    }

    const previousStatus = processingStatus;
    setUploading(true);
    setStatusError("");
    setProcessingStatus({
      hlsStatus: "uploading",
      progressPercent: 0,
      currentStep: "Preparing upload...",
    });

    try {
      const health = await courseService.checkHlsHealth();
      setHlsHealth(health);
      if (
        !health?.hlsEnabled ||
        String(health?.status || "").toLowerCase() !== "healthy"
      ) {
        emitToast(
          "The backend HLS processing provider is not available",
          "error",
        );
        setProcessingStatus(previousStatus);
        return;
      }

      setProcessingStatus({
        hlsStatus: "uploading",
        progressPercent: 5,
        currentStep: "Uploading video to server...",
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
            currentStep: "Uploading video to server...",
          });
        },
      );
      emitToast(
        uploadResult?.message || "Video uploaded. HLS processing started.",
        "success",
      );
      completionNotifiedRef.current = false;
      setProcessingStatus({
        ...uploadResult,
        hlsStatus: uploadResult?.status || "processing",
        progressPercent: 0,
        currentStep:
          uploadResult?.message || "Starting HLS processing...",
      });
      setStatusPolling(
        String(uploadResult?.status || "processing").toLowerCase() ===
          "processing",
      );
      await refreshStatus();
    } catch (error) {
      console.error("HLS upload error:", error);
      emitToast(
        getErrorMessage(error, "Error uploading video for HLS processing"),
        "error",
      );
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

  const readyState =
    videoUrl || processingStatus?.hlsStatus === "ready";

  const progressPercent = processingStatus?.progressPercent || 0;
  const statusLabel = isBusy
    ? processingStatus?.hlsStatus === "uploading"
      ? "Uploading"
      : "Processing"
    : readyState
      ? "Ready"
      : processingStatus?.hlsStatus === "failed"
        ? "Failed"
        : "Required";

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
            Upload the primary video learners will watch in this lesson.
          </p>
        </div>
        <span
          className={`sl-material-status sl-material-status--${isBusy ? "processing" : readyState ? "ready" : processingStatus?.hlsStatus === "failed" ? "failed" : "neutral"}`}
        >
          {statusLabel}
        </span>
      </div>

      {isProviderUnavailable && (
        <div className="sl-material-alert sl-material-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>The backend HLS processing provider is currently unavailable.</span>
        </div>
      )}

      {statusError && (
        <div className="sl-material-alert sl-material-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>Could not load HLS status: {statusError}</span>
        </div>
      )}

      {processingStatus?.hlsStatus === "failed" && (
        <div className="sl-material-alert sl-material-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>Video processing failed</strong>
            <p>
              {processingStatus.currentStep ||
                processingStatus.message ||
                "Please try uploading the video again."}
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
                    : "Processing video"}
                </strong>
                <span>
                  {processingStatus?.currentStep ||
                    (statusLoading
                      ? "Loading the latest processing state..."
                      : "Processing...")}
                </span>
              </div>
              <strong className="sl-video-uploader__percentage">
                {progressPercent}%
              </strong>
            </div>
            <div
              className="sl-video-uploader__progress"
              role="progressbar"
              aria-label="Video processing progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progressPercent}
            >
              <span
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="sl-video-uploader__footnote">
              {statusLoading
                ? "Please wait while the latest status is loaded."
                : "You can safely leave this page while processing continues."}
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
                {processingStatus?.qualities
                  ? `Available qualities: ${processingStatus.qualities}`
                  : "The lesson video is ready to use."}
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
