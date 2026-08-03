import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useParams,
  useNavigate,
  Link,
  useSearchParams,
} from "react-router-dom";
import {
  CheckSquare2,
  PlayCircle,
  FileText,
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  Square,
  BookOpen,
  Eye,
  Layers,
} from "lucide-react";
import { LearningLessonMedia } from "@/features/course/components/LearningLessonMedia";
import { LearningLessonTabs } from "@/features/course/components/LearningLessonTabs";
import { learningService, getCurrentUser } from "@/services";
import { filterPublishedSections } from "@/features/course/utils/lesson-status";
import "./LearningWorkspacePage.css";

const LAST_LESSON_STORAGE_PREFIX = "smartLearnly:learningWorkspace:lastLesson";

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

function formatCurriculumSource(curriculum) {
  if (!curriculum) return null;
  if (curriculum.customized || curriculum.curriculumScope === "class") {
    return "Customized class curriculum";
  }
  return "Master curriculum";
}

function getUserPreferenceKey(user) {
  return user?.id || user?.userId || user?.accountId || user?.email || null;
}

function lessonPositionStorageKey(userKey, courseId, classId) {
  if (!userKey || !courseId) return null;
  const learningContext = classId ? `class:${classId}` : "online";
  return `${LAST_LESSON_STORAGE_PREFIX}:${userKey}:${courseId}:${learningContext}`;
}

function readStoredLessonId(storageKey) {
  if (!storageKey || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStoredLessonId(storageKey, lessonId) {
  if (!storageKey || lessonId == null || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, String(lessonId));
  } catch {
    // Lesson resume is best-effort.
  }
}

function findValidLessonById(lessons, lessonId) {
  const targetId = lessonId == null ? "" : String(lessonId);
  if (!targetId) return null;
  return (
    lessons.find((lesson) => String(getLessonId(lesson)) === targetId) || null
  );
}

export function LearningWorkspacePage({
  previewMode = false,
  mode = "student",
}) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedReturnTo = searchParams.get("returnTo");
  const requestedLessonId = searchParams.get("lessonId");
  const requestedClassId = searchParams.get("classId");
  const workspaceUserKey = useMemo(
    () => getUserPreferenceKey(getCurrentUser()),
    [],
  );
  const lessonResumeStorageKey = useMemo(
    () =>
      lessonPositionStorageKey(workspaceUserKey, courseId, requestedClassId),
    [courseId, requestedClassId, workspaceUserKey],
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(max-width: 1024px)").matches;
  });
  const [activeLessonTab, setActiveLessonTab] = useState("overview");
  const [completedLessonIds, setCompletedLessonIds] = useState(() => new Set());
  const [updatingLessonIds, setUpdatingLessonIds] = useState(() => new Set());
  const [lessonNotesById, setLessonNotesById] = useState({});
  const resolvedClassId = requestedClassId || null;
  const flashcardProgressUserKey = mode === "student" ? workspaceUserKey : null;

  useEffect(() => {
    const narrowLayout = window.matchMedia("(max-width: 1024px)");
    const syncSidebarWithViewport = (event) => {
      setSidebarOpen(!event.matches);
    };

    narrowLayout.addEventListener("change", syncSidebarWithViewport);

    return () => {
      narrowLayout.removeEventListener("change", syncSidebarWithViewport);
    };
  }, [setSidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const handleEscape = (event) => {
      if (
        event.key === "Escape" &&
        window.matchMedia("(max-width: 1024px)").matches
      ) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (cancelled) return;

        let result;

        if (mode === "student") {
          result = await learningService.getLearningContent(
            courseId,
            resolvedClassId,
          );
        } else if (mode === "guest") {
          result = await learningService.getPreviewContent(courseId);
        } else if (mode === "admin-preview") {
          result = await learningService.getAdminPreviewContent(
            courseId,
            requestedClassId,
          );
        } else {
          result = await learningService.getLearningContent(
            courseId,
            resolvedClassId,
          );
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
        if (!cancelled) {
          setError(err?.message || "Failed to load course content");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (courseId) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [courseId, mode, requestedClassId, resolvedClassId]);

  const sections = useMemo(() => groupLessonsBySection(data), [data]);

  const allLessons = useMemo(() => {
    return sections.flatMap((s) => s.lessons || []);
  }, [sections]);

  const [activeLessonId, setActiveLessonId] = useState(null);

  const updateLessonQuery = useCallback(
    (lessonId) => {
      if (lessonId == null) return;
      const nextLessonId = String(lessonId);
      if (searchParams.get("lessonId") === nextLessonId) return;

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("lessonId", nextLessonId);
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleSelectLesson = useCallback(
    (lesson) => {
      const lessonId = getLessonId(lesson);
      setActiveLessonId(lessonId);
      setActiveLessonTab("overview");
      writeStoredLessonId(lessonResumeStorageKey, lessonId);
      updateLessonQuery(lessonId);

      if (window.matchMedia("(max-width: 1024px)").matches) {
        setSidebarOpen(false);
      }
    },
    [
      lessonResumeStorageKey,
      setActiveLessonId,
      setActiveLessonTab,
      setSidebarOpen,
      updateLessonQuery,
    ],
  );

  const activeLesson = useMemo(() => {
    if (allLessons.length === 0) return null;
    const requestedLesson = findValidLessonById(allLessons, requestedLessonId);
    const selectedLesson = findValidLessonById(allLessons, activeLessonId);
    const storedLesson = findValidLessonById(
      allLessons,
      readStoredLessonId(lessonResumeStorageKey),
    );

    return requestedLesson || selectedLesson || storedLesson || allLessons[0];
  }, [activeLessonId, allLessons, lessonResumeStorageKey, requestedLessonId]);

  useEffect(() => {
    const lessonId = getLessonId(activeLesson);
    if (lessonId == null) return;
    writeStoredLessonId(lessonResumeStorageKey, lessonId);
    updateLessonQuery(lessonId);
  }, [activeLesson, lessonResumeStorageKey, updateLessonQuery]);

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
        await learningService.updateLessonProgress(
          lessonId,
          nextCompleted,
          resolvedClassId,
          courseId,
        );
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
    [completedLessonIds, courseId, mode, resolvedClassId, updatingLessonIds],
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
        await learningService.updateLessonProgress(
          lessonId,
          true,
          resolvedClassId,
          courseId,
        );
      } catch (err) {
        setCompletedLessonIds((currentIds) => {
          const rollbackIds = new Set(currentIds);
          rollbackIds.delete(lessonId);
          return rollbackIds;
        });

        setError(err?.message || "Failed to update lesson progress");
      }
    },
    [completedLessonIds, courseId, mode, resolvedClassId],
  );

  const handleGoToNextLesson = useCallback(async () => {
    if (!nextLesson || !activeLesson) return;

    const currentLessonId = getLessonId(activeLesson);
    const currentLessonType = String(
      activeLesson?.lessonType || "",
    ).toUpperCase();

    const isActivityLesson = ["QUIZ", "FLASHCARD", "ESSAY", "ASSIGNMENT"].includes(
      currentLessonType,
    );
    const isCompleted = currentLessonId
      ? completedLessonIds.has(currentLessonId)
      : false;

    if (isActivityLesson && !isCompleted) {
      setError(
        currentLessonType === "QUIZ"
          ? "Please submit the quiz before moving to the next lesson."
          : ["ESSAY", "ASSIGNMENT"].includes(currentLessonType)
            ? "Please submit the assignment before moving to the next lesson."
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
  const curriculumSourceLabel = formatCurriculumSource(data?.curriculum);

  const isAdminPreview = mode === "admin-preview";
  const isGuestPreview = mode === "guest";
  const isDraftAdminPreview =
    isAdminPreview && data?.curriculum?.source === "master_authoring";

  function getSafeReturnPath(returnTo) {
    if (!returnTo) {
      return null;
    }

    // Chỉ cho phép điều hướng nội bộ.
    if (!returnTo.startsWith("/")) {
      return null;
    }

    // Không cho protocol-relative URL như //evil.com.
    if (returnTo.startsWith("//")) {
      return null;
    }

    return returnTo;
  }
  const safeReturnTo = getSafeReturnPath(requestedReturnTo);

  const completedCount = completedLessonIds.size;
  const totalLessonCount = allLessons.length;

  const currentLessonId = getLessonId(activeLesson);

  const isActivityLesson = ["QUIZ", "FLASHCARD", "ESSAY", "ASSIGNMENT"].includes(
    String(activeLesson?.lessonType || "").toUpperCase(),
  );

  const canGoNext =
    !!nextLesson &&
    (!isActivityLesson || completedLessonIds.has(currentLessonId));

  const progressPercent =
    totalLessonCount > 0
      ? Math.round((completedCount / totalLessonCount) * 100)
      : 0;

  function handleLeaveWorkspace() {
    if (isAdminPreview) {
      if (safeReturnTo) {
        navigate(safeReturnTo);
        return;
      }
      navigate(`/admin/courses/${courseId}/content`);
      return;
    }

    if (isGuestPreview || previewMode) {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate(`/courses/${courseId}`);
      }
      return;
    }

    navigate("/learning/courses");
  }

  return (
    <div className="learning-workspace">
      <a
        className="learning-workspace__skip-link"
        href="#learning-workspace-main"
      >
        Skip to lesson content
      </a>
      <header className="learning-workspace__topbar">
        {isAdminPreview ? (
          <span className="learning-workspace__brand learning-workspace__brand--static">
            <BookOpen size={24} aria-hidden="true" />
            <span>Smart Learnly</span>
          </span>
        ) : (
          <button
            type="button"
            className="learning-workspace__brand"
            onClick={handleLeaveWorkspace}
            aria-label="Leave course player"
          >
            <BookOpen size={24} aria-hidden="true" />
            <span>Smart Learnly</span>
          </button>
        )}

        <span
          className="learning-workspace__topbar-divider"
          aria-hidden="true"
        />

        <h1 className="learning-workspace__course-title" title={courseTitle}>
          {courseTitle}
        </h1>

        {isAdminPreview && (
          <span className="learning-workspace__trainee-tag">
            <Eye size={14} />
            {isDraftAdminPreview
              ? "Previewing unpublished changes"
              : requestedClassId
                ? "Viewing this class as trainee"
                : "Viewing as trainee"}
          </span>
        )}

        {isGuestPreview && (
          <span className="learning-workspace__trainee-tag">
            <Eye size={14} />
            Preview mode
          </span>
        )}

        {curriculumSourceLabel && mode === "student" && (
          <span
            className="learning-workspace__trainee-tag"
            title={data?.curriculum?.source || undefined}
          >
            <BookOpen size={14} />
            {curriculumSourceLabel}
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

        {isAdminPreview && (
          <button
            type="button"
            className="learning-workspace__topbar-cta"
            onClick={handleLeaveWorkspace}
          >
            Exit preview
          </button>
        )}

        {!isAdminPreview && (
          <div
            className="learning-workspace__topbar-progress"
            role="progressbar"
            aria-label="Course progress"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progressPercent}
          >
            <svg
              className="learning-workspace__progress-ring"
              viewBox="0 0 36 36"
              aria-hidden="true"
            >
              <circle
              className="learning-workspace__progress-ring-track"
              cx="18"
              cy="18"
              r="15.5"
              pathLength="100"
              />
              <circle
              className="learning-workspace__progress-ring-value"
              cx="18"
              cy="18"
              r="15.5"
              pathLength="100"
              strokeDashoffset={100 - progressPercent}
              />
            </svg>
            <div className="learning-workspace__progress-copy">
              <strong>Your progress</strong>
              <span>
              {progressPercent}% · {completedCount}/{totalLessonCount} lessons
              </span>
            </div>
          </div>
        )}

        {!sidebarOpen && (
          <button
            type="button"
            className="learning-workspace__curriculum-toggle"
            aria-controls="learning-workspace-curriculum"
            aria-expanded="false"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
            <span>Course content</span>
          </button>
        )}
      </header>

      <div className="learning-workspace__body">
        <main className="learning-workspace__main" id="learning-workspace-main">
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
                  courseId={courseId}
                  classId={resolvedClassId}
                  activeTab={activeLessonTab}
                  onTabChange={setActiveLessonTab}
                  note={activeLessonNote}
                  onNoteChange={handleActiveLessonNoteChange}
                  nextLesson={nextLesson}
                  onNextLesson={handleGoToNextLesson}
                  canGoNext={canGoNext}
                  isActivityLesson={isActivityLesson}
                  workspaceMode={mode}
                  flashcardProgressUserKey={flashcardProgressUserKey}
                  flashcardPositionUserKey={workspaceUserKey}
                  onQuizCompleted={markLessonCompleted}
                  onFlashcardCompleted={markLessonCompleted}
                  onEssayCompleted={markLessonCompleted}
                />
              </div>
            ) : (
              <div className="learning-lesson__empty">
                <BookOpen size={48} />
                <p>Select a lesson from course content to begin</p>
              </div>
            )}
          </div>
        </main>

        {sidebarOpen && (
          <button
            type="button"
            className="learning-workspace__sidebar-scrim"
            aria-label="Close course content"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          id="learning-workspace-curriculum"
          className={`learning-workspace__sidebar ${sidebarOpen ? "open" : ""}`}
          aria-label="Course content"
        >
          <div className="learning-workspace__sidebar-header">
            <h2 className="learning-workspace__sidebar-title">
              Course content
            </h2>
            <button
              className="learning-workspace__sidebar-back"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close course content"
            >
              <X size={18} />
            </button>
          </div>

          <div className="learning-workspace__curriculum">
            {sections.map((section, sIdx) => (
              <SectionAccordion
                key={section.sectionId || sIdx}
                section={section}
                sIdx={sIdx}
                activeLesson={activeLesson}
                onSelectLesson={handleSelectLesson}
                completedLessonIds={completedLessonIds}
                updatingLessonIds={updatingLessonIds}
                onToggleLessonComplete={toggleLessonCompleted}
              />
            ))}
          </div>
        </aside>
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
  const completedInSection = lessons.filter((lesson) =>
    completedLessonIds.has(getLessonId(lesson)),
  ).length;
  const sectionDuration = lessons.reduce(
    (total, lesson) => total + Number(lesson.durationSeconds || 0),
    0,
  );

  return (
    <div className="curriculum-section">
      <button
        type="button"
        className="curriculum-section__header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="curriculum-section__copy">
          <span className="curriculum-section__title">
            Section {sIdx + 1}: {section.title}
          </span>
          <span className="curriculum-section__meta">
            {completedInSection}/{lessons.length} lessons ·{" "}
            {formatDuration(sectionDuration)}
          </span>
        </span>
        <span
          className={`curriculum-section__toggle ${expanded ? "expanded" : ""}`}
        >
          <ChevronDown size={16} />
        </span>
      </button>

      {expanded && (
        <div className="curriculum-section__lessons">
          {lessons.map((lesson, lIdx) => {
            const lessonId = getLessonId(lesson);
            const isActive = lessonId === getLessonId(activeLesson);
            const isCompleted = completedLessonIds.has(lessonId);
            const isUpdating = updatingLessonIds.has(lessonId);
            return (
              <div
                key={lessonId || lIdx}
                className={`curriculum-lesson ${isActive ? "curriculum-lesson--active" : ""} ${isCompleted ? "curriculum-lesson--completed" : ""}`}
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
                    <CheckSquare2 size={18} />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
                <button
                  type="button"
                  className="curriculum-lesson__select"
                  onClick={() => onSelectLesson(lesson)}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="curriculum-lesson__info">
                    <div
                      className="curriculum-lesson__title"
                      title={lesson.title}
                    >
                      {lIdx + 1}. {lesson.title}
                    </div>
                    <div className="curriculum-lesson__meta">
                      <span className="curriculum-lesson__duration">
                        <LessonIcon type={lesson.lessonType} size={12} />
                        {formatDuration(lesson.durationSeconds)}
                      </span>
                      {lesson.isPreview && (
                        <span className="curriculum-lesson__preview-badge">
                          Preview
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LearningWorkspacePage;
