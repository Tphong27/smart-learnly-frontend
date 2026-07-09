import { useRef, useState } from "react";
import { CloudUpload, X } from "lucide-react";
import { courseService } from "@/services/course.service";

const MAX_RESOURCES = 10;

function getFileNameFromUrl(url) {
  if (!url) return "";
  return String(url).substring(String(url).lastIndexOf("/") + 1);
}

function displayResourceName(resource) {
  if (!resource) return "Document";
  if (resource instanceof File) return resource.name;
  if (typeof resource === "string") {
    return getFileNameFromUrl(resource) || "Document";
  }
  return (
    resource.name ||
    resource.fileName ||
    getFileNameFromUrl(resource.url) ||
    "Document"
  );
}

/**
 * Reusable resource uploader that uploads to /admin/uploads/lesson-resource
 * and lets the caller manage the final list state (max 10 items).
 */
export function LessonResourceUploader({
  resources = [],
  onResourcesChange,
  showToast,
  disabled = false,
  onBusyChange,
  maxResources = MAX_RESOURCES,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const emitToast = (message, type) => {
    if (typeof showToast === "function") showToast(message, type);
  };

  const setBusy = (value) => {
    setUploading(value);
    if (typeof onBusyChange === "function") onBusyChange(value);
  };

  const uploadFiles = async (files) => {
    const availableSlots = maxResources - resources.length;
    if (availableSlots <= 0) {
      emitToast(
        `A lesson can have at most ${maxResources} resource files`,
        "error",
      );
      return;
    }
    const selectedFiles = Array.from(files).slice(0, availableSlots);
    setBusy(true);
    try {
      const uploadResults = await Promise.allSettled(
        selectedFiles.map((file) => courseService.uploadLessonResource(file)),
      );
      const uploaded = uploadResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      if (uploaded.length > 0) {
        onResourcesChange?.([...resources, ...uploaded]);
        emitToast(
          `Successfully uploaded ${uploaded.length} resource file(s)`,
          "success",
        );
      }
      const failed = uploadResults.filter(
        (result) => result.status === "rejected",
      );
      if (failed.length > 0) {
        emitToast(
          `${failed.length} file(s) failed to upload`,
          "error",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    if (
      !uploading &&
      !disabled &&
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeResource = (index) => {
    const next = resources.filter((_, i) => i !== index);
    onResourcesChange?.(next);
  };

  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "10px",
          fontWeight: "600",
          color: "#1e293b",
          fontSize: "14px",
        }}
      >
        Resources ({resources.length}/{maxResources})
      </label>
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !uploading && !disabled && inputRef.current?.click()}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "12px",
          height: "120px",
          borderRadius: "12px",
          border: "2px dashed #cbd5e1",
          backgroundColor: "#f8fafc",
          cursor: uploading || disabled ? "wait" : "pointer",
          color: "#64748b",
        }}
      >
        <CloudUpload size={24} color="#64748b" />
        <p style={{ margin: 0, fontSize: "14px", color: "#475569" }}>
          {uploading ? (
            "Uploading resource files..."
          ) : (
            <span style={{ color: "#2563eb", fontWeight: 600 }}>
              Choose files or drop here
            </span>
          )}
        </p>
        <input
          type="file"
          multiple
          ref={inputRef}
          onChange={handleSelect}
          disabled={uploading || disabled}
          style={{ display: "none" }}
        />
      </div>

      {resources.length > 0 && (
        <div
          style={{
            marginTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {resources.map((resource, index) => (
            <div
              key={resource?.id || resource?.url || `resource-${index}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                backgroundColor: "#f1f5f9",
                borderRadius: "6px",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "#334155", fontWeight: "500" }}>
                {displayResourceName(resource)}
              </span>
              <X
                size={14}
                color="#ef4444"
                style={{ cursor: "pointer" }}
                onClick={() => removeResource(index)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LessonResourceUploader;
