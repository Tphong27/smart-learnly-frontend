import { useState, useRef } from "react";
import { useToast } from "../../../shared/components/ui/Toast/useToast";
import { request } from "../../../shared/api/httpClient";
import "./ThumbnailUploader.css";

const ThumbnailUploader = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast("Error: Only JPEG, PNG, or WebP images are accepted.", "error");
      return false;
    }
    if (file.size > MAX_SIZE) {
      showToast("Error: Image size cannot exceed 5MB.", "error");
      return false;
    }
    return true;
  };

  const processFile = async (file) => {
    if (!file || !validateFile(file)) return;

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const response = await request("/admin/uploads/course-thumbnail", {
        method: "POST",
        body: formData,
      });

      const uploadedUrl = response?.data?.url || response?.url || response;
      setPreviewUrl(uploadedUrl);
      showToast("Thumbnail uploaded successfully!", "success");

      if (onUploadSuccess) onUploadSuccess(uploadedUrl);
    } catch (error) {
      console.error("Upload error:", error);
      showToast(
        error.message || "An error occurred while uploading the image.",
        "error",
      );
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearFile = (e) => {
    e.stopPropagation();
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onUploadSuccess) onUploadSuccess("");
  };

  return (
    <div className="thumbnail-uploader-container">
      <div
        className={`dropzone-box ${isDragging ? "dragging" : ""} ${previewUrl ? "has-preview" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length > 0)
            processFile(e.dataTransfer.files[0]);
        }}
        onClick={() => !isUploading && fileInputRef.current.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) =>
            e.target.files?.length > 0 && processFile(e.target.files[0])
          }
          accept="image/jpeg, image/png, image/webp"
          style={{ display: "none" }}
        />

        {isUploading ? (
          <div className="upload-loading-state">
            <div className="modern-spinner"></div>
            <p>Optimizing and uploading image...</p>
          </div>
        ) : previewUrl ? (
          <div className="modern-preview-wrapper">
            <img
              src={previewUrl}
              alt="Course Thumbnail"
              className="modern-preview-img"
            />
            <div className="modern-overlay">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Change Image</span>
            </div>
            <button
              className="btn-clear-image"
              title="Remove image"
              onClick={handleClearFile}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="upload-empty-state">
            <div className="icon-cloud-wrapper">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v8" />
                <path d="m16 6-4-4-4 4" />
                <rect width="20" height="12" x="2" y="10" rx="2" />
                <path d="M6 14h.01" />
                <path d="M10 14h.01" />
              </svg>
            </div>
            <div className="upload-text-instruction">
              <p className="main-text">
                Drag and drop your image here, or{" "}
                <span className="highlight-text">browse device</span>
              </p>
              <p className="sub-text">
                Supported formats: PNG, JPEG, WebP (Max 5MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThumbnailUploader;
