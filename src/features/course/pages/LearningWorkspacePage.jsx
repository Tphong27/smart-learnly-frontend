import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    PlayCircle,
    FileText,
    HelpCircle,
    Clock,
    Menu,
    X,
} from "lucide-react";
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

export function LearningWorkspacePage({ previewMode = false }) {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const result = previewMode
                    ? await learningService.getPreviewContent(courseId)
                    : await learningService.getLearningContent(courseId);
                if (cancelled) return;
                setData(result);
            } catch (err) {
                if (cancelled) return;
                const msg = err?.message || "Failed to load course content";
                setError(msg);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        if (courseId) load();
        return () => {
            cancelled = true;
        };
    }, [courseId, previewMode]);

    const sections = useMemo(() => groupLessonsBySection(data), [data]);

    const allLessons = useMemo(() => {
        return sections.flatMap((s) => s.lessons || []);
    }, [sections]);

    const [activeLesson, setActiveLesson] = useState(null);

    useEffect(() => {
        if (allLessons.length > 0 && !activeLesson) {
            setActiveLesson(allLessons[0]);
        }
    }, [allLessons, activeLesson]);

    const currentIndex = useMemo(() => {
        return allLessons.findIndex(
            (l) => l.lessonId === activeLesson?.lessonId,
        );
    }, [allLessons, activeLesson]);

    const goToPrev = () => {
        if (currentIndex > 0) {
            setActiveLesson(allLessons[currentIndex - 1]);
        }
    };

    const goToNext = () => {
        if (currentIndex < allLessons.length - 1) {
            setActiveLesson(allLessons[currentIndex + 1]);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "ArrowLeft") goToPrev();
            if (e.key === "ArrowRight") goToNext();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentIndex, allLessons]);

    const renderLessonContent = (lesson) => {
        if (!lesson) return null;
        const type = (lesson.lessonType || "").toLowerCase();

        return (
            <div className="learning-lesson">
                <header className="learning-lesson__header">
                    <h1 className="learning-lesson__title">{lesson.title}</h1>
                    <div className="learning-lesson__meta">
                        <span className="learning-lesson__type-badge">
                            {lesson.lessonType}
                        </span>
                        <span className="learning-lesson__meta-item">
                            <Clock size={14} />
                            {formatDuration(lesson.durationSeconds)}
                        </span>
                    </div>
                </header>

                {type.includes("video") && lesson.videoUrl && (
                    <div className="learning-lesson__video-container">
                        <video controls src={lesson.videoUrl} />
                    </div>
                )}

                {lesson.content && (
                    <div className="learning-lesson__content">
                        {lesson.content.split("\n").map((line, idx) => (
                            <p key={idx}>{line}</p>
                        ))}
                    </div>
                )}

                {type.includes("quiz") && lesson.content && (
                    <div className="learning-quiz">
                        <QuizDisplay content={lesson.content} />
                    </div>
                )}

                {lesson.attachmentUrl && (
                    <a
                        className="learning-lesson__attachment"
                        href={lesson.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FileText size={18} />
                        Download Attachment
                    </a>
                )}

                {lesson.resources && lesson.resources.length > 0 && (
                    <div className="learning-lesson__resources">
                        <h4 className="learning-lesson__resources-title">
                            Resources
                        </h4>
                        <div className="learning-lesson__resources-list">
                            {lesson.resources.map((r, idx) => (
                                <a
                                    key={idx}
                                    className="learning-lesson__resource"
                                    href={r.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <FileText size={14} />
                                    {r.name || "Resource"}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="learning-workspace">
                <div className="learning-workspace__loading">
                    Loading course content...
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
                    <span>Preview mode - You are viewing sample content</span>
                    {!previewMode && (
                        <Link
                            to={`/courses/${courseId}`}
                            className="learning-workspace__preview-cta"
                        >
                            View Course Details
                        </Link>
                    )}
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
                                previewMode
                                    ? `/courses/${courseId}`
                                    : "/learning/courses",
                            )
                        }
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <h2 className="learning-workspace__sidebar-title">
                        {courseTitle}
                    </h2>
                    <button
                        className="learning-workspace__sidebar-back"
                        onClick={() => setSidebarOpen(false)}
                        style={{ marginLeft: "auto" }}
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
                                onSelectLesson={setActiveLesson}
                            />
                        </div>
                    ))}
                </div>
            </aside>

            <main className="learning-workspace__main">
                {!sidebarOpen && (
                    <button
                        onClick={() => setSidebarOpen(true)}
                        style={{
                            position: "absolute",
                            top: 12,
                            left: 12,
                            zIndex: 50,
                            background: "#313244",
                            border: "none",
                            borderRadius: 8,
                            padding: "8px 12px",
                            color: "#cdd6f4",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <Menu size={18} />
                    </button>
                )}

                <div className="learning-workspace__content">
                    {activeLesson ? (
                        renderLessonContent(activeLesson)
                    ) : (
                        <div
                            style={{
                                textAlign: "center",
                                color: "#6c7086",
                                padding: "48px",
                            }}
                        >
                            Select a lesson from the sidebar to begin
                        </div>
                    )}
                </div>

                <nav className="learning-workspace__nav">
                    <button
                        className="learning-workspace__nav-btn learning-workspace__nav-btn--prev"
                        onClick={goToPrev}
                        disabled={currentIndex <= 0}
                    >
                        <ArrowLeft size={16} />
                        Previous
                    </button>
                    <span style={{ color: "#6c7086", fontSize: 13 }}>
                        {currentIndex + 1} / {allLessons.length}
                    </span>
                    <button
                        className="learning-workspace__nav-btn learning-workspace__nav-btn--next"
                        onClick={goToNext}
                        disabled={currentIndex >= allLessons.length - 1}
                    >
                        Next
                        <ArrowRight size={16} />
                    </button>
                </nav>
            </main>
        </div>
    );
}

function SectionAccordion({ section, sIdx, activeLesson, onSelectLesson }) {
    const [expanded, setExpanded] = useState(true);
    const lessons = section.lessons || [];

    return (
        <div className="curriculum-section">
            <div
                className="curriculum-section__header"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="curriculum-section__title">
                    <span>
                        Section {sIdx + 1}: {section.title}
                    </span>
                </span>
                <span
                    className={`curriculum-section__toggle ${expanded ? "expanded" : ""}`}
                >
                    &#9660;
                </span>
            </div>

            {expanded && (
                <div className="curriculum-section__lessons">
                    {lessons.map((lesson, lIdx) => {
                        const isActive =
                            lesson.lessonId === activeLesson?.lessonId;
                        const type = (lesson.lessonType || "").toLowerCase();
                        return (
                            <div
                                key={lesson.lessonId || lIdx}
                                className={`curriculum-lesson ${isActive ? "curriculum-lesson--active" : ""}`}
                                onClick={() => onSelectLesson(lesson)}
                            >
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

function QuizDisplay({ content }) {
    let quizData = null;
    try {
        quizData = JSON.parse(content);
    } catch {
        return <p>{content}</p>;
    }

    if (!quizData || !quizData.questions) {
        return <p>{content}</p>;
    }

    return (
        <div>
            {quizData.title && (
                <h3 style={{ margin: "0 0 16px", color: "#cdd6f4" }}>
                    {quizData.title}
                </h3>
            )}
            {quizData.questions.map((q, qIdx) => (
                <div key={qIdx} className="learning-quiz__question">
                    <p className="learning-quiz__question-text">
                        {qIdx + 1}. {q.question}
                    </p>
                    {q.options && Array.isArray(q.options) && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                            }}
                        >
                            {q.options.map((opt, oIdx) => (
                                <div
                                    key={oIdx}
                                    style={{
                                        padding: "10px 14px",
                                        background: "#11111b",
                                        borderRadius: 8,
                                        border: `2px solid ${q.correctIndex === oIdx ? "#a6e3a1" : "#313244"}`,
                                        color: "#bac2de",
                                        fontSize: 14,
                                    }}
                                >
                                    {opt}
                                    {q.correctIndex === oIdx && (
                                        <span
                                            style={{
                                                color: "#a6e3a1",
                                                marginLeft: 8,
                                                fontSize: 12,
                                            }}
                                        >
                                            (Correct)
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {q.explanation && (
                        <div
                            style={{
                                marginTop: 12,
                                padding: 12,
                                background: "#1e3a2f",
                                borderRadius: 8,
                                fontSize: 13,
                                color: "#a6e3a1",
                            }}
                        >
                            <strong>Explanation:</strong> {q.explanation}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default LearningWorkspacePage;
