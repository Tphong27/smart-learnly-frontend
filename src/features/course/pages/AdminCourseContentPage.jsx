import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseService } from "../../../services/course.service";
import { flashcardService } from "../../../services/flashcard.service";
import { useToast } from "../../../shared/components/ui/Toast/useToast";
import { CurriculumStructureEditor } from "../components/CurriculumStructureEditor";
import "./AdminCourseContent.css";

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

  const handleEditLesson = (lesson) => {
    if (!lesson?.id) return;
    navigate(`/admin/courses/${courseId}/lessons/${lesson.id}`);
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
