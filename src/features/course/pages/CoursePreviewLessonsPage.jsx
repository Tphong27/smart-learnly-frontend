import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { isHtmlContent } from "../utils/lesson-content";
import {
    ArrowLeft,
    BookOpen,
    Clock3,
    FileText,
    Layers,
    PlayCircle,
} from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";
import { learningService } from "@/services";
import { LearningLessonMedia } from "../components/LearningLessonMedia";
import { isLessonPublished } from "../utils/lesson-status";
import "../../admin/admin-shared.css";
import "./CoursePreviewLessonsPage.css";

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs}s`;
}

function groupBySection(lessons) {
    const map = new Map();
    for (const lesson of lessons) {
        const key = lesson.sectionId || "no-section";
        if (!map.has(key)) {
            map.set(key, {
                sectionId: lesson.sectionId,
                sortOrder: lesson.sectionSortOrder ?? 0,
                lessons: [],
            });
        }
        map.get(key).lessons.push(lesson);
    }
    const sections = Array.from(map.values()).sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    for (const section of sections) {
        section.lessons.sort(
            (a, b) => (a.lessonSortOrder ?? 0) - (b.lessonSortOrder ?? 0),
        );
    }
    return sections;
}

function LessonIcon({ type }) {
    const t = (type || "").toLowerCase();
    if (t.includes("video")) return <PlayCircle size={18} />;
    if (t.includes("quiz") || t.includes("test")) return <FileText size={18} />;
    if (t.includes("flashcard")) return <Layers size={18} />;
    return <BookOpen size={18} />;
}

function LessonContent({ lesson }) {
    if (!lesson) return null;
    const type = (lesson.lessonType || "").toLowerCase();

    return (
        <div className="preview-lesson-content">
            <header className="preview-lesson-content__head">
                <div className="preview-lesson-content__icon">
                    <LessonIcon type={lesson.lessonType} />
                </div>
                <div>
                    <h2 className="preview-lesson-content__title">
                        {lesson.title}
                    </h2>
                    <div className="preview-lesson-content__meta">
                        <span>
                            <Clock3 size={13} />{" "}
                            {formatDuration(lesson.durationSeconds)}
                        </span>
                        {lesson.lessonType && (
                            <span className="preview-chip">
                                {lesson.lessonType}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {type.includes("video") && <LearningLessonMedia lesson={lesson} />}

            {lesson.content &&
                (isHtmlContent(lesson.content) ? (
                    <div
                        className="preview-lesson-content__body preview-lesson-content__rich-content"
                        dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(lesson.content, {
                                ADD_ATTR: [
                                    "target",
                                    "rel",
                                    "class",
                                    "controls",
                                    "preload",
                                    "poster",
                                    "width",
                                    "height",
                                    "type",
                                    "data-summary-video",
                                ],
                            }),
                        }}
                    />
                ) : (
                    <div className="preview-lesson-content__body preview-lesson-content__rich-content">
                        {lesson.content
                            .split("\n")
                            .map((line, idx) =>
                                line.trim() ? (
                                    <p key={idx}>{line}</p>
                                ) : (
                                    <br key={idx} />
                                ),
                            )}
                    </div>
                ))}

            {lesson.attachmentUrl && (
                <a
                    className="preview-lesson-content__attachment"
                    href={lesson.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <FileText size={16} /> Download attached material
                </a>
            )}
        </div>
    );
}

export function CoursePreviewLessonsPage() {
    const { courseId } = useParams();
    const toast = useToast();

    const [lessons, setLessons] = useState([]);
    const [course, setCourse] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const data = await learningService.getPreviewContent(courseId);
                if (cancelled) return;
                setCourse(
                    data
                        ? {
                              id: data.courseId || courseId,
                              title: data.courseTitle || "",
                          }
                        : null,
                );
                const allLessons =
                    data?.sections?.flatMap((section) =>
                        (section.lessons || [])
                            .filter((lesson) =>
                                isLessonPublished(lesson, {
                                    allowMissingStatus: false,
                                }),
                            )
                            .map((lesson) => ({
                            ...lesson,
                            sectionId: lesson.sectionId ?? section.sectionId,
                            sectionTitle: lesson.sectionTitle ?? section.title,
                            sectionSortOrder:
                                lesson.sectionSortOrder ??
                                section.sortOrder ??
                                0,
                            lessonSortOrder:
                                lesson.lessonSortOrder ?? lesson.sortOrder ?? 0,
                        })),
                    ) || [];
                setLessons(allLessons);
                if (allLessons.length > 0) {
                    setActiveId(allLessons[0].lessonId);
                }
            } catch (err) {
                if (cancelled) return;
                const message =
                    err?.message ||
                    "Could not load preview content for this course.";
                setError(message);
                toast.error(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        if (courseId) load();
        return () => {
            cancelled = true;
        };
    }, [courseId, toast]);

    const sections = useMemo(() => groupBySection(lessons), [lessons]);
    const activeLesson = useMemo(
        () => lessons.find((l) => l.lessonId === activeId) || lessons[0],
        [lessons, activeId],
    );

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<ArrowLeft size={14} />}
                        onClick={() => window.history.back()}
                    >
                        Back
                    </Button>
                    <h1 className="admin-page__title" style={{ marginTop: 8 }}>
                        Preview sample content
                    </h1>
                </div>
                {course && (
                    <Link
                        to={`/courses/${course.id}`}
                        className="button button--secondary button--sm"
                    >
                        Open course page
                    </Link>
                )}
            </header>

            {loading ? (
                <div className="admin-loading">Loading preview content...</div>
            ) : error ? (
                <div className="admin-error">{error}</div>
            ) : lessons.length === 0 ? (
                <div className="admin-empty">
                    This course does not have any preview lessons yet. Mark
                    lessons as preview from the content management section.
                </div>
            ) : (
                <div className="preview-layout">
                    <aside className="preview-layout__sidebar">
                        {sections.map((section) => (
                            <div
                                key={section.sectionId || "no-section"}
                                className="preview-section"
                            >
                                <div className="preview-section__header">
                                    Section{" "}
                                    {section.sortOrder ? section.sortOrder : ""}
                                </div>
                                <ul className="preview-section__list">
                                    {section.lessons.map((lesson) => {
                                        const isActive =
                                            lesson.lessonId ===
                                            activeLesson?.lessonId;
                                        return (
                                            <li key={lesson.lessonId}>
                                                <button
                                                    type="button"
                                                    className={
                                                        "preview-section__item" +
                                                        (isActive
                                                            ? " preview-section__item--active"
                                                            : "")
                                                    }
                                                    onClick={() =>
                                                        setActiveId(
                                                            lesson.lessonId,
                                                        )
                                                    }
                                                >
                                                    <span className="preview-section__icon">
                                                        <LessonIcon
                                                            type={
                                                                lesson.lessonType
                                                            }
                                                        />
                                                    </span>
                                                    <span className="preview-section__copy">
                                                        <span className="preview-section__title">
                                                            {lesson.title}
                                                        </span>
                                                        <small>
                                                            {formatDuration(
                                                                lesson.durationSeconds,
                                                            )}
                                                        </small>
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </aside>

                    <section className="preview-layout__main">
                        <LessonContent lesson={activeLesson} />
                    </section>
                </div>
            )}
        </div>
    );
}
