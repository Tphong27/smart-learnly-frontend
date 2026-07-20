import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { courseService } from "@/services/course.service";
import { assignmentService } from "@/services/flashtest.service";
import { Button, useToast } from "@/shared/components/ui";
import RichTextEditor from "@/shared/components/rich-text/RichTextEditor";
import { FlashcardLessonEditor } from "@/features/course/components/flashcards/FlashcardLessonEditor";
import {
    sanitizeLessonHtml,
    isEmptyLessonHtml,
} from "@/shared/utils/htmlSanitizer";
import {
    parseQuizContent,
    serializeQuizContent,
} from "../../utils/quiz-question-schema";
import {
    validateSummaryImage,
    validateSummaryVideo,
} from "@/shared/utils/summaryUploadValidation";
import {
    LESSON_STATUS_OPTIONS,
    getLessonStatusMeta,
    normalizeLessonStatus,
} from "@/features/course/utils/lesson-status";
import { normalizeEditorLessonType } from "@/features/course/utils/lesson-type";
import {
    ArrowLeft,
    Save,
    History,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    CheckCircle2,
    Circle,
    AlertCircle,
    Paperclip,
    X,
    Video,
    BookOpen,
    FileText,
} from "lucide-react";
import { QuizQuestionsPanel } from "../QuizQuestionManager";
import { HlsVideoUploader } from "./HlsVideoUploader";
import { VideoAiStatusPanel } from "../video-ai/VideoAiStatusPanel";
import { PdfMaterialUploader } from "./PdfMaterialUploader";
import { LessonResourceUploader } from "./LessonResourceUploader";
import "../../course-admin.css";
import "@/features/course/course-admin.css";
import "@/features/course/course-lesson-editor.css";

const LESSON_TYPE_LABELS = {
    VIDEO: "Video lecture",
    PDF: "Document / Reading",
    RICH_TEXT: "Reading lesson",
    QUIZ: "Quiz",
    ESSAY: "Essay assignment",
    FLASHCARD: "Flashcard",
};

const EDITABLE_LESSON_TYPE_OPTIONS = [
    {
        value: "VIDEO",
        label: "Video lecture",
        description: "Upload a video for learners to watch in this lesson.",
        Icon: Video,
    },
    {
        value: "RICH_TEXT",
        label: "Reading lesson",
        description: "Teach with formatted text and supporting resources.",
        Icon: BookOpen,
    },
    {
        value: "PDF",
        label: "PDF / document",
        description: "Attach a primary document for learners to read.",
        Icon: FileText,
    },
];

const EDITABLE_LESSON_TYPES = new Set(
    EDITABLE_LESSON_TYPE_OPTIONS.map((option) => option.value),
);

function LessonEditorSection({
    id,
    step,
    title,
    description,
    summary,
    state = "incomplete",
    stateLabel,
    expanded,
    onToggle,
    children,
}) {
    const StatusIcon =
        state === "complete"
            ? CheckCircle2
            : state === "error"
              ? AlertCircle
              : state === "processing"
                ? Loader2
                : Circle;
    const headingId = `${id}-heading`;
    const panelId = `${id}-panel`;

    return (
        <section
            className={`sl-lesson-step sl-lesson-step--${state}${expanded ? " is-expanded" : ""}`}
        >
            <h2 className="sl-lesson-step__heading" id={headingId}>
                <button
                    type="button"
                    className="sl-lesson-step__trigger"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={onToggle}
                >
                    <span
                        className="sl-lesson-step__status-icon"
                        aria-hidden="true"
                    >
                        <StatusIcon
                            size={20}
                            className={
                                state === "processing"
                                    ? "animate-spin"
                                    : undefined
                            }
                        />
                    </span>
                    <span className="sl-lesson-step__copy">
                        <strong>
                            {step}. {title}
                        </strong>
                        <span>{summary || description}</span>
                    </span>
                    <span className="sl-lesson-step__meta">
                        <span
                            className={`sl-lesson-step__state sl-lesson-step__state--${state}`}
                        >
                            {stateLabel}
                        </span>
                        <ChevronDown
                            size={19}
                            className="sl-lesson-step__chevron"
                            aria-hidden="true"
                        />
                    </span>
                </button>
            </h2>
            {expanded && (
                <div
                    id={panelId}
                    className="sl-lesson-step__content"
                    role="region"
                    aria-labelledby={headingId}
                >
                    {children}
                </div>
            )}
        </section>
    );
}

/**
 * Shared lesson editor used by both admin (`/admin/courses/.../lessons/:lessonId`)
 * and trainer (`/trainer/classes/.../lessons/:lessonId`) pages.
 *
 * The parent page passes a `context` object which encapsulates:
 *  - mode: "admin" | "trainer" (informational)
 *  - lessonId, backPath
 *  - services: object exposing the same signatures as courseService for the
 *    fields consumed here plus quiz manager methods and a `flashcardService`
 *    object injected into <FlashcardLessonEditor />.
 *  - features: { audit, quizManager, flashcard } feature flags.
 */
export function LessonDetailEditor({ context }) {
    const {
        lessonId,
        backPath,
        services,
        videoAi,
        features = { audit: true, quizManager: true, flashcard: true },
    } = context || {};

    const navigate = useNavigate();
    const location = useLocation();
    const { showToast: emitToast } = useToast();
    const showToast = useCallback(
        (message, type) => emitToast({ message, type }),
        [emitToast],
    );

    const initialFlashcardSetId =
        location.state?.flashcardSetId ||
        new URLSearchParams(location.search).get("flashcardSetId");
    const initialFlashcardSection =
        location.state?.flashcardSection ||
        new URLSearchParams(location.search).get("flashcardSection");

    const [titleError, setTitleError] = useState("");
    const [summaryError, setSummaryError] = useState("");
    const [activeTab, setActiveTab] = useState("edit");
    const [flashcardSection, setFlashcardSection] = useState(
        initialFlashcardSection === "review" ? "review" : "current",
    );
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [textContent, setTextContent] = useState("");
    const [lessonType, setLessonType] = useState("RICH_TEXT");
    const [selectedLessonType, setSelectedLessonType] =
        useState("RICH_TEXT");
    const [existingLessonData, setExistingLessonData] = useState(null);

    const [videoUrl, setVideoUrl] = useState("");
    const [uploadedFileUrl, setUploadedFileUrl] = useState("");
    const [resources, setResources] = useState([]);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [uploadingResources, setUploadingResources] = useState(false);
    const [videoUploaderBusy, setVideoUploaderBusy] = useState(false);
    const [hlsProcessingStatus, setHlsProcessingStatus] = useState(null);

    const [editHistory, setEditHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);

    const [summary, setSummary] = useState("");
    const [isPreview, setIsPreview] = useState(false);
    const [status, setStatus] = useState("draft");
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [assignment, setAssignment] = useState(null);
    const [assignmentLoading, setAssignmentLoading] = useState(false);
    const [assignmentSaving, setAssignmentSaving] = useState(false);
    const [assignmentFile, setAssignmentFile] = useState(null);
    const [existingAssignmentFile, setExistingAssignmentFile] = useState(null);
    const [expandedSection, setExpandedSection] = useState(
        initialFlashcardSection === "review" ? "material" : "basic",
    );
    const [hasChanges, setHasChanges] = useState(false);
    const [saveNotice, setSaveNotice] = useState(null);

    const markChanged = () => {
        setHasChanges(true);
        setSaveNotice(null);
    };

    const showSaveNotice = (notice) => {
        setSaveNotice(notice);
        window.requestAnimationFrame(() => {
            document.getElementById("lesson-save-notice")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    };

    const openSection = (sectionId) => {
        setExpandedSection(sectionId);
        window.requestAnimationFrame(() => {
            document
                .getElementById(`lesson-step-${sectionId}-heading`)
                ?.querySelector("button")
                ?.focus();
        });
    };

    const getFileNameFromUrl = (url) => {
        if (!url) return "";
        return url.substring(url.lastIndexOf("/") + 1);
    };

    const getErrorMessage = (error, fallbackMessage) => {
        const validationDetails = error?.errors
            ?.map(({ field, message }) => `${field}: ${message}`)
            .join(", ");
        return validationDetails || error?.message || fallbackMessage;
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return "---";
        try {
            const date = new Date(isoString);
            return date.toLocaleString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
        } catch {
            return isoString;
        }
    };

    const syncLatestLessonVideoUrl = useCallback(async () => {
        const response = await services.getLessonDetail(lessonId);
        const latestLesson = response?.data || response;
        const latestVideoUrl = latestLesson?.videoUrl || "";

        setVideoUrl(latestVideoUrl);
        setExistingLessonData((current) => ({
            ...current,
            ...latestLesson,
        }));

        return latestVideoUrl;
    }, [lessonId, services]);

    useEffect(() => {
        const fetchLessonDetail = async () => {
            try {
                setPageLoading(true);
                const response = await services.getLessonDetail(lessonId);
                const lessonData = response?.data || response;

                if (lessonData) {
                    setExistingLessonData(lessonData);

                    setTitle(lessonData.title || "");
                    setSummary(sanitizeLessonHtml(lessonData.content || ""));
                    setTextContent(lessonData.content || "");

                    setVideoUrl(lessonData.videoUrl || "");
                    setUploadedFileUrl(
                        lessonData.attachmentUrl || lessonData.fileUrl || "",
                    );

                    setIsPreview(
                        Boolean(
                            lessonData.isPreview ?? lessonData.isPreviewable,
                        ),
                    );
                    setStatus(normalizeLessonStatus(lessonData.status));
                    setDurationSeconds(Number(lessonData.durationSeconds || 0));

                    const loadedLessonType = normalizeEditorLessonType(
                        lessonData.lessonType || lessonData.type,
                    );
                    setLessonType(loadedLessonType);
                    setSelectedLessonType(loadedLessonType);

                    const loadedResources =
                        lessonData.resources || lessonData.attachments || [];
                    setResources(
                        Array.isArray(loadedResources) ? loadedResources : [],
                    );
                    setHasChanges(false);
                }
            } catch (error) {
                console.error("Error loading lesson details:", error);
                showToast("Failed to load lesson details", "error");
            } finally {
                setPageLoading(false);
            }
        };

        if (lessonId) {
            fetchLessonDetail();
        }
    }, [lessonId, showToast, services]);

    useEffect(() => {
        if (lessonType !== "ESSAY") {
            return;
        }

        let cancelled = false;
        async function loadLessonAssignment() {
            try {
                setAssignmentLoading(true);
                const loaded = await assignmentService.getByLesson(lessonId);
                if (cancelled) return;
                setAssignment(loaded);
                setExistingAssignmentFile(
                    loaded?.instructionFileUrl
                        ? {
                              fileUrl: loaded.instructionFileUrl,
                              fileName:
                                  loaded.instructionFileName ||
                                  getFileNameFromUrl(
                                      loaded.instructionFileUrl,
                                  ) ||
                                  "Instruction file",
                          }
                        : null,
                );
            } catch {
                if (cancelled) return;
                setAssignment(null);
                setExistingAssignmentFile(null);
            } finally {
                if (!cancelled) setAssignmentLoading(false);
            }
        }

        if (lessonId) loadLessonAssignment();
        return () => {
            cancelled = true;
        };
    }, [lessonId, lessonType]);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            if (!services.getLessonAuditLogs) return;
            try {
                setHistoryLoading(true);
                const response = await services.getLessonAuditLogs(
                    lessonId,
                    currentPage,
                    pageSize,
                );

                const logData =
                    response?.items ||
                    response?.data?.items ||
                    response?.data?.data?.items ||
                    [];
                setEditHistory(logData);

                const totalElems =
                    response?.totalElements ??
                    response?.data?.totalElements ??
                    response?.data?.data?.totalElements ??
                    0;
                const totalPgs =
                    response?.totalPages ??
                    response?.data?.totalPages ??
                    response?.data?.data?.totalPages ??
                    1;

                setTotalElements(totalElems);
                setTotalPages(totalPgs);
            } catch (error) {
                console.error("Error loading audit logs:", error);
                showToast("Failed to load audit history logs", "error");
            } finally {
                setHistoryLoading(false);
            }
        };

        if (features.audit && activeTab === "history" && lessonId) {
            fetchAuditLogs();
        }
    }, [
        activeTab,
        lessonId,
        currentPage,
        pageSize,
        showToast,
        services,
        features.audit,
    ]);

    const uploadSummaryImage = async (file) => {
        const validationError = validateSummaryImage(file);

        if (validationError) {
            showToast(validationError, "error");
            return null;
        }

        try {
            const uploadedImage = await courseService.uploadSummaryImage(file);
            const uploadedUrl = uploadedImage?.url || uploadedImage?.data?.url;

            if (!uploadedUrl) {
                throw new Error("Invalid summary image upload response");
            }

            showToast("Summary image uploaded successfully", "success");

            return {
                ...uploadedImage,
                url: uploadedUrl,
            };
        } catch (error) {
            showToast(
                getErrorMessage(error, "Error uploading summary image"),
                "error",
            );
            throw error;
        }
    };

    const uploadSummaryVideo = async (file) => {
        const validationError = validateSummaryVideo(file);

        if (validationError) {
            showToast(validationError, "error");
            return null;
        }

        try {
            const uploadedVideo = await courseService.uploadSummaryVideo(file);
            const uploadedUrl = uploadedVideo?.url || uploadedVideo?.data?.url;

            if (!uploadedUrl) {
                throw new Error("Invalid summary video upload response");
            }

            showToast("Summary video uploaded successfully", "success");

            return {
                ...uploadedVideo,
                url: uploadedUrl,
            };
        } catch (error) {
            showToast(
                getErrorMessage(error, "Error uploading summary video"),
                "error",
            );
            throw error;
        }
    };

    const normalizeResourceForPayload = (resource, index) => {
        if (!resource) {
            return null;
        }

        if (typeof resource === "string") {
            return {
                url: resource,
                name: getFileNameFromUrl(resource) || `resource-${index + 1}`,
                sortOrder: index,
            };
        }

        const url = resource.url || resource.fileUrl || resource.attachmentUrl;

        if (!url) {
            return null;
        }

        return {
            url,
            objectPath: resource.objectPath || null,
            name:
                resource.name ||
                resource.fileName ||
                getFileNameFromUrl(url) ||
                `resource-${index + 1}`,
            fileSize: resource.fileSize || resource.size || null,
            contentType: resource.contentType || resource.type || null,
            sortOrder: resource.sortOrder ?? index,
        };
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaveNotice(null);

        const nextLessonType = selectedLessonType;
        const lessonTypeChanged = nextLessonType !== lessonType;

        if (!title.trim()) {
            setTitleError("Lesson title is required.");
            showSaveNotice({
                type: "error",
                title: "Lesson could not be saved",
                message: "Add a lesson title in step 1, then try again.",
            });
            openSection("basic");
            window.requestAnimationFrame(() =>
                document.getElementById("lesson-title-input")?.focus(),
            );
            return;
        }
        setTitleError("");

        const isQuiz = nextLessonType === "QUIZ";
        const usesLessonResources = !isQuiz && nextLessonType !== "ESSAY";
        const cleanSummary = sanitizeLessonHtml(summary);

        if (isQuiz && !parseQuizContent(textContent).title?.trim()) {
            setSummaryError("Quiz title cannot be empty.");
            showSaveNotice({
                type: "error",
                title: "Lesson could not be saved",
                message: "Add a quiz title in step 1, then try again.",
            });
            openSection("basic");
            return;
        }

        if (!isQuiz && isEmptyLessonHtml(cleanSummary)) {
            setSummaryError("Lesson summary cannot be empty.");
            showSaveNotice({
                type: "error",
                title: "Lesson could not be saved",
                message: "Add a lesson description in step 1, then try again.",
            });
            openSection("basic");
            return;
        }
        setSummaryError("");

        if (!lessonTypeChanged && !materialComplete) {
            const materialMessage =
                nextLessonType === "VIDEO"
                    ? "Upload a lesson video in step 2, then try again."
                    : nextLessonType === "PDF"
                      ? "Upload the reading material in step 2, then try again."
                      : "Add at least one quiz question in step 2, then try again.";
            showSaveNotice({
                type: "error",
                title: "Lesson could not be saved",
                message: materialMessage,
            });
            openSection("material");
            return;
        }

        showSaveNotice({
            type: "saving",
            title: "Saving lesson changes",
            message: "Please wait while the lesson is being updated.",
        });
        setLoading(true);

        try {
            let resolvedVideoUrl = (videoUrl || "").trim();
            if (
                nextLessonType === "VIDEO" &&
                !lessonTypeChanged &&
                !resolvedVideoUrl
            ) {
                const latest = await syncLatestLessonVideoUrl();
                if (latest) resolvedVideoUrl = latest;
            }

            const normalizedResources = usesLessonResources
                ? resources
                      .map((resource, index) =>
                          normalizeResourceForPayload(resource, index),
                      )
                      .filter(Boolean)
                      .slice(0, 10)
                : [];

            const parsedQuiz = isQuiz ? parseQuizContent(textContent) : null;
            const content = isQuiz
                ? serializeQuizContent(parsedQuiz.title, parsedQuiz.questions)
                : cleanSummary;

            const payload = {
                title: title.trim(),
                lessonType: nextLessonType,
                content,
                videoUrl:
                    nextLessonType === "VIDEO" && !lessonTypeChanged
                        ? resolvedVideoUrl
                        : null,
                attachmentUrl:
                    nextLessonType === "PDF" && !lessonTypeChanged
                        ? uploadedFileUrl
                        : null,
                durationSeconds: Number(durationSeconds || 0),
                isPreview,
                status: normalizeLessonStatus(status),
                resources: normalizedResources,
                sortOrder: existingLessonData?.sortOrder ?? 0,
            };

            const response = await services.updateLesson(lessonId, payload);
            const savedLesson = response?.data || response || {};
            const savedLessonType = normalizeEditorLessonType(
                savedLesson.lessonType ||
                    savedLesson.type ||
                    nextLessonType,
            );

            setExistingLessonData((current) => ({
                ...current,
                ...savedLesson,
            }));
            setLessonType(savedLessonType);
            setSelectedLessonType(savedLessonType);
            setVideoUrl(savedLesson.videoUrl || "");
            setUploadedFileUrl(
                savedLesson.attachmentUrl || savedLesson.fileUrl || "",
            );

            if (nextLessonType === "ESSAY") {
                const assignmentSaved = await saveLessonAssignment({
                    title: title.trim(),
                    description: cleanSummary,
                });
                if (!assignmentSaved) {
                    showSaveNotice({
                        type: "error",
                        title: "Assignment could not be saved",
                        message:
                            "Review the assignment information and try again.",
                    });
                    return;
                }
            }

            setHasChanges(false);

            if (lessonTypeChanged) {
                const nextMaterialAction =
                    savedLessonType === "VIDEO"
                        ? "Upload the lesson video in step 2."
                        : savedLessonType === "PDF"
                          ? "Upload the primary document in step 2."
                          : "Review the supporting resources in step 2.";
                setSaveNotice({
                    type: "success",
                    title: "Lesson type updated",
                    message: nextMaterialAction,
                });
                showToast("Lesson type updated successfully!", "success");
                openSection("material");
                return;
            }

            setSaveNotice({
                type: "success",
                title: "Lesson saved",
                message: "All lesson changes were saved successfully.",
            });
            showToast("Update successfully!", "success");
            if (backPath) navigate(backPath);
        } catch (error) {
            console.error("Error updating lesson details:", error);

            const responseData = error?.response?.data;
            let errorText = "Encountered an error while saving lesson data";

            if (typeof responseData === "string") {
                errorText = responseData;
            } else if (responseData?.message) {
                errorText = responseData.message;
            } else if (responseData?.errors) {
                errorText = responseData.errors
                    .map((item) => `${item.field}: ${item.message}`)
                    .join(", ");
            } else if (error?.message) {
                errorText = error.message;
            }

            showSaveNotice({
                type: "error",
                title: "Lesson could not be saved",
                message: errorText,
            });
        } finally {
            setLoading(false);
        }
    };

    const saveLessonAssignment = async ({ title: nextTitle, description }) => {
        setAssignmentSaving(true);
        try {
            const uploaded = assignmentFile
                ? await assignmentService.uploadFile(assignmentFile)
                : null;
            const payload = {
                title: nextTitle,
                description,
                instructionFileUrl:
                    uploaded?.fileUrl || existingAssignmentFile?.fileUrl,
                instructionFileName:
                    uploaded?.fileName ||
                    assignmentFile?.name ||
                    existingAssignmentFile?.fileName,
                isFlashtest: false,
            };

            const saved = assignment?.id
                ? await assignmentService.update(assignment.id, payload)
                : await assignmentService.create({ ...payload, lessonId });

            setAssignment(saved);
            setAssignmentFile(null);
            setExistingAssignmentFile(
                saved?.instructionFileUrl
                    ? {
                          fileUrl: saved.instructionFileUrl,
                          fileName:
                              saved.instructionFileName ||
                              getFileNameFromUrl(saved.instructionFileUrl) ||
                              "Instruction file",
                      }
                    : null,
            );
            return true;
        } catch (error) {
            showToast(
                getErrorMessage(error, "Could not save assignment"),
                "error",
            );
            return false;
        } finally {
            setAssignmentSaving(false);
        }
    };

    const parsedQuizContent = parseQuizContent(textContent);
    const sanitizedSummary = sanitizeLessonHtml(summary);
    const basicComplete = Boolean(title.trim());
    const descriptionComplete =
        lessonType === "QUIZ"
            ? Boolean(parsedQuizContent.title?.trim())
            : lessonType === "FLASHCARD"
              ? true
              : !isEmptyLessonHtml(sanitizedSummary);
    const materialComplete = (() => {
        if (lessonType === "VIDEO") return Boolean(videoUrl);
        if (lessonType === "PDF") return Boolean(uploadedFileUrl);
        if (lessonType === "QUIZ") {
            return (parsedQuizContent.questions || []).length > 0;
        }
        return true;
    })();
    const detailsComplete = basicComplete && descriptionComplete;
    const settingsComplete =
        Boolean(status) && Number(durationSeconds || 0) >= 0;
    const totalSections = lessonType === "FLASHCARD" ? 2 : 3;
    const completedSections =
        lessonType === "FLASHCARD"
            ? [basicComplete, true].filter(Boolean).length
            : [detailsComplete, materialComplete, settingsComplete].filter(
                  Boolean,
              ).length;
    const completionPercent = Math.round(
        (completedSections / totalSections) * 100,
    );
    const editorBusy =
        loading ||
        uploadingPdf ||
        uploadingResources ||
        videoUploaderBusy ||
        assignmentSaving;
    const canChangeLessonType = EDITABLE_LESSON_TYPES.has(lessonType);
    const hasPendingLessonTypeChange = selectedLessonType !== lessonType;
    const selectedTypeLabel =
        LESSON_TYPE_LABELS[selectedLessonType] || selectedLessonType;
    const typeLabel = LESSON_TYPE_LABELS[lessonType] || lessonType;
    const statusMeta = getLessonStatusMeta(status);
    const statusLabel = statusMeta?.label || status;
    const materialSummary = (() => {
        if (videoUploaderBusy)
            return "Video upload or preparation in progress";
        if (lessonType === "VIDEO") {
            return videoUrl
                ? `${resources.length} supporting resource${resources.length === 1 ? "" : "s"}`
                : "Video is required";
        }
        if (lessonType === "PDF") {
            return uploadedFileUrl
                ? `${resources.length} supporting resource${resources.length === 1 ? "" : "s"}`
                : "Reading material is required";
        }
        if (lessonType === "QUIZ") {
            const count = parsedQuizContent.questions.length;
            return `${count} question${count === 1 ? "" : "s"}`;
        }
        if (lessonType === "ESSAY") {
            return assignmentFile || existingAssignmentFile
                ? "Assignment file added"
                : "Assignment file is optional";
        }
        if (lessonType === "RICH_TEXT") {
            return `${resources.length} supporting resource${resources.length === 1 ? "" : "s"}`;
        }
        return "Manage the flashcard set and cards";
    })();

    if (pageLoading)
        return (
            <div className="sl-cm-page" role="status" aria-live="polite">
                <div className="sl-cm-workspace">
                    <div
                        className="sl-cm-skeleton"
                        style={{ width: "35%", marginBottom: 16 }}
                    />
                    <div
                        className="sl-cm-skeleton"
                        style={{ width: "60%", marginBottom: 24 }}
                    />
                    <div
                        className="sl-cm-skeleton"
                        style={{ width: "100%", height: 200 }}
                    />
                </div>
            </div>
        );

    return (
        <div className="sl-cm-lesson-editor">
            <div className="sl-cm-lesson-editor__header">
                <div className="sl-cm-lesson-editor__header-copy">
                    <button
                        type="button"
                        className="sl-cm-back"
                        onClick={() => backPath && navigate(backPath)}
                    >
                        <ArrowLeft size={16} aria-hidden="true" /> Back to
                        curriculum
                    </button>
                    <h1 className="sl-cm-lesson-editor__title">
                        {activeTab === "history"
                            ? "Lesson audit history"
                            : "Edit lesson"}
                    </h1>
                    <div className="sl-cm-lesson-editor__lesson-line">
                        <strong>{title || "Untitled lesson"}</strong>
                    </div>
                    <p className="sl-cm-lesson-editor__context">{typeLabel}</p>
                </div>
                {features.audit && (
                    <Button
                        type="button"
                        variant="outline"
                        leftIcon={
                            activeTab === "history" ? (
                                <ArrowLeft size={16} />
                            ) : (
                                <History size={16} />
                            )
                        }
                        onClick={() => {
                            setCurrentPage(0);
                            setActiveTab(
                                activeTab === "history" ? "edit" : "history",
                            );
                        }}
                    >
                        {activeTab === "history"
                            ? "Back to editor"
                            : "Audit history"}
                    </Button>
                )}
            </div>

            {activeTab === "edit" && saveNotice && (
                <div
                    id="lesson-save-notice"
                    className={`sl-cm-lesson-editor__notice sl-cm-lesson-editor__notice--${saveNotice.type}`}
                    role={saveNotice.type === "error" ? "alert" : "status"}
                    aria-live={
                        saveNotice.type === "error" ? "assertive" : "polite"
                    }
                >
                    <span
                        className="sl-cm-lesson-editor__notice-icon"
                        aria-hidden="true"
                    >
                        {saveNotice.type === "saving" ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : saveNotice.type === "success" ? (
                            <CheckCircle2 size={20} />
                        ) : (
                            <AlertCircle size={20} />
                        )}
                    </span>
                    <div className="sl-cm-lesson-editor__notice-copy">
                        <strong>{saveNotice.title}</strong>
                        <p>{saveNotice.message}</p>
                    </div>
                    {saveNotice.type !== "saving" && (
                        <button
                            type="button"
                            className="sl-cm-lesson-editor__notice-close"
                            aria-label="Dismiss save notification"
                            onClick={() => setSaveNotice(null)}
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}

            {activeTab === "edit" && (
                <section
                    className="sl-cm-lesson-editor__progress"
                    aria-label="Lesson completion"
                >
                    <div className="sl-cm-lesson-editor__progress-copy">
                        <div>
                            <strong>Lesson completion</strong>
                            <span>
                                {completedSections} of {totalSections} required
                                sections completed
                            </span>
                        </div>
                        <strong>{completionPercent}%</strong>
                    </div>
                    <div
                        className="sl-cm-lesson-editor__progress-track"
                        role="progressbar"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow={completionPercent}
                    >
                        <span style={{ width: `${completionPercent}%` }} />
                    </div>
                    <p
                        className="sl-cm-lesson-editor__save-state"
                        aria-live="polite"
                    >
                        {editorBusy
                            ? "Saving or processing lesson content..."
                            : hasChanges
                              ? "Unsaved changes"
                              : "All changes loaded"}
                    </p>
                </section>
            )}

            {activeTab === "edit" ? (
                lessonType === "FLASHCARD" && features.flashcard ? (
                    <div className="sl-cm-lesson-editor__accordion-form">
                        <div className="sl-cm-lesson-editor__steps">
                            <LessonEditorSection
                                id="lesson-step-basic"
                                step="1"
                                title="Basic information"
                                description="Review the lesson identity before editing its flashcards."
                                summary={`${typeLabel} · Preview ${isPreview ? "enabled" : "disabled"}`}
                                state="complete"
                                stateLabel="Complete"
                                expanded={expandedSection === "basic"}
                                onToggle={() => setExpandedSection((current) => current === "basic" ? "" : "basic")}
                            >
                                <div className="sl-cm-lesson-editor__preview-card">
                                    <strong>{title || "Untitled flashcard lesson"}</strong>
                                    <dl>
                                        <div><dt>Type</dt><dd>{typeLabel}</dd></div>
                                        <div><dt>Preview</dt><dd>{isPreview ? "Enabled" : "Disabled"}</dd></div>
                                    </dl>
                                </div>
                                <div className="sl-lesson-step__footer">
                                    <Button type="button" variant="outline" onClick={() => openSection("material")}>
                                        Next: Flashcards
                                    </Button>
                                </div>
                            </LessonEditorSection>
                            <LessonEditorSection
                                id="lesson-step-material"
                                step="2"
                                title="Flashcards"
                                description="Manage the flashcard set and its learning cards."
                                summary="Edit the set title, cards, and study content"
                                state="complete"
                                stateLabel="Editor ready"
                                expanded={expandedSection === "material"}
                                onToggle={() => setExpandedSection((current) => current === "material" ? "" : "material")}
                            >
                                <div className="flashcard-actions" style={{ marginBottom: "16px" }}>
    <button
        type="button"
        className={`flashcard-btn ${
            flashcardSection === "current"
                ? "flashcard-btn--primary"
                : ""
        }`}
        onClick={() => setFlashcardSection("current")}
    >
        Current Flashcards
    </button>

    {features.flashcardStaging !== false && (
        <button
            type="button"
            className={`flashcard-btn ${
                flashcardSection === "review"
                    ? "flashcard-btn--primary"
                    : ""
            }`}
            onClick={() => setFlashcardSection("review")}
        >
            Staging Review
        </button>
    )}
</div>

<FlashcardLessonEditor
    lessonId={lessonId}
    initialSetId={initialFlashcardSetId}
    defaultTitle={title}
    activeSection={flashcardSection}
    showToast={showToast}
    onTitleSaved={(nextTitle) => {
        setTitle(nextTitle);
        setHasChanges(false);
    }}
    onNavigateToCurrent={() => setFlashcardSection("current")}
    flashcardService={services.flashcardService}
    stagingEnabled={features.flashcardStaging !== false}
/>
                            </LessonEditorSection>
                        </div>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSave}
                        className="sl-cm-lesson-editor__accordion-form"
                        noValidate
                    >
                        <div className="sl-cm-lesson-editor__steps">
                            <LessonEditorSection
                                id="lesson-step-basic"
                                step="1"
                                title="Title and description"
                                description="Add the lesson title and explain what learners will study."
                                summary={
                                    detailsComplete
                                        ? "Title and description added"
                                        : lessonType === "QUIZ"
                                          ? "Title and quiz title are required"
                                          : "Title and description are required"
                                }
                                state={
                                    detailsComplete
                                        ? "complete"
                                        : titleError || summaryError
                                          ? "error"
                                          : "incomplete"
                                }
                                stateLabel={
                                    detailsComplete
                                        ? "Complete"
                                        : titleError || summaryError
                                          ? "Needs attention"
                                          : "Incomplete"
                                }
                                expanded={expandedSection === "basic"}
                                onToggle={() =>
                                    setExpandedSection((current) =>
                                        current === "basic" ? "" : "basic",
                                    )
                                }
                            >
                                <div className="sl-cm-lesson-editor__basic-form">
                                    <div className="sl-cm-lesson-editor__basic-title">
                                        <label
                                            className="sl-cm-lesson-editor__field-label"
                                            htmlFor="lesson-title-input"
                                        >
                                            Title{" "}
                                            <span className="required">*</span>
                                        </label>
                                        <input
                                            id="lesson-title-input"
                                            type="text"
                                            value={title}
                                            onChange={(e) => {
                                                setTitle(e.target.value);
                                                markChanged();
                                                if (e.target.value.trim())
                                                    setTitleError("");
                                            }}
                                            className="sl-cm-lesson-editor__field-control"
                                            aria-invalid={
                                                titleError ? "true" : undefined
                                            }
                                            aria-describedby={
                                                titleError
                                                    ? "lesson-title-error"
                                                    : undefined
                                            }
                                        />
                                        {titleError ? (
                                            <p
                                                id="lesson-title-error"
                                                className="sl-cm-lesson-editor__field-help"
                                                style={{
                                                    color: "var(--sl-danger)",
                                                    fontWeight: 600,
                                                }}
                                                role="alert"
                                            >
                                                {titleError}
                                            </p>
                                        ) : null}
                                    </div>
                                    {canChangeLessonType && (
                                        <fieldset
                                            className="sl-cm-lesson-editor__type-field"
                                            disabled={editorBusy}
                                            aria-describedby={
                                                hasPendingLessonTypeChange
                                                    ? "lesson-type-help lesson-type-change-notice"
                                                    : "lesson-type-help"
                                            }
                                        >
                                            <legend className="sl-cm-lesson-editor__field-label">
                                                Lesson type
                                            </legend>
                                            <p
                                                id="lesson-type-help"
                                                className="sl-cm-lesson-editor__field-help sl-cm-lesson-editor__type-help"
                                            >
                                                Choose the primary format for
                                                this lesson. Save the change
                                                before uploading its material.
                                            </p>
                                            <div className="sl-cm-lesson-editor__type-grid">
                                                {EDITABLE_LESSON_TYPE_OPTIONS.map(
                                                    ({
                                                        value,
                                                        label,
                                                        description,
                                                        Icon,
                                                    }) => {
                                                        const isSelected =
                                                            selectedLessonType ===
                                                            value;

                                                        return (
                                                            <label
                                                                key={value}
                                                                className={`sl-cm-lesson-editor__type-option${isSelected ? " is-selected" : ""}`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="lesson-type"
                                                                    value={
                                                                        value
                                                                    }
                                                                    checked={
                                                                        isSelected
                                                                    }
                                                                    onChange={() => {
                                                                        setSelectedLessonType(
                                                                            value,
                                                                        );
                                                                        markChanged();
                                                                    }}
                                                                />
                                                                <span
                                                                    className="sl-cm-lesson-editor__type-icon"
                                                                    aria-hidden="true"
                                                                >
                                                                    <Icon
                                                                        size={
                                                                            20
                                                                        }
                                                                    />
                                                                </span>
                                                                <span className="sl-cm-lesson-editor__type-copy">
                                                                    <strong>
                                                                        {label}
                                                                    </strong>
                                                                    <span>
                                                                        {
                                                                            description
                                                                        }
                                                                    </span>
                                                                </span>
                                                                <CheckCircle2
                                                                    size={18}
                                                                    className="sl-cm-lesson-editor__type-check"
                                                                    aria-hidden="true"
                                                                />
                                                            </label>
                                                        );
                                                    },
                                                )}
                                            </div>
                                            {hasPendingLessonTypeChange && (
                                                <div
                                                    id="lesson-type-change-notice"
                                                    className="sl-cm-lesson-editor__type-notice"
                                                    role="status"
                                                    aria-live="polite"
                                                >
                                                    <AlertCircle
                                                        size={18}
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        <strong>
                                                            Save to switch to {" "}
                                                            {selectedTypeLabel}.
                                                        </strong>{" "}
                                                        Step 2 will update after
                                                        the backend confirms the
                                                        new lesson type.
                                                    </span>
                                                </div>
                                            )}
                                        </fieldset>
                                    )}
                                    <div className="sl-cm-lesson-editor__description-field">
                                        {lessonType === "QUIZ" ? (
                                            <div>
                                                <label
                                                    className="sl-cm-lesson-editor__field-label"
                                                    htmlFor="lesson-quiz-title"
                                                >
                                                    Quiz title{" "}
                                                    <span className="required">
                                                        *
                                                    </span>
                                                </label>
                                                <input
                                                    id="lesson-quiz-title"
                                                    type="text"
                                                    value={
                                                        parseQuizContent(
                                                            textContent,
                                                        ).title
                                                    }
                                                    onChange={(event) => {
                                                        const parsed =
                                                            parseQuizContent(
                                                                textContent,
                                                            );
                                                        setTextContent(
                                                            serializeQuizContent(
                                                                event.target
                                                                    .value,
                                                                parsed.questions,
                                                            ),
                                                        );
                                                        setSummaryError("");
                                                        markChanged();
                                                    }}
                                                    placeholder="Enter quiz title"
                                                    className="sl-cm-lesson-editor__field-control"
                                                    aria-invalid={
                                                        summaryError
                                                            ? "true"
                                                            : undefined
                                                    }
                                                />
                                                {summaryError ? (
                                                    <p
                                                        className="sl-cm-lesson-editor__field-help sl-cm-lesson-editor__field-help--error"
                                                        role="alert"
                                                    >
                                                        {summaryError}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="sl-cm-lesson-editor__field-label">
                                                    Description{" "}
                                                    <span className="required">
                                                        *
                                                    </span>
                                                </label>
                                                <RichTextEditor
                                                    value={summary}
                                                    onChange={(value) => {
                                                        setSummary(value);
                                                        setSummaryError("");
                                                        markChanged();
                                                    }}
                                                    placeholder="Describe what learners will study..."
                                                    minHeight={220}
                                                    imageUploader={
                                                        uploadSummaryImage
                                                    }
                                                    videoUploader={
                                                        uploadSummaryVideo
                                                    }
                                                />
                                                {summaryError ? (
                                                    <p
                                                        className="sl-cm-lesson-editor__field-help sl-cm-lesson-editor__field-help--error"
                                                        role="alert"
                                                    >
                                                        {summaryError}
                                                    </p>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="sl-lesson-step__footer">
                                    <Button
                                        type={
                                            hasPendingLessonTypeChange
                                                ? "submit"
                                                : "button"
                                        }
                                        variant={
                                            hasPendingLessonTypeChange
                                                ? "primary"
                                                : "outline"
                                        }
                                        loading={
                                            hasPendingLessonTypeChange &&
                                            loading
                                        }
                                        disabled={editorBusy}
                                        onClick={
                                            hasPendingLessonTypeChange
                                                ? undefined
                                                : () =>
                                                      openSection("material")
                                        }
                                    >
                                        {hasPendingLessonTypeChange
                                            ? "Save type & continue"
                                            : "Next: Material & resources"}
                                    </Button>
                                </div>
                            </LessonEditorSection>

                            <LessonEditorSection
                                id="lesson-step-material"
                                step="2"
                                title="Material and resources"
                                description="Add the lesson material and supporting resources."
                                summary={materialSummary}
                                state={
                                    videoUploaderBusy ||
                                    uploadingPdf ||
                                    uploadingResources ||
                                    assignmentLoading
                                        ? "processing"
                                        : materialComplete
                                          ? "complete"
                                          : "incomplete"
                                }
                                stateLabel={
                                    videoUploaderBusy ||
                                    uploadingPdf ||
                                    uploadingResources ||
                                    assignmentLoading
                                        ? "Processing"
                                        : materialComplete
                                          ? "Complete"
                                          : "Items missing"
                                }
                                expanded={expandedSection === "material"}
                                onToggle={() =>
                                    setExpandedSection((current) =>
                                        current === "material"
                                            ? ""
                                            : "material",
                                    )
                                }
                            >
                                <div className="sl-cm-lesson-editor__material-layout">
                                    {lessonType !== "QUIZ" &&
                                        lessonType !== "ESSAY" && (
                                            <LessonResourceUploader
                                                resources={resources}
                                                onResourcesChange={(
                                                    nextResources,
                                                ) => {
                                                    setResources(nextResources);
                                                    markChanged();
                                                }}
                                                showToast={showToast}
                                                onBusyChange={
                                                    setUploadingResources
                                                }
                                            />
                                        )}

                                    <div className="sl-cm-lesson-editor__panel-body">
                                        {lessonType === "VIDEO" && (
                                            <HlsVideoUploader
                                                lessonId={lessonId}
                                                videoUrl={videoUrl}
                                                onVideoUrlChange={(nextUrl) => {
                                                    setVideoUrl(nextUrl);
                                                    markChanged();
                                                }}
                                                showToast={showToast}
                                                getLatestVideoUrl={
                                                    syncLatestLessonVideoUrl
                                                }
                                                onBusyChange={
                                                    setVideoUploaderBusy
                                                }
                                                onStatusChange={
                                                    setHlsProcessingStatus
                                                }
                                            />
                                        )}

                                        {lessonType === "VIDEO" && videoAi?.service && (
                                            <VideoAiStatusPanel
                                                service={videoAi.service}
                                                reviewPath={videoAi.reviewPath}
                                                hlsStatus={hlsProcessingStatus}
                                                showToast={showToast}
                                            />
                                        )}

                                        {lessonType === "PDF" && (
                                            <PdfMaterialUploader
                                                attachmentUrl={uploadedFileUrl}
                                                onAttachmentUrlChange={(
                                                    nextUrl,
                                                ) => {
                                                    setUploadedFileUrl(nextUrl);
                                                    markChanged();
                                                }}
                                                showToast={showToast}
                                                onBusyChange={setUploadingPdf}
                                            />
                                        )}
                                        {lessonType === "QUIZ" &&
                                            features.quizManager && (
                                                <QuizQuestionsPanel
                                                    lessonId={lessonId}
                                                    lessonTitle={title}
                                                    service={services}
                                                    onSaved={async () => {
                                                        const response =
                                                            await services.getLessonDetail(
                                                                lessonId,
                                                            );
                                                        const nextLesson =
                                                            response?.data ||
                                                            response;
                                                        setTextContent(
                                                            nextLesson?.content ||
                                                                "",
                                                        );
                                                        setExistingLessonData(
                                                            (current) => ({
                                                                ...current,
                                                                ...nextLesson,
                                                            }),
                                                        );
                                                    }}
                                                />
                                            )}
                                        {lessonType === "ESSAY" && (
                                            <div className="sl-cm-lesson-editor__essay-card">
                                                {assignmentLoading ? (
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "10px",
                                                            color: "#64748b",
                                                        }}
                                                    >
                                                        <Loader2
                                                            className="animate-spin"
                                                            size={18}
                                                        />
                                                        <span>
                                                            Loading essay
                                                            content...
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                flexDirection:
                                                                    "column",
                                                                flex: "1 1 auto",
                                                                minHeight: 0,
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    display:
                                                                        "block",
                                                                    marginBottom:
                                                                        "8px",
                                                                    fontWeight: 600,
                                                                    color: "#1e293b",
                                                                    fontSize:
                                                                        "14px",
                                                                }}
                                                            >
                                                                Assignment File
                                                            </span>
                                                            {assignmentFile ||
                                                            existingAssignmentFile ? (
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        alignItems:
                                                                            "center",
                                                                        justifyContent:
                                                                            "space-between",
                                                                        gap: "12px",
                                                                        width: "100%",
                                                                        flex: "1 1 auto",
                                                                        boxSizing:
                                                                            "border-box",
                                                                        minWidth: 0,
                                                                        padding:
                                                                            "12px 14px",
                                                                        border: "1px solid #cbd5e1",
                                                                        borderRadius:
                                                                            "10px",
                                                                        background:
                                                                            "#f8fafc",
                                                                        minHeight:
                                                                            "84px",
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            display:
                                                                                "flex",
                                                                            alignItems:
                                                                                "center",
                                                                            gap: "10px",
                                                                            color: "#334155",
                                                                            flex: "1 1 auto",
                                                                            minWidth: 0,
                                                                        }}
                                                                    >
                                                                        <Paperclip
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                        <span
                                                                            style={{
                                                                                display:
                                                                                    "block",
                                                                                flex: "1 1 auto",
                                                                                minWidth: 0,
                                                                                maxWidth:
                                                                                    "100%",
                                                                                overflow:
                                                                                    "hidden",
                                                                                textOverflow:
                                                                                    "ellipsis",
                                                                                whiteSpace:
                                                                                    "nowrap",
                                                                            }}
                                                                        >
                                                                            {assignmentFile?.name ||
                                                                                existingAssignmentFile?.fileName}
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        aria-label="Remove assignment file"
                                                                        onClick={() => {
                                                                            setAssignmentFile(
                                                                                null,
                                                                            );
                                                                            setExistingAssignmentFile(
                                                                                null,
                                                                            );
                                                                            markChanged();
                                                                        }}
                                                                        style={{
                                                                            border: "none",
                                                                            background:
                                                                                "transparent",
                                                                            cursor: "pointer",
                                                                            color: "#64748b",
                                                                        }}
                                                                    >
                                                                        <X
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <label
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        alignItems:
                                                                            "center",
                                                                        justifyContent:
                                                                            "center",
                                                                        gap: "12px",
                                                                        width: "100%",
                                                                        minHeight:
                                                                            "240px",
                                                                        flex: "1 1 auto",
                                                                        boxSizing:
                                                                            "border-box",
                                                                        padding:
                                                                            "18px",
                                                                        border: "1px dashed #94a3b8",
                                                                        borderRadius:
                                                                            "12px",
                                                                        cursor: "pointer",
                                                                        color: "#475569",
                                                                        background:
                                                                            "#fff",
                                                                    }}
                                                                >
                                                                    <Paperclip
                                                                        size={
                                                                            20
                                                                        }
                                                                    />
                                                                    <span>
                                                                        Upload
                                                                        essay
                                                                        assignment
                                                                        file
                                                                    </span>
                                                                    <input
                                                                        type="file"
                                                                        hidden
                                                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                                                                        onChange={(
                                                                            event,
                                                                        ) => {
                                                                            setAssignmentFile(
                                                                                event
                                                                                    .target
                                                                                    .files?.[0] ||
                                                                                    null,
                                                                            );
                                                                            markChanged();
                                                                        }}
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="sl-lesson-step__footer">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => openSection("settings")}
                                    >
                                        Next: Lesson settings
                                    </Button>
                                </div>
                            </LessonEditorSection>

                            <LessonEditorSection
                                id="lesson-step-settings"
                                step="3"
                                title="Lesson settings"
                                description="Configure status, duration, and preview access."
                                summary={`${statusLabel} · ${durationSeconds ? `${durationSeconds} seconds` : "No duration"} · Preview ${isPreview ? "enabled" : "disabled"}`}
                                state={
                                    settingsComplete
                                        ? "complete"
                                        : "incomplete"
                                }
                                stateLabel={
                                    settingsComplete ? "Complete" : "Incomplete"
                                }
                                expanded={expandedSection === "settings"}
                                onToggle={() =>
                                    setExpandedSection((current) =>
                                        current === "settings"
                                            ? ""
                                            : "settings",
                                    )
                                }
                            >
                                <div className="sl-cm-lesson-editor__settings-grid">
                                    <div className="sl-cm-lesson-editor__settings-field">
                                        <div>
                                            <label
                                                className="sl-cm-lesson-editor__field-label"
                                                htmlFor="lesson-settings-status"
                                            >
                                                Lesson status
                                            </label>
                                            <p>
                                                {statusMeta?.description ||
                                                    "Choose whether learners can access this lesson."}
                                            </p>
                                        </div>
                                        <select
                                            id="lesson-settings-status"
                                            value={status}
                                            onChange={(event) => {
                                                setStatus(event.target.value);
                                                markChanged();
                                            }}
                                            className="sl-cm-lesson-editor__field-control"
                                        >
                                            {LESSON_STATUS_OPTIONS.map(
                                                (option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                    <div className="sl-cm-lesson-editor__settings-field">
                                        <div>
                                            <label
                                                className="sl-cm-lesson-editor__field-label"
                                                htmlFor="lesson-duration-input"
                                            >
                                                Estimated duration
                                            </label>
                                            <p>
                                                Used to estimate the learner's
                                                course duration.
                                            </p>
                                        </div>
                                        <div className="sl-cm-lesson-editor__input-unit">
                                            <input
                                                id="lesson-duration-input"
                                                type="number"
                                                min="0"
                                                inputMode="numeric"
                                                value={durationSeconds}
                                                onChange={(event) => {
                                                    setDurationSeconds(
                                                        Math.max(
                                                            0,
                                                            Number(
                                                                event.target
                                                                    .value || 0,
                                                            ),
                                                        ),
                                                    );
                                                    markChanged();
                                                }}
                                                className="sl-cm-lesson-editor__field-control"
                                            />
                                            <span aria-hidden="true">
                                                seconds
                                            </span>
                                        </div>
                                    </div>

                                    <label className="sl-cm-lesson-editor__preview-setting sl-cm-lesson-editor__preview-setting--settings">
                                        <span className="sl-cm-lesson-editor__preview-copy">
                                            <strong>Preview lesson</strong>
                                            <small id="lesson-preview-help">
                                                Let learners view this lesson
                                                before enrolling.
                                            </small>
                                        </span>
                                        <span className="sl-cm-lesson-editor__switch">
                                            <input
                                                type="checkbox"
                                                checked={isPreview}
                                                aria-describedby="lesson-preview-help"
                                                onChange={(event) => {
                                                    setIsPreview(
                                                        event.target.checked,
                                                    );
                                                    markChanged();
                                                }}
                                            />
                                            <span
                                                className="sl-cm-lesson-editor__switch-track"
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </label>
                                </div>
                            </LessonEditorSection>
                        </div>

                        <div className="sl-cm-lesson-editor__sticky">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => backPath && navigate(backPath)}
                            >
                                Cancel
                            </Button>
                            <span
                                className="sl-cm-lesson-editor__sticky-state"
                                aria-live="polite"
                            >
                                {editorBusy
                                    ? "Saving or processing..."
                                    : hasChanges
                                      ? "Unsaved changes"
                                      : "Ready"}
                            </span>
                            <div className="sl-cm-lesson-editor__sticky-spacer" />
                            <Button
                                type="submit"
                                variant="primary"
                                loading={loading}
                                disabled={editorBusy}
                                leftIcon={<Save size={16} />}
                            >
                                {assignmentSaving
                                    ? "Saving assignment..."
                                    : videoUploaderBusy
                                      ? "Processing..."
                                      : "Save changes"}
                            </Button>
                        </div>
                    </form>
                )
            ) : (
                <div className="sl-cm-lesson-editor__audit">
                    <h3 className="sl-cm-lesson-editor__audit-title">
                        Activity log
                    </h3>

                    {historyLoading ? (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                padding: "40px",
                                gap: "10px",
                                color: "#64748b",
                            }}
                        >
                            <Loader2 className="animate-spin" size={20} />
                            <span>Loading audit logs from the system...</span>
                        </div>
                    ) : editHistory.length === 0 ? (
                        <div
                            style={{
                                padding: "40px",
                                textAlign: "center",
                                color: "#94a3b8",
                            }}
                        >
                            No audit logs found for this lesson.
                        </div>
                    ) : (
                        <>
                            <div style={{ overflowX: "auto" }}>
                                <table
                                    style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        textAlign: "left",
                                        fontSize: "14px",
                                    }}
                                >
                                    <thead>
                                        <tr
                                            style={{
                                                borderBottom:
                                                    "2px solid #edf2f7",
                                                color: "#64748b",
                                            }}
                                        >
                                            <th
                                                style={{
                                                    padding: "12px 16px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                Timestamp
                                            </th>
                                            <th
                                                style={{
                                                    padding: "12px 16px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                Actor (Email)
                                            </th>
                                            <th
                                                style={{
                                                    padding: "12px 16px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                Role
                                            </th>
                                            <th
                                                style={{
                                                    padding: "12px 16px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                Action / Summary
                                            </th>
                                            <th
                                                style={{
                                                    padding: "12px 16px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {editHistory.map((log) => (
                                            <tr
                                                key={log.id}
                                                style={{
                                                    borderBottom:
                                                        "1px solid #edf2f7",
                                                    color: "#334155",
                                                }}
                                            >
                                                <td
                                                    style={{
                                                        padding: "16px",
                                                        color: "#64748b",
                                                    }}
                                                >
                                                    {formatDateTime(
                                                        log.occurredAt,
                                                    )}
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "16px",
                                                        fontWeight: "500",
                                                    }}
                                                >
                                                    {log.actorEmail || "N/A"}
                                                </td>
                                                <td style={{ padding: "16px" }}>
                                                    <span
                                                        style={{
                                                            padding: "4px 8px",
                                                            backgroundColor:
                                                                "#f1f5f9",
                                                            borderRadius: "4px",
                                                            fontSize: "12px",
                                                            fontWeight: "500",
                                                        }}
                                                    >
                                                        {log.actorRole}
                                                    </span>
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "16px",
                                                        fontWeight: "500",
                                                    }}
                                                >
                                                    {log.summary}
                                                </td>
                                                <td style={{ padding: "16px" }}>
                                                    <span
                                                        style={{
                                                            padding: "4px 8px",
                                                            borderRadius: "4px",
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            backgroundColor:
                                                                log.result ===
                                                                "SUCCESS"
                                                                    ? "#dcfce7"
                                                                    : "#fee2e2",
                                                            color:
                                                                log.result ===
                                                                "SUCCESS"
                                                                    ? "#15803d"
                                                                    : "#b91c1c",
                                                        }}
                                                    >
                                                        {log.result}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalElements > 0 && (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginTop: "24px",
                                        paddingTop: "16px",
                                        borderTop: "1px solid #e2e8f0",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "14px",
                                            color: "#64748b",
                                        }}
                                    >
                                        Showing{" "}
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                color: "#334155",
                                            }}
                                        >
                                            {currentPage * pageSize + 1}
                                        </span>{" "}
                                        to{" "}
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                color: "#334155",
                                            }}
                                        >
                                            {Math.min(
                                                (currentPage + 1) * pageSize,
                                                totalElements,
                                            )}
                                        </span>{" "}
                                        of{" "}
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                color: "#334155",
                                            }}
                                        >
                                            {totalElements}
                                        </span>{" "}
                                        entries
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                        }}
                                    >
                                        <button
                                            onClick={() =>
                                                setCurrentPage((prev) =>
                                                    Math.max(0, prev - 1),
                                                )
                                            }
                                            disabled={currentPage === 0}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px",
                                                padding: "6px 12px",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: "6px",
                                                backgroundColor:
                                                    currentPage === 0
                                                        ? "#f8fafc"
                                                        : "#fff",
                                                color:
                                                    currentPage === 0
                                                        ? "#94a3b8"
                                                        : "#334155",
                                                cursor:
                                                    currentPage === 0
                                                        ? "not-allowed"
                                                        : "pointer",
                                                fontSize: "13px",
                                                fontWeight: "500",
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            <ChevronLeft size={16} /> Previous
                                        </button>

                                        <div
                                            style={{
                                                fontSize: "13px",
                                                fontWeight: "500",
                                                color: "#475569",
                                                padding: "0 8px",
                                            }}
                                        >
                                            Page {currentPage + 1} of{" "}
                                            {totalPages}
                                        </div>

                                        <button
                                            onClick={() =>
                                                setCurrentPage((prev) =>
                                                    Math.min(
                                                        totalPages - 1,
                                                        prev + 1,
                                                    ),
                                                )
                                            }
                                            disabled={
                                                currentPage >= totalPages - 1 ||
                                                totalPages === 0
                                            }
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px",
                                                padding: "6px 12px",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: "6px",
                                                backgroundColor:
                                                    currentPage >=
                                                        totalPages - 1 ||
                                                    totalPages === 0
                                                        ? "#f8fafc"
                                                        : "#fff",
                                                color:
                                                    currentPage >=
                                                        totalPages - 1 ||
                                                    totalPages === 0
                                                        ? "#94a3b8"
                                                        : "#334155",
                                                cursor:
                                                    currentPage >=
                                                        totalPages - 1 ||
                                                    totalPages === 0
                                                        ? "not-allowed"
                                                        : "pointer",
                                                fontSize: "13px",
                                                fontWeight: "500",
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            Next <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default LessonDetailEditor;
