import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { courseService } from "@/services/course.service";
import { flashcardService } from "@/services/flashcard.service";
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
} from "../utils/quiz-question-schema";
import {
    validateSummaryImage,
    validateSummaryVideo,
} from "@/shared/utils/summaryUploadValidation";
import {
    MATERIAL_DOC_EXTENSIONS,
    getFileExtension,
} from "@/features/course/utils/lesson-content";
import {
    LESSON_STATUS_OPTIONS,
    getLessonStatusMeta,
    normalizeLessonStatus,
} from "@/features/course/utils/lesson-status";
import {
    ArrowLeft,
    Save,
    CloudUpload,
    Video,
    File as FileIcon,
    X,
    FileText,
    History,
    Edit3,
    Loader2,
    Download,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

const ESSAY_INSTRUCTION_EXTENSIONS = [
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "png",
    "jpg",
    "jpeg",
    "zip",
];

export default function AdminLessonDetailPage() {
    const { courseId, lessonId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast: emitToast, removeToast } = useToast();
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
    const [mainContentFile, setMainContentFile] = useState(null);
    const [uploadedFileUrl, setUploadedFileUrl] = useState("");
    const [resources, setResources] = useState([]);
    const [essayAssignment, setEssayAssignment] = useState(null);
    const [essaySubmissions, setEssaySubmissions] = useState([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [gradeForms, setGradeForms] = useState({});
    const [gradingId, setGradingId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [uploadingMainFile, setUploadingMainFile] = useState(false);
    const [uploadingResources, setUploadingResources] = useState(false);

    // HLS Video Upload states
    const [hlsUploading, setHlsUploading] = useState(false);
    const [hlsProcessingStatus, setHlsProcessingStatus] = useState(null);
    const [hlsStatusPolling, setHlsStatusPolling] = useState(false);
    const [hlsStatusLoading, setHlsStatusLoading] = useState(true);
    const [hlsStatusError, setHlsStatusError] = useState("");
    const [hlsHealth, setHlsHealth] = useState(null);
    const hlsCompletionNotifiedRef = useRef(false);

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

    const mainFileInputRef = useRef(null);
    const resourceInputRef = useRef(null);

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

    const refreshHlsStatus = useCallback(async () => {
        if (!lessonId) return null;

        try {
            const nextStatus =
                await courseService.getHlsProcessingStatus(lessonId);
            setHlsStatusError("");
            setHlsProcessingStatus(nextStatus);
            setHlsStatusPolling(
                String(nextStatus?.hlsStatus || "").toLowerCase() ===
                    "processing",
            );
            return nextStatus;
        } catch (error) {
            setHlsStatusError(
                error?.message || "Unable to check HLS processing status.",
            );
            return null;
        } finally {
            setHlsStatusLoading(false);
        }
    }, [lessonId]);

    const syncLatestLessonVideoUrl = useCallback(async () => {
        const response = await courseService.getLessonDetail(lessonId);
        const latestLesson = response?.data || response;
        const latestVideoUrl = latestLesson?.videoUrl || "";

        setVideoUrl(latestVideoUrl);
        setExistingLessonData((current) => ({
            ...current,
            ...latestLesson,
        }));

        return latestVideoUrl;
    }, [lessonId]);

    useEffect(() => {
        const fetchLessonDetail = async () => {
            try {
                setPageLoading(true);
                const response = await courseService.getLessonDetail(lessonId);
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
                    } else if (typeFromServer === "ESSAY") {
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
    }, [lessonId, showToast]);

    useEffect(() => {
        if (lessonType !== "ESSAY" || !lessonId) return undefined;

        let cancelled = false;
        async function loadEssayAssignment() {
            try {
                const assignment = await assignmentService.getByLesson(lessonId);
                if (cancelled) return;
                setEssayAssignment(assignment);
                if (assignment?.instructionFileUrl) {
                    setUploadedFileUrl(assignment.instructionFileUrl);
                }
            } catch (error) {
                if (cancelled) return;
                if (error?.originalError?.response?.status !== 404) {
                    console.warn("Could not load essay assignment", error);
                }
                setEssayAssignment(null);
            }
        }

        loadEssayAssignment();
        return () => {
            cancelled = true;
        };
    }, [lessonId, lessonType]);

    useEffect(() => {
        if (pageLoading || !lessonId || lessonType !== "VIDEO")
            return undefined;

        let cancelled = false;

        async function fetchInitialHlsStatus() {
            try {
                const nextStatus =
                    await courseService.getHlsProcessingStatus(lessonId);
                if (cancelled) return;

                setHlsStatusError("");
                setHlsProcessingStatus(nextStatus);
                setHlsStatusPolling(
                    String(nextStatus?.hlsStatus || "").toLowerCase() ===
                        "processing",
                );
            } catch (error) {
                if (!cancelled) {
                    setHlsStatusError(
                        error?.message ||
                            "Unable to check HLS processing status.",
                    );
                }
            } finally {
                if (!cancelled) setHlsStatusLoading(false);
            }
        }

        async function fetchHlsHealth() {
            try {
                const health = await courseService.checkHlsHealth();
                if (!cancelled) setHlsHealth(health);
            } catch (error) {
                if (!cancelled) {
                    setHlsHealth(null);
                    console.error("Error loading HLS health:", error);
                }
            }
        }

        fetchInitialHlsStatus();
        fetchHlsHealth();

        return () => {
            cancelled = true;
        };
    }, [lessonId, lessonType, pageLoading]);

    useEffect(() => {
        if (!hlsStatusPolling || !lessonId) return undefined;

        let cancelled = false;
        let timerId;
        let attempts = 0;
        const maxAttempts = 240;

        async function poll() {
            try {
                const nextStatus =
                    await courseService.getHlsProcessingStatus(lessonId);
                if (cancelled) return;

                setHlsProcessingStatus(nextStatus);
                const normalizedStatus = String(
                    nextStatus?.hlsStatus || "",
                ).toLowerCase();

                if (normalizedStatus === "ready") {
                    setHlsStatusPolling(false);
                    try {
                        await syncLatestLessonVideoUrl();
                    } catch (syncError) {
                        console.error(
                            "Error syncing the completed HLS video URL:",
                            syncError,
                        );
                    }
                    if (!hlsCompletionNotifiedRef.current) {
                        hlsCompletionNotifiedRef.current = true;
                        showToast(
                            "Video processing completed. HLS is ready.",
                            "success",
                        );
                    }
                    return;
                }

                if (normalizedStatus === "failed") {
                    setHlsStatusPolling(false);
                    showToast(
                        nextStatus?.message ||
                            "Video processing failed. Please try again.",
                        "error",
                    );
                    return;
                }

                attempts += 1;
                if (attempts >= maxAttempts) {
                    setHlsStatusPolling(false);
                    showToast(
                        "Video processing is taking longer than expected. It will continue on the backend; refresh the status later.",
                        "error",
                    );
                    return;
                }

                timerId = window.setTimeout(poll, 5000);
            } catch (pollError) {
                if (cancelled) return;
                attempts += 1;
                console.error("Error polling HLS status:", pollError);

                if (attempts >= maxAttempts) {
                    setHlsStatusPolling(false);
                    setHlsStatusError(
                        "Unable to refresh HLS status. Processing may still be running on the backend.",
                    );
                    return;
                }

                timerId = window.setTimeout(poll, 5000);
            }
        }

        poll();

        return () => {
            cancelled = true;
            window.clearTimeout(timerId);
        };
    }, [hlsStatusPolling, lessonId, showToast, syncLatestLessonVideoUrl]);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            try {
                setHistoryLoading(true);
                const response = await courseService.getLessonAuditLogs(
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

        if (activeTab === "history" && lessonId) {
            fetchAuditLogs();
        }
    }, [activeTab, lessonId, currentPage, pageSize, showToast]);

    const handleDragOver = (e) => e.preventDefault();

    const handleDropMainFile = async (e) => {
        e.preventDefault();
        if (
            !uploadingMainFile &&
            e.dataTransfer.files &&
            e.dataTransfer.files.length > 0
        ) {
            const file = e.dataTransfer.files[0];
            await uploadMainFile(file);
        }
    };

    const handleMainFileSelect = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            await uploadMainFile(file);
            e.target.value = "";
        }
    };

    const uploadMainFile = async (file) => {
        // Validate định dạng & kích thước cho material tài liệu (lesson type PDF).
        if (lessonType === "PDF") {
            const extension = getFileExtension(file.name);
            if (!MATERIAL_DOC_EXTENSIONS.includes(extension)) {
                showToast(
                    "Only PDF, DOC or DOCX files are supported for this document",
                    "error",
                );
                return;
            }
        }
        if (lessonType === "ESSAY") {
            const extension = getFileExtension(file.name);
            if (!ESSAY_INSTRUCTION_EXTENSIONS.includes(extension)) {
                showToast(
                    "Only PDF, Word, PowerPoint, image, or ZIP files are supported for essay instructions",
                    "error",
                );
                return;
            }
        }
        const MAX_MATERIAL_SIZE = 50 * 1024 * 1024; // 50MB, khớp giới hạn backend
        if (file.size > MAX_MATERIAL_SIZE) {
            showToast("File is too large. Maximum size is 50MB", "error");
            return;
        }

        setUploadingMainFile(true);
        setMainContentFile(file);
        try {
            const uploadedFile =
                lessonType === "ESSAY"
                    ? await assignmentService.uploadFile(file)
                    : await courseService.uploadLessonMaterial(file);
            const uploadedUrl =
                uploadedFile?.url ||
                uploadedFile?.fileUrl ||
                uploadedFile?.data?.url ||
                uploadedFile?.data?.fileUrl ||
                "";
            if (!uploadedUrl) {
                throw new Error("Upload completed but no file URL was returned");
            }
            setUploadedFileUrl(uploadedUrl);
            if (lessonType === "VIDEO") {
                setVideoUrl(uploadedUrl);
            }
            showToast(`Successfully uploaded ${file.name}!`, "success");
        } catch (error) {
            setMainContentFile(null);
            showToast(
                getErrorMessage(error, "Error uploading file to the system"),
                "error",
            );
        } finally {
            setUploadingMainFile(false);
        }
    };

    const uploadResourceFiles = async (files) => {
        const availableSlots = 10 - resources.length;
        if (availableSlots <= 0) {
            showToast("A lesson can have at most 10 resource files", "error");
            return;
        }
        const selectedFiles = Array.from(files).slice(0, availableSlots);
        setUploadingResources(true);
        try {
            const uploadResults = await Promise.allSettled(
                selectedFiles.map((file) =>
                    courseService.uploadLessonResource(file),
                ),
            );
            const uploadedResources = uploadResults
                .filter((result) => result.status === "fulfilled")
                .map((result) => result.value);
            if (uploadedResources.length > 0) {
                setResources((currentResources) => [
                    ...currentResources,
                    ...uploadedResources,
                ]);
                showToast(
                    `Successfully uploaded ${uploadedResources.length} resource file(s)`,
                    "success",
                );
            }
        } finally {
            setUploadingResources(false);
        }
    };

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

    // HLS Video Upload functions
    const uploadHlsVideo = async (file) => {
        const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
        if (!file || file.size <= 0) {
            showToast("Please select a valid video file", "error");
            return;
        }
        if (file.size > MAX_VIDEO_SIZE) {
            showToast("Video file too large. Maximum size is 500MB", "error");
            return;
        }
        const isVideo =
            file.type?.startsWith("video/") ||
            /\.(mp4|mov|avi|mkv|webm|m4v|mpg|mpeg)$/i.test(file.name);
        if (!isVideo) {
            showToast("The selected file is not a supported video", "error");
            return;
        }

        const previousStatus = hlsProcessingStatus;
        setHlsUploading(true);
        setHlsStatusError("");
        setHlsProcessingStatus({
            hlsStatus: "uploading",
            progressPercent: 0,
            currentStep: "Preparing upload...",
        });
        try {
            const health = await courseService.checkHlsHealth();
            setHlsHealth(health);
            if (
                !health?.hlsEnabled ||
                String(health?.status || "").toLowerCase() !== "healthy"
            ) {
                showToast(
                    "The backend HLS processing provider is not available",
                    "error",
                );
                setHlsProcessingStatus(previousStatus);
                return;
            }

            setHlsProcessingStatus({
                hlsStatus: "uploading",
                progressPercent: 5,
                currentStep: "Uploading video to server...",
            });

            const replaceExisting = ["ready", "failed"].includes(
                String(hlsProcessingStatus?.hlsStatus || "").toLowerCase(),
            );
            const uploadResult = await courseService.uploadHlsVideo(
                lessonId,
                file,
                replaceExisting,
                (progressPercent) => {
                    setHlsProcessingStatus({
                        hlsStatus: "uploading",
                        progressPercent,
                        currentStep: "Uploading video to server...",
                    });
                },
            );
            showToast(
                uploadResult?.message ||
                    "Video uploaded. HLS processing started.",
                "success",
            );
            hlsCompletionNotifiedRef.current = false;
            setHlsProcessingStatus({
                ...uploadResult,
                hlsStatus: uploadResult?.status || "processing",
                progressPercent: 0,
                currentStep:
                    uploadResult?.message || "Starting HLS processing...",
            });
            setHlsStatusPolling(
                String(uploadResult?.status || "processing").toLowerCase() ===
                    "processing",
            );
            await refreshHlsStatus();
        } catch (error) {
            console.error("HLS upload error:", error);
            showToast(
                getErrorMessage(
                    error,
                    "Error uploading video for HLS processing",
                ),
                "error",
            );
            setHlsProcessingStatus(previousStatus);
        } finally {
            setHlsUploading(false);
        }
    };

    const handleDropResources = async (e) => {
        e.preventDefault();
        if (
            !uploadingResources &&
            e.dataTransfer.files &&
            e.dataTransfer.files.length > 0
        ) {
            await uploadResourceFiles(e.dataTransfer.files);
        }
    };

    const handleResourceSelect = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            await uploadResourceFiles(e.target.files);
            e.target.value = "";
        }
    };

    const removeResource = (indexToRemove) => {
        setResources((currentResources) =>
            currentResources.filter((_, index) => index !== indexToRemove),
        );
    };

    const loadEssaySubmissions = useCallback(async () => {
        if (!essayAssignment?.id) return;
        setSubmissionsLoading(true);
        try {
            const submissions = await assignmentService.getSubmissionsByAssignment(
                essayAssignment.id,
            );
            setEssaySubmissions(Array.isArray(submissions) ? submissions : []);
        } catch (error) {
            console.error("Error loading essay submissions:", error);
            showToast("Failed to load essay submissions", "error");
        } finally {
            setSubmissionsLoading(false);
        }
    }, [essayAssignment?.id, showToast]);

    useEffect(() => {
        if (activeTab === "submissions") {
            loadEssaySubmissions();
        }
    }, [activeTab, loadEssaySubmissions]);

    const downloadEssayFile = async (submission) => {
        if (!submission?.fileUrl) return;
        setDownloadingId(submission.id);
        try {
            const blob = await assignmentService.downloadFile(submission.fileUrl);
            const href = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = href;
            link.download = submission.fileName || "submission";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(href);
        } catch (error) {
            showToast(error?.message || "Could not download submission", "error");
        } finally {
            setDownloadingId(null);
        }
    };

    const updateGradeForm = (submissionId, patch) => {
        setGradeForms((current) => ({
            ...current,
            [submissionId]: {
                score: "",
                ...(current[submissionId] || {}),
                ...patch,
            },
        }));
    };

    const gradeEssaySubmission = async (submission) => {
        const score = Number(gradeForms[submission.id]?.score);
        if (!Number.isFinite(score) || score < 0 || score > 10) {
            showToast("Please enter a score from 0 to 10", "error");
            return;
        }

        setGradingId(submission.id);
        try {
            await assignmentService.gradeSubmission(submission.id, {
                score,
                status: "GRADED",
            });
            setGradeForms((current) => {
                const next = { ...current };
                delete next[submission.id];
                return next;
            });
            await loadEssaySubmissions();
            showToast("Submission graded", "success");
        } catch (error) {
            showToast(error?.message || "Could not grade submission", "error");
        } finally {
            setGradingId(null);
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
        const isEssay = lessonType === "ESSAY";
        const isFlashcard = lessonType === "FLASHCARD";
        const cleanSummary = sanitizeLessonHtml(summary);
        const summaryIsEmpty = isEmptyLessonHtml(cleanSummary);

        if (!isQuiz && !isFlashcard && summaryIsEmpty) {
            showToast("Lesson Summary Blank", "error");
            return;
        }

        setLoading(true);

        try {
            let resolvedVideoUrl = videoUrl.trim();
            const normalizedHlsStatus = String(
                hlsProcessingStatus?.hlsStatus || "",
            ).toLowerCase();

            if (lessonType === "VIDEO" && normalizedHlsStatus === "ready") {
                resolvedVideoUrl = await syncLatestLessonVideoUrl();
                if (!resolvedVideoUrl) {
                    throw new Error(
                        "The HLS video is ready, but its playlist URL could not be synchronized. Refresh the page before saving.",
                    );
                }
            }

            const normalizedResources = isQuiz
                || isEssay
                ? []
                : resources
                      .map((resource, index) =>
                          normalizeResourceForPayload(resource, index),
                      )
                      .filter(Boolean)
                      .slice(0, 10);

            // Với Quiz: giữ nguyên questions hiện có, chỉ cập nhật quiz title.
            const parsedQuiz = isQuiz ? parseQuizContent(textContent) : null;
            const content = isQuiz
                ? serializeQuizContent(parsedQuiz.title, parsedQuiz.questions)
                : isFlashcard && summaryIsEmpty
                  ? null
                  : cleanSummary;

            const payload = isFlashcard
                ? {
                      title: title.trim(),
                      lessonType: "FLASHCARD",
                      content,
                      durationSeconds: Number(durationSeconds || 0),
                      isPreview,
                      status: normalizeLessonStatus(status),
                      sortOrder: existingLessonData?.sortOrder ?? 0,
                  }
                : {
                      title: title.trim(),
                      lessonType,
                      content,
                      videoUrl: lessonType === "VIDEO" ? resolvedVideoUrl : null,
                      attachmentUrl:
                          lessonType === "PDF" || lessonType === "ESSAY"
                              ? uploadedFileUrl
                              : null,
                      durationSeconds: Number(durationSeconds || 0),
                      isPreview,
                      status: normalizeLessonStatus(status),
                      resources: normalizedResources,
                      sortOrder: existingLessonData?.sortOrder ?? 0,
                  };

            await courseService.updateLesson(lessonId, payload);

            if (isFlashcard) {
                try {
                    const flashcardSet =
                        await flashcardService.getAdminSetByLesson(lessonId);
                    if (flashcardSet?.id) {
                        await flashcardService.updateSet(flashcardSet.id, {
                            title: title.trim(),
                        });
                    }
                } catch (syncError) {
                    console.warn(
                        "Flashcard set title sync failed after lesson update:",
                        syncError,
                    );
                }
            }

            if (isEssay) {
                const assignmentPayload = {
                    lessonId,
                    title: title.trim(),
                    description: cleanSummary,
                    instructionFileUrl: uploadedFileUrl || null,
                    instructionFileName:
                        mainContentFile?.name ||
                        getFileNameFromUrl(uploadedFileUrl) ||
                        null,
                    dueDate: null,
                    allowLateSubmission: true,
                    maxScore: 10,
                    isFlashtest: false,
                };

                const savedAssignment = essayAssignment?.id
                    ? await assignmentService.update(
                          essayAssignment.id,
                          assignmentPayload,
                      )
                    : await assignmentService.create(assignmentPayload);
                setEssayAssignment(savedAssignment);
            }

            showToast("Update successfully!", "success");
            navigate(`/admin/courses/${courseId}/content`);
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

    const isHlsProviderUnavailable = Boolean(
        hlsHealth &&
        (!hlsHealth.hlsEnabled ||
            String(hlsHealth.status || "").toLowerCase() !== "healthy"),
    );
    const isHlsOperationBusy =
        hlsStatusLoading || hlsUploading || hlsStatusPolling;
    const hlsProviderLabel =
        hlsProcessingStatus?.processingProvider === "github-actions" ||
        hlsHealth?.processingProvider === "github-actions"
            ? "GitHub Actions"
            : hlsProcessingStatus?.processingProvider ||
              hlsHealth?.processingProvider ||
              "";
    const isFlashcardLesson = lessonType === "FLASHCARD";
    const activeSecondaryTab = lessonType === "ESSAY" ? "submissions" : "history";
    const lessonTabs = isFlashcardLesson
        ? [
              { key: "edit", label: "Edit Content", icon: Edit3 },
              { key: "flashcard-current", label: "Current Flashcards", icon: FileText },
              { key: "flashcard-review", label: "Staging Review", icon: FileText },
              { key: "history", label: "Audit History", icon: History },
          ]
        : [
              { key: "edit", label: "Edit Content", icon: Edit3 },
              {
                  key: activeSecondaryTab,
                  label:
                      lessonType === "ESSAY"
                          ? "Student Submissions"
                          : "Audit History",
                  icon: History,
              },
          ];
    const tabButtonStyle = (tabKey) => ({
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 20px",
        fontSize: "15px",
        fontWeight: "600",
        border: "none",
        background: "none",
        cursor: "pointer",
        color: activeTab === tabKey ? "#2563eb" : "#64748b",
        borderBottom:
            activeTab === tabKey ? "2px solid #2563eb" : "2px solid transparent",
        transition: "all 0.2s",
    });

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
                onClick={() => navigate(`/admin/courses/${courseId}/content`)}
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
                <ArrowLeft size={16} /> Back to Course Structure
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
                {lessonTabs.map((tab) => {
                    const TabIcon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => {
                                setCurrentPage(0);
                                setActiveTab(tab.key);
                            }}
                            style={tabButtonStyle(tab.key)}
                        >
                            <TabIcon size={18} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {isFlashcardLesson &&
            ["flashcard-current", "flashcard-review"].includes(activeTab) ? (
                    <FlashcardLessonEditor
                        lessonId={lessonId}
                        initialSetId={initialFlashcardSetId}
                        defaultTitle={title}
                        activeSection={
                            activeTab === "flashcard-current"
                                ? "current"
                                : "review"
                        }
                        showToast={showToast}
                        dismissToast={removeToast}
                        onTitleSaved={setTitle}
                        onNavigateToCurrent={() => setActiveTab("flashcard-current")}
                    />
            ) : activeTab === "edit" ? (
                <>
                    <form onSubmit={handleSave}>
                        <div style={{ display: "flex", gap: isFlashcardLesson ? "0" : "40px" }}>
                            <div
                                style={{
                                    flex: isFlashcardLesson ? "1" : "3",
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
                                            onChange={(e) => {
                                                if (
                                                    isFlashcardLesson &&
                                                    e.target.value !==
                                                        "FLASHCARD"
                                                ) {
                                                    return;
                                                }
                                                setLessonType(e.target.value);
                                            }}
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
                                            <option
                                                value="VIDEO"
                                                disabled={isFlashcardLesson}
                                            >
                                                Video Lecture
                                            </option>
                                            <option
                                                value="PDF"
                                                disabled={isFlashcardLesson}
                                            >
                                                Document / Reading
                                            </option>
                                            <option
                                                value="QUIZ"
                                                disabled={isFlashcardLesson}
                                            >
                                                Quiz
                                            </option>
                                            <option
                                                value="ESSAY"
                                                disabled={isFlashcardLesson}
                                            >
                                                Essay
                                            </option>
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
                                            Manage quiz questions from the
                                            course content page using the
                                            "Manage questions" button.
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
                                            {!isFlashcardLesson && (
                                                <span style={{ color: "#ef4444" }}>
                                                    *
                                                </span>
                                            )}
                                        </label>

                                        <RichTextEditor
                                            value={summary}
                                            onChange={setSummary}
                                            placeholder={
                                                isFlashcardLesson
                                                    ? "Optional lesson summary..."
                                                    : "Content Learning..."
                                            }
                                            minHeight={260}
                                            imageUploader={uploadSummaryImage}
                                            videoUploader={uploadSummaryVideo}
                                        />
                                    </div>
                                )}

                                {lessonType !== "QUIZ" &&
                                    lessonType !== "ESSAY" &&
                                    lessonType !== "FLASHCARD" && (
                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                marginBottom: "10px",
                                                fontWeight: "600",
                                                color: "#1e293b",
                                                fontSize: "14px",
                                            }}
                                        >
                                            Resources ({resources.length}/10)
                                        </label>
                                        <div
                                            onDragOver={handleDragOver}
                                            onDrop={handleDropResources}
                                            onClick={() =>
                                                !uploadingResources &&
                                                resourceInputRef.current?.click()
                                            }
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                gap: "12px",
                                                height: "120px",
                                                borderRadius: "12px",
                                                border: "2px dashed #cbd5e1",
                                                backgroundColor: "#f8fafc",
                                                cursor: uploadingResources
                                                    ? "wait"
                                                    : "pointer",
                                                color: "#64748b",
                                            }}
                                        >
                                            <CloudUpload
                                                size={24}
                                                color="#64748b"
                                            />
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: "14px",
                                                    color: "#475569",
                                                }}
                                            >
                                                {uploadingResources ? (
                                                    "Uploading resource files..."
                                                ) : (
                                                    <>
                                                        <span
                                                            style={{
                                                                color: "#2563eb",
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            Choose file
                                                        </span>
                                                    </>
                                                )}
                                            </p>
                                            <input
                                                type="file"
                                                multiple
                                                ref={resourceInputRef}
                                                onChange={handleResourceSelect}
                                                disabled={uploadingResources}
                                                style={{ display: "none" }}
                                            />
                                        </div>
                                        {resources.length > 0 && (
                                            <div
                                                style={{
                                                    marginTop: "12px",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "8px",
                                                }}
                                            >
                                                {resources.map(
                                                    (file, index) => (
                                                        <div
                                                            key={index}
                                                            style={{
                                                                display: "flex",
                                                                justifyContent:
                                                                    "space-between",
                                                                alignItems:
                                                                    "center",
                                                                padding:
                                                                    "8px 12px",
                                                                backgroundColor:
                                                                    "#f1f5f9",
                                                                borderRadius:
                                                                    "6px",
                                                                fontSize:
                                                                    "13px",
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    color: "#334155",
                                                                    fontWeight:
                                                                        "500",
                                                                }}
                                                            >
                                                                {file instanceof
                                                                File
                                                                    ? file.name
                                                                    : typeof file ===
                                                                        "string"
                                                                      ? getFileNameFromUrl(
                                                                            file,
                                                                        )
                                                                      : file.name ||
                                                                        file.fileName ||
                                                                        "Document"}
                                                            </span>
                                                            <X
                                                                size={14}
                                                                color="#ef4444"
                                                                style={{
                                                                    cursor: "pointer",
                                                                }}
                                                                onClick={() =>
                                                                    removeResource(
                                                                        index,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {isFlashcardLesson && (
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "flex-end",
                                            gap: "14px",
                                            marginTop: "4px",
                                            borderTop: "1px solid #e2e8f0",
                                            paddingTop: "24px",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    `/admin/courses/${courseId}/content`,
                                                )
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
                                        <button
                                            type="submit"
                                            disabled={loading}
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
                                            <Save size={18} />
                                            {loading ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {!isFlashcardLesson && (
                            <div
                                style={{
                                    flex: "2",
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
                                        Lesson Content
                                    </h3>
                                    {lessonType === "FLASHCARD" && (
                                        <div
                                            style={{
                                                backgroundColor: "#fff",
                                                padding: "20px",
                                                borderRadius: "12px",
                                                border: "1px solid #cbd5e1",
                                            }}
                                        >
                                            <p
                                                style={{
                                                    margin: 0,
                                                    color: "#64748b",
                                                    fontSize: "14px",
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                Flashcard content is managed
                                                through the Current Flashcards
                                                and Staging Review tabs.
                                            </p>
                                        </div>
                                    )}
                                    {lessonType === "VIDEO" && (
                                        <div
                                            style={{
                                                backgroundColor: "#fff",
                                                padding: "24px",
                                                borderRadius: "12px",
                                                border: "1px solid #cbd5e1",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent:
                                                        "space-between",
                                                    gap: "16px",
                                                    marginBottom: "16px",
                                                }}
                                            >
                                                <div>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "8px",
                                                            color: "#2563eb",
                                                            fontWeight: "600",
                                                        }}
                                                    >
                                                        <Video size={24} />
                                                        Upload Video
                                                    </div>
                                                </div>
                                            </div>

                                            {isHlsProviderUnavailable && (
                                                <div
                                                    role="alert"
                                                    style={{
                                                        padding: "12px 14px",
                                                        borderRadius: "10px",
                                                        marginBottom: "16px",
                                                        color: "#991b1b",
                                                        background: "#fff1f2",
                                                        border: "1px solid #fecaca",
                                                        fontSize: "13px",
                                                    }}
                                                >
                                                    The backend HLS processing
                                                    provider is currently
                                                    unavailable.
                                                </div>
                                            )}

                                            {hlsStatusError && (
                                                <div
                                                    role="alert"
                                                    style={{
                                                        padding: "12px 14px",
                                                        borderRadius: "10px",
                                                        marginBottom: "16px",
                                                        color: "#991b1b",
                                                        background: "#fff1f2",
                                                        border: "1px solid #fecaca",
                                                        fontSize: "13px",
                                                    }}
                                                >
                                                    Could not load HLS status:{" "}
                                                    {hlsStatusError}
                                                </div>
                                            )}

                                            {/* Error Banner */}
                                            {hlsProcessingStatus &&
                                                hlsProcessingStatus.hlsStatus ===
                                                    "failed" && (
                                                    <div
                                                        style={{
                                                            padding:
                                                                "14px 16px",
                                                            borderRadius:
                                                                "10px",
                                                            marginBottom:
                                                                "16px",
                                                            backgroundColor:
                                                                "#fee2e2",
                                                            border: "1px solid #fca5a5",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: "10px",
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize:
                                                                        "20px",
                                                                    color: "#dc2626",
                                                                }}
                                                            >
                                                                ✗
                                                            </span>
                                                            <div>
                                                                <p
                                                                    style={{
                                                                        margin: 0,
                                                                        fontWeight:
                                                                            "600",
                                                                        fontSize:
                                                                            "14px",
                                                                        color: "#dc2626",
                                                                    }}
                                                                >
                                                                    Processing
                                                                    Failed
                                                                </p>
                                                                <p
                                                                    style={{
                                                                        margin: "2px 0 0 0",
                                                                        fontSize:
                                                                            "12px",
                                                                        color: "#991b1b",
                                                                    }}
                                                                >
                                                                    {hlsProcessingStatus.currentStep ||
                                                                        hlsProcessingStatus.message ||
                                                                        "Please try uploading again"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                            {/* Upload Area */}
                                            <div
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    if (
                                                        !isHlsOperationBusy &&
                                                        !isHlsProviderUnavailable &&
                                                        e.dataTransfer.files &&
                                                        e.dataTransfer.files
                                                            .length > 0
                                                    ) {
                                                        uploadHlsVideo(
                                                            e.dataTransfer
                                                                .files[0],
                                                        );
                                                    }
                                                }}
                                                onClick={() =>
                                                    !isHlsOperationBusy &&
                                                    !isHlsProviderUnavailable &&
                                                    mainFileInputRef.current?.click()
                                                }
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                    gap: "16px",
                                                    height: "280px",
                                                    borderRadius: "12px",
                                                    border:
                                                        videoUrl ||
                                                        hlsProcessingStatus?.hlsStatus ===
                                                            "ready"
                                                            ? "2px solid #10b981"
                                                            : isHlsOperationBusy
                                                              ? "2px solid #2563eb"
                                                              : "2px dashed #cbd5e1",
                                                    backgroundColor:
                                                        videoUrl ||
                                                        hlsProcessingStatus?.hlsStatus ===
                                                            "ready"
                                                            ? "#f0fdf4"
                                                            : isHlsOperationBusy
                                                              ? "#eff6ff"
                                                              : "#fff",
                                                    cursor:
                                                        isHlsOperationBusy ||
                                                        isHlsProviderUnavailable
                                                            ? "default"
                                                            : "pointer",
                                                    textAlign: "center",
                                                    padding: "24px",
                                                }}
                                            >
                                                {isHlsOperationBusy ? (
                                                    <>
                                                        <Loader2
                                                            className="animate-spin"
                                                            size={48}
                                                            style={{
                                                                color: "#2563eb",
                                                            }}
                                                        />
                                                        <p
                                                            style={{
                                                                margin: 0,
                                                                color: "#1e40af",
                                                                fontWeight:
                                                                    "600",
                                                                fontSize:
                                                                    "15px",
                                                            }}
                                                        >
                                                            {hlsProcessingStatus?.hlsStatus ===
                                                            "uploading"
                                                                ? "Uploading Video..."
                                                                : "Processing Video..."}
                                                        </p>

                                                        {/* Progress Bar */}
                                                        <div
                                                            style={{
                                                                width: "100%",
                                                                maxWidth:
                                                                    "280px",
                                                                marginTop:
                                                                    "8px",
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display:
                                                                        "flex",
                                                                    justifyContent:
                                                                        "space-between",
                                                                    marginBottom:
                                                                        "6px",
                                                                    fontSize:
                                                                        "13px",
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        color: "#64748b",
                                                                    }}
                                                                >
                                                                    {hlsProcessingStatus?.currentStep ||
                                                                        (hlsStatusLoading
                                                                            ? "Loading the latest processing state..."
                                                                            : "Processing...")}
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        color: "#2563eb",
                                                                        fontWeight:
                                                                            "600",
                                                                    }}
                                                                >
                                                                    {hlsProcessingStatus?.progressPercent ||
                                                                        0}
                                                                    %
                                                                </span>
                                                            </div>
                                                            <div
                                                                style={{
                                                                    width: "100%",
                                                                    height: "8px",
                                                                    backgroundColor:
                                                                        "#e2e8f0",
                                                                    borderRadius:
                                                                        "4px",
                                                                    overflow:
                                                                        "hidden",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        width: `${hlsProcessingStatus?.progressPercent || 0}%`,
                                                                        height: "100%",
                                                                        backgroundColor:
                                                                            "#2563eb",
                                                                        borderRadius:
                                                                            "4px",
                                                                        transition:
                                                                            "width 0.3s ease",
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <p
                                                            style={{
                                                                margin: "12px 0 0 0",
                                                                color: "#64748b",
                                                                fontSize:
                                                                    "12px",
                                                            }}
                                                        >
                                                            {hlsStatusLoading
                                                                ? "Please wait while the latest status is loaded."
                                                                : "You may leave this page. Video is processing"}
                                                        </p>
                                                    </>
                                                ) : videoUrl ||
                                                  hlsProcessingStatus?.hlsStatus ===
                                                      "ready" ? (
                                                    <>
                                                        <Video
                                                            size={48}
                                                            color="#10b981"
                                                        />
                                                        <p
                                                            style={{
                                                                margin: 0,
                                                                fontSize:
                                                                    "15px",
                                                                fontWeight:
                                                                    "600",
                                                                color: "#065f46",
                                                            }}
                                                        >
                                                            {hlsProcessingStatus?.hlsStatus ===
                                                            "ready"
                                                                ? "Video Ready"
                                                                : "Video Uploaded"}
                                                        </p>
                                                        {hlsProcessingStatus?.qualities && (
                                                            <p
                                                                style={{
                                                                    margin: "4px 0 0 0",
                                                                    fontSize:
                                                                        "12px",
                                                                    color: "#059669",
                                                                }}
                                                            >
                                                                Qualities:{" "}
                                                                {
                                                                    hlsProcessingStatus.qualities
                                                                }
                                                            </p>
                                                        )}
                                                        <p
                                                            style={{
                                                                margin: "8px 0 0 0",
                                                                fontSize:
                                                                    "12px",
                                                                color: "#64748b",
                                                            }}
                                                        >
                                                            Click to replace
                                                            with new video
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div
                                                            style={{
                                                                width: "56px",
                                                                height: "56px",
                                                                backgroundColor:
                                                                    "#e2e8f0",
                                                                borderRadius:
                                                                    "14px",
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                justifyContent:
                                                                    "center",
                                                            }}
                                                        >
                                                            <FileText
                                                                size={28}
                                                                color="#64748b"
                                                            />
                                                        </div>
                                                        <p
                                                            style={{
                                                                margin: 0,
                                                                fontSize:
                                                                    "15px",
                                                                fontWeight:
                                                                    "600",
                                                                color: "#1e293b",
                                                            }}
                                                        >
                                                            Drag and drop or{" "}
                                                            <span
                                                                style={{
                                                                    color: "#2563eb",
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                Browse
                                                            </span>
                                                        </p>
                                                        <p
                                                            style={{
                                                                margin: "4px 0 0 0",
                                                                fontSize:
                                                                    "12px",
                                                                color: "#64748b",
                                                            }}
                                                        >
                                                            Supports MP4, MOV,
                                                            AVI, MKV (max 500MB)
                                                        </p>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    ref={mainFileInputRef}
                                                    onChange={(e) => {
                                                        if (
                                                            e.target.files &&
                                                            e.target.files
                                                                .length > 0
                                                        ) {
                                                            uploadHlsVideo(
                                                                e.target
                                                                    .files[0],
                                                            );
                                                            e.target.value = "";
                                                        }
                                                    }}
                                                    disabled={
                                                        isHlsOperationBusy ||
                                                        isHlsProviderUnavailable
                                                    }
                                                    style={{ display: "none" }}
                                                    accept=".mp4,.webm,.mov,.avi,.mkv,.m4v,.mpg,.mpeg"
                                                />
                                            </div>

                                            {/* Video URL fallback */}
                                            {!videoUrl &&
                                                (!hlsProcessingStatus?.hlsStatus ||
                                                    hlsProcessingStatus.hlsStatus ===
                                                        "not_found") && (
                                                    <div
                                                        style={{
                                                            marginTop: 12,
                                                        }}
                                                    >
                                                        <label
                                                            style={{
                                                                fontSize: 12,
                                                                color: "#64748b",
                                                                display:
                                                                    "block",
                                                                marginBottom: 4,
                                                            }}
                                                        >
                                                            Or paste video URL
                                                            (for external
                                                            videos)
                                                        </label>
                                                        <input
                                                            type="url"
                                                            value={videoUrl}
                                                            onChange={(e) =>
                                                                setVideoUrl(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="https://..."
                                                            style={{
                                                                width: "100%",
                                                                padding:
                                                                    "8px 12px",
                                                                borderRadius:
                                                                    "6px",
                                                                border: "1px solid #cbd5e1",
                                                                fontSize:
                                                                    "13px",
                                                                boxSizing:
                                                                    "border-box",
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                    {(lessonType === "PDF" ||
                                        lessonType === "ESSAY") && (
                                        <div
                                            onDragOver={handleDragOver}
                                            onDrop={handleDropMainFile}
                                            onClick={() =>
                                                !uploadingMainFile &&
                                                mainFileInputRef.current?.click()
                                            }
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                gap: "16px",
                                                height: "300px",
                                                minWidth: 0,
                                                maxWidth: "100%",
                                                overflow: "hidden",
                                                borderRadius: "16px",
                                                border:
                                                    mainContentFile ||
                                                    uploadedFileUrl
                                                        ? "2px solid #10b981"
                                                        : "2px dashed #cbd5e1",
                                                backgroundColor:
                                                    mainContentFile ||
                                                    uploadedFileUrl
                                                        ? "#f0fdf4"
                                                        : "#fff",
                                                cursor: uploadingMainFile
                                                    ? "wait"
                                                    : "pointer",
                                                textAlign: "center",
                                                padding: "40px",
                                            }}
                                        >
                                            {uploadingMainFile ? (
                                                <>
                                                    <CloudUpload
                                                        size={48}
                                                        color="#2563eb"
                                                    />
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            color: "#2563eb",
                                                        }}
                                                    >
                                                        Uploading...
                                                    </p>
                                                </>
                                            ) : mainContentFile ||
                                              uploadedFileUrl ? (
                                                <>
                                                    <FileIcon
                                                        size={48}
                                                        color="#10b981"
                                                    />
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            fontSize: "16px",
                                                            fontWeight: "600",
                                                            color: "#065f46",
                                                            maxWidth: "100%",
                                                            lineHeight: 1.35,
                                                            overflowWrap:
                                                                "anywhere",
                                                            wordBreak:
                                                                "break-word",
                                                            whiteSpace:
                                                                "normal",
                                                        }}
                                                    >
                                                        {mainContentFile
                                                            ? mainContentFile.name
                                                            : getFileNameFromUrl(
                                                                  uploadedFileUrl,
                                                              )}
                                                    </p>
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            fontSize: "13px",
                                                            color: "#059669",
                                                            maxWidth: "100%",
                                                            overflowWrap:
                                                                "anywhere",
                                                        }}
                                                    >
                                                        Click to replace
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <div
                                                        style={{
                                                            width: "48px",
                                                            height: "48px",
                                                            backgroundColor:
                                                                "#e2e8f0",
                                                            borderRadius:
                                                                "12px",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        <FileText
                                                            size={24}
                                                            color="#64748b"
                                                        />
                                                    </div>
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            fontSize: "16px",
                                                            fontWeight: "600",
                                                            color: "#1e293b",
                                                            maxWidth: "100%",
                                                            lineHeight: 1.4,
                                                            overflowWrap:
                                                                "anywhere",
                                                        }}
                                                    >
                                                        {lessonType === "ESSAY"
                                                            ? "Upload assignment document or "
                                                            : "Drag and drop or "}
                                                        <span
                                                            style={{
                                                                color: "#2563eb",
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            Browse
                                                        </span>
                                                    </p>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                ref={mainFileInputRef}
                                                onChange={handleMainFileSelect}
                                                disabled={uploadingMainFile}
                                                style={{ display: "none" }}
                                                accept={
                                                    lessonType === "ESSAY"
                                                        ? ".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                                                        : ".pdf,.doc,.docx"
                                                }
                                            />
                                        </div>
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
                                            uploadingMainFile ||
                                            uploadingResources ||
                                            hlsUploading ||
                                            hlsStatusPolling
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
                                            : hlsStatusPolling
                                              ? "Processing..."
                                              : "Save Changes"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                `/admin/courses/${courseId}/content`,
                                            )
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
                            )}
                        </div>
                    </form>
                </>
            ) : activeTab === "submissions" ? (
                <div
                    style={{
                        backgroundColor: "#fff",
                        padding: "28px",
                        borderRadius: "16px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "16px",
                            marginBottom: "20px",
                        }}
                    >
                        <div>
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: "18px",
                                    color: "#1e293b",
                                }}
                            >
                                Student Submissions
                            </h3>
                            <p
                                style={{
                                    margin: "6px 0 0",
                                    color: "#64748b",
                                    fontSize: "14px",
                                }}
                            >
                                Download submitted files and grade this essay lesson.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={loadEssaySubmissions}
                            disabled={submissionsLoading || !essayAssignment?.id}
                            style={{
                                border: "1px solid #cbd5e1",
                                background: "#fff",
                                borderRadius: "8px",
                                padding: "10px 14px",
                                color: "#334155",
                                cursor:
                                    submissionsLoading || !essayAssignment?.id
                                        ? "not-allowed"
                                        : "pointer",
                                fontWeight: 600,
                            }}
                        >
                            {submissionsLoading ? "Loading..." : "Refresh"}
                        </button>
                    </div>

                    {!essayAssignment?.id ? (
                        <div
                            style={{
                                padding: "40px",
                                textAlign: "center",
                                color: "#94a3b8",
                                border: "1px dashed #cbd5e1",
                                borderRadius: "12px",
                            }}
                        >
                            Save this essay lesson first to create its submission workspace.
                        </div>
                    ) : submissionsLoading ? (
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
                            <span>Loading submissions...</span>
                        </div>
                    ) : essaySubmissions.length === 0 ? (
                        <div
                            style={{
                                padding: "40px",
                                textAlign: "center",
                                color: "#94a3b8",
                                border: "1px dashed #cbd5e1",
                                borderRadius: "12px",
                            }}
                        >
                            No student submissions yet.
                        </div>
                    ) : (
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
                                            borderBottom: "2px solid #edf2f7",
                                            color: "#64748b",
                                        }}
                                    >
                                        <th style={{ padding: "12px 16px" }}>Student</th>
                                        <th style={{ padding: "12px 16px" }}>Status</th>
                                        <th style={{ padding: "12px 16px" }}>Submitted</th>
                                        <th style={{ padding: "12px 16px" }}>File</th>
                                        <th style={{ padding: "12px 16px" }}>Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {essaySubmissions.map((submission) => (
                                        <tr
                                            key={submission.id}
                                            style={{
                                                borderBottom: "1px solid #edf2f7",
                                                color: "#334155",
                                            }}
                                        >
                                            <td style={{ padding: "16px" }}>
                                                {submission.studentName ||
                                                    submission.studentId ||
                                                    "Student"}
                                            </td>
                                            <td style={{ padding: "16px" }}>
                                                {submission.status || "--"}
                                            </td>
                                            <td style={{ padding: "16px" }}>
                                                {formatDateTime(submission.submittedAt)}
                                            </td>
                                            <td style={{ padding: "16px" }}>
                                                {submission.fileUrl ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            downloadEssayFile(submission)
                                                        }
                                                        disabled={
                                                            downloadingId ===
                                                            submission.id
                                                        }
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: "8px",
                                                            border: "1px solid #cbd5e1",
                                                            background: "#fff",
                                                            borderRadius: "8px",
                                                            padding: "8px 12px",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <Download size={16} />
                                                        {downloadingId === submission.id
                                                            ? "Downloading..."
                                                            : submission.fileName ||
                                                              "Download"}
                                                    </button>
                                                ) : (
                                                    "No file"
                                                )}
                                            </td>
                                            <td style={{ padding: "16px" }}>
                                                {submission.score != null ? (
                                                    <strong>{submission.score}/10</strong>
                                                ) : (
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            gap: "8px",
                                                            alignItems: "center",
                                                        }}
                                                    >
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="10"
                                                            step="0.1"
                                                            value={
                                                                gradeForms[
                                                                    submission.id
                                                                ]?.score || ""
                                                            }
                                                            onChange={(event) =>
                                                                updateGradeForm(
                                                                    submission.id,
                                                                    {
                                                                        score: event
                                                                            .target
                                                                            .value,
                                                                    },
                                                                )
                                                            }
                                                            placeholder="0-10"
                                                            style={{
                                                                width: "90px",
                                                                padding: "8px 10px",
                                                                borderRadius: "8px",
                                                                border: "1px solid #cbd5e1",
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                gradeEssaySubmission(
                                                                    submission,
                                                                )
                                                            }
                                                            disabled={
                                                                gradingId ===
                                                                submission.id
                                                            }
                                                            style={{
                                                                border: "none",
                                                                background: "#2563eb",
                                                                color: "#fff",
                                                                borderRadius: "8px",
                                                                padding: "8px 12px",
                                                                cursor: "pointer",
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {gradingId === submission.id
                                                                ? "Saving..."
                                                                : "Grade"}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
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
                            margin: "0 0 6px 0",
                            fontSize: "18px",
                            color: "#1e293b",
                        }}
                    >
                        Lesson Audit Logs
                    </h3>
                    <p
                        style={{
                            margin: "0 0 20px",
                            color: "#64748b",
                            fontSize: "14px",
                        }}
                    >
                        Review saved changes and system activity for this lesson.
                    </p>

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
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "10px",
                                padding: "44px 24px",
                                textAlign: "center",
                                color: "#64748b",
                                border: "1px dashed #cbd5e1",
                                borderRadius: "12px",
                                backgroundColor: "#f8fafc",
                            }}
                        >
                            <History size={28} color="#94a3b8" />
                            <strong style={{ color: "#334155", fontSize: "16px" }}>
                                No audit logs yet
                            </strong>
                            <span>
                                Changes will appear here after lesson activity is recorded.
                            </span>
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
                                                Time
                                            </th>
                                            <th
                                                style={{
                                                    padding: "12px 16px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                Actor
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
                                                Details
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
                                                    {log.actorEmail ||
                                                        log.actorName ||
                                                        log.actorUser ||
                                                        "System"}
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
                                                        {log.actorRole || "--"}
                                                    </span>
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "16px",
                                                        fontWeight: "500",
                                                    }}
                                                >
                                                    {log.summary ||
                                                        log.details ||
                                                        log.description ||
                                                        log.action ||
                                                        "--"}
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
                                                        {log.result || "--"}
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
