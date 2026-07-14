import { useRef, useState } from "react";
import { CloudUpload, FileText, Loader2, Trash2 } from "lucide-react";
import { courseService } from "@/services/course.service";
import "./lesson-material-uploader.css";

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
    <section
      className="sl-material-card sl-resource-uploader"
      aria-labelledby="lesson-resources-heading"
    >
      <div className="sl-material-card__header">
        <div>
          <h3 id="lesson-resources-heading" className="sl-material-card__title">
            <FileText size={20} aria-hidden="true" />
            Resources
          </h3>
          <p className="sl-material-card__description">
            Add documents, source files, or other supporting materials.
          </p>
        </div>
        <span className="sl-resource-uploader__count">
          {resources.length} / {maxResources}
        </span>
      </div>

      <button
        type="button"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !uploading && !disabled && inputRef.current?.click()}
        disabled={uploading || disabled || resources.length >= maxResources}
        className="sl-resource-uploader__dropzone"
      >
        <span className="sl-resource-uploader__upload-icon">
          {uploading ? (
            <Loader2 className="animate-spin" size={22} aria-hidden="true" />
          ) : (
            <CloudUpload size={22} aria-hidden="true" />
          )}
        </span>
        <span className="sl-resource-uploader__dropzone-copy">
          <strong>
            {uploading
              ? "Uploading resource files"
              : resources.length >= maxResources
                ? "Resource limit reached"
                : "Upload resources"}
          </strong>
          <span>
            {uploading
              ? "Please wait while your files are uploaded."
              : resources.length >= maxResources
                ? `Remove a file before adding another. Maximum ${maxResources} files.`
                : "Drag files here or browse your device"}
          </span>
        </span>
      </button>
      <input
        type="file"
        multiple
        ref={inputRef}
        onChange={handleSelect}
        disabled={uploading || disabled || resources.length >= maxResources}
        className="sl-material-visually-hidden"
        tabIndex={-1}
      />

      {resources.length > 0 && (
        <ul className="sl-resource-uploader__list" aria-label="Uploaded resources">
          {resources.map((resource, index) => (
            <li
              key={resource?.id || resource?.url || `resource-${index}`}
            >
              <span className="sl-resource-uploader__file-icon">
                <FileText size={18} aria-hidden="true" />
              </span>
              <span className="sl-resource-uploader__file-copy">
                <strong title={displayResourceName(resource)}>
                  {displayResourceName(resource)}
                </strong>
                <small>Supporting resource</small>
              </span>
              <button
                type="button"
                className="sl-resource-uploader__remove"
                aria-label={`Remove ${displayResourceName(resource)}`}
                onClick={() => removeResource(index)}
                disabled={uploading || disabled}
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {resources.length === 0 && !uploading && (
        <p className="sl-resource-uploader__empty">
          Uploaded resources will appear here.
        </p>
      )}
    </section>
  );
}

export default LessonResourceUploader;
