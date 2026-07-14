import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
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

function clipboardFiles(event) {
  const dataTransferFiles = fileListToArray(event.clipboardData?.files);
  if (dataTransferFiles.length > 0) return dataTransferFiles;

  return Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter(Boolean);
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
  autoOpenPicker = false,
  onAutoOpenHandled,
}) {
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);
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
  }

  function showInfo(nextMessage) {
    setMessage(nextMessage || "");
    setMessageType("info");
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

  function handlePaste(event) {
    if (controlsDisabled) return;

    const selected = imageSelection(clipboardFiles(event));
    if (!selected.file) return;

    event.preventDefault();
    uploadFile(
      selected.file,
      selected.fileCount > 1 || selected.imageCount > 1
        ? "Only the first pasted image was uploaded."
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
    onChange?.("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  useEffect(() => {
    if (!autoOpenPicker) return;

    if (!controlsDisabled && onUploadImage) {
      window.setTimeout(() => fileInputRef.current?.click(), 0);
    }
    onAutoOpenHandled?.();
  }, [autoOpenPicker, controlsDisabled, onAutoOpenHandled, onUploadImage]);

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
      <div
        ref={dropzoneRef}
        className={[
          "flashcard-image-input__dropzone",
          dragging ? "is-dragging" : "",
          hasImage ? "has-image" : "",
          uploading ? "is-uploading" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        tabIndex={controlsDisabled ? -1 : 0}
        aria-disabled={controlsDisabled || !onUploadImage}
        aria-controls={inputId}
        aria-label={`${label}: Drop, or paste image`}
        onClick={() => {
          if (!controlsDisabled) dropzoneRef.current?.focus();
        }}
        onPaste={handlePaste}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!controlsDisabled) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!controlsDisabled) {
            event.dataTransfer.dropEffect = "copy";
            setDragging(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flashcard-image-input__state">
            <Loader2 size={22} className="flashcard-spin-icon" />
            <span>Uploading image...</span>
          </div>
        ) : hasImage ? (
          <img
            src={value}
            alt={`${label} preview`}
            className="flashcard-image-input__preview"
            loading="lazy"
          />
        ) : (
          <div className="flashcard-image-input__state">
            <ImageIcon size={22} />
            <span>Drop, or paste image</span>
          </div>
        )}
      </div>
      <div className="flashcard-image-input__actions">
        <button
          type="button"
          className="flashcard-btn"
          onClick={openFilePicker}
          disabled={controlsDisabled || !onUploadImage}
        >
          {hasImage ? <ImagePlus size={16} /> : <Upload size={16} />}
          {uploading ? "Uploading" : hasImage ? "Replace image" : "Upload image"}
        </button>
        {hasImage && (
          <button
            type="button"
            className="flashcard-btn flashcard-btn--danger"
            onClick={handleRemove}
            disabled={controlsDisabled}
          >
            <Trash2 size={16} />
            Remove
          </button>
        )}
      </div>
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
