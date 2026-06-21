import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseService } from "../../../services/course.service";
import { useToast } from "../../../shared/components/ui/Toast/useToast";
import "./AdminCourseContent.css";

// ==========================================
// SUB-COMPONENT: SECTION
// ==========================================
function SectionItem({
  section,
  index,
  setTargetSectionId,
  setIsLessonModalOpen,
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
          if (data && Array.isArray(data)) setLessons(data);
          else setLessons([]);
        })
        .catch((err) =>
          console.error("Error fetching lessons: " + section.id, err),
        )
        .finally(() => setLoadingLessons(false));
    }
  }, [section?.id]);

  const renderLessonIcon = (type) => {
    const t = String(type).toLowerCase();
    if (t === "video") {
      return (
        <div className="lesson-icon video">
          <span className="material-symbols-outlined">play_circle</span>
        </div>
      );
    }
    if (["document", "text", "pdf"].includes(t)) {
      return (
        <div className="lesson-icon doc">
          <span className="material-symbols-outlined">description</span>
        </div>
      );
    }
    return (
      <div className="lesson-icon quiz">
        <span className="material-symbols-outlined">quiz</span>
      </div>
    );
  };

  return (
    <div className="section-item">
      <div className="section-header">
        <div className="section-title-wrapper">
          <span className="material-symbols-outlined drag-handle">
            drag_indicator
          </span>
          <h3>
            Section {index + 1}: {section?.title}
          </h3>
        </div>

        <div className="section-actions">
          <button className="icon-btn" title="Edit section">
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button className="icon-btn delete" title="Delete section">
            <span className="material-symbols-outlined">delete</span>
          </button>
          <button
            onClick={() => {
              setTargetSectionId(section.id);
              setIsLessonModalOpen(true);
            }}
            className="btn-outline"
          >
            + Add Lesson
          </button>
        </div>
      </div>

      <div className="lessons-container">
        {loadingLessons ? (
          <div
            style={{
              padding: "16px 48px",
              color: "#737686",
              fontStyle: "italic",
              fontSize: "14px",
            }}
          >
            Loading lessons...
          </div>
        ) : lessons.length > 0 ? (
          lessons.map((lesson, lIndex) => (
            <div key={lesson?.id || lIndex} className="lesson-item">
              <div className="lesson-info">
                <span className="material-symbols-outlined drag-handle">
                  drag_indicator
                </span>
                {renderLessonIcon(lesson?.lessonType)}
                <span className="lesson-title">
                  {index + 1}.{lIndex + 1}. {lesson?.title}
                </span>
                <span className="badge type">
                  {lesson?.lessonType || "VIDEO"}
                </span>
                {lesson?.isPreview && (
                  <span className="badge preview">Preview</span>
                )}
              </div>

              <div className="lesson-actions">
                <span className="lesson-duration">
                  {lesson?.durationSeconds
                    ? `${Math.floor(lesson.durationSeconds / 60)} mins`
                    : "--"}
                </span>
                <button
                  onClick={() =>
                    lesson?.id &&
                    navigate(`/admin/courses/${courseId}/lessons/${lesson.id}`)
                  }
                  className="btn-outline"
                >
                  Edit content
                </button>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#737686",
              fontSize: "14px",
            }}
          >
            This section has no lessons yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
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
    lessonType: "video",
    isPreview: false,
  });

  useEffect(() => {
    if (courseId) fetchContent();
    else setLoading(false);
  }, [courseId]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const data = await courseService.getCourseContent(courseId);
      setSections(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error loading content",
        "error",
      );
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
      showToast("Section added successfully!", "success");
      setNewSectionTitle("");
      setIsSectionModalOpen(false);
      fetchContent();
    } catch (error) {
      showToast("Error creating section", "error");
    }
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!newLessonData.title.trim() || !targetSectionId) return;
    try {
      let mappedType = String(newLessonData.lessonType).toLowerCase();
      if (mappedType === "document") mappedType = "pdf";
      else if (mappedType === "quiz") mappedType = "rich_text";

      await courseService.createLesson(targetSectionId, {
        title: newLessonData.title.trim(),
        lessonType: mappedType,
        isPreview: !!newLessonData.isPreview,
        status: "draft",
        durationSeconds: 0,
        sortOrder: 0,
      });

      showToast("Lesson added successfully!", "success");
      setNewLessonData({ title: "", lessonType: "video", isPreview: false });
      setIsLessonModalOpen(false);
      setTargetSectionId(null);
      fetchContent();
    } catch (error) {
      showToast("Error creating lesson", "error");
    }
  };

  if (loading)
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        Loading data...
      </div>
    );

  return (
    <div className="admin-course-page">
      <div className="page-container">
        <div className="page-header">
          <button
            onClick={() => navigate("/admin/courses")}
            className="back-btn"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "18px" }}
            >
              arrow_back
            </span>
            Back to list
          </button>
          <div className="header-title-wrapper">
            <div>
              <h2>Course Structure</h2>
              <p>Organize and manage your course content</p>
            </div>
            <button
              onClick={() => setIsSectionModalOpen(true)}
              className="btn-primary"
            >
              <span className="material-symbols-outlined">add</span> Add New
              Section
            </button>
          </div>
        </div>

        <div className="workspace-card">
          <div className="sections-list">
            {sections.length > 0 ? (
              sections.map((section, index) => (
                <SectionItem
                  key={section?.id || index}
                  section={section}
                  index={index}
                  setTargetSectionId={setTargetSectionId}
                  setIsLessonModalOpen={setIsLessonModalOpen}
                  courseId={courseId}
                  navigate={navigate}
                />
              ))
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "#737686",
                  padding: "40px",
                }}
              >
                The course has no content structure yet. Let's create the first
                section!
              </div>
            )}
          </div>

          <div
            onClick={() => setIsSectionModalOpen(true)}
            className="empty-add-area"
          >
            <div className="icon-circle">
              <span className="material-symbols-outlined">add</span>
            </div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
              Add a new section
            </h4>
            <p style={{ margin: 0, color: "#434655", fontSize: "14px" }}>
              Build a logical structure to help students follow along easily.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION MODAL */}
      {isSectionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Section</h3>
              <button
                className="icon-btn"
                onClick={() => setIsSectionModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateSection}>
              <div className="modal-body">
                <div className="form-group">
                  <label>
                    Section Name <span style={{ color: "#ba1a1a" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="e.g., Section 1: Environment Setup..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LESSON MODAL */}
      {isLessonModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Lesson</h3>
              <button
                className="icon-btn"
                onClick={() => {
                  setIsLessonModalOpen(false);
                  setTargetSectionId(null);
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateLesson}>
              <div className="modal-body">
                <div className="form-group">
                  <label>
                    Lesson Title <span style={{ color: "#ba1a1a" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newLessonData.title}
                    onChange={(e) =>
                      setNewLessonData({
                        ...newLessonData,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g., 1.1. ReactJS Overview"
                  />
                </div>
                <div className="form-group">
                  <label>
                    Lesson Type <span style={{ color: "#ba1a1a" }}>*</span>
                  </label>
                  <select
                    value={newLessonData.lessonType}
                    onChange={(e) =>
                      setNewLessonData({
                        ...newLessonData,
                        lessonType: e.target.value,
                      })
                    }
                  >
                    <option value="video">Video Lecture</option>
                    <option value="document">
                      Reading Material (Text/PDF)
                    </option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    background: "#f3f3fe",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid #c3c6d7",
                  }}
                >
                  <input
                    id="previewMode"
                    type="checkbox"
                    checked={newLessonData.isPreview}
                    onChange={(e) =>
                      setNewLessonData({
                        ...newLessonData,
                        isPreview: e.target.checked,
                      })
                    }
                    style={{ width: "16px", height: "16px", marginTop: "2px" }}
                  />
                  <label
                    htmlFor="previewMode"
                    style={{ cursor: "pointer", margin: 0 }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#191b23",
                      }}
                    >
                      Allow preview
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#434655",
                        marginTop: "4px",
                      }}
                    >
                      Students who haven't purchased the course can still view
                      this.
                    </div>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setIsLessonModalOpen(false);
                    setTargetSectionId(null);
                  }}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
