import React, { useState, useEffect, useCallback } from "react";
import {
    useLocation,
    useParams,
    useNavigate,
} from "react-router-dom";
import { Eye, HelpCircle, History } from "lucide-react";
import { courseContentService } from "../services/courseContentService";
import { flashcardAuthoringService as flashcardService } from "@/features/flashcard";
import { useToast } from "../../../shared/components/ui/Toast/useToast";
import { CurriculumAuthoringLayout } from "../components/CurriculumAuthoringLayout";
import { CurriculumStructureEditor } from "../components/CurriculumStructureEditor";
import { getCurrentUser } from "@/services/api-client";
import "../course-admin.css";

/** Lấy thông báo API dễ hiểu và dùng fallback khi backend không trả message. */
function getApiErrorMessage(error, fallback) {
    return error?.message || error?.response?.data?.message || fallback;
}

/** Điều phối màn curriculum và mở Lesson Editor ngay sau khi tạo draft mới. */
export default function AdminCourseContentPage() {
    const params = useParams();
    const courseId = params.courseId || params.id;
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast: emitToast } = useToast();
    const isStaffRoute = location.pathname.startsWith("/staff/");
    const courseBasePath = isStaffRoute ? "/staff/courses" : "/admin/courses";
    const currentRole = String(getCurrentUser()?.role || "").toLowerCase();
    // Timeline change-history chỉ TMO/SME — ẩn CTA với Trainer (admin content route vẫn cho TRAINER).
    const canViewChangeHistory =
        currentRole === "tmo" || currentRole === "sme";

    const courseListPath = courseBasePath;

    const courseContentPath = `${courseBasePath}/${courseId}/content`;
    const coursePreviewPath = `${courseBasePath}/${courseId}/preview`;
    const courseQuestionsPath = `${courseBasePath}/${courseId}/questions`;
    const courseHistoryPath = `${courseBasePath}/${courseId}/history`;
    const lessonBasePath = `${courseBasePath}/${courseId}/lessons`;
    /** Chuẩn hóa cả hai cách gọi toast đang tồn tại trong feature course. */
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

    /** Tải curriculum và đồng bộ lesson đã được nhúng sẵn theo từng module. */
    const fetchSections = useCallback(async () => {
        setLoadingSections(true);
        setLoadError("");
        try {
            const data = await courseContentService.getCourseContent(courseId);
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
            const message = getApiErrorMessage(
                error,
                "Could not load course content.",
            );
            setLoadError(message);
            showToast({
                type: "error",
                message,
            });
        } finally {
            setLoadingSections(false);
        }
    }, [courseId, showToast]);

    /** Tải lesson của một module khi response curriculum chưa chứa danh sách này. */
    const fetchLessonsForSection = useCallback(async (sectionId) => {
        setLoadingLessons((prev) => ({ ...prev, [sectionId]: true }));
        try {
            const data = await courseContentService.getLessonsBySection(sectionId);
            setSectionLessons((prev) => ({
                ...prev,
                [sectionId]: Array.isArray(data) ? data : [],
            }));
        } catch (err) {
            console.error(
                "Error fetching lessons for section " + sectionId,
                err,
            );
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

    /** Tạo module rồi làm mới curriculum. */
    const handleCreateSection = async ({ title }) => {
        try {
            await courseContentService.createSection(courseId, {
                title,
            });
            showToast({
                type: "success",
                message: "Section added successfully!",
            });
            fetchSections();
            return true;
        } catch (error) {
            showToast({
                type: "error",
                message: getApiErrorMessage(
                    error,
                    "Could not create section.",
                ),
            });
            return false;
        }
    };

    /** Cập nhật tên module rồi làm mới curriculum. */
    const handleUpdateSection = async (sectionId, { title }) => {
        try {
            await courseContentService.updateSection(sectionId, {
                title,
            });
            showToast({
                type: "success",
                message: "Section updated successfully!",
            });
            fetchSections();
            return true;
        } catch {
            showToast({ type: "error", message: "Error updating section" });
            return false;
        }
    };

    /** Xóa module theo kiểu optimistic và cung cấp thao tác hoàn tác bằng tạo lại. */
    const handleDeleteSection = async (sectionId, sectionTitle) => {
        const previousSections = sections;
        const target = sections.find((s) => s.id === sectionId);
        if (!target) return;

        // Optimistic remove — rollback if delete fails
        setSections((current) => current.filter((s) => s.id !== sectionId));

        try {
            await courseContentService.deleteSection(sectionId);
            showToast({
                type: "success",
                message: `Section “${sectionTitle}” deleted.`,
                duration: 5000,
                action: {
                    label: "Undo",
                    onClick: async () => {
                        try {
                            await courseContentService.createSection(courseId, {
                                title: target.title,
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
                                message: getApiErrorMessage(
                                    restoreErr,
                                    "Could not restore the section.",
                                ),
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
                message: getApiErrorMessage(
                    error,
                    "Could not delete section.",
                ),
            });
        }
    };

    /** Lưu thứ tự module mới và khôi phục dữ liệu server nếu request thất bại. */
    const handleReorderSections = async (orderedIds) => {
        const reordered = orderedIds
            .map((id) => sections.find((s) => s.id === id))
            .filter(Boolean)
            .map((section, index) => ({ ...section, sortOrder: index }));
        setSections(reordered);

        try {
            await courseContentService.reorderSections(courseId, orderedIds);
            showToast({ type: "success", message: "Sections reordered." });
        } catch (error) {
            showToast({
                type: "error",
                message: getApiErrorMessage(
                    error,
                    "Could not reorder sections.",
                ),
            });
            fetchSections();
        }
    };

    /** Tạo lesson draft và mở editor bằng ID thật do backend trả về. */
    const handleCreateLesson = async (sectionId, payload) => {
        try {
            let mappedType = String(payload.lessonType).toLowerCase();
            if (mappedType === "document") mappedType = "pdf";

            if (mappedType === "flashcard") {
                const durationSeconds = Number.isFinite(Number(payload.durationSeconds))
                    ? Math.max(0, Math.round(Number(payload.durationSeconds)))
                    : 0;
                const createdLesson = await flashcardService.createLesson(
                    courseId,
                    sectionId,
                    {
                        title: payload.title,
                        description: "",
                        isPreview: !!payload.isPreview,
                        status: payload.status || "draft",
                        durationSeconds,
                        sortOrder: 0,
                    },
                );

                if (createdLesson?.lessonId && createdLesson?.setId) {
                    sessionStorage.setItem(
                        `flashcard-set:${createdLesson.lessonId}`,
                        createdLesson.setId,
                    );
                }

                fetchLessonsForSection(sectionId);

                if (createdLesson?.lessonId) {
                    navigate(`${lessonBasePath}/${createdLesson.lessonId}`, {
                        state: {
                            flashcardSetId: createdLesson.setId,
                            isNewLesson: true,
                        },
                    });
                }
                return true;
            }

            const createdLesson = await courseContentService.createLesson(sectionId, {
                title: payload.title,
                lessonType: mappedType,
                isPreview: !!payload.isPreview,
                status: "draft",
                durationSeconds: 0,
                sortOrder: 0,
            });

            const createdLessonId = createdLesson?.id || createdLesson?.lessonId;
            if (!createdLessonId) {
                throw new Error("Created lesson ID was not returned.");
            }

            fetchLessonsForSection(sectionId);
            navigate(`${lessonBasePath}/${createdLessonId}`, {
                state: { isNewLesson: true },
            });
            return true;
        } catch (error) {
            showToast({
                type: "error",
                message: getApiErrorMessage(
                    error,
                    "Could not create lesson.",
                ),
            });
            return false;
        }
    };

    /** Xóa lesson thường hoặc flashcard set tương ứng rồi cập nhật danh sách tại chỗ. */
    const handleDeleteLesson = async (lessonId, lessonTitle, lesson = null) => {
        try {
            const isFlashcard =
                String(lesson?.lessonType || "").toLowerCase() === "flashcard";

            if (isFlashcard) {
                const flashcardSet =
                    await flashcardService.getAdminSetByLesson(lessonId);
                await flashcardService.deleteSet(flashcardSet.id);
            } else {
                await courseContentService.deleteLesson(lessonId);
            }

            showToast({
                type: "success",
                message: `Lesson “${lessonTitle}” deleted.`,
            });
            setSectionLessons((prev) => {
                const updated = { ...prev };
                for (const key of Object.keys(updated)) {
                    updated[key] = updated[key].filter(
                        (l) => l.id !== lessonId,
                    );
                }
                return updated;
            });
        } catch (error) {
            showToast({
                type: "error",
                message: getApiErrorMessage(
                    error,
                    "Could not delete lesson.",
                ),
            });
        }
    };

    /** Lưu thứ tự lesson mới trong module và đồng bộ lại khi API lỗi. */
    const handleReorderLessons = async (sectionId, orderedIds) => {
        const currentLessons = sectionLessons[sectionId] || [];
        const nextLessons = orderedIds
            .map((id) => currentLessons.find((l) => l.id === id))
            .filter(Boolean)
            .map((lesson, index) => ({ ...lesson, sortOrder: index }));
        setSectionLessons((prev) => ({ ...prev, [sectionId]: nextLessons }));

        try {
            await courseContentService.reorderLessons(sectionId, orderedIds);
            showToast({ type: "success", message: "Lessons reordered." });
        } catch (error) {
            showToast({
                type: "error",
                message: getApiErrorMessage(
                    error,
                    "Could not reorder lessons.",
                ),
            });
            fetchLessonsForSection(sectionId);
        }
    };

    /** Mở Lesson Editor cho lesson đã tồn tại. */
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

    return (
        <CurriculumAuthoringLayout
            loading={loadingSections}
            error={loadError}
            backLabel="Back to courses"
            onBack={() => navigate(courseListPath)}
            onRetry={fetchSections}
            headerActions={
                <>
                    <button
                        type="button"
                        className="sl-cm-btn sl-cm-btn--secondary"
                        onClick={() => navigate(courseQuestionsPath)}
                    >
                        <HelpCircle size={16} aria-hidden="true" /> All questions
                    </button>
                    {canViewChangeHistory && (
                        <button
                            type="button"
                            className="sl-cm-btn sl-cm-btn--secondary"
                            onClick={() => navigate(courseHistoryPath)}
                        >
                            <History size={16} aria-hidden="true" /> Change history
                        </button>
                    )}
                    <a
                        className="sl-cm-btn sl-cm-btn--secondary"
                        href={`${coursePreviewPath}?returnTo=${encodeURIComponent(courseContentPath)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Eye size={16} aria-hidden="true" /> Preview as learner
                    </a>
                </>
            }
        >
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
                openLessonEditorOnCreate
                onDeleteLesson={handleDeleteLesson}
                onReorderLessons={handleReorderLessons}
                onEditLesson={handleEditLesson}
                enableFlashcardCreateFields
            />
        </CurriculumAuthoringLayout>
    );
}
