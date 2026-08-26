import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { courseContentService } from "../../services/courseContentService";
import { assignmentService } from "@/features/assignment";
import { videoAiService } from "../../services/videoAiService";
import {
    Alert,
    Button,
    ConfirmDialog,
    IconButton,
    Input,
    LoadingState,
    Select,
    Textarea,
    useToast,
} from "@/shared/components/ui";
import RichTextEditor from "@/shared/components/rich-text/RichTextEditor";
import { AssignmentAiDraftPanel } from "@/features/assignment/components/AssignmentAiDraftPanel";
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
    getLessonStatusMeta,
    normalizeLessonStatus,
} from "@/features/course/utils/lesson-status";
import {
    getYoutubeVideoId,
    youtubeEmbedUrl,
} from "@/features/course/utils/lesson-content";
import {
    ArrowLeft,
    Save,
    History,
    Loader2,
    Paperclip,
    Sparkles,
    X,
} from "lucide-react";
import { QuizQuestionsPanel } from "../QuizQuestionManager";
import { PdfMaterialUploader } from "./PdfMaterialUploader";
import { LessonResourceUploader } from "./LessonResourceUploader";
import { LessonAuditHistory } from "./LessonAuditHistory";
import { LessonEditorSection } from "./LessonEditorSection";
import { FlashcardLessonAuthoring } from "./FlashcardLessonAuthoring";
import { LessonSettingsFields } from "./LessonSettingsFields";
import "../../course-admin.css";
import "@/features/course/course-admin.css";
import "@/features/course/course-lesson-editor.css";

const LESSON_TYPE_LABELS = {
    VIDEO: "Video lecture",
    PDF: "Document / Reading",
    RICH_TEXT: "Text lesson",
    QUIZ: "Quiz",
    ESSAY: "Essay assignment",
    FLASHCARD: "Flashcard",
};

/** Chuẩn hóa thời lượng giây từ API và loại bỏ giá trị rỗng hoặc không hợp lệ. */
function normalizeExactDurationSeconds(value) {
    if (value == null || String(value).trim() === "") {
        return null;
    }
    const duration = Number(value);
    if (!Number.isFinite(duration) || duration < 0) {
        return null;
    }
    return Math.round(duration);
}

/** Chuẩn hóa lesson type từ API về các loại mà editor hỗ trợ. */
function normalizeEditorLessonType(value) {
    const type = String(value || "VIDEO").toUpperCase();
    if (type === "PDF" || type === "DOCUMENT") return "PDF";
    if (type === "QUIZ") return "QUIZ";
    if (type === "FLASHCARD") return "FLASHCARD";
    if (type === "RICH_TEXT" || type === "TEXT") return "RICH_TEXT";
    if (type === "ESSAY" || type === "ASSIGNMENT") return "ESSAY";
    return "VIDEO";
}

/**
 * Hiển thị trình soạn lesson dùng chung cho Admin và Trainer.
 * Với Trainer, `classId` trong context giữ assignment đúng phạm vi lớp đang dạy.
 */
export function LessonDetailEditor({ context }) {
    const {
        courseId,
        classId,
        lessonId,
        backPath,
        services,
        features = { audit: false, quizManager: true, flashcard: true },
    } = context || {};

    const navigate = useNavigate();
    const location = useLocation();
    const { showToast: emitToast } = useToast();
    /** Chuyển API toast dùng chung sang chữ ký cũ của lesson editor. */
    const showToast = useCallback(
        (message, type) => emitToast({ message, type }),
        [emitToast],
    );

    const initialFlashcardSetId =
        location.state?.flashcardSetId ||
        new URLSearchParams(location.search).get("flashcardSetId");
    /** Đánh dấu lesson vừa được tạo để editor chạy ở chế độ "Create lesson"
     *  cho tới khi người dùng lưu lần đầu. */
    const [isNewLesson, setIsNewLesson] = useState(() =>
        Boolean(location.state?.isNewLesson),
    );

    const [titleError, setTitleError] = useState("");
    const [summaryError, setSummaryError] = useState("");
    const [activeTab, setActiveTab] = useState("edit");
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const saveInProgressRef = useRef(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [textContent, setTextContent] = useState("");
    const [lessonType, setLessonType] = useState("VIDEO");
    const [persistedLessonType, setPersistedLessonType] = useState("");
    const [existingLessonData, setExistingLessonData] = useState(null);

    const [videoUrl, setVideoUrl] = useState("");
    const [uploadedFileUrl, setUploadedFileUrl] = useState("");
    const [resources, setResources] = useState([]);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [uploadingResources, setUploadingResources] = useState(false);
    const [summaryGenerating, setSummaryGenerating] = useState(false);
    const [videoSummaryError, setVideoSummaryError] = useState("");
    const [summaryGenerated, setSummaryGenerated] = useState(false);
    const [quizQuestionsBusy, setQuizQuestionsBusy] = useState(false);
    const [quizQuestionCount, setQuizQuestionCount] = useState(0);

    const [editHistory, setEditHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);

    const [summary, setSummary] = useState("");
    const [isPreview, setIsPreview] = useState(false);
    const [status, setStatus] = useState("draft");
    const [durationMinutes, setDurationMinutes] = useState("");
    const [exactDurationSeconds, setExactDurationSeconds] = useState(null);
    const [assignment, setAssignment] = useState(null);
    const [assignmentRubric, setAssignmentRubric] = useState("");
    const [assignmentLoading, setAssignmentLoading] = useState(false);
    const [assignmentSaving, setAssignmentSaving] = useState(false);
    const [assignmentFile, setAssignmentFile] = useState(null);
    const [existingAssignmentFile, setExistingAssignmentFile] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [saveNotice, setSaveNotice] = useState(null);
    const [pendingLessonType, setPendingLessonType] = useState(null);
    const [summaryReplaceConfirmationOpen, setSummaryReplaceConfirmationOpen] =
        useState(false);

    const hasDescriptionData = !isEmptyLessonHtml(sanitizeLessonHtml(summary));
    const hasResourceData = resources.length > 0;
    const hasTypeSpecificData =
        (lessonType === "VIDEO" && Boolean(videoUrl.trim())) ||
        (lessonType === "PDF" && Boolean(uploadedFileUrl)) ||
        (lessonType === "QUIZ" && Boolean(textContent.trim())) ||
        (lessonType === "ESSAY" &&
            Boolean(
                assignmentLoading ||
                assignment?.id ||
                assignmentRubric.trim() ||
                assignmentFile ||
                existingAssignmentFile,
            )) ||
        (lessonType === "FLASHCARD" &&
            Boolean(
                persistedLessonType === "FLASHCARD" || initialFlashcardSetId,
            ));
    const hasCurrentLessonTypeData =
        hasDescriptionData || hasResourceData || hasTypeSpecificData;

    /** Đánh dấu form có thay đổi và xóa feedback lưu cũ. */
    const markChanged = useCallback(() => {
        setHasChanges(true);
        setSaveNotice(null);
    }, []);

    /** Áp dụng lesson type mới và xóa content dùng chung để dữ liệu không lọt sang loại khác. */
    const applyLessonTypeChange = useCallback(
        (nextLessonType) => {
            setLessonType(nextLessonType);
            setSummary("");
            setTextContent("");
            setQuizQuestionCount(0);
            setResources([]);
            setVideoUrl("");
            setUploadedFileUrl("");
            setAssignment(null);
            setAssignmentRubric("");
            setAssignmentFile(null);
            setExistingAssignmentFile(null);
            setSummaryError("");
            setVideoSummaryError("");
            setSummaryGenerated(false);
            markChanged();
        },
        [markChanged],
    );

    /** Yêu cầu xác nhận trước khi đổi type vì Description và Resources sẽ bị xóa. */
    const handleLessonTypeChange = useCallback(
        (nextLessonType) => {
            if (!nextLessonType || nextLessonType === lessonType) return;
            if (hasCurrentLessonTypeData) {
                setPendingLessonType(nextLessonType);
                return;
            }
            applyLessonTypeChange(nextLessonType);
        },
        [applyLessonTypeChange, hasCurrentLessonTypeData, lessonType],
    );

    /** Xác nhận xóa content dùng chung rồi hoàn tất việc đổi lesson type. */
    const handleConfirmLessonTypeChange = useCallback(() => {
        if (!pendingLessonType) return;
        applyLessonTypeChange(pendingLessonType);
        setPendingLessonType(null);
    }, [applyLessonTypeChange, pendingLessonType]);

    /** Cập nhật thời lượng ước tính và bỏ giá trị giây cũ từ AI/API. */
    const updateDurationMinutes = useCallback(
        (value) => {
            setDurationMinutes(
                value === "" ? "" : Math.max(0, Number(value || 0)),
            );
            setExactDurationSeconds(null);
            markChanged();
        },
        [markChanged],
    );

    /** Hiển thị feedback lưu và đưa nó vào vùng nhìn của người dùng. */
    const showSaveNotice = (notice) => {
        setSaveNotice(notice);
        window.requestAnimationFrame(() => {
            document.getElementById("lesson-save-notice")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    };

    /** Lấy tên file cuối URL để hiển thị khi API không trả fileName. */
    const getFileNameFromUrl = (url) => {
        if (!url) return "";
        return url.substring(url.lastIndexOf("/") + 1);
    };

    /** Chuẩn hóa lỗi validation/API thành một thông báo ngắn cho giao diện. */
    const getErrorMessage = useCallback((error, fallbackMessage) => {
        const validationDetails = error?.errors
            ?.map(({ field, message }) => `${field}: ${message}`)
            .join(", ");
        return validationDetails || error?.message || fallbackMessage;
    }, []);

    useEffect(() => {
        /** Tải lesson và phân phối dữ liệu về state phù hợp với từng lesson type. */
        const fetchLessonDetail = async () => {
            try {
                setPageLoading(true);
                setSummaryGenerating(false);
                const response = await services.getLessonDetail(lessonId);
                const lessonData = response?.data || response;

                if (lessonData) {
                    setExistingLessonData(lessonData);

                    const normalizedLessonType = normalizeEditorLessonType(
                        lessonData.lessonType || lessonData.type,
                    );
                    const loadedContent = lessonData.content || "";

                    setTitle(lessonData.title || "");
                    setSummary(
                        normalizedLessonType === "QUIZ" ||
                            normalizedLessonType === "FLASHCARD"
                            ? ""
                            : sanitizeLessonHtml(loadedContent),
                    );
                    setTextContent(
                        normalizedLessonType === "QUIZ" ? loadedContent : "",
                    );

                    setVideoUrl(lessonData.videoUrl || "");
                    setSummaryGenerated(false);
                    setUploadedFileUrl(
                        lessonData.attachmentUrl || lessonData.fileUrl || "",
                    );

                    setIsPreview(
                        Boolean(
                            lessonData.isPreview ?? lessonData.isPreviewable,
                        ),
                    );
                    setStatus(normalizeLessonStatus(lessonData.status));
                    const loadedDurationSeconds = normalizeExactDurationSeconds(
                        lessonData.durationSeconds,
                    );
                    setExactDurationSeconds(loadedDurationSeconds);
                    setDurationMinutes(
                        loadedDurationSeconds
                            ? Math.max(1, Math.ceil(loadedDurationSeconds / 60))
                            : "",
                    );

                    setLessonType(normalizedLessonType);
                    setPersistedLessonType(normalizedLessonType);

                    const loadedResources =
                        lessonData.resources || lessonData.attachments || [];
                    setResources(
                        ["VIDEO", "PDF", "RICH_TEXT"].includes(
                            normalizedLessonType,
                        ) && Array.isArray(loadedResources)
                            ? loadedResources
                            : [],
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
        /** Tải Daily Assignment của lesson, ưu tiên bản riêng của lớp Trainer đang mở. */
        async function loadLessonAssignment() {
            try {
                setAssignmentLoading(true);
                const loaded = await assignmentService.getByLesson(
                    lessonId,
                    classId,
                );
                if (cancelled) return;
                setAssignment(loaded);
                setAssignmentRubric(loaded?.rubric || "");
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
                setAssignmentRubric("");
                setExistingAssignmentFile(null);
            } finally {
                if (!cancelled) setAssignmentLoading(false);
            }
        }

        if (lessonId) loadLessonAssignment();
        return () => {
            cancelled = true;
        };
    }, [classId, lessonId, lessonType]);

    useEffect(() => {
        /** Tải lịch sử chỉnh sửa theo trang khi người dùng mở audit history. */
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

    /** Kiểm tra và tải ảnh được chèn vào mô tả lesson. */
    const uploadSummaryImage = useCallback(
        async (file) => {
            const validationError = validateSummaryImage(file);

            if (validationError) {
                showToast(validationError, "error");
                return null;
            }

            try {
                const uploadedImage =
                    await courseContentService.uploadSummaryImage(file);
                const uploadedUrl =
                    uploadedImage?.url || uploadedImage?.data?.url;

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
        },
        [getErrorMessage, showToast],
    );

    /** Kiểm tra và tải video được chèn vào mô tả lesson. */
    const uploadSummaryVideo = useCallback(
        async (file) => {
            const validationError = validateSummaryVideo(file);

            if (validationError) {
                showToast(validationError, "error");
                return null;
            }

            try {
                const uploadedVideo =
                    await courseContentService.uploadSummaryVideo(file);
                const uploadedUrl =
                    uploadedVideo?.url || uploadedVideo?.data?.url;

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
        },
        [getErrorMessage, showToast],
    );

    /** Cập nhật mô tả đã sanitize ở bước lưu và đánh dấu nội dung cần lưu lại. */
    const handleSummaryChange = useCallback(
        (value) => {
            setSummary(value);
            setSummaryError("");
            setSummaryGenerated(false);
            markChanged();
        },
        [markChanged],
    );

    /** Escape văn bản AI trước khi ghép thành HTML cho rich text editor. */
    const escapeSummaryText = (value) =>
        String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    /** Chuyển response summary có cấu trúc từ AI thành HTML lesson an toàn. */
    const summaryToHtml = (value) => {
        const paragraphs = Array.isArray(value?.overviewParagraphs)
            ? value.overviewParagraphs.filter(
                  (paragraph) =>
                      typeof paragraph === "string" && paragraph.trim(),
              )
            : [];
        const takeaways = Array.isArray(value?.keyTakeaways)
            ? value.keyTakeaways.filter(
                  (takeaway) => typeof takeaway === "string" && takeaway.trim(),
              )
            : [];
        const title =
            typeof value?.keyTakeawaysTitle === "string"
                ? value.keyTakeawaysTitle.trim()
                : "";

        if (paragraphs.length === 0 || !title || takeaways.length === 0) {
            return "";
        }

        const overviewHtml = paragraphs
            .map((paragraph) => `<p>${escapeSummaryText(paragraph.trim())}</p>`)
            .join("");
        const takeawaysHtml = takeaways
            .map((takeaway) => `<li>${escapeSummaryText(takeaway.trim())}</li>`)
            .join("");

        return sanitizeLessonHtml(
            `${overviewHtml}<p><strong>${escapeSummaryText(title)}</strong></p><ul>${takeawaysHtml}</ul>`,
        );
    };

    /** Gọi AI tạo summary và cập nhật metadata video sau khi người dùng đã xác nhận. */
    const generateVideoSummary = async (requestedUrl) => {
        setSummaryGenerating(true);
        setSummaryGenerated(false);
        setVideoSummaryError("");

        try {
            const result = await videoAiService.generateSummary(requestedUrl);
            const generatedSummary = summaryToHtml(result.summary);
            if (isEmptyLessonHtml(generatedSummary)) {
                throw new Error("The generated summary has an invalid format.");
            }

            const resolvedVideoUrl = result.videoUrl || requestedUrl;
            const generatedDurationSeconds = normalizeExactDurationSeconds(
                result.durationSeconds,
            );

            setVideoUrl(resolvedVideoUrl);
            setExactDurationSeconds(generatedDurationSeconds);
            setDurationMinutes(
                generatedDurationSeconds
                    ? Math.max(1, Math.ceil(generatedDurationSeconds / 60))
                    : result.durationMinutes == null ||
                        result.durationMinutes === ""
                      ? ""
                      : Math.max(0, Number(result.durationMinutes) || 0),
            );
            setSummary(generatedSummary);
            setSummaryError("");
            setSummaryGenerated(true);
            markChanged();
            showToast("Summary generated. Review it before saving.", "success");
        } catch (error) {
            setVideoSummaryError(
                getErrorMessage(
                    error,
                    "Could not generate a summary for this YouTube video.",
                ),
            );
        } finally {
            setSummaryGenerating(false);
        }
    };

    /** Kiểm tra URL và yêu cầu xác nhận nếu summary hiện tại sẽ bị thay thế. */
    const handleGenerateSummary = () => {
        const requestedUrl = videoUrl.trim();
        if (!getYoutubeVideoId(requestedUrl)) {
            setVideoSummaryError(
                "Enter a valid HTTPS YouTube URL (youtube.com/watch?v= or youtu.be).",
            );
            return;
        }

        if (!isEmptyLessonHtml(summary)) {
            setSummaryReplaceConfirmationOpen(true);
            return;
        }

        void generateVideoSummary(requestedUrl);
    };

    /** Chuẩn hóa resource từ các uploader khác nhau về payload lưu lesson. */
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

    /** Validate toàn form rồi lưu lesson và assignment liên quan theo đúng loại. */
    const handleSave = async (e) => {
        e.preventDefault();
        if (saveInProgressRef.current || quizQuestionsBusy) return;

        setSaveNotice(null);

        if (!title.trim()) {
            setTitleError("Lesson title is required.");
            showSaveNotice({
                type: "error",
                title: "Lesson could not be saved",
                message: "Add a lesson title in step 1, then try again.",
            });
            window.requestAnimationFrame(() =>
                document.getElementById("lesson-title-input")?.focus(),
            );
            return;
        }
        setTitleError("");

        const isQuiz = lessonType === "QUIZ";
        const isFlashcard = lessonType === "FLASHCARD";
        const usesAttachedQuestionApi =
            isQuiz && typeof services?.getQuestions === "function";
        const usesLessonResources =
            !isQuiz && lessonType !== "ESSAY" && !isFlashcard;
        const cleanSummary = sanitizeLessonHtml(summary);

        if (!isQuiz && !isFlashcard && isEmptyLessonHtml(cleanSummary)) {
            setSummaryError("Lesson summary cannot be empty.");
            showSaveNotice({
                type: "error",
                title: "Lesson could not be saved",
                message: "Add a lesson description in step 1, then try again.",
            });
            return;
        }
        setSummaryError("");

        if (!isQuiz && !isFlashcard && !materialComplete) {
            if (lessonType === "VIDEO") {
                const message = videoUrl.trim()
                    ? "Enter a valid HTTPS YouTube URL (youtube.com/watch?v= or youtu.be)."
                    : "Add a YouTube URL before saving this video lesson.";
                setVideoSummaryError(message);
                showSaveNotice({
                    type: "error",
                    title: "Lesson could not be saved",
                    message,
                });
                window.requestAnimationFrame(() =>
                    document.getElementById("lesson-youtube-url")?.focus(),
                );
                return;
            }
            const materialMessage =
                lessonType === "PDF"
                    ? "Upload the reading material in step 2, then try again."
                    : "Add at least one quiz question in step 2, then try again.";
            showSaveNotice({
                type: "error",
                title: "Lesson could not be saved",
                message: materialMessage,
            });
            return;
        }

        saveInProgressRef.current = true;
        showSaveNotice({
            type: "saving",
            title: "Saving lesson changes",
            message: "Please wait while the lesson is being updated.",
        });
        setLoading(true);

        try {
            let latestQuizLesson = null;
            let latestQuizQuestions = [];
            if (isQuiz) {
                const [latestResponse, attachedQuestions] = await Promise.all([
                    services.getLessonDetail(lessonId),
                    usesAttachedQuestionApi
                        ? services.getQuestions(lessonId)
                        : Promise.resolve(null),
                ]);
                latestQuizLesson = latestResponse?.data || latestResponse;
                latestQuizQuestions = usesAttachedQuestionApi
                    ? Array.isArray(attachedQuestions)
                        ? attachedQuestions
                        : []
                    : parseQuizContent(latestQuizLesson?.content || "")
                          .questions;
                setQuizQuestionCount(latestQuizQuestions.length);

                if (latestQuizQuestions.length === 0) {
                    showSaveNotice({
                        type: "error",
                        title: "Lesson could not be saved",
                        message:
                            "Add at least one quiz question in step 2, then try again.",
                    });
                    return;
                }
            }

            const resolvedVideoUrl = (videoUrl || "").trim();

            const normalizedResources = usesLessonResources
                ? resources
                      .map((resource, index) =>
                          normalizeResourceForPayload(resource, index),
                      )
                      .filter(Boolean)
                      .slice(0, 10)
                : [];

            const content = isQuiz
                ? usesAttachedQuestionApi
                    ? latestQuizLesson?.content || ""
                    : serializeQuizContent(title.trim(), latestQuizQuestions)
                : cleanSummary;
            const durationSeconds =
                durationMinutes === ""
                    ? null
                    : lessonType === "ESSAY"
                      ? 0
                      : (exactDurationSeconds ??
                        Math.round(Number(durationMinutes || 0) * 60));

            const payload = isFlashcard
                ? {
                      title: title.trim(),
                      lessonType,
                      content: "",
                      videoUrl: null,
                      attachmentUrl: null,
                      durationSeconds,
                      isPreview,
                      status: normalizeLessonStatus(status),
                      resources: [],
                      sortOrder:
                          latestQuizLesson?.sortOrder ??
                          existingLessonData?.sortOrder ??
                          0,
                  }
                : {
                      title: title.trim(),
                      lessonType,
                      content,
                      videoUrl:
                          lessonType === "VIDEO" ? resolvedVideoUrl : null,
                      attachmentUrl:
                          lessonType === "PDF" ? uploadedFileUrl : null,
                      durationSeconds,
                      isPreview,
                      status: normalizeLessonStatus(status),
                      resources: normalizedResources,
                      sortOrder:
                          latestQuizLesson?.sortOrder ??
                          existingLessonData?.sortOrder ??
                          0,
                  };

            const savedLessonResponse = await services.updateLesson(
                lessonId,
                payload,
            );
            const savedLesson =
                savedLessonResponse?.data || savedLessonResponse;
            if (savedLesson) {
                setExistingLessonData((current) => ({
                    ...(current || {}),
                    ...savedLesson,
                }));
            }
            setPersistedLessonType(lessonType);

            if (lessonType === "ESSAY") {
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
            setSaveNotice({
                type: "success",
                title: isNewLesson ? "Lesson created" : "Lesson saved",
                message: isNewLesson
                    ? "The lesson was created successfully."
                    : "All lesson changes were saved successfully.",
            });
            if (isFlashcard) {
                showToast(
                    isNewLesson
                        ? "Flashcard lesson created."
                        : "Lesson saved.",
                    "success",
                );
            } else {
                showToast(
                    isNewLesson
                        ? "Lesson created successfully!"
                        : "Update successfully!",
                    "success",
                );
                if (backPath) navigate(backPath);
            }
            if (isNewLesson) setIsNewLesson(false);
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
            saveInProgressRef.current = false;
            setLoading(false);
        }
    };

    /** Lưu Daily Assignment và gắn bài vào đúng lớp khi thao tác từ workspace Trainer. */
    /** Tạo hoặc cập nhật essay assignment, gồm rubric và instruction file. */
    const saveLessonAssignment = async ({ title: nextTitle, description }) => {
        const hasInstructionText = !isEmptyLessonHtml(description);
        const hasInstructionFile = Boolean(
            assignmentFile || existingAssignmentFile?.fileUrl,
        );
        if (!hasInstructionText && !hasInstructionFile) {
            showToast("Instructions text or file is required", "error");
            return false;
        }

        setAssignmentSaving(true);
        try {
            const uploaded = assignmentFile
                ? await assignmentService.uploadFile(assignmentFile)
                : null;
            const payload = {
                title: nextTitle,
                description,
                rubric: assignmentRubric,
                instructionFileUrl:
                    uploaded?.fileUrl || existingAssignmentFile?.fileUrl,
                instructionFileName:
                    uploaded?.fileName ||
                    assignmentFile?.name ||
                    existingAssignmentFile?.fileName,
                ...(classId && { classId }),
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
    const videoEmbedUrl = youtubeEmbedUrl(videoUrl);
    const hasInvalidYoutubeUrl = Boolean(videoUrl.trim()) && !videoEmbedUrl;
    const basicComplete = Boolean(title.trim());
    const descriptionComplete =
        lessonType === "QUIZ" ||
        lessonType === "FLASHCARD" ||
        !isEmptyLessonHtml(sanitizedSummary);
    const materialComplete = (() => {
        if (lessonType === "VIDEO") return Boolean(videoEmbedUrl);
        if (lessonType === "PDF") return Boolean(uploadedFileUrl);
        if (lessonType === "QUIZ") {
            return typeof services?.getQuestions === "function"
                ? quizQuestionCount > 0
                : (parsedQuizContent.questions || []).length > 0;
        }
        return true;
    })();
    const detailsComplete = basicComplete && descriptionComplete;
    const settingsComplete =
        Boolean(status) && Number(durationMinutes || 0) >= 0;
    const editorBusy =
        loading ||
        uploadingPdf ||
        uploadingResources ||
        summaryGenerating ||
        assignmentSaving ||
        quizQuestionsBusy;
    const statusMeta = getLessonStatusMeta(status);
    const statusLabel = statusMeta?.label || status;
    const materialSummary = (() => {
        if (lessonType === "VIDEO") {
            if (!videoUrl.trim()) return "Video is required";
            if (hasInvalidYoutubeUrl) return "Invalid YouTube URL";
            return `${resources.length} supporting resource${resources.length === 1 ? "" : "s"}`;
        }
        if (lessonType === "PDF") {
            return uploadedFileUrl
                ? `${resources.length} supporting resource${resources.length === 1 ? "" : "s"}`
                : "Reading material is required";
        }
        if (lessonType === "QUIZ") {
            const count =
                typeof services?.getQuestions === "function"
                    ? quizQuestionCount
                    : parsedQuizContent.questions.length;
            return `${count} question${count === 1 ? "" : "s"}`;
        }
        if (lessonType === "ESSAY") {
            return assignmentFile || existingAssignmentFile
                ? "Assignment file added"
                : "Assignment file is optional";
        }
        if (lessonType === "FLASHCARD") {
            return "Manage the flashcard set and cards";
        }
        return `${resources.length} supporting resource${resources.length === 1 ? "" : "s"}`;
    })();
    const defaultFlashcardModuleId =
        existingLessonData?.moduleId ||
        existingLessonData?.courseModuleId ||
        existingLessonData?.module?.id ||
        "";
    const lessonMetadataFormId = "sl-cm-lesson-metadata-form";
    const lessonSaveBarVisible = activeTab === "edit";
    const lessonSaveBar = lessonSaveBarVisible ? (
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
                disabled={
                    editorBusy || (!isNewLesson && !hasChanges)
                }
                form={
                    lessonType === "FLASHCARD"
                        ? lessonMetadataFormId
                        : undefined
                }
                leftIcon={<Save size={16} />}
            >
                {assignmentSaving
                    ? "Saving assignment..."
                    : isNewLesson
                      ? "Create lesson"
                      : "Save changes"}
            </Button>
        </div>
    ) : null;

    if (pageLoading)
        return (
            <div className="sl-cm-page" role="status" aria-live="polite">
                <div className="sl-cm-workspace">
                    <div className="sl-cm-skeleton sl-cm-lesson-editor__skeleton-title" />
                    <div className="sl-cm-skeleton sl-cm-lesson-editor__skeleton-subtitle" />
                    <div className="sl-cm-skeleton sl-cm-lesson-editor__skeleton-panel" />
                </div>
            </div>
        );

    return (
        <div
            className={[
                "sl-cm-lesson-editor",
                lessonSaveBarVisible
                    ? "sl-cm-lesson-editor--save-bar-visible"
                    : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div className="sl-cm-lesson-editor__header">
                <div className="sl-cm-lesson-editor__header-copy">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="sl-cm-back"
                        onClick={() => backPath && navigate(backPath)}
                        leftIcon={<ArrowLeft size={16} />}
                    >
                        Back to curriculum
                    </Button>
                    <h1 className="sl-cm-lesson-editor__title">
                        {activeTab === "history"
                            ? "Lesson audit history"
                            : isNewLesson
                              ? "Create lesson"
                              : "Edit lesson"}
                    </h1>
                    {activeTab === "edit" && lessonType === "ESSAY" && (
                        <Select
                            className="sl-cm-lesson-editor__type-selector"
                            label="Lesson type"
                            value={lessonType}
                            onChange={(event) =>
                                handleLessonTypeChange(event.target.value)
                            }
                        >
                            {Object.entries(LESSON_TYPE_LABELS).map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ),
                            )}
                        </Select>
                    )}
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
                <Alert
                    id="lesson-save-notice"
                    className="sl-cm-lesson-editor__notice"
                    tone={
                        saveNotice.type === "error"
                            ? "danger"
                            : saveNotice.type === "success"
                              ? "success"
                              : "info"
                    }
                    title={saveNotice.title}
                    icon={
                        saveNotice.type === "saving" ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : undefined
                    }
                    dismissLabel="Dismiss save notification"
                    onDismiss={
                        saveNotice.type === "saving"
                            ? undefined
                            : () => setSaveNotice(null)
                    }
                >
                    {saveNotice.message}
                </Alert>
            )}

            {activeTab === "edit" ? (
                lessonType === "FLASHCARD" && features.flashcard ? (
                    <FlashcardLessonAuthoring
                        lessonMetadataFormId={lessonMetadataFormId}
                        handleSave={handleSave}
                        lessonType={lessonType}
                        lessonTypeOptions={Object.entries(LESSON_TYPE_LABELS)}
                        onLessonTypeChange={handleLessonTypeChange}
                        durationMinutes={durationMinutes}
                        isPreview={isPreview}
                        setIsPreview={setIsPreview}
                        title={title}
                        setTitle={setTitle}
                        setTitleError={setTitleError}
                        markChanged={markChanged}
                        titleError={titleError}
                        updateDurationMinutes={updateDurationMinutes}
                        status={status}
                        setStatus={setStatus}
                        courseId={courseId}
                        lessonId={lessonId}
                        initialFlashcardSetId={initialFlashcardSetId}
                        flashcardSetReady={
                            Boolean(lessonId) &&
                            (persistedLessonType === "FLASHCARD" ||
                                Boolean(initialFlashcardSetId))
                        }
                        defaultFlashcardModuleId={defaultFlashcardModuleId}
                        showToast={showToast}
                        services={services}
                        features={features}
                        lessonSaveBar={lessonSaveBar}
                    />
                ) : (
                    <form
                        onSubmit={handleSave}
                        className={`sl-cm-lesson-editor__accordion-form ${
                            lessonType === "ESSAY"
                                ? "sl-cm-lesson-editor__assignment-form"
                                : ""
                        }`}
                        noValidate
                    >
                        {lessonType !== "ESSAY" ? (
                            <div className="sl-video-lesson-form">
                                <section className="sl-video-lesson-form__section">
                                    <div className="sl-video-lesson-form__info-grid">
                                        <Input
                                            id="lesson-title-input"
                                            className="sl-video-lesson-form__field"
                                            label="Title"
                                            required
                                            type="text"
                                            value={title}
                                            error={titleError}
                                            onChange={(event) => {
                                                setTitle(event.target.value);
                                                setTitleError("");
                                                markChanged();
                                            }}
                                        />

                                        <Select
                                            id="lesson-type-input"
                                            className="sl-video-lesson-form__field"
                                            label="Type"
                                            value={lessonType}
                                            onChange={(event) =>
                                                handleLessonTypeChange(
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            {Object.entries(
                                                LESSON_TYPE_LABELS,
                                            ).map(([value, label]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    <LessonSettingsFields
                                        idPrefix="lesson"
                                        status={status}
                                        durationMinutes={durationMinutes}
                                        isPreview={isPreview}
                                        showDuration={false}
                                        onStatusChange={(nextStatus) => {
                                            setStatus(nextStatus);
                                            markChanged();
                                        }}
                                        onDurationChange={updateDurationMinutes}
                                        onPreviewChange={(nextIsPreview) => {
                                            setIsPreview(nextIsPreview);
                                            markChanged();
                                        }}
                                    />
                                </section>

                                {lessonType === "PDF" && (
                                    <section className="sl-video-lesson-form__section">
                                        <div className="sl-video-lesson-form__section-heading">
                                            <div>
                                                <h2>Document</h2>
                                                <p className="sl-video-lesson-form__section-description">
                                                    Upload the primary PDF, DOC,
                                                    or DOCX reading material.
                                                </p>
                                            </div>
                                        </div>
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
                                    </section>
                                )}

                                {lessonType === "QUIZ" &&
                                    features.quizManager && (
                                        <section className="sl-video-lesson-form__section sl-video-lesson-form__section--questions">
                                            <QuizQuestionsPanel
                                                lessonId={lessonId}
                                                courseId={courseId}
                                                lessonTitle={title}
                                                service={services}
                                                disabled={loading}
                                                onBusyChange={
                                                    setQuizQuestionsBusy
                                                }
                                                onQuestionsChange={
                                                    setQuizQuestionCount
                                                }
                                                onSaved={(
                                                    nextContent,
                                                    savedLesson,
                                                ) => {
                                                    setTextContent(nextContent);
                                                    setExistingLessonData(
                                                        (current) => ({
                                                            ...current,
                                                            ...savedLesson,
                                                            content:
                                                                nextContent,
                                                        }),
                                                    );
                                                }}
                                            />
                                        </section>
                                    )}

                                {lessonType === "VIDEO" && (
                                    <section className="sl-video-lesson-form__section">
                                        <div className="sl-video-lesson-form__section-heading">
                                            <div>
                                                <h2>Video source</h2>
                                            </div>
                                        </div>
                                        <Input
                                            id="lesson-youtube-url"
                                            className="sl-video-lesson-form__field"
                                            label="YouTube URL"
                                            required
                                            type="url"
                                            inputMode="url"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            value={videoUrl}
                                            helperText="Use a public YouTube video with captions enabled."
                                            error={
                                                videoSummaryError ||
                                                (hasInvalidYoutubeUrl
                                                    ? "Enter an HTTPS URL in youtube.com/watch?v=... or youtu.be/... format."
                                                    : "")
                                            }
                                            onChange={(event) => {
                                                const nextVideoUrl =
                                                    event.target.value;
                                                if (
                                                    getYoutubeVideoId(
                                                        nextVideoUrl,
                                                    ) !==
                                                    getYoutubeVideoId(videoUrl)
                                                ) {
                                                    setDurationMinutes("");
                                                }
                                                setExactDurationSeconds(null);
                                                setVideoUrl(nextVideoUrl);
                                                setVideoSummaryError("");
                                                setSummaryGenerated(false);
                                                markChanged();
                                            }}
                                        />

                                        {videoEmbedUrl ? (
                                            <div className="sl-video-lesson-form__preview">
                                                <iframe
                                                    src={videoEmbedUrl}
                                                    title="YouTube video preview"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                    referrerPolicy="strict-origin-when-cross-origin"
                                                    allowFullScreen
                                                />
                                            </div>
                                        ) : null}
                                    </section>
                                )}

                                {["VIDEO", "PDF", "RICH_TEXT"].includes(
                                    lessonType,
                                ) && (
                                    <section className="sl-video-lesson-form__section">
                                        <div className="sl-video-lesson-form__details-heading">
                                            <div>
                                                <h2>
                                                    Description{" "}
                                                    <span
                                                        className="required"
                                                        aria-hidden="true"
                                                    >
                                                        *
                                                    </span>
                                                </h2>
                                            </div>
                                            {lessonType === "VIDEO" && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    leftIcon={
                                                        summaryGenerating ? (
                                                            <Loader2
                                                                size={16}
                                                                className="animate-spin"
                                                            />
                                                        ) : (
                                                            <Sparkles
                                                                size={16}
                                                            />
                                                        )
                                                    }
                                                    disabled={summaryGenerating}
                                                    onClick={
                                                        handleGenerateSummary
                                                    }
                                                >
                                                    {summaryGenerating
                                                        ? "Getting transcript and generating summary..."
                                                        : "Generate summary"}
                                                </Button>
                                            )}
                                        </div>
                                        {lessonType === "VIDEO" &&
                                            summaryGenerated && (
                                                <p
                                                    className="sl-video-lesson-form__ai-note"
                                                    role="status"
                                                >
                                                    AI-generated - review before
                                                    saving.
                                                </p>
                                            )}
                                        <RichTextEditor
                                            value={summary}
                                            onChange={handleSummaryChange}
                                            placeholder={
                                                lessonType === "VIDEO"
                                                    ? "Write the lesson description or generate it from the YouTube transcript..."
                                                    : "Describe what learners will study in this lesson..."
                                            }
                                            minHeight={260}
                                            imageUploader={uploadSummaryImage}
                                        />
                                        {summaryError && (
                                            <p
                                                className="sl-cm-lesson-editor__field-help sl-cm-lesson-editor__field-help--error"
                                                role="alert"
                                            >
                                                {summaryError}
                                            </p>
                                        )}
                                    </section>
                                )}

                                {["VIDEO", "PDF", "RICH_TEXT"].includes(
                                    lessonType,
                                ) && (
                                    <LessonResourceUploader
                                        resources={resources}
                                        onResourcesChange={(nextResources) => {
                                            setResources(nextResources);
                                            markChanged();
                                        }}
                                        showToast={showToast}
                                        onBusyChange={setUploadingResources}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="sl-cm-lesson-editor__steps">
                                <LessonEditorSection
                                    id="lesson-step-basic"
                                    step="1"
                                    title="Title and description"
                                    description="Add the lesson title and explain what learners will study."
                                    summary={
                                        detailsComplete
                                            ? "Title and description added"
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
                                    expanded
                                >
                                    <div className="sl-cm-lesson-editor__basic-form">
                                        <Input
                                            id="lesson-title-input"
                                            className="sl-cm-lesson-editor__basic-title"
                                            label="Title"
                                            required
                                            type="text"
                                            value={title}
                                            error={titleError}
                                            onChange={(event) => {
                                                setTitle(event.target.value);
                                                markChanged();
                                                if (event.target.value.trim()) {
                                                    setTitleError("");
                                                }
                                            }}
                                        />
                                        <div className="sl-cm-lesson-editor__description-field">
                                            <div>
                                                <label className="sl-cm-lesson-editor__field-label">
                                                    Description{" "}
                                                    <span className="required">
                                                        *
                                                    </span>
                                                </label>
                                                <RichTextEditor
                                                    value={summary}
                                                    onChange={
                                                        handleSummaryChange
                                                    }
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
                                        </div>
                                    </div>
                                </LessonEditorSection>

                                <LessonEditorSection
                                    id="lesson-step-material"
                                    step="2"
                                    title="Material and resources"
                                    description="Add the lesson material and supporting resources."
                                    summary={materialSummary}
                                    state={
                                        assignmentLoading
                                            ? "processing"
                                            : materialComplete
                                              ? "complete"
                                              : "incomplete"
                                    }
                                    stateLabel={
                                        assignmentLoading
                                            ? "Processing"
                                            : materialComplete
                                              ? "Complete"
                                              : "Items missing"
                                    }
                                    expanded
                                >
                                    <div className="sl-cm-lesson-editor__material-layout">
                                        <div className="sl-cm-lesson-editor__panel-body">
                                            <div className="sl-cm-lesson-editor__essay-card">
                                                {assignmentLoading ? (
                                                    <LoadingState
                                                        compact
                                                        label="Loading essay content..."
                                                    />
                                                ) : (
                                                    <>
                                                        <div className="sl-cm-lesson-editor__assignment-file-field">
                                                            <span className="sl-cm-lesson-editor__assignment-file-label">
                                                                Assignment File{" "}
                                                                <span className="required">
                                                                    *
                                                                </span>
                                                            </span>
                                                            {assignmentFile ||
                                                            existingAssignmentFile ? (
                                                                <div className="sl-cm-lesson-editor__assignment-file-selected">
                                                                    <div className="sl-cm-lesson-editor__assignment-file-copy">
                                                                        <Paperclip
                                                                            size={
                                                                                16
                                                                            }
                                                                            aria-hidden="true"
                                                                        />
                                                                        <span className="sl-cm-lesson-editor__assignment-file-name">
                                                                            {assignmentFile?.name ||
                                                                                existingAssignmentFile?.fileName}
                                                                        </span>
                                                                    </div>
                                                                    <IconButton
                                                                        icon={
                                                                            <X
                                                                                size={
                                                                                    16
                                                                                }
                                                                            />
                                                                        }
                                                                        label="Remove assignment file"
                                                                        onClick={() => {
                                                                            setAssignmentFile(
                                                                                null,
                                                                            );
                                                                            setExistingAssignmentFile(
                                                                                null,
                                                                            );
                                                                            markChanged();
                                                                        }}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <label className="sl-cm-lesson-editor__assignment-file-dropzone">
                                                                    <Paperclip
                                                                        size={
                                                                            20
                                                                        }
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span>
                                                                        Upload
                                                                        essay
                                                                        assignment
                                                                        file
                                                                    </span>
                                                                    <input
                                                                        type="file"
                                                                        className="sl-cm-lesson-editor__assignment-file-input"
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
                                                        <AssignmentAiDraftPanel
                                                            mode="essay"
                                                            currentTitle={title}
                                                            currentDescription={
                                                                summary
                                                            }
                                                            compact
                                                            onDraftGenerated={({
                                                                rubric,
                                                            }) => {
                                                                setAssignmentRubric(
                                                                    rubric,
                                                                );
                                                                markChanged();
                                                            }}
                                                        />
                                                        <Textarea
                                                            className="sl-cm-lesson-editor__rubric-field"
                                                            textareaClassName="sl-cm-lesson-editor__rubric-control"
                                                            label="Assignment rubric"
                                                            value={
                                                                assignmentRubric
                                                            }
                                                            rows={6}
                                                            placeholder="Grading criteria generated by AI or entered by the trainer."
                                                            onChange={(
                                                                event,
                                                            ) => {
                                                                setAssignmentRubric(
                                                                    event.target
                                                                        .value,
                                                                );
                                                                markChanged();
                                                            }}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </LessonEditorSection>

                                <LessonEditorSection
                                    id="lesson-step-settings"
                                    step="3"
                                    title="Lesson settings"
                                    description="Configure status and preview access. This assignment remains available until the course ends."
                                    summary={`${statusLabel} \u00B7 Available until course end \u00B7 Preview ${isPreview ? "enabled" : "disabled"}`}
                                    state={
                                        settingsComplete
                                            ? "complete"
                                            : "incomplete"
                                    }
                                    stateLabel={
                                        settingsComplete
                                            ? "Complete"
                                            : "Incomplete"
                                    }
                                    expanded
                                >
                                    <LessonSettingsFields
                                        idPrefix="lesson-essay"
                                        status={status}
                                        durationMinutes={durationMinutes}
                                        isPreview={isPreview}
                                        showDuration={false}
                                        onStatusChange={(nextStatus) => {
                                            setStatus(nextStatus);
                                            markChanged();
                                        }}
                                        onDurationChange={updateDurationMinutes}
                                        onPreviewChange={(nextIsPreview) => {
                                            setIsPreview(nextIsPreview);
                                            markChanged();
                                        }}
                                    />
                                </LessonEditorSection>
                            </div>
                        )}

                        {lessonSaveBar}
                    </form>
                )
            ) : (
                <LessonAuditHistory
                    historyLoading={historyLoading}
                    editHistory={editHistory}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalElements={totalElements}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            )}

            <ConfirmDialog
                open={summaryReplaceConfirmationOpen}
                title="Replace lesson description?"
                description="Generating a new summary will replace the current lesson description."
                confirmLabel="Generate and replace"
                cancelLabel="Keep current description"
                tone="primary"
                loading={summaryGenerating}
                onClose={() => setSummaryReplaceConfirmationOpen(false)}
                onConfirm={() => {
                    setSummaryReplaceConfirmationOpen(false);
                    void generateVideoSummary(videoUrl.trim());
                }}
            />

            <ConfirmDialog
                open={Boolean(pendingLessonType)}
                title="Change lesson type?"
                confirmLabel="Change type"
                cancelLabel="Cancel"
                tone="danger"
                onClose={() => setPendingLessonType(null)}
                onConfirm={handleConfirmLessonTypeChange}
            >
                <p className="sl-cm-lesson-editor__type-change-warning">
                    Everything related to this lesson type will be deleted.
                </p>
            </ConfirmDialog>
        </div>
    );
}

export default LessonDetailEditor;
