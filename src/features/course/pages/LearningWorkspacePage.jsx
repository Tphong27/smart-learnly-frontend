import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useParams,
  useNavigate,
  Link,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  PlayCircle,
  FileText,
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  Circle,
  BookOpen,
  Eye,
  Layers,
} from "lucide-react";
import { LearningLessonMedia } from "@/features/course/components/LearningLessonMedia";
import { LearningLessonTabs } from "@/features/course/components/LearningLessonTabs";
import { learningService } from "@/services";
import { filterPublishedSections } from "@/features/course/utils/lesson-status";
import "./LearningWorkspacePage.css";

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs}s`;
}

function getLessonId(lesson) {
  return lesson?.lessonId ?? lesson?.id ?? null;
}

function LessonIcon({ type, size = 16 }) {
  const t = (type || "").toLowerCase();
  if (t.includes("video")) return <PlayCircle size={size} />;
  if (t.includes("quiz")) return <HelpCircle size={size} />;
  if (t.includes("flashcard")) return <Layers size={size} />;
  return <FileText size={size} />;
}

function groupLessonsBySection(data) {
  return filterPublishedSections(data?.sections || []);
}

export function LearningWorkspacePage({
  previewMode = false,
  mode = "student",
}) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedLessonId = searchParams.get("lessonId");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeLessonTab, setActiveLessonTab] = useState("overview");
  const [completedLessonIds, setCompletedLessonIds] = useState(() => new Set());
  const [updatingLessonIds, setUpdatingLessonIds] = useState(() => new Set());
  const [lessonNotesById, setLessonNotesById] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let result;
        if (mode === "student") {
          result = await learningService.getLearningContent(courseId);
        } else if (mode === "guest") {
          result = await learningService.getPreviewContent(courseId);
        } else if (mode === "admin-preview") {
          result = await learningService.getAdminPreviewContent(courseId);
        } else {
          result = await learningService.getLearningContent(courseId);
        }
        if (!cancelled) {
          setData(result);

          const loadedLessons = filterPublishedSections(
            result?.sections || [],
          ).flatMap((section) => section.lessons || []);

          const completedIds = new Set(
            loadedLessons
              .filter((lesson) => lesson.completed)
              .map((lesson) => getLessonId(lesson))
              .filter(Boolean),
          );

          setCompletedLessonIds(completedIds);
        }
      } catch (err) {
        if (!cancelled)
          setError(err?.message || "Failed to load course content");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (courseId) load();
    return () => {
      cancelled = true;
    };
  }, [courseId, mode]);

  const sections = useMemo(() => groupLessonsBySection(data), [data]);

  const allLessons = useMemo(() => {
    return sections.flatMap((s) => s.lessons || []);
  }, [sections]);

  const [activeLessonId, setActiveLessonId] = useState(requestedLessonId);

  const handleSelectLesson = useCallback((lesson) => {
    setActiveLessonId(getLessonId(lesson));
    setActiveLessonTab("overview");
  }, []);

  const activeLesson = useMemo(() => {
    if (allLessons.length === 0) return null;
    return (
      allLessons.find((lesson) => getLessonId(lesson) === activeLessonId) ||
      allLessons[0]
    );
  }, [allLessons, activeLessonId]);

  const currentIndex = useMemo(
    () =>
      allLessons.findIndex(
        (lesson) => getLessonId(lesson) === getLessonId(activeLesson),
      ),
    [activeLesson, allLessons],
  );

  const nextLesson = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= allLessons.length - 1) {
      return null;
    }
    return allLessons[currentIndex + 1];
  }, [allLessons, currentIndex]);

  const toggleLessonCompleted = useCallback(
    async (lessonId) => {
      if (!lessonId || mode !== "student") return;

      if (updatingLessonIds.has(lessonId)) return;

      const wasCompleted = completedLessonIds.has(lessonId);
      const nextCompleted = !wasCompleted;

      setUpdatingLessonIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(lessonId);
        return nextIds;
      });

      setCompletedLessonIds((currentIds) => {
        const nextIds = new Set(currentIds);

        if (nextCompleted) {
          nextIds.add(lessonId);
        } else {
          nextIds.delete(lessonId);
        }

        return nextIds;
      });

      try {
        await learningService.updateLessonProgress(lessonId, nextCompleted);
      } catch (err) {
        setCompletedLessonIds((currentIds) => {
          const rollbackIds = new Set(currentIds);

          if (wasCompleted) {
            rollbackIds.add(lessonId);
          } else {
            rollbackIds.delete(lessonId);
          }

          return rollbackIds;
        });

        setError(err?.message || "Failed to update lesson progress");
      } finally {
        setUpdatingLessonIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.delete(lessonId);
          return nextIds;
        });
      }
    },
    [completedLessonIds, mode, updatingLessonIds],
  );

  const activeLessonIdForNote = getLessonId(activeLesson);
  const activeLessonNote = activeLessonIdForNote
    ? lessonNotesById[activeLessonIdForNote] || ""
    : "";

  const handleActiveLessonNoteChange = useCallback(
    (note) => {
      if (!activeLessonIdForNote) return;
      setLessonNotesById((currentNotes) => ({
        ...currentNotes,
        [activeLessonIdForNote]: note,
      }));
    },
    [activeLessonIdForNote],
  );

  const markLessonCompleted = useCallback(
    async (lessonId) => {
      if (!lessonId || mode !== "student") return;
      if (completedLessonIds.has(lessonId)) return;

      setCompletedLessonIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(lessonId);
        return nextIds;
      });

      try {
        await learningService.updateLessonProgress(lessonId, true);
      } catch (err) {
        setCompletedLessonIds((currentIds) => {
          const rollbackIds = new Set(currentIds);
          rollbackIds.delete(lessonId);
          return rollbackIds;
        });

        setError(err?.message || "Failed to update quiz progress");
      }
    },
    [completedLessonIds, mode],
  );

  const handleGoToNextLesson = useCallback(async () => {
    if (!nextLesson || !activeLesson) return;

    const currentLessonId = getLessonId(activeLesson);
    const currentLessonType = String(
      activeLesson?.lessonType || "",
    ).toUpperCase();

    const isActivityLesson = ["QUIZ", "FLASHCARD"].includes(currentLessonType);
    const isCompleted = currentLessonId
      ? completedLessonIds.has(currentLessonId)
      : false;

    if (isActivityLesson && !isCompleted) {
      setError(
        currentLessonType === "QUIZ"
          ? "Please submit the quiz before moving to the next lesson."
          : "Please complete all flashcards before moving to the next lesson.",
      );
      return;
    }

    if (currentLessonId && !isCompleted) {
      await markLessonCompleted(currentLessonId);
    }

    handleSelectLesson(nextLesson);
  }, [
    activeLesson,
    completedLessonIds,
    handleSelectLesson,
    markLessonCompleted,
    nextLesson,
  ]);

  if (loading) {
    return (
      <div className="learning-workspace">
        <div className="learning-workspace__loading">
          <div className="learning-workspace__spinner" />
          <span>Loading course content...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="learning-workspace">
        <div className="learning-workspace__error">
          <span className="learning-workspace__error-msg">{error}</span>
          <button
            className="learning-workspace__error-btn"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const courseTitle = data?.courseTitle || "Course";
  const stats = data?.stats;

  const isAdminPreview = mode === "admin-preview";
  const isGuestPreview = mode === "guest";

  const completedCount = completedLessonIds.size;
  const totalLessonCount = allLessons.length;

  const currentLessonId = getLessonId(activeLesson);

  const isActivityLesson = ["QUIZ", "FLASHCARD"].includes(
    String(activeLesson?.lessonType || "").toUpperCase(),
  );

  const canGoNext =
    !!nextLesson &&
    (!isActivityLesson || completedLessonIds.has(currentLessonId));

  const progressPercent =
    totalLessonCount > 0
      ? Math.round((completedCount / totalLessonCount) * 100)
      : 0;

  return (
    <div className="learning-workspace">
      <header className="learning-workspace__topbar">
        <button
          className="learning-workspace__topbar-back"
          onClick={() => {
            if (isAdminPreview) {
              navigate(`/admin/courses/${courseId}/content`);
            } else if (isGuestPreview || previewMode) {
              // Quay về đúng trang xuất phát (course detail có thể mở bằng slug),
              // tránh điều hướng cứng tới /courses/<uuid> gây 404.
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(`/courses/${courseId}`);
              }
            } else {
              navigate("/learning/courses");
            }
          }}
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="learning-workspace__course-title" title={courseTitle}>
          {courseTitle}
        </h1>

        {isAdminPreview && (
          <span className="learning-workspace__trainee-tag">
            <Eye size={14} />
            Viewing as trainee
          </span>
        )}

        {isGuestPreview && (
          <span className="learning-workspace__trainee-tag">
            <Eye size={14} />
            Preview mode
          </span>
        )}

        {(isGuestPreview || previewMode) && (
          <Link
            to={`/courses/${courseId}`}
            className="learning-workspace__topbar-cta"
          >
            View Course Details
          </Link>
        )}

        <div className="learning-workspace__topbar-progress">
          <div className="learning-workspace__progress-track">
            <div
              className="learning-workspace__progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="learning-workspace__progress-label">
            {completedCount}/{totalLessonCount} done
          </span>
        </div>
      </header>

      <div className="learning-workspace__body">
        <aside
          className={`learning-workspace__sidebar ${sidebarOpen ? "open" : ""}`}
        >
          <div className="learning-workspace__sidebar-header">
            <h2 className="learning-workspace__sidebar-title">
              Course content
            </h2>
            <button
              className="learning-workspace__sidebar-back"
              onClick={() => setSidebarOpen(false)}
              title="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {stats && (
            <div className="learning-workspace__stats">
              <span className="learning-workspace__stat">
                <span className="learning-workspace__stat-value">
                  {stats.totalSections}
                </span>{" "}
                sections
              </span>
              <span className="learning-workspace__stat">
                <span className="learning-workspace__stat-value">
                  {stats.totalLessons}
                </span>{" "}
                lessons
              </span>
              <span className="learning-workspace__stat">
                <span className="learning-workspace__stat-value">
                  {formatDuration(stats.totalDurationSeconds)}
                </span>
              </span>
            </div>
          )}

          <div className="learning-workspace__curriculum">
            {sections.map((section, sIdx) => (
              <div
                key={section.sectionId || sIdx}
                className="curriculum-section"
              >
                <SectionAccordion
                  section={section}
                  sIdx={sIdx}
                  activeLesson={activeLesson}
                  onSelectLesson={handleSelectLesson}
                  completedLessonIds={completedLessonIds}
                  updatingLessonIds={updatingLessonIds}
                  onToggleLessonComplete={toggleLessonCompleted}
                />
              </div>
            ))}
          </div>
        </aside>

        <main className="learning-workspace__main">
          {!sidebarOpen && (
            <button
              className="learning-workspace__sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              title="Open sidebar"
            >
              <Menu size={18} />
            </button>
          )}

          <div className="learning-workspace__content">
            {activeLesson ? (
              <div className="learning-lesson">
                <LearningLessonMedia
                  key={`media-${getLessonId(activeLesson)}`}
                  lesson={activeLesson}
                />

                <LearningLessonTabs
                  key={`tabs-${getLessonId(activeLesson)}`}
                  lesson={activeLesson}
                  activeTab={activeLessonTab}
                  onTabChange={setActiveLessonTab}
                  note={activeLessonNote}
                  onNoteChange={handleActiveLessonNoteChange}
                  nextLesson={nextLesson}
                  onNextLesson={handleGoToNextLesson}
                  canGoNext={canGoNext}
                  isActivityLesson={isActivityLesson}
                  workspaceMode={mode}
                  onQuizCompleted={markLessonCompleted}
                  onFlashcardCompleted={markLessonCompleted}
                />
              </div>
            ) : (
              <div className="learning-lesson__empty">
                <BookOpen size={48} />
                <p>Select a lesson from the sidebar to begin</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function SectionAccordion({
  section,
  sIdx,
  activeLesson,
  onSelectLesson,
  completedLessonIds,
  updatingLessonIds,
  onToggleLessonComplete,
}) {
  const [expanded, setExpanded] = useState(true);
  const lessons = section.lessons || [];

  return (
    <div className="curriculum-section">
      <div
        className="curriculum-section__header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="curriculum-section__title">
          Section {sIdx + 1}: {section.title}
        </span>
        <span
          className={`curriculum-section__toggle ${expanded ? "expanded" : ""}`}
        >
          <ChevronDown size={16} />
        </span>
      </div>

      {expanded && (
        <div className="curriculum-section__lessons">
          {lessons.map((lesson, lIdx) => {
            const lessonId = getLessonId(lesson);
            const isActive = lessonId === getLessonId(activeLesson);
            const isCompleted = completedLessonIds.has(lessonId);
            const isUpdating = updatingLessonIds.has(lessonId);
            const type = (lesson.lessonType || "").toLowerCase();
            return (
              <div
                key={lessonId || lIdx}
                className={`curriculum-lesson ${isActive ? "curriculum-lesson--active" : ""} ${isCompleted ? "curriculum-lesson--completed" : ""}`}
                onClick={() => onSelectLesson(lesson)}
              >
                <button
                  type="button"
                  className="curriculum-lesson__complete"
                  disabled={isUpdating}
                  aria-label={
                    isCompleted
                      ? "Mark lesson as incomplete"
                      : "Mark lesson as complete"
                  }
                  title={isCompleted ? "Completed" : "Mark as complete"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleLessonComplete(lessonId);
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    <Circle size={17} />
                  )}
                </button>
                <div
                  className={`curriculum-lesson__icon curriculum-lesson__icon--${type}`}
                >
                  <LessonIcon type={lesson.lessonType} size={14} />
                </div>
                <div className="curriculum-lesson__info">
                  <div className="curriculum-lesson__index">
                    Lesson {sIdx + 1}.{lIdx + 1}
                  </div>
                  <div
                    className="curriculum-lesson__title"
                    title={lesson.title}
                  >
                    {lesson.title}
                  </div>
                  <div className="curriculum-lesson__meta">
                    <span className="curriculum-lesson__duration">
                      {formatDuration(lesson.durationSeconds)}
                    </span>
                    {lesson.isPreview && (
                      <span className="curriculum-lesson__preview-badge">
                        Preview
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LearningWorkspacePage;
