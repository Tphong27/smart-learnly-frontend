import { useRef, useState } from "react";
import { CloudUpload, FileText, File as FileIcon } from "lucide-react";
import { courseService } from "@/services/course.service";
import {
  MATERIAL_DOC_EXTENSIONS,
  getFileExtension,
} from "@/features/course/utils/lesson-content";

/**
 * PDF/document material uploader. Uses backend admin upload endpoint
 * (/admin/uploads/lesson-material) which is shared for both admin and
 * trainer flows on the FE.
 */
export function PdfMaterialUploader({
  attachmentUrl,
  onAttachmentUrlChange,
  showToast,
  disabled = false,
  onBusyChange,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  const emitToast = (message, type) => {
    if (typeof showToast === "function") showToast(message, type);
  };

  const setBusy = (value) => {
    setUploading(value);
    if (typeof onBusyChange === "function") onBusyChange(value);
  };

  const doUpload = async (file) => {
    const extension = getFileExtension(file.name);
    if (!MATERIAL_DOC_EXTENSIONS.includes(extension)) {
      emitToast(
        "Only PDF, DOC or DOCX files are supported for reading material",
        "error",
      );
      return;
    }
    const MAX_MATERIAL_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_MATERIAL_SIZE) {
      emitToast("File is too large. Maximum size is 50MB", "error");
      return;
    }

    setBusy(true);
    setPendingFile(file);
    try {
      const uploaded = await courseService.uploadLessonMaterial(file);
      onAttachmentUrlChange?.(uploaded.url);
      emitToast(`Successfully uploaded ${file.name}!`, "success");
    } catch (error) {
      setPendingFile(null);
      emitToast(
        error?.message || "Error uploading file to the system",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    if (
      !disabled &&
      !uploading &&
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      doUpload(e.dataTransfer.files[0]);
    }
  };
  const handleSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      doUpload(e.target.files[0]);
      e.target.value = "";
    }
  };

  const getFileNameFromUrl = (url) => {
    if (!url) return "";
    return url.substring(url.lastIndexOf("/") + 1);
  };

  const hasFile = Boolean(pendingFile || attachmentUrl);

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !uploading && !disabled && inputRef.current?.click()}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "16px",
        height: "300px",
        borderRadius: "16px",
        border: hasFile ? "2px solid #10b981" : "2px dashed #cbd5e1",
        backgroundColor: hasFile ? "#f0fdf4" : "#fff",
        cursor: uploading || disabled ? "wait" : "pointer",
        textAlign: "center",
        padding: "40px",
      }}
    >
      {uploading ? (
        <>
          <CloudUpload size={48} color="#2563eb" />
          <p style={{ margin: 0, color: "#2563eb" }}>Uploading...</p>
        </>
      ) : hasFile ? (
        <>
          <FileIcon size={48} color="#10b981" />
          <p
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: "600",
              color: "#065f46",
            }}
          >
            {pendingFile ? pendingFile.name : getFileNameFromUrl(attachmentUrl)}
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#059669" }}>
            Click to replace
          </p>
        </>
      ) : (
        <>
          <div
            style={{
              width: "48px",
              height: "48px",
              backgroundColor: "#e2e8f0",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileText size={24} color="#64748b" />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: "600",
              color: "#1e293b",
            }}
          >
            Drag and drop or{" "}
            <span style={{ color: "#2563eb", fontWeight: 700 }}>Browse</span>
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
            PDF, DOC, DOCX (max 50MB)
          </p>
        </>
      )}
      <input
        type="file"
        ref={inputRef}
        onChange={handleSelect}
        disabled={uploading || disabled}
        style={{ display: "none" }}
        accept=".pdf,.doc,.docx"
      />
    </div>
  );
}

export default PdfMaterialUploader;
