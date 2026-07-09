import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { courseService } from "../../../services/course.service";
import { flashcardService } from "../../../services/flashcard.service";
import { getCurrentUser } from "../../../services/api-client";
import { useToast } from "../../../shared/components/ui/Toast/useToast";
import { CurriculumStructureEditor } from "../components/CurriculumStructureEditor";
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
  readOnly = false,
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
    if (t === "essay") {
      return (
        <div className="lesson-icon doc">
          <span className="material-symbols-outlined">assignment</span>
        </div>
      );
    }
    return (
      <div className="lesson-icon quiz">
        <span className="material-symbols-outlined">quiz</span>
      </div>
    );
  };

  const renderLessonStatus = (lesson) => {
    const meta = getLessonStatusMeta(lesson?.status);

    return (
      <span className={`badge status status-${meta.value}`}>{meta.label}</span>
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
            {...(readOnly ? {} : dragHandleProps)}
            className="material-symbols-outlined drag-handle"
            style={{ cursor: readOnly ? "default" : "grab" }}
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

        {!readOnly && (
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
        )}
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
                    isDragDisabled={readOnly}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...(readOnly ? {} : provided.draggableProps)}
                        {...(readOnly ? {} : provided.dragHandleProps)}
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
                          {renderLessonStatus(lesson)}
                          {lesson?.isPreview && (
                            <span className="badge preview">Preview</span>
                          )}
                        </div>

                        {!readOnly && (
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
                        )}
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
  const location = useLocation();
  const { showToast: emitToast } = useToast();
  const currentUser = getCurrentUser();
  const isTrainer = String(currentUser?.role || "").toLowerCase() === "trainer";
  const isStaffCourseContent = location.pathname.startsWith("/staff/");
  const readOnly = isTrainer || isStaffCourseContent;
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

  const fetchSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const data = await courseService.getCourseContent(courseId);
      const nextSections = Array.isArray(data) ? data : [];

      setSections(nextSections);
      setSectionLessons(() => {
        const lessonsBySection = {};
        for (const section of nextSections) {
          if (Array.isArray(section?.lessons)) {
            lessonsBySection[section.id] = section.lessons;
          }
        }
        return lessonsBySection;
      });
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
      const hasLessonsData = Object.prototype.hasOwnProperty.call(
        sectionLessons,
        section.id,
      );
      if (!hasLessonsData) {
        fetchLessonsForSection(section.id);
      }
    });
  }, [sections, sectionLessons, fetchLessonsForSection]);

  const handleCreateSection = async ({ title }) => {
    try {
      await courseService.createSection(courseId, { title, isActive: true });
      showToast("Section added successfully!", "success");
      fetchSections();
    } catch (error) {
      showToast("Error creating section", "error");
    }
  };

  const handleUpdateSection = async (sectionId, { title }) => {
    try {
      await courseService.updateSection(sectionId, {
        title,
        isActive: true,
      });
      showToast({ type: "success", message: "Section updated successfully!" });
      fetchSections();
    } catch (error) {
      showToast({ type: "error", message: "Error updating section" });
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
        showToast({
          type: "success",
          message: "Section deleted successfully!",
        });
        fetchSections();
      } catch (error) {
        showToast({ type: "error", message: "Error deleting section" });
      }
    }
  };

  const handleReorderSections = async (orderedIds) => {
    const reordered = orderedIds
      .map((id) => sections.find((s) => s.id === id))
      .filter(Boolean)
      .map((section, index) => ({ ...section, sortOrder: index }));
    setSections(reordered);

    try {
      await courseService.reorderSections(courseId, orderedIds);
      showToast("Sections reordered successfully!", "success");
    } catch (error) {
      showToast("Error reordering sections", "error");
      fetchSections();
    }
  };

  const handleCreateLesson = async (sectionId, payload) => {
    try {
      let mappedType = String(payload.lessonType).toLowerCase();
      if (mappedType === "document") mappedType = "pdf";

      if (mappedType === "flashcard") {
        const createdLesson = await flashcardService.createLesson(
          courseId,
          sectionId,
          {
            title: payload.title,
            description: "",
            isPreview: !!payload.isPreview,
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
        fetchLessonsForSection(sectionId);

        if (createdLesson?.lessonId) {
          navigate(
            `/admin/courses/${courseId}/lessons/${createdLesson.lessonId}`,
            { state: { flashcardSetId: createdLesson.setId } },
          );
        }
        return;
      }

      await courseService.createLesson(sectionId, {
        title: payload.title,
        lessonType: mappedType,
        isPreview: !!payload.isPreview,
        status: "draft",
        durationSeconds: 0,
        sortOrder: 0,
      });

      showToast("Lesson added successfully!", "success");
      fetchLessonsForSection(sectionId);
    } catch (error) {
      showToast("Error creating lesson", "error");
    }
  };

  const handleDeleteLesson = async (lessonId, lessonTitle, lesson = null) => {
    if (window.confirm(`Are you sure you want to delete "${lessonTitle}"?`)) {
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

  const handleReorderLessons = async (sectionId, orderedIds) => {
    const currentLessons = sectionLessons[sectionId] || [];
    const nextLessons = orderedIds
      .map((id) => currentLessons.find((l) => l.id === id))
      .filter(Boolean)
      .map((lesson, index) => ({ ...lesson, sortOrder: index }));
    setSectionLessons((prev) => ({ ...prev, [sectionId]: nextLessons }));

    try {
      await courseService.reorderLessons(sectionId, orderedIds);
      showToast("Lessons reordered successfully!", "success");
    } catch (error) {
      showToast("Error reordering lessons", "error");
      fetchLessonsForSection(sectionId);
    }
  };

  const onDragEnd = async (result) => {
    if (readOnly) return;
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
      totalLessons: Object.values(sectionLessons).reduce(
        (sum, l) => sum + l.length,
        0,
      ),
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
                    "noopener,noreferrer",
                  )
                }
                className="btn-outline"
              >
                <span className="material-symbols-outlined">visibility</span>{" "}
                View as User
              </button>
            </div>
          </div>
        </div>

        <CurriculumStructureEditor
          sections={sections}
          getLessons={(section) => sectionLessons[section.id] || []}
          isSectionLessonsLoading={(sectionId) =>
            loadingLessons[sectionId] || false
          }
          stats={stats}
          onCreateSection={handleCreateSection}
          onUpdateSection={handleUpdateSection}
          onDeleteSection={handleDeleteSection}
          onReorderSections={handleReorderSections}
          onCreateLesson={handleCreateLesson}
          onDeleteLesson={handleDeleteLesson}
          onReorderLessons={handleReorderLessons}
          onEditLesson={handleEditLesson}
        />
      </div>
    </div>
  );
}
