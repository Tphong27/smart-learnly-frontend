import React, { useState, useEffect, useCallback } from "react";
import {
  useLocation,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Eye, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { courseService } from "../../../services/course.service";
import { flashcardService } from "../../../services/flashcard.service";
import { useToast } from "../../../shared/components/ui/Toast/useToast";
import { Button } from "../../../shared/components/ui";
import { CurriculumStructureEditor } from "../components/CurriculumStructureEditor";
import "../course-admin.css";

export default function AdminCourseContentPage() {
  const params = useParams();
  const courseId = params.courseId || params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast: emitToast } = useToast();
  const isStaffRoute = location.pathname.startsWith("/staff/");
  const courseBasePath = isStaffRoute ? "/staff/courses" : "/admin/courses";

  const courseListPath = courseBasePath;

  const courseContentPath = `${courseBasePath}/${courseId}/content`;
  const coursePreviewPath = `${courseBasePath}/${courseId}/preview`;
  const lessonBasePath = `${courseBasePath}/${courseId}/lessons`;
  const focusMode = searchParams.get("focus") === "1";
  const pageClassName = `sl-cm-page sl-cm-page--curriculum${focusMode ? " sl-cm-page--focus" : ""}`;

  function toggleFocusMode() {
    const nextParams = new URLSearchParams(searchParams);
    if (focusMode) nextParams.delete("focus");
    else nextParams.set("focus", "1");
    setSearchParams(nextParams, { replace: true });
  }

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
  const [loadError, setLoadError] = useState("");
  const [loadingLessons, setLoadingLessons] = useState({});

  const fetchSections = useCallback(async () => {
    setLoadingSections(true);
    setLoadError("");
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
      const message = error.response?.data?.message || "Error loading content";
      setLoadError(message);
      showToast({
        type: "error",
        message,
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
    if (!courseId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      fetchSections();
    });
    return () => window.cancelAnimationFrame(frame);
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
      showToast({ type: "success", message: "Section added successfully!" });
      fetchSections();
      return true;
    } catch (error) {
      showToast({
        type: "error",
        message: error?.response?.data?.message || "Could not create section.",
      });
      return false;
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
      return true;
    } catch {
      showToast({ type: "error", message: "Error updating section" });
      return false;
    }
  };

  const handleDeleteSection = async (sectionId, sectionTitle) => {
    const previousSections = sections;
    const target = sections.find((s) => s.id === sectionId);
    if (!target) return;

    // Optimistic remove — rollback if delete fails
    setSections((current) => current.filter((s) => s.id !== sectionId));

    try {
      await courseService.deleteSection(sectionId);
      showToast({
        type: "success",
        message: `Section “${sectionTitle}” deleted.`,
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await courseService.createSection(courseId, {
                title: target.title,
                isActive: target.isActive ?? true,
                sortOrder: target.sortOrder ?? 0,
              });
              showToast({
                type: "success",
                message: "Section restored.",
              });
              fetchSections();
            } catch (restoreErr) {
              showToast({
                type: "error",
                message:
                  restoreErr?.response?.data?.message ||
                  "Could not restore the section.",
              });
              setSections(previousSections);
            }
          },
        },
      });
    } catch (error) {
      // Rollback optimistic remove
      setSections(previousSections);
      showToast({
        type: "error",
        message: error?.response?.data?.message || "Could not delete section.",
      });
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
      showToast({ type: "success", message: "Sections reordered." });
    } catch (error) {
      showToast({
        type: "error",
        message: error?.response?.data?.message || "Could not reorder sections.",
      });
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

        showToast({ type: "success", message: "Flashcard lesson added." });
        fetchLessonsForSection(sectionId);

        if (createdLesson?.lessonId) {
          navigate(
            `${lessonBasePath}/${createdLesson.lessonId}`,
            { state: { flashcardSetId: createdLesson.setId } },
          );
        }
        return true;
      }

      await courseService.createLesson(sectionId, {
        title: payload.title,
        lessonType: mappedType,
        isPreview: !!payload.isPreview,
        status: "draft",
        durationSeconds: 0,
        sortOrder: 0,
      });

      showToast({ type: "success", message: "Lesson added." });
      fetchLessonsForSection(sectionId);
      return true;
    } catch (error) {
      showToast({
        type: "error",
        message: error?.response?.data?.message || "Could not create lesson.",
      });
      return false;
    }
  };

  const handleDeleteLesson = async (lessonId, lessonTitle, lesson = null) => {
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

      showToast({
        type: "success",
        message: `Lesson “${lessonTitle}” deleted.`,
      });
      setSectionLessons((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].filter((l) => l.id !== lessonId);
        }
        return updated;
      });
    } catch (error) {
      showToast({
        type: "error",
        message: error?.response?.data?.message || "Could not delete lesson.",
      });
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
      showToast({ type: "success", message: "Lessons reordered." });
    } catch (error) {
      showToast({
        type: "error",
        message: error?.response?.data?.message || "Could not reorder lessons.",
      });
      fetchLessonsForSection(sectionId);
    }
  };

  const handleEditLesson = useCallback(
    (lesson) => {
      if (!lesson?.id) {
        showToast({
          type: "error",
          message: "Lesson ID was not found.",
        });
        return;
      }

      navigate(`${lessonBasePath}/${lesson.id}`);
    },
    [lessonBasePath, navigate, showToast],
  );

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

  if (loadingSections) {
    return (
      <div className={pageClassName} role="status" aria-live="polite">
        {focusMode && (
          <button
            type="button"
            className="sl-cm-btn sl-cm-btn--secondary sl-cm-focus-escape"
            onClick={toggleFocusMode}
          >
            <Minimize2 size={16} aria-hidden="true" /> Exit focus
          </button>
        )}
        <div className="sl-cm-workspace" aria-busy="true">
          <div className="sl-cm-skeleton" style={{ width: "40%", marginBottom: 12 }} />
          <div className="sl-cm-skeleton" style={{ width: "70%", marginBottom: 24 }} />
          <div className="sl-cm-skeleton" style={{ width: "100%", height: 64 }} />
          <div className="sl-cm-skeleton" style={{ width: "100%", height: 64 }} />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={pageClassName}>
        {focusMode && (
          <button
            type="button"
            className="sl-cm-btn sl-cm-btn--secondary sl-cm-focus-escape"
            onClick={toggleFocusMode}
          >
            <Minimize2 size={16} aria-hidden="true" /> Exit focus
          </button>
        )}
        <div className="sl-cm-workspace sl-cm-load-error" role="alert">
          <h1 className="sl-cm-header__title">Curriculum unavailable</h1>
          <p>{loadError}</p>
          <div className="sl-cm-load-error__actions">
            <Button
              variant="outline"
              onClick={() => navigate(courseListPath)}
            >
              Back to courses
            </Button>
            <Button
              leftIcon={<RotateCcw size={16} />}
              onClick={fetchSections}
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageClassName}>
      <header className="sl-cm-header">
        <div>
          <button
            type="button"
            className="sl-cm-back"
            onClick={() => navigate(courseListPath)}
          >
            ← Back to courses
          </button>
          <h1 className="sl-cm-header__title">Curriculum</h1>
          <p className="sl-cm-header__subtitle">
            Organise sections and lessons so learners can follow a logical flow.
          </p>
        </div>
        <div className="sl-cm-header__actions">
          <button
            type="button"
            className="sl-cm-btn sl-cm-btn--secondary"
            onClick={toggleFocusMode}
            aria-pressed={focusMode}
          >
            {focusMode ? (
              <Minimize2 size={16} aria-hidden="true" />
            ) : (
              <Maximize2 size={16} aria-hidden="true" />
            )}
            {focusMode ? "Exit focus" : "Focus mode"}
          </button>
          <a
            className="sl-cm-btn sl-cm-btn--secondary"
            href={`${coursePreviewPath}?returnTo=${encodeURIComponent(courseContentPath)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Eye size={16} aria-hidden="true" /> Preview as learner
          </a>
        </div>
      </header>

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
  );
}
