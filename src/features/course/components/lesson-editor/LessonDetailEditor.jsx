import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { courseService } from "@/services/course.service";
import { assignmentService } from "@/services/flashtest.service";
import { useToast } from "@/shared/components/ui/Toast/useToast";
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
import {
    ArrowLeft,
    Save,
    History,
    Edit3,
    ListChecks,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Paperclip,
    X,
} from "lucide-react";
import { QuizQuestionsPanel } from "../QuizQuestionManager";
import { HlsVideoUploader } from "./HlsVideoUploader";
import { PdfMaterialUploader } from "./PdfMaterialUploader";
import { LessonResourceUploader } from "./LessonResourceUploader";

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

    const [activeTab, setActiveTab] = useState("edit");
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [textContent, setTextContent] = useState("");
    const [lessonType, setLessonType] = useState("VIDEO");
    const [existingLessonData, setExistingLessonData] = useState(null);

    const [videoUrl, setVideoUrl] = useState("");
    const [uploadedFileUrl, setUploadedFileUrl] = useState("");
    const [resources, setResources] = useState([]);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [uploadingResources, setUploadingResources] = useState(false);
    const [videoUploaderBusy, setVideoUploaderBusy] = useState(false);

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

                    const typeFromServer = String(
                        lessonData.lessonType || lessonData.type || "VIDEO",
                    ).toUpperCase();

                    if (
                        typeFromServer === "PDF" ||
                        typeFromServer === "DOCUMENT"
                    ) {
                        setLessonType("PDF");
                    } else if (typeFromServer === "QUIZ") {
                        setLessonType("QUIZ");
                    } else if (typeFromServer === "FLASHCARD") {
                        setLessonType("FLASHCARD");
                    } else if (
                        typeFromServer === "ESSAY" ||
                        typeFromServer === "ASSIGNMENT"
                    ) {
                        setLessonType("ESSAY");
                    } else {
                        setLessonType("VIDEO");
                    }

                    const loadedResources =
                        lessonData.resources || lessonData.attachments || [];
                    setResources(
                        Array.isArray(loadedResources) ? loadedResources : [],
                    );
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

        if (!title.trim()) {
            showToast("Please enter tỉtle", "error");
            return;
        }

        const isQuiz = lessonType === "QUIZ";
        const usesLessonResources = !isQuiz && lessonType !== "ESSAY";
        const cleanSummary = sanitizeLessonHtml(summary);

        if (!isQuiz && isEmptyLessonHtml(cleanSummary)) {
            showToast("Lesson Summary Blank", "error");
            return;
        }

        setLoading(true);

        try {
            let resolvedVideoUrl = (videoUrl || "").trim();
            if (lessonType === "VIDEO" && !resolvedVideoUrl) {
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
                lessonType,
                content,
                videoUrl: lessonType === "VIDEO" ? resolvedVideoUrl : null,
                attachmentUrl: lessonType === "PDF" ? uploadedFileUrl : null,
                durationSeconds: Number(durationSeconds || 0),
                isPreview,
                status: normalizeLessonStatus(status),
                resources: normalizedResources,
                sortOrder: existingLessonData?.sortOrder ?? 0,
            };

            await services.updateLesson(lessonId, payload);

            if (lessonType === "ESSAY") {
                const assignmentSaved = await saveLessonAssignment({
                    title: title.trim(),
                    description: cleanSummary,
                });
                if (!assignmentSaved) return;
            }

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

            showToast(errorText, "error");
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

    if (pageLoading)
        return (
            <div
                style={{
                    padding: "40px",
                    fontWeight: "bold",
                    color: "#64748b",
                    textAlign: "center",
                }}
            >
                Loading lesson data...
            </div>
        );

    const showQuizTab = features.quizManager && lessonType === "QUIZ";

    return (
        <div
            style={{
                padding: "30px",
                maxWidth: "1350px",
                margin: "0 auto",
                fontFamily: "Inter, sans-serif",
            }}
        >
            <button
                type="button"
                onClick={() => backPath && navigate(backPath)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "none",
                    border: "none",
                    color: "#475569",
                    cursor: "pointer",
                    padding: 0,
                    marginBottom: "20px",
                    fontSize: "14px",
                    fontWeight: "500",
                }}
            >
                <ArrowLeft size={16} /> Back
            </button>

            <h1
                style={{
                    marginBottom: "24px",
                    color: "#0f172a",
                    fontSize: "28px",
                    fontWeight: "700",
                }}
            >
                Update Lesson
            </h1>

            <div
                style={{
                    display: "flex",
                    gap: "8px",
                    borderBottom: "1px solid #e2e8f0",
                    marginBottom: "30px",
                    paddingBottom: "1px",
                }}
            >
                <button
                    type="button"
                    onClick={() => {
                        setCurrentPage(0);
                        setActiveTab("edit");
                    }}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 20px",
                        fontSize: "15px",
                        fontWeight: "600",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: activeTab === "edit" ? "#2563eb" : "#64748b",
                        borderBottom:
                            activeTab === "edit"
                                ? "2px solid #2563eb"
                                : "2px solid transparent",
                        transition: "all 0.2s",
                    }}
                >
                    <Edit3 size={18} /> Edit Content
                </button>
                {features.audit && (
                    <button
                        type="button"
                        onClick={() => setActiveTab("history")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "12px 20px",
                            fontSize: "15px",
                            fontWeight: "600",
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            color:
                                activeTab === "history" ? "#2563eb" : "#64748b",
                            borderBottom:
                                activeTab === "history"
                                    ? "2px solid #2563eb"
                                    : "2px solid transparent",
                            transition: "all 0.2s",
                        }}
                    >
                        <History size={18} /> Audit History
                    </button>
                )}
                {showQuizTab && (
                    <button
                        type="button"
                        onClick={() => setActiveTab("questions")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "12px 20px",
                            fontSize: "15px",
                            fontWeight: "600",
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            color:
                                activeTab === "questions"
                                    ? "#2563eb"
                                    : "#64748b",
                            borderBottom:
                                activeTab === "questions"
                                    ? "2px solid #2563eb"
                                    : "2px solid transparent",
                            transition: "all 0.2s",
                        }}
                    >
                        <ListChecks size={18} /> Manage Questions
                    </button>
                )}
            </div>

            {activeTab === "questions" && showQuizTab ? (
                <QuizQuestionsPanel
                    lessonId={lessonId}
                    lessonTitle={title}
                    service={services}
                />
            ) : activeTab === "edit" ? (
                lessonType === "FLASHCARD" && features.flashcard ? (
                    <FlashcardLessonEditor
                        lessonId={lessonId}
                        initialSetId={initialFlashcardSetId}
                        defaultTitle={title}
                        showToast={showToast}
                        onTitleSaved={setTitle}
                        flashcardService={services.flashcardService}
                        stagingEnabled={features.flashcardStaging !== false}
                    />
                ) : (
                    <form onSubmit={handleSave}>
                        <div style={{ display: "flex", gap: "40px" }}>
                            <div
                                style={{
                                    flex: "3",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "28px",
                                    backgroundColor: "#fff",
                                    padding: "28px",
                                    borderRadius: "16px",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "minmax(0, 2fr) minmax(180px, 1fr) minmax(170px, 0.8fr)",
                                        gap: "20px",
                                        alignItems: "start",
                                    }}
                                >
                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                marginBottom: "8px",
                                                fontWeight: "600",
                                                color: "#1e293b",
                                                fontSize: "14px",
                                            }}
                                        >
                                            Title{" "}
                                            <span style={{ color: "#ef4444" }}>
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) =>
                                                setTitle(e.target.value)
                                            }
                                            style={{
                                                width: "100%",
                                                padding: "11px 16px",
                                                borderRadius: "8px",
                                                border: "1px solid #cbd5e1",
                                                fontSize: "15px",
                                                boxSizing: "border-box",
                                            }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                marginBottom: "8px",
                                                fontWeight: "600",
                                                color: "#1e293b",
                                                fontSize: "14px",
                                            }}
                                        >
                                            Lesson Type{" "}
                                            <span style={{ color: "#ef4444" }}>
                                                *
                                            </span>
                                        </label>
                                        <select
                                            value={lessonType}
                                            onChange={(e) =>
                                                setLessonType(e.target.value)
                                            }
                                            disabled={
                                                lessonType === "FLASHCARD"
                                            }
                                            style={{
                                                width: "100%",
                                                padding: "11px 16px",
                                                borderRadius: "8px",
                                                border: "1px solid #cbd5e1",
                                                fontSize: "15px",
                                                boxSizing: "border-box",
                                                backgroundColor: "#fff",
                                            }}
                                        >
                                            <option value="VIDEO">
                                                Video Lecture
                                            </option>
                                            <option value="PDF">
                                                Document / Reading
                                            </option>
                                            <option value="QUIZ">Quiz</option>
                                            <option value="ESSAY">Essay</option>
                                            {lessonType === "FLASHCARD" && (
                                                <option value="FLASHCARD">
                                                    Flashcard
                                                </option>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                marginBottom: "8px",
                                                fontWeight: "600",
                                                color: "#1e293b",
                                                fontSize: "14px",
                                            }}
                                        >
                                            Status{" "}
                                            <span style={{ color: "#ef4444" }}>
                                                *
                                            </span>
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) =>
                                                setStatus(e.target.value)
                                            }
                                            style={{
                                                width: "100%",
                                                padding: "11px 16px",
                                                borderRadius: "8px",
                                                border: "1px solid #cbd5e1",
                                                fontSize: "15px",
                                                boxSizing: "border-box",
                                                backgroundColor: "#fff",
                                            }}
                                            required
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
                                        <p
                                            style={{
                                                margin: "6px 0 0",
                                                color: "#64748b",
                                                fontSize: "12px",
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {getLessonStatusMeta(status)
                                                ?.description || ""}
                                        </p>
                                    </div>
                                </div>

                                {lessonType === "QUIZ" ? (
                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                marginBottom: "8px",
                                                fontWeight: "600",
                                                color: "#1e293b",
                                                fontSize: "14px",
                                            }}
                                        >
                                            Quiz Title
                                        </label>
                                        <input
                                            type="text"
                                            value={
                                                parseQuizContent(textContent)
                                                    .title
                                            }
                                            onChange={(e) => {
                                                const parsed =
                                                    parseQuizContent(
                                                        textContent,
                                                    );
                                                setTextContent(
                                                    serializeQuizContent(
                                                        e.target.value,
                                                        parsed.questions,
                                                    ),
                                                );
                                            }}
                                            placeholder="Enter quiz title"
                                            style={{
                                                width: "100%",
                                                padding: "11px 16px",
                                                borderRadius: "8px",
                                                border: "1px solid #cbd5e1",
                                                fontSize: "15px",
                                                boxSizing: "border-box",
                                            }}
                                        />
                                        <p
                                            style={{
                                                marginTop: "10px",
                                                fontSize: "13px",
                                                color: "#64748b",
                                            }}
                                        >
                                            Manage quiz questions in the
                                            "Manage Questions" tab above.
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                marginBottom: "8px",
                                                fontWeight: "600",
                                                color: "#1e293b",
                                                fontSize: "14px",
                                            }}
                                        >
                                            Summary{" "}
                                            <span style={{ color: "#ef4444" }}>
                                                *
                                            </span>
                                        </label>

                                        <RichTextEditor
                                            value={summary}
                                            onChange={setSummary}
                                            placeholder="Content Learning..."
                                            minHeight={260}
                                            imageUploader={uploadSummaryImage}
                                            videoUploader={uploadSummaryVideo}
                                        />
                                    </div>
                                )}

                                {lessonType !== "QUIZ" &&
                                    lessonType !== "ESSAY" && (
                                    <LessonResourceUploader
                                        resources={resources}
                                        onResourcesChange={setResources}
                                        showToast={showToast}
                                        onBusyChange={setUploadingResources}
                                    />
                                )}
                            </div>

                            <div
                                style={{
                                    flex: lessonType === "ESSAY" ? "3" : "2",
                                    minWidth: 0,
                                    backgroundColor: "#f8fafc",
                                    padding: "30px",
                                    borderRadius: "16px",
                                    border: "1px solid #e2e8f0",
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <div
                                    style={{
                                        flexGrow: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "16px",
                                    }}
                                >
                                    <h3
                                        style={{
                                            margin: 0,
                                            fontSize: "16px",
                                            color: "#0f172a",
                                        }}
                                    >
                                        Content
                                    </h3>
                                    {lessonType === "VIDEO" && (
                                        <HlsVideoUploader
                                            lessonId={lessonId}
                                            videoUrl={videoUrl}
                                            onVideoUrlChange={setVideoUrl}
                                            showToast={showToast}
                                            getLatestVideoUrl={
                                                syncLatestLessonVideoUrl
                                            }
                                            onBusyChange={setVideoUploaderBusy}
                                        />
                                    )}

                                    {lessonType === "PDF" && (
                                        <PdfMaterialUploader
                                            attachmentUrl={uploadedFileUrl}
                                            onAttachmentUrlChange={
                                                setUploadedFileUrl
                                            }
                                            showToast={showToast}
                                            onBusyChange={setUploadingPdf}
                                        />
                                    )}
                                    {lessonType === "QUIZ" && (
                                        <div
                                            style={{
                                                backgroundColor: "#fff",
                                                padding: "20px",
                                                borderRadius: "12px",
                                                border: "1px solid #cbd5e1",
                                                textAlign: "center",
                                            }}
                                        >
                                            <p
                                                style={{
                                                    color: "#64748b",
                                                    margin: 0,
                                                    fontSize: "14px",
                                                }}
                                            >
                                                Quiz content is edited in the
                                                left panel. Add questions and
                                                options using the Quiz Editor.
                                            </p>
                                        </div>
                                    )}
                                    {lessonType === "ESSAY" && (
                                        <div
                                            style={{
                                                backgroundColor: "#fff",
                                                padding: "20px",
                                                borderRadius: "12px",
                                                border: "1px solid #cbd5e1",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "18px",
                                                width: "100%",
                                                boxSizing: "border-box",
                                                minWidth: 0,
                                                flex: "1 1 auto",
                                                minHeight: "320px",
                                            }}
                                        >
                                            {assignmentLoading ? (
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "10px",
                                                        color: "#64748b",
                                                    }}
                                                >
                                                    <Loader2
                                                        className="animate-spin"
                                                        size={18}
                                                    />
                                                    <span>
                                                        Loading essay content...
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
                                                                color:
                                                                    "#1e293b",
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
                                                                    width:
                                                                        "100%",
                                                                    flex:
                                                                        "1 1 auto",
                                                                    boxSizing:
                                                                        "border-box",
                                                                    minWidth: 0,
                                                                    padding:
                                                                        "12px 14px",
                                                                    border:
                                                                        "1px solid #cbd5e1",
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
                                                                        gap:
                                                                            "10px",
                                                                        color:
                                                                            "#334155",
                                                                        flex:
                                                                            "1 1 auto",
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
                                                                            flex:
                                                                                "1 1 auto",
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
                                                                    onClick={() => {
                                                                        setAssignmentFile(
                                                                            null,
                                                                        );
                                                                        setExistingAssignmentFile(
                                                                            null,
                                                                        );
                                                                    }}
                                                                    style={{
                                                                        border:
                                                                            "none",
                                                                        background:
                                                                            "transparent",
                                                                        cursor:
                                                                            "pointer",
                                                                        color:
                                                                            "#64748b",
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
                                                                    width:
                                                                        "100%",
                                                                    minHeight:
                                                                        "240px",
                                                                    flex:
                                                                        "1 1 auto",
                                                                    boxSizing:
                                                                        "border-box",
                                                                    padding:
                                                                        "18px",
                                                                    border:
                                                                        "1px dashed #94a3b8",
                                                                    borderRadius:
                                                                        "12px",
                                                                    cursor:
                                                                        "pointer",
                                                                    color:
                                                                        "#475569",
                                                                    background:
                                                                        "#fff",
                                                                }}
                                                            >
                                                                <Paperclip
                                                                    size={20}
                                                                />
                                                                <span>
                                                                    Upload essay
                                                                    assignment
                                                                    file
                                                                </span>
                                                                <input
                                                                    type="file"
                                                                    hidden
                                                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        setAssignmentFile(
                                                                            event
                                                                                .target
                                                                                .files?.[0] ||
                                                                                null,
                                                                        )
                                                                    }
                                                                />
                                                            </label>
                                                        )}
                                                    </div>

                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: "14px",
                                        marginTop: "30px",
                                        borderTop: "1px solid #e2e8f0",
                                        paddingTop: "24px",
                                    }}
                                >
                                    <button
                                        type="submit"
                                        disabled={
                                            loading ||
                                            uploadingPdf ||
                                            uploadingResources ||
                                            videoUploaderBusy ||
                                            assignmentSaving
                                        }
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                            backgroundColor: "#2563eb",
                                            color: "#fff",
                                            border: "none",
                                            padding: "13px 28px",
                                            borderRadius: "10px",
                                            cursor: "pointer",
                                            fontWeight: "600",
                                            fontSize: "15px",
                                        }}
                                    >
                                        <Save size={18} />{" "}
                                        {loading
                                            ? "Saving..."
                                            : assignmentSaving
                                              ? "Saving assignment..."
                                            : videoUploaderBusy
                                              ? "Processing..."
                                              : "Save Changes"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            backPath && navigate(backPath)
                                        }
                                        style={{
                                            backgroundColor: "#fff",
                                            border: "1px solid #cbd5e1",
                                            padding: "13px 28px",
                                            borderRadius: "10px",
                                            cursor: "pointer",
                                            color: "#475569",
                                            fontWeight: "500",
                                            fontSize: "15px",
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )
            ) : (
                <div
                    style={{
                        backgroundColor: "#fff",
                        padding: "28px",
                        borderRadius: "16px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                >
                    <h3
                        style={{
                            margin: "0 0 20px 0",
                            fontSize: "18px",
                            color: "#1e293b",
                        }}
                    >
                        Lesson Audit Logs
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
                                                            borderRadius:
                                                                "4px",
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
                                                            borderRadius:
                                                                "4px",
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
                                                currentPage >=
                                                    totalPages - 1 ||
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
