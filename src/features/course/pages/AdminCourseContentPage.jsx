import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseService } from "../../../services/course.service";
import { useToast } from "../../../shared/components/ui/Toast/useToast";
import { ArrowLeft, Video, FileText, HelpCircle, X, Plus } from "lucide-react";
import "./AdminCourseContent.css";

// ==========================================
// COMPONENT CON: XỬ LÝ HIỂN THỊ VÀ TỰ ĐỘNG GỌI API LẤY BÀI HỌC CHO TỪNG CHƯƠNG
// ==========================================
function SectionItem({
  section,
  index,
  handleSectionDragStart,
  handleSectionDragEnd,
  handleSectionDrop,
  setTargetSectionId,
  setIsLessonModalOpen,
  getLessonIcon,
  courseId,
  navigate,
}) {
  const [lessons, setLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  useEffect(() => {
    if (section?.id) {
      setLoadingLessons(true);
      courseService
        .getLessonsBySection(section.id)
        .then((data) => {
          if (data && Array.isArray(data)) {
            setLessons(data);
          } else {
            setLessons([]);
          }
        })
        .catch((err) => {
          console.error("Lỗi lấy bài học của chương học " + section.id, err);
        })
        .finally(() => setLoadingLessons(false));
    }
  }, [section?.id]);

  return (
    <div
      draggable
      onDragStart={(e) => handleSectionDragStart(e, index)}
      onDragEnd={handleSectionDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleSectionDrop(e, index)}
      style={{
        border: "1px solid #cbd5e1",
        background: "#ffffff",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header của Chương */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px",
          background: "#f1f5f9",
          cursor: "grab",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{ color: "#94a3b8", fontSize: "18px", userSelect: "none" }}
          >
            ⣿
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: "600",
              color: "#334155",
            }}
          >
            Chương {index + 1}: {section?.title}
          </h3>
        </div>
        <button
          onClick={() => {
            setTargetSectionId(section.id);
            setIsLessonModalOpen(true);
          }}
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: "#2563eb",
            padding: "6px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "500",
          }}
        >
          + Thêm Bài học
        </button>
      </div>

      {/* Danh sách Bài học của riêng chương này */}
      <ul style={{ listStyle: "none", padding: "0", margin: "0" }}>
        {loadingLessons ? (
          <li
            style={{ padding: "12px 40px", color: "#94a3b8", fontSize: "13px" }}
          >
            Đang tải danh sách bài học...
          </li>
        ) : lessons.length > 0 ? (
          lessons.map((lesson, lIndex) => (
            <li
              key={lesson?.id || lIndex}
              style={{
                padding: "12px 16px 12px 40px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#ffffff",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span
                  style={{
                    color: "#64748b",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  {index + 1}.{lIndex + 1}
                </span>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {getLessonIcon(lesson?.lessonType)}
                  <span
                    style={{
                      fontWeight: "500",
                      color: "#475569",
                      fontSize: "14px",
                    }}
                  >
                    {lesson?.title}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    background: "#f1f5f9",
                    borderRadius: "12px",
                    color: "#64748b",
                    fontWeight: "500",
                  }}
                >
                  {lesson?.lessonType || "VIDEO"}
                </span>
              </div>

              <button
                onClick={() => {
                  if (lesson?.id) {
                    navigate(`/admin/courses/${courseId}/lessons/${lesson.id}`);
                  }
                }}
                style={{
                  color: "#2563eb",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                Sửa nội dung
              </button>
            </li>
          ))
        ) : (
          <li
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#94a3b8",
              fontStyle: "italic",
              fontSize: "13px",
              background: "#fafafa",
            }}
          >
            Chương này chưa có bài học nào.
          </li>
        )}
      </ul>
    </div>
  );
}

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export default function AdminCourseContentPage() {
  const params = useParams();
  const courseId = params.courseId || params.id;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState(null);
  const [newLessonData, setNewLessonData] = useState({
    title: "",
    lessonType: "VIDEO",
    isPreview: false,
  });

  const [draggedSectionIndex, setDraggedSectionIndex] = useState(null);

  useEffect(() => {
    if (courseId) {
      fetchContent();
    } else {
      setLoading(false);
    }
  }, [courseId]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const data = await courseService.getCourseContent(courseId);
      if (data && Array.isArray(data)) {
        setSections(data);
      } else {
        setSections([]);
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Lỗi khi tải nội dung khóa học";
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    try {
      await courseService.createSection(courseId, {
        title: newSectionTitle,
        isActive: true,
      });

      showToast("Đã thêm chương học mới thành công!", "success");
      setNewSectionTitle("");
      setIsSectionModalOpen(false);
      fetchContent();
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Lỗi khi tạo chương học";
      showToast(errorMsg, "error");
    }
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!newLessonData.title.trim() || !targetSectionId) return;

    try {
      let mappedType = String(newLessonData.lessonType).toLowerCase();
      if (mappedType === "document") {
        mappedType = "pdf";
      } else if (mappedType === "quiz") {
        mappedType = "rich_text";
      }

      const payload = {
        title: newLessonData.title.trim(),
        lessonType: mappedType,
        isPreview: !!newLessonData.isPreview,
        status: "draft",
        durationSeconds: 0,
        sortOrder: 0,
      };

      await courseService.createLesson(targetSectionId, payload);

      showToast("Đã thêm bài học mới thành công!", "success");
      setNewLessonData({ title: "", lessonType: "VIDEO", isPreview: false });
      setIsLessonModalOpen(false);
      setTargetSectionId(null);
      fetchContent();
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || "Lỗi khi tạo bài học";
      showToast(errorMsg, "error");
    }
  };

  const handleSectionDragStart = (e, index) => {
    setDraggedSectionIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSectionDragEnd = () => {
    setDraggedSectionIndex(null);
  };

  const handleSectionDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedSectionIndex === null || draggedSectionIndex === targetIndex)
      return;

    const newSections = [...sections];
    const itemToMove = newSections.splice(draggedSectionIndex, 1)[0];
    newSections.splice(targetIndex, 0, itemToMove);

    setSections(newSections);

    try {
      const orderedIds = newSections.map((s) => s.id);
      await courseService.reorderSections(courseId, orderedIds);
      showToast("Đã cập nhật vị trí chương!", "success");
    } catch (error) {
      showToast("Lỗi khi lưu vị trí chương", "error");
      fetchContent();
    }
  };

  const getLessonIcon = (type) => {
    const formattedType = String(type).toLowerCase();
    if (formattedType === "video")
      return <Video size={16} color="#1890ff" style={{ marginRight: "4px" }} />;
    if (
      formattedType === "document" ||
      formattedType === "text" ||
      formattedType === "pdf" ||
      formattedType === "rich_text"
    )
      return (
        <FileText size={16} color="#52c41a" style={{ marginRight: "4px" }} />
      );
    return (
      <HelpCircle size={16} color="#faad14" style={{ marginRight: "4px" }} />
    );
  };

  if (loading) {
    return (
      <div className="admin-loading-wrapper">
        <div className="modern-spinner">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="app-page-inner">
      <div
        className="admin-container"
        style={{ width: "100%", maxWidth: "900px", margin: "0 auto" }}
      >
        {/* Header điều hướng */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <button
              className="back-btn"
              onClick={() => navigate("/admin/courses")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <ArrowLeft size={16} /> Quay lại danh sách
            </button>
            <h2
              style={{
                fontSize: "22px",
                fontWeight: "700",
                margin: 0,
                color: "#1e293b",
              }}
            >
              Quản lý Cấu trúc Khóa học
            </h2>
          </div>
          <button
            onClick={() => setIsSectionModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            <Plus size={16} /> Thêm Chương Mới
          </button>
        </div>

        {/* Danh sách phân tầng chương học */}
        <div
          className="sections-list"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {Array.isArray(sections) && sections.length > 0 ? (
            sections.map((section, index) => (
              <SectionItem
                key={section?.id || index}
                section={section}
                index={index}
                handleSectionDragStart={handleSectionDragStart}
                handleSectionDragEnd={handleSectionDragEnd}
                handleSectionDrop={handleSectionDrop}
                setTargetSectionId={setTargetSectionId}
                setIsLessonModalOpen={setIsLessonModalOpen}
                getLessonIcon={getLessonIcon}
                courseId={courseId}
                navigate={navigate}
              />
            ))
          ) : (
            <div
              style={{ textAlign: "center", color: "#64748b", padding: "40px" }}
            >
              Khóa học này hiện tại chưa có cấu trúc nội dung. Hãy tạo chương
              học đầu tiên!
            </div>
          )}
        </div>

        {/* MODAL THÊM CHƯƠNG MỚI */}
        {isSectionModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Thêm Chương Học Mới</h3>
                <button
                  className="close-modal-btn"
                  onClick={() => setIsSectionModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateSection}>
                <div className="modal-body">
                  <div className="form-group-modal">
                    <label>Tên chương học *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Giới thiệu cấu trúc ứng dụng..."
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-modal-secondary"
                    onClick={() => setIsSectionModalOpen(false)}
                  >
                    Hủy bỏ
                  </button>
                  <button type="submit" className="btn-modal-primary">
                    Tạo chương
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL THÊM BÀI HỌC */}
        {isLessonModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Thêm Bài Học Mới</h3>
                <button
                  className="close-modal-btn"
                  onClick={() => {
                    setIsLessonModalOpen(false);
                    setTargetSectionId(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateLesson}>
                <div className="modal-body">
                  <div className="form-group-modal">
                    <label>Tiêu đề bài học *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Cài đặt môi trường NodeJS..."
                      value={newLessonData.title}
                      onChange={(e) =>
                        setNewLessonData({
                          ...newLessonData,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group-modal">
                    <label>Loại bài học</label>
                    <select
                      value={newLessonData.lessonType}
                      onChange={(e) =>
                        setNewLessonData({
                          ...newLessonData,
                          lessonType: e.target.value,
                        })
                      }
                    >
                      <option value="VIDEO">Video Bài Giảng</option>
                      <option value="DOCUMENT">Tài Liệu Đọc (Text/PDF)</option>
                      <option value="QUIZ">Bài Kiểm Tra (Quiz)</option>
                    </select>
                  </div>

                  <div className="form-group-modal checkbox-group">
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontWeight: "normal",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newLessonData.isPreview}
                        onChange={(e) =>
                          setNewLessonData({
                            ...newLessonData,
                            isPreview: e.target.checked,
                          })
                        }
                      />
                      Cho phép học thử miễn phí (Preview)
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-modal-secondary"
                    onClick={() => {
                      setIsLessonModalOpen(false);
                      setTargetSectionId(null);
                    }}
                  >
                    Hủy bỏ
                  </button>
                  <button type="submit" className="btn-modal-primary">
                    Tạo bài học
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
