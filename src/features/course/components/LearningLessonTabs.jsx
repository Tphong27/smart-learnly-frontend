import { useEffect, useRef, useState } from "react";
import {
    AlertCircle,
    ArrowRight,
    Award,
    BookOpen,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Download,
    File,
    FileText,
    FolderOpen,
    Loader2,
    RefreshCw,
    UploadCloud,
    X,
} from "lucide-react";
import { fileNameFromUrl, isHtmlContent } from "../utils/lesson-content";
import { assignmentService } from "@/features/assignment";
import { attemptService } from "@/features/test/services/attemptService";
import { FlashcardPractice } from "./flashcards/FlashcardPractice";
import { getCurrentUser } from "@/services/api-client";
import DOMPurify from "dompurify";

const TABS = [
    { key: "overview", label: "Overview", icon: BookOpen },
    { key: "resources", label: "Resources", icon: FolderOpen },
];

function getLessonId(lesson) {
    return lesson?.lessonId ?? lesson?.id ?? null;
}

function numberOrNull(value) {
    if (value == null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function isFinalAttempt(status) {
    return ["SUBMITTED", "GRADED", "EXPIRED", "TIMEOUT"].includes(
        String(status || "").toUpperCase(),
    );
}

function formatQuizScore(attempt) {
    const percentage = numberOrNull(attempt?.percentage);
    const rawScore = numberOrNull(attempt?.score);
    const totalQuestions = numberOrNull(attempt?.totalQuestions);
    if (percentage != null) {
        return {
            score: Number.isInteger(percentage / 10)
                ? String(percentage / 10)
                : (percentage / 10).toFixed(1),
            percentage: Math.round(percentage),
        };
    }
    if (rawScore != null && totalQuestions) {
        const computedPercentage = (rawScore / totalQuestions) * 100;
        return {
            score: Number.isInteger(computedPercentage / 10)
                ? String(computedPercentage / 10)
                : (computedPercentage / 10).toFixed(1),
            percentage: Math.round(computedPercentage),
        };
    }
    return { score: rawScore ?? "--", percentage: null };
}

const ASSIGNMENT_FILE_TYPES = [
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".png",
    ".jpg",
    ".jpeg",
    ".zip",
];

function QuizLessonLaunch({ lesson, classId, onQuizCompleted, onQuizStart }) {
    const [latestAttempt, setLatestAttempt] = useState(null);
    const [loadingResult, setLoadingResult] = useState(false);
    const testId = lesson?.testId || lesson?.test_id;
    const lessonId = getLessonId(lesson);

    useEffect(() => {
        let cancelled = false;
        async function loadQuizResult() {
            if (!testId) {
                setLatestAttempt(null);
                return;
            }
            const currentUser = getCurrentUser();
            const studentId =
                currentUser?.id ||
                currentUser?.userId ||
                currentUser?.accountId;
            if (!studentId) return;

            setLoadingResult(true);
            try {
                const history = await attemptService.getHistory(
                    testId,
                    studentId,
                    classId ? { classId } : {},
                );
                if (cancelled) return;
                const completed = (history || [])
                    .filter((attempt) => isFinalAttempt(attempt?.status))
                    .sort(
                        (a, b) =>
                            new Date(
                                b?.endTime || b?.updatedAt || b?.createdAt || 0,
                            ) -
                            new Date(
                                a?.endTime || a?.updatedAt || a?.createdAt || 0,
                            ),
                    );
                const latest = completed[0] || null;
                setLatestAttempt(latest);
                if (latest && lessonId) {
                    onQuizCompleted?.(lessonId);
                }
            } catch {
                if (!cancelled) setLatestAttempt(null);
            } finally {
                if (!cancelled) setLoadingResult(false);
            }
        }

        loadQuizResult();
        return () => {
            cancelled = true;
        };
    }, [classId, lessonId, onQuizCompleted, testId]);

    if (!testId) {
        return (
            <article className="learning-quiz-launch">
                <div className="learning-quiz-launch__icon">
                    <AlertCircle size={24} aria-hidden="true" />
                </div>
                <div className="learning-quiz-launch__body">
                    <h2>{lesson.title || "Quiz"}</h2>
                    <p>This quiz has not been linked to a test yet.</p>
                </div>
            </article>
        );
    }

    if (latestAttempt) {
        const score = formatQuizScore(latestAttempt);
        return (
            <article className="learning-quiz-launch learning-quiz-launch--completed">
                <div className="learning-quiz-launch__icon">
                    <CheckCircle2 size={24} aria-hidden="true" />
                </div>
                <div className="learning-quiz-launch__body">
                    <h2>{lesson.title || "Quiz"}</h2>
                    <p>Quiz completed</p>
                </div>
                <div className="learning-quiz-launch__score">
                    <span>Score</span>
                    <strong>{score.score}/10</strong>
                </div>
            </article>
        );
    }

    return (
        <article className="learning-quiz-launch">
            <div className="learning-quiz-launch__icon">
                <ArrowRight size={24} aria-hidden="true" />
            </div>
            <div className="learning-quiz-launch__body">
                <h2>{lesson.title || "Quiz"}</h2>
                <p>
                    {loadingResult
                        ? "Checking your quiz result..."
                        : "Open this quiz in the full-screen test workspace."}
                </p>
            </div>
            <button
                type="button"
                className="learning-quiz-launch__button"
                onClick={() => onQuizStart?.(lesson)}
                disabled={loadingResult}
            >
                Start quiz
                <ArrowRight size={18} aria-hidden="true" />
            </button>
        </article>
    );
}

function formatAssignmentDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return null;
    if (bytes < 1024 * 1024)
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPastDate(value) {
    if (!value) return false;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) && timestamp < Date.now();
}

function getAssignmentStatus(assignment, submission) {
    const rawStatus = String(submission?.status || "").toUpperCase();
    const hasSubmittedFile = Boolean(submission?.fileUrl);
    const isLate = Boolean(submission?.isLate) || rawStatus === "LATE";
    const isClosed =
        isPastDate(assignment?.lockoutDate) ||
        (isPastDate(assignment?.dueDate) && !assignment?.allowLateSubmission);

    if (rawStatus === "GRADED") {
        return { key: "graded", label: "Graded", Icon: CheckCircle2 };
    }
    if (hasSubmittedFile && (isLate || rawStatus === "EXPIRED")) {
        return { key: "late", label: "Submitted late", Icon: Clock3 };
    }
    if (hasSubmittedFile || rawStatus === "SUBMITTED") {
        return { key: "submitted", label: "Submitted", Icon: CheckCircle2 };
    }
    if (isClosed || rawStatus === "EXPIRED") {
        return { key: "expired", label: "Closed", Icon: AlertCircle };
    }
    if (isPastDate(assignment?.dueDate) && assignment?.allowLateSubmission) {
        return { key: "late", label: "Past due", Icon: Clock3 };
    }
    if (["DOING", "PENDING"].includes(rawStatus)) {
        return { key: "doing", label: "In progress", Icon: Clock3 };
    }
    return { key: "not-submitted", label: "Not submitted", Icon: Clock3 };
}

function AssignmentRichContent({ content }) {
    if (!content) {
        return (
            <p className="assignment-view__empty-copy">
                No instructions have been added yet.
            </p>
        );
    }

    if (isHtmlContent(content)) {
        return (
            <div
                className="assignment-view__rich-text"
                dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(content, {
                        ADD_ATTR: [
                            "target",
                            "rel",
                            "controls",
                            "preload",
                            "poster",
                            "width",
                            "height",
                            "type",
                            "class",
                            "data-summary-video",
                        ],
                    }),
                }}
            />
        );
    }

    return (
        <div className="assignment-view__rich-text">
            {content
                .split("\n")
                .map((line, index) =>
                    line.trim() ? (
                        <p key={index}>{line}</p>
                    ) : (
                        <br key={index} />
                    ),
                )}
        </div>
    );
}

function OverviewContent({
    lesson,
    courseId,
    classId,
    workspaceMode,
    flashcardProgressUserKey,
    flashcardPositionUserKey,
    onQuizCompleted,
    onQuizStart,
    onFlashcardCompleted,
    onEssayCompleted,
}) {
    const type = (lesson?.lessonType || "").toUpperCase();

    if (type === "QUIZ") {
        return (
            <QuizLessonLaunch
                lesson={lesson}
                classId={classId}
                onQuizCompleted={onQuizCompleted}
                onQuizStart={onQuizStart}
            />
        );
    }

    if (type === "ESSAY" || type === "ASSIGNMENT") {
        return (
            <EssayLessonContent
                lesson={lesson}
                classId={classId}
                readOnly={workspaceMode !== "student"}
                onCompleted={() => onEssayCompleted?.(getLessonId(lesson))}
            />
        );
    }

    if (type === "FLASHCARD") {
        return (
            <FlashcardPractice
                lessonId={getLessonId(lesson)}
                courseId={courseId}
                classId={classId}
                adminMode={workspaceMode === "admin-preview"}
                readOnly={workspaceMode !== "student"}
                progressUserKey={flashcardProgressUserKey}
                positionUserKey={flashcardPositionUserKey}
                onCompleted={() => onFlashcardCompleted?.(getLessonId(lesson))}
            />
        );
    }

    if (!lesson?.content) {
        return (
            <div className="tab-overview__empty">
                <BookOpen size={32} />
                <p>No additional overview content for this lesson.</p>
            </div>
        );
    }

    if (isHtmlContent(lesson.content)) {
        const cleanContent = DOMPurify.sanitize(lesson.content, {
            ADD_TAGS: ["iframe"],
            ADD_ATTR: [
                "target",
                "rel",
                "controls",
                "preload",
                "poster",
                "width",
                "height",
                "type",
                "class",
                "data-summary-video",
            ],
        });

        return (
            <div
                className="tab-overview__content learning-lesson__rich-content"
                dangerouslySetInnerHTML={{ __html: cleanContent }}
            />
        );
    }

    return (
        <div className="tab-overview__content learning-lesson__rich-content">
            {lesson.content
                .split("\n")
                .map((line, index) =>
                    line.trim() ? (
                        <p key={index}>{line}</p>
                    ) : (
                        <br key={index} />
                    ),
                )}
        </div>
    );
}

function EssayLessonContent({
    lesson,
    classId,
    readOnly = false,
    onCompleted,
}) {
    const [assignment, setAssignment] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [downloadingFile, setDownloadingFile] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [message, setMessage] = useState(null);
    const [loadVersion, setLoadVersion] = useState(0);
    const onCompletedRef = useRef(onCompleted);
    const lessonId = getLessonId(lesson);

    useEffect(() => {
        onCompletedRef.current = onCompleted;
    }, [onCompleted]);

    useEffect(() => {
        let cancelled = false;
        async function loadEssay() {
            setLoading(true);
            setMessage(null);
            setFile(null);
            try {
                const nextAssignment = await assignmentService.getByLesson(
                    lessonId,
                    classId,
                );
                if (cancelled) return;
                setAssignment(nextAssignment);
                setSubmission(null);

                const currentUser = getCurrentUser();
                const studentId =
                    currentUser?.id ||
                    currentUser?.userId ||
                    currentUser?.accountId;
                if (!readOnly && studentId && nextAssignment?.id) {
                    try {
                        const currentSubmission =
                            await assignmentService.getSubmissionByStudent(
                                nextAssignment.id,
                                studentId,
                            );
                        if (!cancelled) {
                            setSubmission(currentSubmission);
                            if (
                                [
                                    "SUBMITTED",
                                    "GRADED",
                                    "LATE",
                                    "EXPIRED",
                                ].includes(
                                    String(
                                        currentSubmission?.status || "",
                                    ).toUpperCase(),
                                )
                            ) {
                                onCompletedRef.current?.();
                            }
                        }
                    } catch (submissionError) {
                        if (
                            submissionError?.originalError?.response?.status !==
                            404
                        ) {
                            throw submissionError;
                        }
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    setMessage({
                        type: "error",
                        text:
                            error?.message || "Could not load this assignment.",
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        if (lessonId) loadEssay();
        return () => {
            cancelled = true;
        };
    }, [lessonId, classId, readOnly, loadVersion]);

    const downloadAssignmentFile = async (fileUrl, fileName, downloadKey) => {
        if (!fileUrl) return;
        setDownloadingFile(downloadKey);
        setMessage(null);
        try {
            const blob = await assignmentService.downloadFile(fileUrl);
            const href = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = href;
            link.download =
                fileName || fileNameFromUrl(fileUrl) || "assignment-file";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(href);
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error?.message ||
                    "The file could not be downloaded. Please try again.",
            });
        } finally {
            setDownloadingFile("");
        }
    };

    const downloadInstruction = () => {
        const fileUrl = assignment?.instructionFileUrl || lesson?.attachmentUrl;
        return downloadAssignmentFile(
            fileUrl,
            assignment?.instructionFileName || fileNameFromUrl(fileUrl),
            "instruction",
        );
    };

    const handleFileSelect = (nextFile) => {
        if (!nextFile) return;
        const lowerName = nextFile.name.toLowerCase();
        const isAllowed = ASSIGNMENT_FILE_TYPES.some((extension) =>
            lowerName.endsWith(extension),
        );
        if (!isAllowed) {
            setFile(null);
            setMessage({
                type: "error",
                text: "Choose a PDF, Word, PowerPoint, image, or ZIP file.",
            });
            return;
        }

        setFile(nextFile);
        setMessage(null);
    };

    const submitEssay = async () => {
        if (!assignment?.id || !file) return;
        const currentUser = getCurrentUser();
        const studentId =
            currentUser?.id || currentUser?.userId || currentUser?.accountId;
        if (!studentId) {
            setMessage({
                type: "error",
                text: "Please sign in again before submitting.",
            });
            return;
        }

        setSubmitting(true);
        setMessage(null);
        try {
            const uploaded = await assignmentService.uploadFile(file);
            await assignmentService.start({
                assignmentId: assignment.id,
                studentId,
                studentName:
                    currentUser?.fullName || currentUser?.email || "Student",
            });
            const result = await assignmentService.submit({
                assignmentId: assignment.id,
                studentId,
                studentName:
                    currentUser?.fullName || currentUser?.email || "Student",
                submissionText: "",
                fileUrl: uploaded?.fileUrl,
                fileName: uploaded?.fileName || file.name,
            });
            setSubmission(result);
            setFile(null);
            setMessage({
                type: "success",
                text: result?.isLate
                    ? "Your assignment was submitted late."
                    : "Your assignment was submitted successfully.",
            });
            onCompletedRef.current?.();
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error?.message ||
                    "Your assignment could not be submitted. Check the file and try again.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const instructionUrl =
        assignment?.instructionFileUrl || lesson?.attachmentUrl;
    const status = getAssignmentStatus(assignment, submission);
    const StatusIcon = status.Icon;
    const dueDate = formatAssignmentDate(assignment?.dueDate);
    const lockoutDate = formatAssignmentDate(assignment?.lockoutDate);
    const submittedAt = formatAssignmentDate(submission?.submittedAt);
    const gradedAt = formatAssignmentDate(submission?.gradedAt);
    const hasSubmission = Boolean(submission?.fileUrl);
    const hasResult =
        submission?.score != null ||
        Boolean(submission?.trainerFeedback) ||
        Boolean(submission?.aiFeedback) ||
        String(submission?.status || "").toUpperCase() === "GRADED";
    const assignmentClosed =
        isPastDate(assignment?.lockoutDate) ||
        (isPastDate(assignment?.dueDate) && !assignment?.allowLateSubmission);
    const canSubmit =
        !readOnly && !assignmentClosed && !hasResult && Boolean(assignment?.id);
    const assignmentContent = assignment?.description || lesson?.content;
    const supplementalInstructions =
        assignment?.description &&
        lesson?.content &&
        assignment.description.trim() !== lesson.content.trim()
            ? lesson.content
            : null;

    if (loading) {
        return (
            <div
                className="assignment-skeleton"
                aria-busy="true"
                aria-label="Loading assignment"
            >
                <div className="assignment-skeleton__line assignment-skeleton__line--label" />
                <div className="assignment-skeleton__line assignment-skeleton__line--title" />
                <div className="assignment-skeleton__meta">
                    <span />
                    <span />
                    <span />
                </div>
                <div className="assignment-skeleton__section">
                    <div className="assignment-skeleton__line assignment-skeleton__line--heading" />
                    <div className="assignment-skeleton__line" />
                    <div className="assignment-skeleton__line" />
                    <div className="assignment-skeleton__line assignment-skeleton__line--short" />
                </div>
                <div className="assignment-skeleton__upload" />
            </div>
        );
    }

    if (!assignment) {
        return (
            <div className="assignment-load-error" role="alert">
                <AlertCircle size={28} />
                <div>
                    <h3>Assignment unavailable</h3>
                    <p>
                        {message?.text || "This assignment could not be found."}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setLoadVersion((version) => version + 1)}
                >
                    <RefreshCw size={16} />
                    Try again
                </button>
            </div>
        );
    }

    return (
        <article className="assignment-view">
            <header className="assignment-view__header">
                <div className="assignment-view__eyebrow-row">
                    <span
                        className={`assignment-status assignment-status--${status.key}`}
                    >
                        <StatusIcon size={15} />
                        {status.label}
                    </span>
                </div>
                <h2>{assignment?.title || lesson?.title || "Assignment"}</h2>
                <div
                    className="assignment-view__meta"
                    aria-label="Assignment details"
                >
                    <span>
                        <CalendarDays size={17} />
                        <span>
                            <small>Due</small>
                            <strong>{dueDate || "No due date"}</strong>
                        </span>
                    </span>
                    <span>
                        <Award size={17} />
                        <span>
                            <small>Points</small>
                            <strong>{assignment?.maxScore ?? 10}</strong>
                        </span>
                    </span>
                    <span>
                        <Clock3 size={17} />
                        <span>
                            <small>Late submissions</small>
                            <strong>
                                {assignment?.allowLateSubmission
                                    ? "Allowed"
                                    : "Not allowed"}
                            </strong>
                        </span>
                    </span>
                </div>
                {lockoutDate && (
                    <p className="assignment-view__lockout">
                        Submissions close {lockoutDate}.
                    </p>
                )}
            </header>

            <section
                className="assignment-view__section"
                aria-labelledby="assignment-about-heading"
            >
                <h3 id="assignment-about-heading">About this assignment</h3>
                <AssignmentRichContent content={assignmentContent} />
            </section>

            {supplementalInstructions && (
                <section
                    className="assignment-view__section"
                    aria-labelledby="assignment-instructions-heading"
                >
                    <h3 id="assignment-instructions-heading">Instructions</h3>
                    <AssignmentRichContent content={supplementalInstructions} />
                </section>
            )}

            {instructionUrl && (
                <section
                    className="assignment-view__section"
                    aria-labelledby="assignment-files-heading"
                >
                    <h3 id="assignment-files-heading">Assignment files</h3>
                    <button
                        type="button"
                        className="assignment-file"
                        onClick={downloadInstruction}
                        disabled={downloadingFile === "instruction"}
                    >
                        <span className="assignment-file__icon">
                            <FileText size={20} />
                        </span>
                        <span className="assignment-file__info">
                            <strong>
                                {assignment?.instructionFileName ||
                                    fileNameFromUrl(instructionUrl) ||
                                    "Assignment instructions"}
                            </strong>
                            <small>Assignment instructions</small>
                        </span>
                        {downloadingFile === "instruction" ? (
                            <Loader2 className="assignment-spin" size={18} />
                        ) : (
                            <span className="assignment-file__action">
                                <Download size={16} />
                                Download
                            </span>
                        )}
                    </button>
                </section>
            )}

            {!readOnly && (
                <section
                    className="assignment-submission"
                    aria-labelledby="assignment-submission-heading"
                >
                    <div className="assignment-submission__heading">
                        <div>
                            <h3 id="assignment-submission-heading">
                                {hasResult
                                    ? "Assignment result"
                                    : "Submit your work"}
                            </h3>
                        </div>
                        {submittedAt && !hasResult && (
                            <span className="assignment-submission__date">
                                Submitted {submittedAt}
                            </span>
                        )}
                    </div>

                    {hasResult && (
                        <div className="assignment-result">
                            <div className="assignment-result__score">
                                <span
                                    className={`assignment-status assignment-status--${status.key}`}
                                >
                                    <StatusIcon size={15} />
                                    {status.label}
                                </span>
                                <strong>
                                    {submission?.score ?? "—"}
                                    <small>
                                        {" "}
                                        / {assignment?.maxScore ?? 10}
                                    </small>
                                </strong>
                                <span>
                                    {gradedAt
                                        ? `Graded ${gradedAt}`
                                        : "Review complete"}
                                </span>
                            </div>
                            <div className="assignment-result__feedback">
                                {submission?.trainerFeedback && (
                                    <div>
                                        <h4>Instructor feedback</h4>
                                        <p>{submission.trainerFeedback}</p>
                                    </div>
                                )}
                                {submission?.aiFeedback && (
                                    <div>
                                        <h4>AI feedback</h4>
                                        <p>{submission.aiFeedback}</p>
                                    </div>
                                )}
                                {!submission?.trainerFeedback &&
                                    !submission?.aiFeedback && (
                                        <p className="assignment-view__empty-copy">
                                            No written feedback was provided.
                                        </p>
                                    )}
                            </div>
                        </div>
                    )}

                    {hasSubmission && (
                        <button
                            type="button"
                            className="assignment-file assignment-file--submitted"
                            onClick={() =>
                                downloadAssignmentFile(
                                    submission.fileUrl,
                                    submission.fileName,
                                    "submission",
                                )
                            }
                            disabled={downloadingFile === "submission"}
                        >
                            <span className="assignment-file__icon">
                                <FileText size={20} />
                            </span>
                            <span className="assignment-file__info">
                                <small>Submitted file</small>
                                <strong>
                                    {submission.fileName ||
                                        "Submitted assignment"}
                                </strong>
                            </span>
                            {downloadingFile === "submission" ? (
                                <Loader2
                                    className="assignment-spin"
                                    size={18}
                                />
                            ) : (
                                <span className="assignment-file__action">
                                    <Download size={16} />
                                    Download
                                </span>
                            )}
                        </button>
                    )}

                    {hasSubmission && !hasResult && (
                        <div className="assignment-notice assignment-notice--info">
                            <Clock3 size={18} />
                            <p>
                                {submission?.isLate
                                    ? "This assignment was submitted after the due date."
                                    : "Your assignment is waiting for review."}
                            </p>
                        </div>
                    )}

                    {assignmentClosed && !hasSubmission && (
                        <div
                            className="assignment-notice assignment-notice--error"
                            role="alert"
                        >
                            <AlertCircle size={18} />
                            <p>
                                The submission period for this assignment has
                                closed.
                            </p>
                        </div>
                    )}

                    {canSubmit && (
                        <div className="assignment-upload-area">
                            {file ? (
                                <div className="assignment-upload__selected">
                                    <span className="assignment-file__icon">
                                        <FileText size={20} />
                                    </span>
                                    <span className="assignment-file__info">
                                        <strong>{file.name}</strong>
                                        <small>
                                            {formatFileSize(file.size) ||
                                                "Ready to upload"}
                                        </small>
                                    </span>
                                    <button
                                        type="button"
                                        aria-label={`Remove ${file.name}`}
                                        onClick={() => {
                                            setFile(null);
                                            setMessage(null);
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <label
                                    className={`assignment-upload ${isDragging ? "assignment-upload--dragging" : ""}`}
                                    onDragEnter={(event) => {
                                        event.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragOver={(event) =>
                                        event.preventDefault()
                                    }
                                    onDragLeave={(event) => {
                                        if (
                                            !event.currentTarget.contains(
                                                event.relatedTarget,
                                            )
                                        ) {
                                            setIsDragging(false);
                                        }
                                    }}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setIsDragging(false);
                                        handleFileSelect(
                                            event.dataTransfer.files?.[0],
                                        );
                                    }}
                                >
                                    <UploadCloud size={24} />
                                    <span>
                                        <strong>
                                            {hasSubmission
                                                ? "Choose a replacement file"
                                                : "Upload your work"}
                                        </strong>
                                        <small>
                                            Drag and drop or choose a file
                                        </small>
                                    </span>
                                    <span className="assignment-upload__browse">
                                        Choose file
                                    </span>
                                    <input
                                        key={file ? file.name : "empty"}
                                        className="assignment-upload__input"
                                        type="file"
                                        accept={ASSIGNMENT_FILE_TYPES.join(",")}
                                        onChange={(event) =>
                                            handleFileSelect(
                                                event.target.files?.[0],
                                            )
                                        }
                                    />
                                </label>
                            )}
                            <p className="assignment-upload__help">
                                PDF, Word, PowerPoint, PNG, JPG, or ZIP
                            </p>
                            <div className="assignment-submission__actions">
                                <button
                                    type="button"
                                    className="assignment-submit-button"
                                    onClick={submitEssay}
                                    disabled={submitting || !file}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2
                                                className="assignment-spin"
                                                size={18}
                                            />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            {hasSubmission
                                                ? "Replace submission"
                                                : "Submit assignment"}
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {message && (
                        <div
                            className={`assignment-notice assignment-notice--${message.type}`}
                            role={message.type === "error" ? "alert" : "status"}
                            aria-live="polite"
                        >
                            {message.type === "success" ? (
                                <CheckCircle2 size={18} />
                            ) : (
                                <AlertCircle size={18} />
                            )}
                            <p>{message.text}</p>
                        </div>
                    )}
                </section>
            )}

            {readOnly && message && (
                <div
                    className="assignment-notice assignment-notice--error"
                    role="alert"
                >
                    <AlertCircle size={18} />
                    <p>{message.text}</p>
                </div>
            )}
        </article>
    );
}

function ResourcesContent({ lesson }) {
    const resources = Array.isArray(lesson?.resources) ? lesson.resources : [];
    const hasAttachment = !!lesson?.attachmentUrl;
    const totalResources = resources.length + (hasAttachment ? 1 : 0);

    if (totalResources === 0) {
        return (
            <div className="tab-resources__empty">
                <FolderOpen size={32} />
                <p>No resources attached to this lesson.</p>
            </div>
        );
    }

    return (
        <div className="tab-resources__list">
            {hasAttachment && (
                <a
                    href={lesson.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tab-resources__item"
                >
                    <div className="tab-resources__item-icon">
                        <FileText size={20} />
                    </div>
                    <div className="tab-resources__item-info">
                        <div className="tab-resources__item-name">
                            {fileNameFromUrl(lesson.attachmentUrl) ||
                                "Attachment"}
                        </div>
                        <div className="tab-resources__item-meta">
                            Main attachment
                        </div>
                    </div>
                    <div className="tab-resources__item-actions">
                        <Download size={16} />
                    </div>
                </a>
            )}

            {resources.map((resource, index) => (
                <a
                    key={`${resource.url || "resource"}-${index}`}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tab-resources__item"
                >
                    <div className="tab-resources__item-icon">
                        <File size={20} />
                    </div>
                    <div className="tab-resources__item-info">
                        <div className="tab-resources__item-name">
                            {resource.name ||
                                fileNameFromUrl(resource.url) ||
                                `Resource ${index + 1}`}
                        </div>
                        {resource.contentType && (
                            <div className="tab-resources__item-meta">
                                {resource.contentType}
                            </div>
                        )}
                    </div>
                    <div className="tab-resources__item-actions">
                        <Download size={16} />
                    </div>
                </a>
            ))}
        </div>
    );
}

/** Hiển thị nội dung tổng quan và tài nguyên của lesson trong workspace học. */
export function LearningLessonTabs({
    lesson,
    courseId,
    classId,
    activeTab,
    onTabChange,
    nextLesson,
    onNextLesson,
    canGoNext = true,
    isActivityLesson = false,
    workspaceMode = "student",
    flashcardProgressUserKey,
    flashcardPositionUserKey,
    onQuizCompleted,
    onQuizStart,
    onFlashcardCompleted,
    onEssayCompleted,
}) {
    const resources = Array.isArray(lesson?.resources) ? lesson.resources : [];
    const totalResources = resources.length + (lesson?.attachmentUrl ? 1 : 0);

    return (
        <div className="lesson-tabs">
            <div className="lesson-tabs__bar">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        type="button"
                        key={key}
                        className={`lesson-tabs__tab ${
                            activeTab === key ? "lesson-tabs__tab--active" : ""
                        }`}
                        onClick={() => onTabChange(key)}
                    >
                        <Icon size={15} />
                        {label}
                        {key === "resources" && totalResources > 0 && (
                            <span className="lesson-tabs__badge">
                                {totalResources}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="lesson-tabs__content">
                {activeTab === "overview" && (
                    <div className="tab-overview">
                        <OverviewContent
                            lesson={lesson}
                            courseId={courseId}
                            classId={classId}
                            workspaceMode={workspaceMode}
                            flashcardProgressUserKey={flashcardProgressUserKey}
                            flashcardPositionUserKey={flashcardPositionUserKey}
                            onQuizCompleted={onQuizCompleted}
                            onQuizStart={onQuizStart}
                            onFlashcardCompleted={onFlashcardCompleted}
                            onEssayCompleted={onEssayCompleted}
                        />
                    </div>
                )}

                {activeTab === "resources" && (
                    <div className="tab-resources">
                        <ResourcesContent lesson={lesson} />
                    </div>
                )}
            </div>

            {nextLesson && (
                <div className="lesson-tabs__footer">
                    <button
                        type="button"
                        className="lesson-tabs__next-btn"
                        onClick={onNextLesson}
                        disabled={!canGoNext}
                        title={
                            !canGoNext && isActivityLesson
                                ? "Complete this activity before moving to the next lesson."
                                : undefined
                        }
                    >
                        <span>
                            Next lesson
                            <small>
                                {!canGoNext && isActivityLesson
                                    ? "Complete this activity first"
                                    : nextLesson.title}
                            </small>
                        </span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}
