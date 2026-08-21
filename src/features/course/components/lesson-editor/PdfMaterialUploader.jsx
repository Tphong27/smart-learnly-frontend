import { useRef, useState } from "react";
import { FileText, File as FileIcon, Loader2 } from "lucide-react";
import { courseContentService } from "../../services/courseContentService";
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

  /** Chuyển kết quả upload thành toast theo API chung của lesson editor. */
  const emitToast = (message, type) => {
    if (typeof showToast === "function") showToast(message, type);
  };

  /** Đồng bộ trạng thái upload cục bộ với trạng thái khóa form ở component cha. */
  const setBusy = (value) => {
    setUploading(value);
    if (typeof onBusyChange === "function") onBusyChange(value);
  };

  /** Kiểm tra định dạng và kích thước trước khi gửi tài liệu lên backend. */
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
      const uploaded = await courseContentService.uploadLessonMaterial(file);
      const uploadedUrl = uploaded?.url || uploaded?.data?.url;
      if (!uploadedUrl) {
        throw new Error("Upload succeeded but no file URL was returned");
      }
      onAttachmentUrlChange?.(uploadedUrl);
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

  /** Cho phép khu vực upload nhận file bằng thao tác kéo thả. */
  const handleDragOver = (e) => e.preventDefault();
  /** Nhận file đầu tiên được thả vào khu vực tài liệu. */
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
  /** Nhận file được chọn từ hộp thoại hệ thống. */
  const handleSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      doUpload(e.target.files[0]);
      e.target.value = "";
    }
  };

  /** Lấy tên file dễ đọc từ URL tài liệu đã lưu. */
  const getFileNameFromUrl = (url) => {
    if (!url) return "";
    return url.substring(url.lastIndexOf("/") + 1);
  };

  const hasFile = Boolean(pendingFile || attachmentUrl);

  return (
    <div className="sl-document-uploader">
      <button
      type="button"
      className={`sl-document-uploader__dropzone${hasFile ? " is-ready" : ""}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !uploading && !disabled && inputRef.current?.click()}
      disabled={uploading || disabled}
      aria-describedby="lesson-document-upload-help"
    >
      {uploading ? (
        <>
          <Loader2 className="animate-spin" size={28} aria-hidden="true" />
          <strong>Uploading document...</strong>
        </>
      ) : hasFile ? (
        <>
          <FileIcon size={28} aria-hidden="true" />
          <strong>
            {pendingFile ? pendingFile.name : getFileNameFromUrl(attachmentUrl)}
          </strong>
          <span>Document uploaded · Click to replace</span>
        </>
      ) : (
        <>
          <FileText size={28} aria-hidden="true" />
          <strong>Upload document</strong>
          <span>Drag and drop or browse your device</span>
        </>
      )}
      </button>
      <p id="lesson-document-upload-help" className="sl-document-uploader__help">
        PDF, DOC, or DOCX · Maximum 50 MB
      </p>
      <input
        type="file"
        ref={inputRef}
        onChange={handleSelect}
        disabled={uploading || disabled}
        className="sl-material-visually-hidden"
        tabIndex={-1}
        accept=".pdf,.doc,.docx"
      />
    </div>
  );
}

export default PdfMaterialUploader;
