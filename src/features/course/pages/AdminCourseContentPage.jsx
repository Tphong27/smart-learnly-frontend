import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { courseService } from "../../../services/course.service";
import { flashcardService } from "../../../services/flashcard.service";
import { useToast } from "../../../shared/components/ui/Toast/useToast";
import { QuizQuestionManager } from "../components/QuizQuestionManager";
import "./AdminCourseContent.css";

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

function SectionItem({
  section,
  index,
  setTargetSectionId,
  setIsLessonModalOpen,
  courseId,
  navigate,
  onEditSection,
  onDeleteSection,
  lessons,
  loadingLessons,
  onLessonClick,
  onDeleteLesson,
  onManageQuestions,
  dragHandleProps,
}) {
  const [isExpanded, setIsExpanded] = useState(true);

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
    if (t === "flashcard") {
      return (
        <div className="lesson-icon flashcard">
          <span className="material-symbols-outlined">view_carousel</span>
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
        <div
          className="section-title-wrapper"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <span
            {...dragHandleProps}
            className="material-symbols-outlined drag-handle"
            style={{ cursor: "grab" }}
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
        <Droppable droppableId={`section-${section.id}`} type="LESSON">
          {(provided) => (
            <div
              className="lessons-container"
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
                lessons.map((lesson, lIndex) => (
                  <Draggable
                    key={lesson?.id || lIndex}
                    draggableId={`lesson-${lesson.id}`}
                    index={lIndex}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="lesson-item"
                        style={{
                          ...provided.draggableProps.style,
                          background: snapshot.isDragging
                            ? "#e8eaff"
                            : undefined,
                        }}
                      >
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
                              navigate(
                                `/admin/courses/${courseId}/lessons/${lesson.id}`
                              )
                            }
                            className="btn-outline"
                          >
                            Edit content
                          </button>
                          {String(lesson?.lessonType).toUpperCase() ===
                            "QUIZ" && (
                            <button
                              onClick={() =>
                                lesson?.id && onManageQuestions(lesson)
                              }
                              className="btn-outline"
                            >
                              Manage questions
                            </button>
                          )}
                          <button
                            className="icon-btn delete"
                            title="Delete lesson"
                            onClick={() =>
                              lesson?.id &&
                              onDeleteLesson(lesson.id, lesson.title, lesson)
                            }
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
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
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
}

export default function AdminCourseContentPage() {
  const params = useParams();
  const courseId = params.courseId || params.id;
  const navigate = useNavigate();
  const { showToast: emitToast } = useToast();
  const showToast = useCallback(
    (messageOrOptions, type) => {
      if (messageOrOptions && typeof messageOrOptions === "object") {
        emitToast(messageOrOptions);
        return;
      }
      emitToast({ message: messageOrOptions, type });
    },
    [emitToast],
  );

  const [sections, setSections] = useState([]);
  const [sectionLessons, setSectionLessons] = useState({});
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState({});

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

  const [quizManagerLesson, setQuizManagerLesson] = useState(null);

  const fetchSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const data = await courseService.getCourseContent(courseId);
      setSections(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast({
        type: "error",
        message: error.response?.data?.message || "Error loading content",
      });
    } finally {
      setLoadingSections(false);
    }
  }, [courseId, showToast]);

  const fetchLessonsForSection = useCallback(async (sectionId) => {
    setLoadingLessons((prev) => ({ ...prev, [sectionId]: true }));
    try {
      const data = await courseService.getLessonsBySection(sectionId);
      setSectionLessons((prev) => ({
        ...prev,
        [sectionId]: Array.isArray(data) ? data : [],
      }));
    } catch (err) {
      console.error("Error fetching lessons for section " + sectionId, err);
      // Đánh dấu section đã được fetch (dù lỗi) để tránh effect lặp fetch vô hạn
      setSectionLessons((prev) => ({
        ...prev,
        [sectionId]: prev[sectionId] || [],
      }));
    } finally {
      setLoadingLessons((prev) => ({ ...prev, [sectionId]: false }));
    }
  }, []);

  useEffect(() => {
    if (courseId) fetchSections();
  }, [courseId, fetchSections]);

  useEffect(() => {
    sections.forEach((section) => {
      if (!sectionLessons[section.id]) {
        fetchLessonsForSection(section.id);
      }
    });
  }, [sections, sectionLessons, fetchLessonsForSection]);

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
      showToast({ type: "success", message: "Section updated successfully!" });
      setIsEditSectionModalOpen(false);
      setEditingSectionId(null);
      setEditSectionTitle("");
      fetchSections();
    } catch (error) {
      showToast({ type: "error", message: "Error updating section" });
    }
  };

  const handleDeleteSection = async (sectionId, sectionTitle) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${sectionTitle}"? All lessons inside will be deleted.`
      )
    ) {
      try {
        await courseService.deleteSection(sectionId);
        showToast({ type: "success", message: "Section deleted successfully!" });
        fetchSections();
      } catch (error) {
        showToast({ type: "error", message: "Error deleting section" });
      }
    }
  };

  const handleDeleteLesson = async (lessonId, lessonTitle, lesson = null) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${lessonTitle}"?`
      )
    ) {
      try {
        const isFlashcard =
          String(lesson?.lessonType || "").toLowerCase() === "flashcard";

        if (isFlashcard) {
          const flashcardSet =
            await flashcardService.getAdminSetByLesson(lessonId);
          await flashcardService.deleteSet(flashcardSet.id);
        } else {
          await courseService.deleteLesson(lessonId);
        }

        showToast({ type: "success", message: "Lesson deleted successfully!" });
        setSectionLessons((prev) => {
          const updated = { ...prev };
          for (const key of Object.keys(updated)) {
            updated[key] = updated[key].filter((l) => l.id !== lessonId);
          }
          return updated;
        });
      } catch (error) {
        showToast("Error deleting lesson", "error");
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
      fetchSections();
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

      if (mappedType === "flashcard") {
        const createdLesson = await flashcardService.createLesson(
          courseId,
          targetSectionId,
          {
            title: newLessonData.title.trim(),
            description: "",
            isPreview: !!newLessonData.isPreview,
            status: "draft",
            sortOrder: 0,
          },
        );

        if (createdLesson?.lessonId && createdLesson?.setId) {
          sessionStorage.setItem(
            `flashcard-set:${createdLesson.lessonId}`,
            createdLesson.setId,
          );
        }

        showToast("Flashcard lesson added successfully!", "success");
        setNewLessonData({ title: "", lessonType: "video", isPreview: false });
        setIsLessonModalOpen(false);
        setTargetSectionId(null);
        fetchLessonsForSection(targetSectionId);

        if (createdLesson?.lessonId) {
          navigate(`/admin/courses/${courseId}/lessons/${createdLesson.lessonId}`, {
            state: { flashcardSetId: createdLesson.setId },
          });
        }
        return;
      }

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
      fetchLessonsForSection(targetSectionId);
    } catch (error) {
      showToast("Error creating lesson", "error");
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === "SECTION") {
      const reordered = reorder(sections, source.index, destination.index);
      const newSections = reordered.map((s, idx) => ({ ...s, sortOrder: idx }));
      setSections(newSections);

      try {
        await courseService.reorderSections(
          courseId,
          newSections.map((s) => s.id)
        );
        showToast("Sections reordered successfully!", "success");
      } catch (error) {
        showToast("Error reordering sections", "error");
        fetchSections();
      }
    } else if (type === "LESSON") {
      const sourceSectionId = source.droppableId.replace("section-", "");
      const destSectionId = destination.droppableId.replace("section-", "");

      if (sourceSectionId === destSectionId) {
        const lessons = [...(sectionLessons[sourceSectionId] || [])];
        const reordered = reorder(lessons, source.index, destination.index);
        const newLessons = reordered.map((l, idx) => ({ ...l, sortOrder: idx }));

        setSectionLessons((prev) => ({
          ...prev,
          [sourceSectionId]: newLessons,
        }));

        try {
          await courseService.reorderLessons(
            sourceSectionId,
            newLessons.map((l) => l.id)
          );
          showToast("Lessons reordered successfully!", "success");
        } catch (error) {
          showToast("Error reordering lessons", "error");
          fetchLessonsForSection(sourceSectionId);
        }
      }
    }
  };

  const stats = React.useMemo(() => {
    let totalVideos = 0;
    let totalDocs = 0;
    let totalQuizzes = 0;
    let totalFlashcards = 0;
    for (const section of sections) {
      const lessons = sectionLessons[section.id] || [];
      for (const lesson of lessons) {
        const t = (lesson.lessonType || "").toLowerCase();
        if (t === "video") totalVideos++;
        else if (t === "pdf" || t === "document") totalDocs++;
        else if (t === "quiz") totalQuizzes++;
        else if (t === "flashcard") totalFlashcards++;
      }
    }
    return {
      totalSections: sections.length,
      totalLessons: Object.values(sectionLessons).reduce((sum, l) => sum + l.length, 0),
      totalVideos,
      totalDocuments: totalDocs,
      totalQuizzes,
      totalFlashcards,
    };
  }, [sections, sectionLessons]);

  if (loadingSections)
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        Loading data...
      </div>
    );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
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
              <div className="header-actions">
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `/admin/courses/${courseId}/preview`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="btn-outline"
                >
                  <span className="material-symbols-outlined">visibility</span>{" "}
                  View as User
                </button>
                <button
                  onClick={() => setIsSectionModalOpen(true)}
                  className="btn-primary"
                >
                  <span className="material-symbols-outlined">add</span> Add New
                  Section
                </button>
              </div>
            </div>
          </div>

          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-value">{stats.totalSections}</span>
              <span className="stat-label">Sections</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalLessons}</span>
              <span className="stat-label">Total Lessons</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalVideos}</span>
              <span className="stat-label">Videos</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalDocuments}</span>
              <span className="stat-label">Documents</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalQuizzes}</span>
              <span className="stat-label">Quizzes</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalFlashcards}</span>
              <span className="stat-label">Flashcards</span>
            </div>
          </div>

          <Droppable droppableId="sections" type="SECTION">
            {(provided) => (
              <div
                className="workspace-card"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <div className="sections-list">
                  {sections.length > 0 ? (
                    sections.map((section, index) => (
                      <Draggable
                        key={section.id}
                        draggableId={`section-${section.id}`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...provided.draggableProps.style,
                              marginBottom: 16,
                            }}
                          >
                            <SectionItem
                              section={section}
                              index={index}
                              setTargetSectionId={setTargetSectionId}
                              setIsLessonModalOpen={setIsLessonModalOpen}
                              courseId={courseId}
                              navigate={navigate}
                              onEditSection={handleOpenEditSection}
                              onDeleteSection={handleDeleteSection}
                              onDeleteLesson={handleDeleteLesson}
                              onManageQuestions={setQuizManagerLesson}
                              lessons={sectionLessons[section.id] || []}
                              loadingLessons={loadingLessons[section.id] || false}
                              onLessonClick={(lesson) =>
                                navigate(
                                  `/admin/courses/${courseId}/lessons/${lesson.id}`
                                )
                              }
                              dragHandleProps={provided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
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
                  {provided.placeholder}
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
            )}
          </Droppable>
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
                        Reading Material (PDF / Word)
                      </option>
                      <option value="quiz">Quiz</option>
                      <option value="flashcard">Flashcard</option>
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

      <QuizQuestionManager
        open={Boolean(quizManagerLesson)}
        lesson={quizManagerLesson}
        onClose={() => setQuizManagerLesson(null)}
        onSaved={() => {
          const sectionId =
            quizManagerLesson?.sectionId || quizManagerLesson?.section?.id;
          if (sectionId) {
            fetchLessonsForSection(sectionId);
          }
        }}
      />
    </DragDropContext>
  );
}
