import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { courseService } from "@/services";
import { useToast } from "@/shared/components/ui";
import "./ThumbnailUploader.css";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export default function ThumbnailUploader({ value, onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState(null);
  const [isCleared, setIsCleared] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();
  const effectivePreviewUrl = isCleared ? null : uploadedPreviewUrl || value || null;

  function validateFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPEG, PNG, or WebP images are accepted.");
      return false;
    }

    if (file.size > MAX_SIZE) {
      toast.error("Image size cannot exceed 5MB.");
      return false;
    }

    return true;
  }

  async function processFile(file) {
    if (!file || !validateFile(file)) return;

    const localPreview = URL.createObjectURL(file);
    setUploadedPreviewUrl(localPreview);
    setIsUploading(true);

    try {
      const uploaded = await courseService.uploadThumbnail(file);
      const uploadedUrl =
        uploaded?.url ||
        uploaded?.thumbnailUrl ||
        uploaded?.data?.url ||
        uploaded?.data?.thumbnailUrl;

      if (!uploadedUrl) {
        throw new Error("Upload response does not include thumbnail URL.");
      }

      setUploadedPreviewUrl(uploadedUrl);
      setIsCleared(false);
      onUploadSuccess?.(uploadedUrl);
      toast.success("Thumbnail uploaded successfully.");
    } catch (error) {
      setUploadedPreviewUrl(value || null);
      toast.error(error?.message || "Could not upload thumbnail.");
    } finally {
      URL.revokeObjectURL(localPreview);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploading(false);
    }
  }

  function handleClearFile(event) {
    event.stopPropagation();
    setUploadedPreviewUrl(null);
    setIsCleared(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onUploadSuccess?.("");
  }

  return (
    <div className="thumbnail-uploader-container">
      <div
        className={`dropzone-box ${isDragging ? "dragging" : ""} ${effectivePreviewUrl ? "has-preview" : ""}`}
        role="button"
        tabIndex={isUploading ? -1 : 0}
        aria-label={
          effectivePreviewUrl
            ? "Change course thumbnail"
            : "Upload course thumbnail"
        }
        aria-disabled={isUploading || undefined}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (event.dataTransfer.files?.length > 0) {
            processFile(event.dataTransfer.files[0]);
          }
        }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || isUploading) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(event) => {
            if (event.target.files?.length > 0) {
              processFile(event.target.files[0]);
            }
          }}
          accept="image/jpeg, image/png, image/webp"
          style={{ display: "none" }}
        />

        {isUploading ? (
          <div className="upload-loading-state">
            <div className="modern-spinner"></div>
            <p>Uploading image...</p>
          </div>
        ) : effectivePreviewUrl ? (
          <div className="modern-preview-wrapper">
            <img src={effectivePreviewUrl} alt="Course thumbnail" className="modern-preview-img" />
            <div className="modern-overlay">
              <span>Change image</span>
            </div>
            <button
              type="button"
              className="btn-clear-image"
              aria-label="Remove course thumbnail"
              onClick={handleClearFile}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="upload-empty-state">
            <div className="icon-cloud-wrapper" aria-hidden="true">
              <UploadCloud size={22} />
            </div>
            <div className="upload-text-instruction">
              <p className="main-text">
                Drag and drop your image here, or <span className="highlight-text">browse device</span>
              </p>
              <p className="sub-text">Supported formats: PNG, JPEG, WebP. Max 5MB.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
