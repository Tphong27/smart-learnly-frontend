import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
  onEditSection,
  onDeleteSection,
  sectionDraggableId,
}) {
  const [lessons, setLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

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
    <Draggable draggableId={sectionDraggableId} index={index}>
      {(provided, snapshot) => (
        <div
          className={`section-item ${snapshot.isDragging ? "is-dragging" : ""}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <div className="section-header">
            <div
              className="section-title-wrapper"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <span
                className="material-symbols-outlined drag-handle"
                style={{ cursor: "grab" }}
                {...provided.dragHandleProps}
              >
                drag_indicator
              </span>

              <span
                className="material-symbols-outlined toggle-expand"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                  cursor: "pointer",
                  userSelect: "none",
                  color: "#434655",
                  transition: "transform 0.2s ease",
                }}
              >
                {isExpanded ? "expand_more" : "chevron_right"}
              </span>

              <h3
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ cursor: "pointer", userSelect: "none", margin: 0 }}
              >
                Section {index + 1}: {section?.title}
              </h3>
            </div>

            <div className="section-actions">
              <button
                className="icon-btn"
                title="Edit section"
                onClick={() => onEditSection(section)}
              >
                <span className="material-symbols-outlined">edit</span>
              </button>

              <button
                className="icon-btn delete"
                title="Delete section"
                onClick={() => onDeleteSection(section.id, section.title)}
              >
                <span className="material-symbols-outlined">delete</span>
              </button>

              <button
                onClick={() => {
                  setIsExpanded(true);
                  setTargetSectionId(section.id);
                  setIsLessonModalOpen(true);
                }}
                className="btn-outline"
              >
                + Add Lesson
              </button>
            </div>
          </div>

          {isExpanded && (
            <Droppable
              droppableId={`section-${section.id}`}
              type="LESSON"
            >
              {(provided, snapshot) => (
                <div
                  className={`lessons-container ${snapshot.isDraggingOver ? "is-dragging-over" : ""}`}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
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
                    <>
                      {lessons.map((lesson, lIndex) => (
                        <Draggable
                          key={lesson?.id || lIndex}
                          draggableId={`lesson-${lesson.id}`}
                          index={lIndex}
                        >
                          {(provided, snapshot) => (
                            <div
                              className={`lesson-item ${snapshot.isDragging ? "is-dragging" : ""}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <div className="lesson-info">
                                <span
                                  className="material-symbols-outlined drag-handle"
                                  {...provided.dragHandleProps}
                                >
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
                                    navigate(
                                      `/admin/courses/${courseId}/lessons/${lesson.id}`,
                                    )
                                  }
                                  className="btn-outline"
                                >
                                  Edit content
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </>
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
              )}
            </Droppable>
          )}
        </div>
      )}
    </Draggable>
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

  const [isEditSectionModalOpen, setIsEditSectionModalOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editSectionTitle, setEditSectionTitle] = useState("");

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

  const handleOpenEditSection = (section) => {
    setEditingSectionId(section.id);
    setEditSectionTitle(section.title);
    setIsEditSectionModalOpen(true);
  };

  const handleUpdateSection = async (e) => {
    e.preventDefault();
    if (!editSectionTitle.trim() || !editingSectionId) return;
    try {
      await courseService.updateSection(editingSectionId, {
        title: editSectionTitle.trim(),
        isActive: true,
      });
      showToast("Section updated successfully!", "success");
      setIsEditSectionModalOpen(false);
      setEditingSectionId(null);
      setEditSectionTitle("");
      fetchContent();
    } catch (error) {
      showToast("Error updating section", "error");
    }
  };

  const handleDeleteSection = async (sectionId, sectionTitle) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${sectionTitle}"? All lessons inside will be deleted.`,
      )
    ) {
      try {
        await courseService.deleteSection(sectionId);
        showToast("Section deleted successfully!", "success");
        fetchContent();
      } catch (error) {
        showToast("Error deleting section", "error");
      }
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
      else if (mappedType === "quiz") mappedType = "quiz";

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

  const handleDragEnd = async (result) => {
    const { destination, source, type } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === "SECTION") {
      const reorderedSections = Array.from(sections);
      const [movedSection] = reorderedSections.splice(source.index, 1);
      reorderedSections.splice(destination.index, 0, movedSection);

      setSections(reorderedSections);

      try {
        const orderedIds = reorderedSections.map((s) => s.id);
        await courseService.reorderSections(courseId, orderedIds);
        showToast("Sections reordered successfully!", "success");
      } catch (error) {
        showToast("Error reordering sections", "error");
        fetchContent();
      }
    } else if (type === "LESSON") {
      const sourceSectionId = source.droppableId.replace("section-", "");
      const destSectionId = destination.droppableId.replace("section-", "");

      if (sourceSectionId !== destSectionId) {
        showToast("Cannot move lessons between sections yet", "warning");
        return;
      }

      try {
        const lessons = await courseService.getLessonsBySection(sourceSectionId);
        const reorderedLessons = Array.from(lessons);
        const [movedLesson] = reorderedLessons.splice(source.index, 1);
        reorderedLessons.splice(destination.index, 0, movedLesson);

        const orderedIds = reorderedLessons.map((l) => l.id);
        await courseService.reorderLessons(sourceSectionId, orderedIds);
        showToast("Lessons reordered successfully!", "success");
        fetchContent();
      } catch (error) {
        showToast("Error reordering lessons", "error");
        fetchContent();
      }
    }
  };

  const calculateStats = () => {
    let totalLessons = 0;
    let videoCount = 0;
    let documentCount = 0;
    let quizCount = 0;

    sections.forEach((section) => {
      if (section.lessons && Array.isArray(section.lessons)) {
        totalLessons += section.lessons.length;
        section.lessons.forEach((lesson) => {
          const type = String(lesson.lessonType || "").toLowerCase();
          if (type === "video") videoCount++;
          else if (["pdf", "document"].includes(type)) documentCount++;
          else if (["quiz", "rich_text"].includes(type)) quizCount++;
        });
      }
    });

    return {
      sectionCount: sections.length,
      totalLessons,
      videoCount,
      documentCount,
      quizCount,
    };
  };

  const stats = calculateStats();

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

        {/* Statistics Panel */}
        <div className="stats-panel" style={{
          display: "flex",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap"
        }}>
          <div className="stat-card" style={{
            flex: "1",
            minWidth: "150px",
            padding: "16px 20px",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }}>
            <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>
              Sections
            </div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a" }}>
              {stats.sectionCount}
            </div>
          </div>
          <div className="stat-card" style={{
            flex: "1",
            minWidth: "150px",
            padding: "16px 20px",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }}>
            <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>
              Total Lessons
            </div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a" }}>
              {stats.totalLessons}
            </div>
          </div>
          <div className="stat-card" style={{
            flex: "1",
            minWidth: "150px",
            padding: "16px 20px",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }}>
            <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>
              Videos
            </div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#2563eb" }}>
              {stats.videoCount}
            </div>
          </div>
          <div className="stat-card" style={{
            flex: "1",
            minWidth: "150px",
            padding: "16px 20px",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }}>
            <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>
              Documents
            </div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#16a34a" }}>
              {stats.documentCount}
            </div>
          </div>
          <div className="stat-card" style={{
            flex: "1",
            minWidth: "150px",
            padding: "16px 20px",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }}>
            <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>
              Quizzes
            </div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#dc2626" }}>
              {stats.quizCount}
            </div>
          </div>
        </div>

        <div className="workspace-card">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections" type="SECTION">
              {(provided, snapshot) => (
                <div
                  className={`sections-list ${snapshot.isDraggingOver ? "is-dragging-over" : ""}`}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {sections.length > 0 ? (
                    <>
                      {sections.map((section, index) => (
                        <SectionItem
                          key={section?.id || index}
                          section={section}
                          index={index}
                          sectionDraggableId={`section-${section.id}`}
                          setTargetSectionId={setTargetSectionId}
                          setIsLessonModalOpen={setIsLessonModalOpen}
                          courseId={courseId}
                          navigate={navigate}
                          onEditSection={handleOpenEditSection}
                          onDeleteSection={handleDeleteSection}
                        />
                      ))}
                      {provided.placeholder}
                    </>
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
              )}
            </Droppable>
          </DragDropContext>

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

      {/* CREATE SECTION MODAL */}
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

      {/* EDIT SECTION MODAL */}
      {isEditSectionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Section</h3>
              <button
                className="icon-btn"
                onClick={() => {
                  setIsEditSectionModalOpen(false);
                  setEditingSectionId(null);
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleUpdateSection}>
              <div className="modal-body">
                <div className="form-group">
                  <label>
                    Section Name <span style={{ color: "#ba1a1a" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editSectionTitle}
                    onChange={(e) => setEditSectionTitle(e.target.value)}
                    placeholder="e.g., Section 1: Environment Setup..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditSectionModalOpen(false);
                    setEditingSectionId(null);
                  }}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Section
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
