import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2, RefreshCw, Trash2 } from "lucide-react";
import {
  FLASHCARD_IMAGE_ACCEPT,
  FLASHCARD_IMAGE_MAX_SIZE_LABEL,
  getUploadedFileUrl,
  isImageLikeFile,
  validateFlashcardImageFile,
} from "./flashcard-utils";

function fileListToArray(fileList) {
  return Array.from(fileList || []).filter(Boolean);
}

function imageSelection(files) {
  const imageFiles = fileListToArray(files).filter(isImageLikeFile);
  return {
    file: imageFiles[0] || null,
    imageCount: imageFiles.length,
    fileCount: fileListToArray(files).length,
  };
}

export function FlashcardImageInput({
  id,
  label,
  value,
  disabled = false,
  onChange,
  onUploadImage,
  onError,
  onUploadingChange,
  onUploadStateChange,
}) {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const hasImage = Boolean(value);
  const controlsDisabled = disabled || uploading;
  const inputId = id || `${label.toLowerCase().replace(/\s+/g, "-")}-input`;

  function setUploadState(nextUploading) {
    setUploading(nextUploading);
    onUploadingChange?.(nextUploading);
  }

  function showError(nextMessage) {
    setMessage(nextMessage);
    setMessageType("error");
    onError?.(nextMessage);
    onUploadStateChange?.({ uploading: false, error: nextMessage });
  }

  function showInfo(nextMessage) {
    setMessage(nextMessage || "");
    setMessageType("info");
    onUploadStateChange?.({ uploading: false, error: "" });
  }

  async function uploadFile(file, successMessage = "") {
    if (!file) return;
    if (!onUploadImage) {
      showError("Image upload is not available.");
      return;
    }

    const validationError = validateFlashcardImageFile(file);
    if (validationError) {
      showError(validationError);
      return;
    }

    setUploadState(true);
    setMessage("");
    onUploadStateChange?.({ uploading: true, error: "" });

    try {
      const uploaded = await onUploadImage(file);
      const uploadedUrl = getUploadedFileUrl(uploaded);
      if (!uploadedUrl) {
        throw new Error("Upload response did not include a URL.");
      }
      onChange?.(uploadedUrl);
      showInfo(successMessage);
    } catch (error) {
      showError(error?.message || "Image upload failed.");
    } finally {
      setUploadState(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleSelectedFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    uploadFile(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (controlsDisabled) return;

    const selected = imageSelection(event.dataTransfer?.files);
    if (!selected.file) {
      showError("Drop a JPEG, PNG, or WebP image file.");
      return;
    }

    uploadFile(
      selected.file,
      selected.fileCount > 1 || selected.imageCount > 1
        ? "Only the first image was uploaded."
        : "",
    );
  }

  function openFilePicker() {
    if (controlsDisabled || !onUploadImage) return;
    fileInputRef.current?.click();
  }

  function handleRemove() {
    if (controlsDisabled) return;
    setMessage("");
    onUploadStateChange?.({ uploading: false, error: "" });
    onChange?.("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const dropzoneClassName = [
    "flashcard-image-input__dropzone",
    dragging ? "is-dragging" : "",
    hasImage ? "has-image" : "",
    uploading ? "is-uploading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const dragDropProps = {
    onDragEnter: (event) => {
      event.preventDefault();
      if (!controlsDisabled) setDragging(true);
    },
    onDragOver: (event) => {
      event.preventDefault();
      if (!controlsDisabled) {
        event.dataTransfer.dropEffect = "copy";
        setDragging(true);
      }
    },
    onDragLeave: (event) => {
      event.preventDefault();
      setDragging(false);
    },
    onDrop: handleDrop,
  };

  return (
    <div className="flashcard-image-input">
      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept={FLASHCARD_IMAGE_ACCEPT}
        hidden
        disabled={controlsDisabled || !onUploadImage}
        onChange={handleSelectedFile}
      />
      {hasImage ? (
        <div
          className={dropzoneClassName}
          aria-label={`${label} preview. Drop another image to replace it.`}
          {...dragDropProps}
        >
          {uploading ? (
            <div className="flashcard-image-input__state">
              <Loader2 size={22} className="flashcard-spin-icon" />
              <span>Uploading image...</span>
            </div>
          ) : (
            <img
              src={value}
              alt={`${label} preview`}
              className="flashcard-image-input__preview"
              loading="lazy"
            />
          )}
        </div>
      ) : (
        <button
          type="button"
          className={dropzoneClassName}
          disabled={controlsDisabled || !onUploadImage}
          aria-controls={inputId}
          aria-label={`${label}: Drag an image here or click to upload`}
          onClick={openFilePicker}
          {...dragDropProps}
        >
          <div className="flashcard-image-input__state">
            {uploading ? (
              <Loader2 size={22} className="flashcard-spin-icon" />
            ) : (
              <ImageIcon size={22} />
            )}
            <span>
              {uploading
                ? "Uploading image..."
                : "Drag an image here or click to upload."}
            </span>
          </div>
        </button>
      )}
      {hasImage && (
        <div className="flashcard-image-input__actions">
          <button
            type="button"
            className="flashcard-btn flashcard-btn--icon flashcard-image-input__action-button"
            onClick={openFilePicker}
            disabled={controlsDisabled || !onUploadImage}
            aria-label="Replace image"
            title="Replace image"
          >
            <RefreshCw size={16} className={uploading ? "flashcard-spin-icon" : ""} />
          </button>
          <button
            type="button"
            className="flashcard-btn flashcard-btn--icon flashcard-btn--danger flashcard-image-input__action-button"
            onClick={handleRemove}
            disabled={controlsDisabled}
            aria-label="Remove image"
            title="Remove image"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
      <p className="flashcard-image-input__hint">
        JPEG, PNG, or WebP. Max {FLASHCARD_IMAGE_MAX_SIZE_LABEL}.
      </p>
      {message && (
        <p
          className={`flashcard-image-input__message flashcard-image-input__message--${messageType}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
