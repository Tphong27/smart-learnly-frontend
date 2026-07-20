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

function requestStatus(error) {
  return error?.response?.status || error?.originalError?.response?.status;
}

function videoStatusErrorMessage(error) {
  const status = requestStatus(error);
  if (status === 401) return "Your session has expired. Sign in again to continue.";
  if (status === 403) return "You do not have permission to manage this video.";
  if (status === 404) return "This lesson is no longer available. Refresh the page and try again.";
  return "We could not check the video right now. Refresh the page or try again in a moment.";
}

function videoUploadErrorMessage(error) {
  const status = requestStatus(error);
  const detail = String(error?.message || "").toLowerCase();
  if (detail.includes("requires a video lesson")) {
    return "Save this lesson as a video lesson before uploading a file.";
  }
  if (status === 401) return "Your session has expired. Sign in again to continue.";
  if (status === 403) return "You do not have permission to upload this video.";
  if (status === 413) return "This video is too large. Choose a file smaller than 500 MB.";
  return "We could not upload this video. Check your connection and try again.";
}

/**
 * HLS video uploader shared between admin lesson detail page and trainer
 * class curriculum lesson editor modal.
 *
 * Wraps the upload -> HLS-processing polling flow. Backend endpoints under
 * /hls/... are not admin-scoped, so both roles reuse them directly.
 */
export function HlsVideoUploader({ lessonId, ...props }) {
  return (
    <HlsVideoUploaderForLesson
      key={lessonId || "lesson-without-id"}
      lessonId={lessonId}
      {...props}
    />
  );
}

function HlsVideoUploaderForLesson({
  lessonId,
  videoUrl,
  onVideoUrlChange,
  showToast,
  getLatestVideoUrl,
  disabled = false,
  onBusyChange,
  onStatusChange,
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
      setStatusError(videoStatusErrorMessage(error));
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
          setStatusError(videoStatusErrorMessage(error));
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
            emitToast("Your video is ready for learners.", "success");
          }
          return;
        }

        if (normalized === "failed") {
          setStatusPolling(false);
          emitToast(
            "We could not prepare this video. Upload it again to try once more.",
            "error",
          );
          return;
        }

        attempts += 1;
        if (attempts >= maxAttempts) {
          setStatusPolling(false);
          emitToast(
            "This video is taking longer than expected. You can leave this page and check again later.",
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
            "We could not refresh the progress. Your video may still be preparing; check again later.",
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

  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  useEffect(() => {
    onStatusChange?.(processingStatus);
  }, [onStatusChange, processingStatus]);

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
          "Video uploads are temporarily unavailable. Please try again later.",
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
        "Video uploaded. We are preparing it for learners.",
        "success",
      );
      completionNotifiedRef.current = false;
      setProcessingStatus({
        ...uploadResult,
        hlsStatus: uploadResult?.status || "processing",
        progressPercent: 0,
        currentStep: "Preparing video...",
      });
      setStatusPolling(
        String(uploadResult?.status || "processing").toLowerCase() ===
          "processing",
      );
      await refreshStatus();
    } catch (error) {
      console.error("HLS upload error:", error);
      emitToast(videoUploadErrorMessage(error), "error");
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
  const normalizedStatus = String(
    processingStatus?.hlsStatus || "",
  ).toLowerCase();
  const statusLabel = statusLoading
    ? "Checking"
    : uploading || normalizedStatus === "uploading"
      ? "Uploading"
      : statusPolling
        ? "Preparing"
    : readyState
      ? "Ready"
      : normalizedStatus === "failed"
        ? "Needs attention"
        : "Not uploaded";
  const progressTitle = statusLoading
    ? "Checking video"
    : normalizedStatus === "uploading"
      ? "Uploading video"
      : "Preparing video";
  const progressMessage = statusLoading
    ? "Checking the latest progress..."
    : normalizedStatus === "uploading"
      ? "Keep this page open until the upload finishes."
      : progressPercent >= 80
        ? "Finishing your video..."
        : "Making your video ready for smooth playback.";

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
          <span>Video uploads are temporarily unavailable. Please try again later.</span>
        </div>
      )}

      {statusError && (
        <div className="sl-material-alert sl-material-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{statusError}</span>
        </div>
      )}

      {processingStatus?.hlsStatus === "failed" && (
        <div className="sl-material-alert sl-material-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>Video needs attention</strong>
            <p>We could not prepare this video. Upload it again to try once more.</p>
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
            : statusLoading
              ? "Checking video status"
              : normalizedStatus === "uploading"
                ? "Video is uploading"
                : statusPolling
                  ? "Video is being prepared"
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
                <strong>{progressTitle}</strong>
                <span>{progressMessage}</span>
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
                ? "This should only take a moment."
                : normalizedStatus === "uploading"
                  ? "Do not close this page until the upload is complete."
                  : "You can leave this page. We will continue preparing the video."}
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
                  ? `Ready in ${processingStatus.qualities}`
                  : "Learners can now watch this video."}
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
