import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Video } from "lucide-react";
import { courseService } from "@/services/course.service";

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

  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid #cbd5e1",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#2563eb",
            fontWeight: "600",
          }}
        >
          <Video size={24} />
          Upload Video
        </div>
      </div>

      {isProviderUnavailable && (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            borderRadius: "10px",
            marginBottom: "16px",
            color: "#991b1b",
            background: "#fff1f2",
            border: "1px solid #fecaca",
            fontSize: "13px",
          }}
        >
          The backend HLS processing provider is currently unavailable.
        </div>
      )}

      {statusError && (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            borderRadius: "10px",
            marginBottom: "16px",
            color: "#991b1b",
            background: "#fff1f2",
            border: "1px solid #fecaca",
            fontSize: "13px",
          }}
        >
          Could not load HLS status: {statusError}
        </div>
      )}

      {processingStatus?.hlsStatus === "failed" && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "10px",
            marginBottom: "16px",
            backgroundColor: "#fee2e2",
            border: "1px solid #fca5a5",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px", color: "#dc2626" }}>x</span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#dc2626",
                }}
              >
                Processing Failed
              </p>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "12px",
                  color: "#991b1b",
                }}
              >
                {processingStatus.currentStep ||
                  processingStatus.message ||
                  "Please try uploading again"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() =>
          !disabledInteraction && fileInputRef.current?.click()
        }
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "16px",
          height: "280px",
          borderRadius: "12px",
          border: readyState
            ? "2px solid #10b981"
            : isBusy
              ? "2px solid #2563eb"
              : "2px dashed #cbd5e1",
          backgroundColor: readyState
            ? "#f0fdf4"
            : isBusy
              ? "#eff6ff"
              : "#fff",
          cursor: disabledInteraction ? "default" : "pointer",
          textAlign: "center",
          padding: "24px",
        }}
      >
        {isBusy ? (
          <>
            <Loader2
              className="animate-spin"
              size={48}
              style={{ color: "#2563eb" }}
            />
            <p
              style={{
                margin: 0,
                color: "#1e40af",
                fontWeight: "600",
                fontSize: "15px",
              }}
            >
              {processingStatus?.hlsStatus === "uploading"
                ? "Uploading Video..."
                : "Processing Video..."}
            </p>

            <div
              style={{
                width: "100%",
                maxWidth: "280px",
                marginTop: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "#64748b" }}>
                  {processingStatus?.currentStep ||
                    (statusLoading
                      ? "Loading the latest processing state..."
                      : "Processing...")}
                </span>
                <span style={{ color: "#2563eb", fontWeight: "600" }}>
                  {processingStatus?.progressPercent || 0}%
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  backgroundColor: "#e2e8f0",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${processingStatus?.progressPercent || 0}%`,
                    height: "100%",
                    backgroundColor: "#2563eb",
                    borderRadius: "4px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            <p
              style={{
                margin: "12px 0 0 0",
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              {statusLoading
                ? "Please wait while the latest status is loaded."
                : "You may leave this page. Video is processing"}
            </p>
          </>
        ) : readyState ? (
          <>
            <Video size={48} color="#10b981" />
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: "600",
                color: "#065f46",
              }}
            >
              {processingStatus?.hlsStatus === "ready"
                ? "Video Ready"
                : "Video Uploaded"}
            </p>
            {processingStatus?.qualities && (
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "12px",
                  color: "#059669",
                }}
              >
                Qualities: {processingStatus.qualities}
              </p>
            )}
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              Click to replace with new video
            </p>
          </>
        ) : (
          <>
            <div
              style={{
                width: "56px",
                height: "56px",
                backgroundColor: "#e2e8f0",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={28} color="#64748b" />
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: "600",
                color: "#1e293b",
              }}
            >
              Drag and drop or{" "}
              <span style={{ color: "#2563eb", fontWeight: 700 }}>Browse</span>
            </p>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              Supports MP4, MOV, AVI, MKV (max 500MB)
            </p>
          </>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          disabled={disabledInteraction}
          style={{ display: "none" }}
          accept=".mp4,.webm,.mov,.avi,.mkv,.m4v,.mpg,.mpeg"
        />
      </div>

      {!videoUrl &&
        (!processingStatus?.hlsStatus ||
          processingStatus.hlsStatus === "not_found") && (
          <div style={{ marginTop: 12 }}>
            <label
              style={{
                fontSize: 12,
                color: "#64748b",
                display: "block",
                marginBottom: 4,
              }}
            >
              Or paste video URL (for external videos)
            </label>
            <input
              type="url"
              value={videoUrl || ""}
              onChange={(e) => onVideoUrlChange?.(e.target.value)}
              placeholder="https://..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}
    </div>
  );
}

export default HlsVideoUploader;
