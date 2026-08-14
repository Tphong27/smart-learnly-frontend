import { useContext, useEffect, useRef, useState } from "react";
import { Pencil, Trash2, CheckCircle2, ClipboardList } from "lucide-react";
import {
    Alert,
    Button,
    ConfirmDialog,
    EmptyState,
    IconButton,
    LoadingState,
    useToast,
} from "@/shared/components/ui";
import { StatusBadge } from "@/shared/components/status";
import { courseContentService } from "../services/courseContentService";
import { normalizeLessonStatus } from "@/features/course/utils/lesson-status";
import {
    QUESTION_TYPES,
    QUESTION_TYPE_LABELS,
    validateQuizQuestions,
    sanitizeQuizHtml,
    parseQuizContent,
    serializeQuizContent,
    getOptionMedia,
    getOptionText,
} from "../utils/quiz-question-schema";
import { QuizQuestionEditModal } from "./QuizQuestionEditModal";
import { QuizImportContext } from "./lesson-editor/quiz-import-context";
import { mapCourseQuestionToQuizQuestion } from "../utils/course-question-quiz-import";
import "./quiz-question-manager.css";

/** Render nội dung HTML quiz sau khi đã loại bỏ markup không an toàn. */
function HtmlText({ html }) {
    return (
        <span dangerouslySetInnerHTML={{ __html: sanitizeQuizHtml(html) }} />
    );
}

/** Trả về nhãn ngắn gọn cho loại media đính kèm. */
function mediaLabel(media) {
    if (!media) return "";
    if (media.type === "video") return "Video";
    if (media.type === "audio") return "Audio";
    if (media.type === "image") return "Image";
    return "";
}

/** Chọn class màu theo loại media để card hiển thị nhất quán. */
function mediaChipClass(media) {
    const type = media?.type;
    if (type === "video")
        return "quiz-question-card__media-chip quiz-question-card__media-chip--video";
    if (type === "audio")
        return "quiz-question-card__media-chip quiz-question-card__media-chip--audio";
    return "quiz-question-card__media-chip quiz-question-card__media-chip--image";
}

/** Chuyển vị trí đáp án sang ký hiệu chữ cái A, B, C... */
function optionLetter(index) {
    return String.fromCharCode(65 + index);
}

/** Chuẩn hóa question đã gắn từ test API về shape mà quiz card đang hiển thị. */
function normalizeAttachedQuestion(question) {
    return {
        ...mapCourseQuestionToQuizQuestion(question),
        questionId: question?.questionId || question?.id || null,
        orderIndex: question?.orderIndex ?? 0,
        marks: question?.marks ?? 1,
    };
}

/** Kiểm tra service hiện tại có hỗ trợ CRUD question tách khỏi lesson content hay không. */
function usesAttachedQuestionApi(service) {
    return Boolean(
        service?.getQuestions &&
            service?.attachQuestion &&
            service?.detachQuestion,
    );
}

/** Hiển thị một câu hỏi quiz và chỉ cho sửa nội dung ở flow lesson content cũ. */
function QuizQuestionCard({
    question,
    index,
    onEdit,
    onDelete,
    disabled,
    canEditContent = true,
}) {
    const type = question.type;
    const isChoice =
        type === QUESTION_TYPES.SINGLE || type === QUESTION_TYPES.MULTIPLE;
    const isFill = type === QUESTION_TYPES.FILL;
    const options = Array.isArray(question.options) ? question.options : [];
    const correctSet = new Set(
        Array.isArray(question.correct_answers) ? question.correct_answers : [],
    );
    const optionMediaCount = options.filter((opt) =>
        getOptionMedia(opt),
    ).length;

    return (
        <article className="quiz-question-card">
            <div className="quiz-question-card__header">
                <div className="quiz-question-card__heading">
                    <div className="quiz-question-card__eyebrow">
                        <span>Question {index + 1}</span>
                        <StatusBadge
                            status={type || "unknown"}
                            label={
                                QUESTION_TYPE_LABELS[type] ||
                                type ||
                                "Unknown"
                            }
                            tone="neutral"
                            className="quiz-question-card__type"
                        />
                    </div>
                    {question.title ? (
                        <h3 className="quiz-question-card__title">
                            <HtmlText html={question.title} />
                        </h3>
                    ) : (
                        <h3 className="quiz-question-card__title quiz-question-card__title--empty">
                            Media-only question
                        </h3>
                    )}
                    <div className="quiz-question-card__meta">
                        {question.media && (
                            <span className={mediaChipClass(question.media)}>
                                Question {mediaLabel(question.media)}
                            </span>
                        )}
                        {optionMediaCount > 0 && (
                            <span className="quiz-question-card__media-chip">
                                {optionMediaCount} option media
                            </span>
                        )}
                    </div>
                </div>
                <div className="quiz-question-card__actions">
                    {canEditContent && (
                        <IconButton
                            icon={<Pencil size={18} />}
                            label={`Edit question ${index + 1}`}
                            onClick={() => onEdit(index)}
                            disabled={disabled}
                        />
                    )}
                    <IconButton
                        icon={<Trash2 size={18} />}
                        label={`Delete question ${index + 1}`}
                        variant="danger"
                        onClick={() => onDelete(index)}
                        disabled={disabled}
                    />
                </div>
            </div>

            {isChoice && options.length > 0 && (
                <div className="quiz-question-card__answers">
                    {options.map((option, optIdx) => {
                        const optionNumber = optIdx + 1;
                        const isCorrect = correctSet.has(optionNumber);
                        const optMedia = getOptionMedia(option);
                        const text = getOptionText(option);
                        return (
                            <div
                                key={optIdx}
                                className={`quiz-question-card__answer${isCorrect ? " quiz-question-card__answer--correct" : ""}`}
                            >
                                <span className="quiz-question-card__answer-index">
                                    {optionLetter(optIdx)}
                                </span>
                                <span className="quiz-question-card__answer-text">
                                    {text ? (
                                        <HtmlText html={text} />
                                    ) : (
                                        <em>-</em>
                                    )}
                                    {optMedia && (
                                        <>
                                            {" "}
                                            <span
                                                className={mediaChipClass(
                                                    optMedia,
                                                )}
                                            >
                                                {mediaLabel(optMedia)}
                                            </span>
                                        </>
                                    )}
                                </span>
                                {isCorrect && (
                                    <span className="quiz-question-card__correct">
                                        <CheckCircle2 size={14} /> Correct
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {isFill && (
                <div className="quiz-question-card__answers">
                    {(Array.isArray(question.correct_answers)
                        ? question.correct_answers
                        : []
                    ).map((answer, idx) => (
                        <div
                            key={idx}
                            className="quiz-question-card__answer quiz-question-card__answer--correct"
                        >
                            <span className="quiz-question-card__answer-index">
                                {idx + 1}
                            </span>
                            <span className="quiz-question-card__answer-text">
                                {answer}
                            </span>
                            <span className="quiz-question-card__correct">
                                <CheckCircle2 size={14} /> Accepted
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {question.explain_question && (
                <div className="quiz-question-card__explanation">
                    <strong>Explanation:</strong>{" "}
                    <HtmlText html={question.explain_question} />
                </div>
            )}
        </article>
    );
}

/**
 * Panel quản lý câu hỏi quiz - render inline trong lesson editor.
 * Mỗi thao tác thay đổi câu hỏi được lưu ngay để tránh content local cũ
 * bị nút Save changes của lesson ghi đè.
 */
export function QuizQuestionsPanel({
    lessonId,
    lessonTitle,
    onSaved,
    onBusyChange,
    onQuestionsChange,
    disabled = false,
    service = courseContentService,
}) {
    const toast = useToast();
    const { setBridge, openQuestionList } = useContext(QuizImportContext);

    const [questions, setQuestions] = useState([]);
    const [moduleId, setModuleId] = useState(null);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);

    const [editIndex, setEditIndex] = useState(null); // null = đóng
    const [deleteIndex, setDeleteIndex] = useState(null);

    const attachedQuestionMode = usesAttachedQuestionApi(service);
    const busy = loading || saving;
    const mutationDisabled = disabled || busy;

    useEffect(() => {
        onBusyChange?.(busy);
    }, [busy, onBusyChange]);

    useEffect(() => {
        onQuestionsChange?.(questions.length);
    }, [onQuestionsChange, questions.length]);

    useEffect(
        () => () => {
            onBusyChange?.(false);
            onQuestionsChange?.(0);
        },
        [onBusyChange, onQuestionsChange],
    );

    // Reset bridge khi panel unmount (ví dụ đổi lesson type) để tab Question
    // list không còn giữ dữ liệu/import của quiz cũ.
    useEffect(
        () => () => {
            setBridge({ existingQuestions: [], import: null, moduleId: null });
        },
        [setBridge],
    );

    // Load câu hỏi hiện có khi lessonId đổi; class quiz đọc từ test API riêng.
    useEffect(() => {
        if (!lessonId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setErrors([]);
            try {
                const [response, attachedQuestions] = await Promise.all([
                    service.getLessonDetail(lessonId),
                    attachedQuestionMode
                        ? service.getQuestions(lessonId)
                        : Promise.resolve(null),
                ]);
                const data = response?.data || response;
                const parsed = parseQuizContent(data?.content || "");
                if (!cancelled) {
                    setQuestions(
                        attachedQuestionMode
                            ? (attachedQuestions || []).map(
                                  normalizeAttachedQuestion,
                              )
                            : parsed.questions || [],
                    );
                    setModuleId(
                        data?.moduleId ||
                            data?.courseModuleId ||
                            data?.module?.id ||
                            null,
                    );
                }
            } catch (error) {
                if (!cancelled) {
                    toast.error("Failed to load quiz questions.");
                    console.error("Load quiz error:", error);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [attachedQuestionMode, lessonId, toast, service]);

    /** Kiểm tra và lưu toàn bộ danh sách question của lesson content cũ. */
    const persistQuestions = async (nextQuestions, successMessage) => {
        if (!lessonId || savingRef.current) return false;

        const { valid, errors: validationErrors } =
            validateQuizQuestions(nextQuestions);
        if (!valid) {
            setErrors(validationErrors);
            toast.error("Cannot save: some questions are invalid.");
            return false;
        }

        savingRef.current = true;
        setSaving(true);
        try {
            const detail = await service.getLessonDetail(lessonId);
            const latestLesson = detail?.data || detail;
            const persistedTitle = String(
                latestLesson?.title || lessonTitle || "",
            ).trim();
            const content = serializeQuizContent(persistedTitle, nextQuestions);
            const payload = {
                title: persistedTitle,
                lessonType: "QUIZ",
                content,
                videoUrl: null,
                attachmentUrl: null,
                durationSeconds: Number(latestLesson.durationSeconds || 0),
                isPreview: Boolean(
                    latestLesson.isPreview ?? latestLesson.isPreviewable,
                ),
                status: normalizeLessonStatus(latestLesson.status),
                resources: [],
                sortOrder: latestLesson.sortOrder ?? 0,
            };

            const response = await service.updateLesson(lessonId, payload);
            const responseLesson = response?.data || response;
            const savedLesson = {
                ...latestLesson,
                ...payload,
                ...(responseLesson && typeof responseLesson === "object"
                    ? responseLesson
                    : {}),
                content,
            };

            setQuestions(nextQuestions);
            setErrors([]);
            try {
                await onSaved?.(content, savedLesson);
            } catch (callbackError) {
                console.error("Sync saved quiz state error:", callbackError);
            }
            toast.success(successMessage);
            return true;
        } catch (error) {
            const responseData = error?.response?.data;
            let message = "Failed to save quiz questions.";
            if (responseData?.message) message = responseData.message;
            else if (Array.isArray(responseData?.errors)) {
                message = responseData.errors
                    .map((item) => `${item.field}: ${item.message}`)
                    .join(", ");
            }
            toast.error(message);
            console.error("Save quiz error:", error);
            return false;
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    /** Nhập question bằng API attach của class hoặc fallback vào lesson content cũ. */
    const handleImported = async (importedQuestions, sourceQuestions = []) => {
        if (!attachedQuestionMode) {
            return persistQuestions(
                [...questions, ...importedQuestions],
                `Imported ${importedQuestions.length} question(s).`,
            );
        }

        const sources = sourceQuestions.length
            ? sourceQuestions
            : importedQuestions;
        const missingId = sources.some(
            (question) => !(question?.questionId || question?.id),
        );
        if (missingId) {
            toast.error("Question ID is missing. Please reload the question list.");
            return false;
        }

        savingRef.current = true;
        setSaving(true);
        try {
            for (let index = 0; index < sources.length; index += 1) {
                const question = sources[index];
                await service.attachQuestion(lessonId, {
                    questionId: question.questionId || question.id,
                    orderIndex: questions.length + index,
                    marks: 1,
                });
            }
            const refreshed = await service.getQuestions(lessonId);
            setQuestions((refreshed || []).map(normalizeAttachedQuestion));
            setErrors([]);
            toast.success(`Imported ${sources.length} question(s).`);
            return true;
        } catch (error) {
            toast.error(
                error?.response?.data?.message ||
                    error?.message ||
                    "Questions could not be imported.",
            );
            return false;
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    // Bridge cho tab Question list: đăng ký khi câu hỏi quiz thay đổi để tab
    // đó check trùng và import về đúng quiz này. Giữ handler mới nhất qua ref
    // (cập nhật trong effect) và chỉ setBridge khi `questions` đổi để tránh
    // vòng lặp render.
    const handleImportedRef = useRef(handleImported);
    useEffect(() => {
        handleImportedRef.current = handleImported;
    });

    const lastQuestionsRef = useRef(null);
    useEffect(() => {
        if (lastQuestionsRef.current === questions) return;
        lastQuestionsRef.current = questions;
        setBridge({
            existingQuestions: questions,
            import: handleImportedRef.current,
            moduleId,
        });
    }, [moduleId, questions, setBridge]);

    /** Mở form sửa question khi panel không bận. */
    const openEdit = (index) => {
        if (!mutationDisabled) setEditIndex(index);
    };

    /** Thay question đang sửa và lưu ngay thay đổi. */
    const handleEditSubmit = (question) => {
        const nextQuestions = questions.map((current, index) =>
            index === editIndex ? question : current,
        );
        return persistQuestions(nextQuestions, "Question updated.");
    };

    /** Gỡ question reference khỏi class quiz hoặc xóa khỏi lesson content cũ. */
    const handleConfirmDelete = async () => {
        if (deleteIndex == null) return;
        const question = questions[deleteIndex];

        if (attachedQuestionMode) {
            const questionId = question?.questionId || question?.id;
            if (!questionId) {
                toast.error("Question ID is missing. Please reload the lesson.");
                return;
            }

            savingRef.current = true;
            setSaving(true);
            try {
                await service.detachQuestion(lessonId, questionId);
                setQuestions((current) =>
                    current.filter((item) => item.questionId !== questionId),
                );
                setDeleteIndex(null);
                toast.success("Question removed from this quiz.");
            } catch (error) {
                toast.error(
                    error?.response?.data?.message ||
                        error?.message ||
                        "Question could not be removed.",
                );
            } finally {
                savingRef.current = false;
                setSaving(false);
            }
            return;
        }

        const nextQuestions = questions.filter(
            (_, index) => index !== deleteIndex,
        );
        const saved = await persistQuestions(
            nextQuestions,
            "Question deleted.",
        );
        if (saved) setDeleteIndex(null);
    };

    return (
        <div className="quiz-question-panel">
            <section
                className="quiz-question-panel__workspace"
                aria-labelledby="quiz-questions-heading"
            >
                <div className="quiz-question-panel__header">
                    <div className="quiz-question-panel__heading">
                        <h2 id="quiz-questions-heading">Questions</h2>
                        <p
                            className="quiz-question-panel__count"
                            aria-live="polite"
                        >
                            {questions.length}{" "}
                            {questions.length === 1 ? "question" : "questions"}
                        </p>
                    </div>
                    <div className="quiz-question-panel__actions">
                        <Button
                            type="button"
                            variant="secondary"
                            leftIcon={<ClipboardList size={18} />}
                            onClick={openQuestionList}
                            disabled={mutationDisabled}
                            title="Open question list to import"
                        >
                            Import from question list
                        </Button>
                    </div>
                </div>

                <div className="quiz-question-panel__content">
                    {loading ? (
                        <LoadingState label="Loading quiz questions..." />
                    ) : (
                        <>
                            {errors.length > 0 && (
                                <Alert
                                    tone="danger"
                                    title="Questions need attention"
                                >
                                    <ul className="quiz-question-panel__errors">
                                        {errors.map((err, i) => (
                                            <li key={i}>{err.message}</li>
                                        ))}
                                    </ul>
                                </Alert>
                            )}

                            {questions.length === 0 ? (
                                <EmptyState
                                    title="No questions yet"
                                    description="Import questions from this module's question list to build the quiz."
                                />
                            ) : (
                                <div className="quiz-question-card-list">
                                    {questions.map((question, idx) => (
                                        <QuizQuestionCard
                                            key={idx}
                                            question={question}
                                            index={idx}
                                            onEdit={openEdit}
                                            onDelete={setDeleteIndex}
                                            disabled={mutationDisabled}
                                            canEditContent={
                                                !attachedQuestionMode
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            <QuizQuestionEditModal
                key={editIndex == null ? "closed" : `edit-${editIndex}`}
                open={editIndex != null}
                question={editIndex != null ? questions[editIndex] : null}
                onClose={() => setEditIndex(null)}
                onSubmit={handleEditSubmit}
            />

            <ConfirmDialog
                open={deleteIndex != null}
                title="Delete question"
                description={
                    deleteIndex == null
                        ? ""
                        : `Question ${deleteIndex + 1} will be permanently removed from this quiz.`
                }
                onClose={() => setDeleteIndex(null)}
                confirmLabel="Delete question"
                cancelLabel="Cancel"
                tone="danger"
                loading={saving}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
