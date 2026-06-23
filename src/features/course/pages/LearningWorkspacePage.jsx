import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
} from "lucide-react";
import { LearningLessonMedia } from "@/features/course/components/LearningLessonMedia";
import { LearningLessonTabs } from "@/features/course/components/LearningLessonTabs";
import { learningService } from "@/services";
import "./LearningWorkspacePage.css";

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs}s`;
}

function LessonIcon({ type, size = 16 }) {
    const t = (type || "").toLowerCase();
    if (t.includes("video")) return <PlayCircle size={size} />;
    if (t.includes("quiz")) return <HelpCircle size={size} />;
    return <FileText size={size} />;
}

function groupLessonsBySection(data) {
    return data?.sections || [];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LearningWorkspacePage({
    previewMode = false,
    mode = "student",
}) {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeLessonTab, setActiveLessonTab] = useState("overview");
    const [completedLessonIds, setCompletedLessonIds] = useState(() => new Set());
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
                    result =
                        await learningService.getAdminPreviewContent(courseId);
                } else {
                    result = await learningService.getLearningContent(courseId);
                }
                if (!cancelled) setData(result);
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

    const [activeLessonId, setActiveLessonId] = useState(null);

    const handleSelectLesson = useCallback((lesson) => {
        setActiveLessonId(lesson?.lessonId ?? null);
        setActiveLessonTab("overview");
    }, []);

    const activeLesson = useMemo(() => {
        if (allLessons.length === 0) return null;
        return (
            allLessons.find((lesson) => lesson.lessonId === activeLessonId) ||
            allLessons[0]
        );
    }, [allLessons, activeLessonId]);

    const currentIndex = useMemo(
        () =>
            allLessons.findIndex(
                (lesson) => lesson.lessonId === activeLesson?.lessonId,
            ),
        [activeLesson?.lessonId, allLessons],
    );

    const nextLesson = useMemo(() => {
        if (currentIndex < 0 || currentIndex >= allLessons.length - 1) {
            return null;
        }
        return allLessons[currentIndex + 1];
    }, [allLessons, currentIndex]);

    const handleGoToNextLesson = useCallback(() => {
        if (!nextLesson) return;
        handleSelectLesson(nextLesson);
    }, [handleSelectLesson, nextLesson]);

    const toggleLessonCompleted = useCallback((lessonId) => {
        if (!lessonId) return;
        setCompletedLessonIds((currentIds) => {
            const nextIds = new Set(currentIds);
            if (nextIds.has(lessonId)) {
                nextIds.delete(lessonId);
            } else {
                nextIds.add(lessonId);
            }
            return nextIds;
        });
    }, []);

    const activeLessonIdForNote = activeLesson?.lessonId;
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
                    <span className="learning-workspace__error-msg">
                        {error}
                    </span>
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

    return (
        <div className="learning-workspace">
            {previewMode && (
                <div className="learning-workspace__preview-banner">
                    <span>Preview mode — You are viewing sample content</span>
                    <Link
                        to={`/courses/${courseId}`}
                        className="learning-workspace__preview-cta"
                    >
                        View Course Details
                    </Link>
                </div>
            )}

            <aside
                className={`learning-workspace__sidebar ${sidebarOpen ? "open" : ""}`}
            >
                <div className="learning-workspace__sidebar-header">
                    <button
                        className="learning-workspace__sidebar-back"
                        onClick={() =>
                            navigate(
                                mode === "admin-preview"
                                    ? `/admin/courses/${courseId}/content`
                                    : previewMode
                                      ? `/courses/${courseId}`
                                      : "/learning/courses",
                            )
                        }
                        title="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <h2
                        className="learning-workspace__sidebar-title"
                        title={courseTitle}
                    >
                        {courseTitle}
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
                                key={`media-${activeLesson.lessonId}`}
                                lesson={activeLesson}
                            />

                            <LearningLessonTabs
                                key={`tabs-${activeLesson.lessonId}`}
                                lesson={activeLesson}
                                activeTab={activeLessonTab}
                                onTabChange={setActiveLessonTab}
                                note={activeLessonNote}
                                onNoteChange={handleActiveLessonNoteChange}
                                nextLesson={nextLesson}
                                onNextLesson={handleGoToNextLesson}
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
    );
}

// ─── Section Accordion ───────────────────────────────────────────────────────

function SectionAccordion({
    section,
    sIdx,
    activeLesson,
    onSelectLesson,
    completedLessonIds,
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
                        const isActive =
                            lesson.lessonId === activeLesson?.lessonId;
                        const isCompleted = completedLessonIds.has(
                            lesson.lessonId,
                        );
                        const type = (lesson.lessonType || "").toLowerCase();
                        return (
                            <div
                                key={lesson.lessonId || lIdx}
                                className={`curriculum-lesson ${isActive ? "curriculum-lesson--active" : ""} ${isCompleted ? "curriculum-lesson--completed" : ""}`}
                                onClick={() => onSelectLesson(lesson)}
                            >
                                <button
                                    type="button"
                                    className="curriculum-lesson__complete"
                                    aria-label={
                                        isCompleted
                                            ? "Mark lesson as incomplete"
                                            : "Mark lesson as complete"
                                    }
                                    title={
                                        isCompleted
                                            ? "Completed"
                                            : "Mark as complete"
                                    }
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onToggleLessonComplete(lesson.lessonId);
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
                                    <LessonIcon
                                        type={lesson.lessonType}
                                        size={14}
                                    />
                                </div>
                                <div className="curriculum-lesson__info">
                                    <div className="curriculum-lesson__title">
                                        {sIdx + 1}.{lIdx + 1}. {lesson.title}
                                    </div>
                                    <div className="curriculum-lesson__meta">
                                        <span className="curriculum-lesson__duration">
                                            {formatDuration(
                                                lesson.durationSeconds,
                                            )}
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
