import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseService } from "@/services/course.service";
import { useToast } from "@/shared/components/ui/Toast/useToast";
import {
  ArrowLeft,
  Save,
  Upload,
  FileText,
  Video,
  HelpCircle,
} from "lucide-react";

export default function AdminLessonDetailPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [lessonType, setLessonType] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Các state lưu trữ nội dung bài học
  const [videoUrl, setVideoUrl] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedFileName, setAttachedFileName] = useState("");
  const [oldFileUrl, setOldFileUrl] = useState(""); // Lưu lại link file gốc trên server
  const [isPreviewable, setIsPreviewable] = useState(false);

  // Đổ dữ liệu cũ lên form khi load trang
  useEffect(() => {
    const fetchLessonDetail = async () => {
      try {
        setPageLoading(true);
        const response = await courseService.getLessonDetail(lessonId);
        const lessonData = response?.data || response;

        if (lessonData) {
          setTitle(lessonData.title || "");
          const type = lessonData.lessonType?.toLowerCase() || "pdf";
          setLessonType(type);
          setIsPreviewable(lessonData.isPreviewable || false);
          setVideoUrl(lessonData.videoUrl || "");

          if (lessonData.fileUrl) {
            setOldFileUrl(lessonData.fileUrl);
            const fileNameFromUrl = lessonData.fileUrl.substring(
              lessonData.fileUrl.lastIndexOf("/") + 1,
            );
            setAttachedFileName(decodeURIComponent(fileNameFromUrl));
          } else {
            setOldFileUrl("");
            setAttachedFileName("");
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải chi tiết bài học:", error);
        showToast("Không thể tải thông tin bài học cũ", "error");
      } finally {
        setPageLoading(false);
      }
    };

    if (lessonId) {
      fetchLessonDetail();
    }
  }, [lessonId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFile(file);
      setAttachedFileName(file.name);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mặc định giữ lại link file cũ đang lưu trữ trên hệ thống
      let currentFileUrl = oldFileUrl;

      // 1. Nếu không phải bài học Video và Admin có chọn một file mới từ máy tính
      if (lessonType !== "video" && attachedFile) {
        showToast("Đang tải tệp tin mới lên hệ thống...", "info");

        // Gọi API upload tách biệt để đẩy file lên server trước, lấy về chuỗi URL link file
        const uploadResult = await courseService.uploadThumbnail(attachedFile);
        currentFileUrl =
          uploadResult?.url || uploadResult?.fileUrl || uploadResult;
      }

      // 2. Tạo đối tượng JSON thuần sạch sẽ khớp 100% với DTO tiếp nhận của Spring Boot
      const payload = {
        title: title.trim(),
        lessonType: lessonType.toUpperCase(), // Đưa về dạng Enum viết hoa: VIDEO, PDF, TEST
        isPreviewable: isPreviewable,
        videoUrl: lessonType === "video" ? videoUrl.trim() : "",
        fileUrl: lessonType !== "video" ? currentFileUrl : "",
      };

      // 3. Tiến hành gọi API PUT gửi Object JSON chuẩn chỉ lên Spring Boot
      await courseService.updateLesson(lessonId, payload);

      showToast("Cập nhật nội dung bài học thành công!", "success");
      navigate(`/admin/courses/${courseId}/content`);
    } catch (error) {
      console.error("Lỗi cập nhật bài học chi tiết:", error);

      // Đọc sâu vào đối tượng lỗi Axios để hiển thị thông điệp text tường minh
      let errorText = "Gặp lỗi trong quá trình lưu dữ liệu bài học";
      if (error?.response?.data) {
        if (typeof error.response.data === "string") {
          errorText = error.response.data;
        } else if (error.response.data.message) {
          errorText = error.response.data.message;
        } else {
          errorText = JSON.stringify(error.response.data);
        }
      } else if (error?.message) {
        errorText = error.message;
      }

      showToast(errorText, "error");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div
        style={{
          padding: "40px",
          fontWeight: "bold",
          color: "#64748b",
          textAlign: "center",
        }}
      >
        Đang tải dữ liệu bài học từ hệ thống...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "850px",
        margin: "0 auto",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <button
        type="button"
        onClick={() => navigate(`/admin/courses/${courseId}/content`)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "none",
          border: "none",
          color: "#475569",
          cursor: "pointer",
          padding: 0,
          marginBottom: "20px",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        <ArrowLeft size={16} /> Quay lại Quản lý cấu trúc
      </button>

      <h1
        style={{
          marginBottom: "28px",
          color: "#0f172a",
          fontSize: "26px",
          fontWeight: "700",
          letterSpacing: "-0.5px",
        }}
      >
        Cấu hình nội dung bài học
      </h1>

      <form
        onSubmit={handleSave}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          backgroundColor: "#fff",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        {/* Tiêu đề */}
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              color: "#1e293b",
              fontSize: "14px",
            }}
          >
            Tiêu đề bài học <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "15px",
              boxSizing: "border-box",
            }}
            required
          />
        </div>

        {/* Loại bài học */}
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              color: "#1e293b",
              fontSize: "14px",
            }}
          >
            Loại bài học
          </label>
          <select
            value={lessonType}
            onChange={(e) => {
              setLessonType(e.target.value);
              setAttachedFile(null); // Xóa file chọn tạm thời khi thay đổi loại cấu trúc bài
            }}
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#fff",
              fontSize: "15px",
              boxSizing: "border-box",
            }}
          >
            <option value="video">📹 Video Bài Giảng</option>
            <option value="pdf">📄 Tài Liệu Đọc (Text/PDF)</option>
            <option value="test">📝 Bài Kiểm Tra (Quiz)</option>
          </select>
        </div>

        {/* Khối tải file hoặc nhập URL tương ứng */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            padding: "20px",
            borderRadius: "8px",
            border: "1px dashed #cbd5e1",
          }}
        >
          {lessonType === "video" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "10px",
                }}
              >
                <Video size={18} color="#2563eb" />
                <span
                  style={{
                    fontWeight: "600",
                    color: "#334155",
                    fontSize: "14px",
                  }}
                >
                  Cấu hình Video bài giảng
                </span>
              </div>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Dán link đường dẫn Video bài học (Vd: Youtube, AWS S3 URL...)"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {lessonType === "pdf" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <FileText size={18} color="#10b981" />
                <span
                  style={{
                    fontWeight: "600",
                    color: "#334155",
                    fontSize: "14px",
                  }}
                >
                  File tài liệu học tập (.pdf, .docx, .txt)
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px",
                  backgroundColor: "#fff",
                  border: "2px dashed #e2e8f0",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                onClick={() =>
                  document.getElementById("pdf-file-input").click()
                }
              >
                <Upload
                  size={32}
                  color="#94a3b8"
                  style={{ marginBottom: "8px" }}
                />
                <p
                  style={{
                    margin: "0 0 4px 0",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#475569",
                  }}
                >
                  Click để chọn file mới thay thế nếu cần
                </p>
                <input
                  id="pdf-file-input"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>
              {attachedFileName && (
                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "13px",
                    color: "#0f172a",
                    backgroundColor: "#e2e8f0",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    width: "fit-content",
                    fontWeight: "500",
                  }}
                >
                  📎 File hiện tại trên hệ thống:{" "}
                  <strong style={{ color: "#2563eb" }}>
                    {attachedFileName}
                  </strong>
                </div>
              )}
            </div>
          )}

          {lessonType === "test" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <HelpCircle size={18} color="#f59e0b" />
                <span
                  style={{
                    fontWeight: "600",
                    color: "#334155",
                    fontSize: "14px",
                  }}
                >
                  File đề thi bài kiểm tra hoặc tài liệu đính kèm
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px",
                  backgroundColor: "#fff",
                  border: "2px dashed #e2e8f0",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                onClick={() =>
                  document.getElementById("quiz-file-input").click()
                }
              >
                <Upload
                  size={32}
                  color="#94a3b8"
                  style={{ marginBottom: "8px" }}
                />
                <p
                  style={{
                    margin: "0 0 4px 0",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#475569",
                  }}
                >
                  Click để chọn file đề bài kiểm tra mới
                </p>
                <input
                  id="quiz-file-input"
                  type="file"
                  accept=".pdf,.xlsx,.json"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>
              {attachedFileName && (
                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "13px",
                    color: "#0f172a",
                    backgroundColor: "#fef3c7",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    width: "fit-content",
                    fontWeight: "500",
                    border: "1px solid #fde68a",
                  }}
                >
                  📝 Đề bài hiện tại:{" "}
                  <strong style={{ color: "#b45309" }}>
                    {attachedFileName}
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Học thử */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="checkbox"
            id="isPreview"
            checked={isPreviewable}
            onChange={(e) => setIsPreviewable(e.target.checked)}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          <label
            htmlFor="isPreview"
            style={{
              fontSize: "14px",
              color: "#334155",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Cho phép học thử miễn phí (Preview)
          </label>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "12px",
            borderTop: "1px solid #f1f5f9",
            paddingTop: "18px",
          }}
        >
          <button
            type="submit"
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "11px 24px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            <Save size={16} /> {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/courses/${courseId}/content`)}
            style={{
              backgroundColor: "#fff",
              border: "1px solid #cbd5e1",
              padding: "11px 24px",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#475569",
              fontWeight: "500",
              fontSize: "14px",
            }}
          >
            Hủy bỏ
          </button>
        </div>
      </form>
    </div>
  );
}
