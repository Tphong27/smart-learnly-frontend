import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { courseContentService } from "../../services/courseContentService";
import { assignmentService } from "@/features/assignment";
import { videoAiService } from "../../services/videoAiService";
import { Button, useToast } from "@/shared/components/ui";
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
  LESSON_STATUS_OPTIONS,
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
  CheckCircle2,
  AlertCircle,
  CirclePlay,
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
  const [expandedSection, setExpandedSection] = useState("basic");
  const [hasChanges, setHasChanges] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);

  const markChanged = useCallback(() => {
    setHasChanges(true);
    setSaveNotice(null);
  }, []);

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

  const getErrorMessage = useCallback((error, fallbackMessage) => {
    const validationDetails = error?.errors
      ?.map(({ field, message }) => `${field}: ${message}`)
      .join(", ");
    return validationDetails || error?.message || fallbackMessage;
  }, []);

  useEffect(() => {
    const fetchLessonDetail = async () => {
      try {
        setPageLoading(true);
        setSummaryGenerating(false);
        const response = await services.getLessonDetail(lessonId);
        const lessonData = response?.data || response;

        if (lessonData) {
          setExistingLessonData(lessonData);

          setTitle(lessonData.title || "");
          setSummary(sanitizeLessonHtml(lessonData.content || ""));
          setTextContent(lessonData.content || "");

          setVideoUrl(lessonData.videoUrl || "");
          setSummaryGenerated(false);
          setUploadedFileUrl(
            lessonData.attachmentUrl || lessonData.fileUrl || "",
          );

          setIsPreview(
            Boolean(lessonData.isPreview ?? lessonData.isPreviewable),
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

          const typeFromServer = String(
            lessonData.lessonType || lessonData.type || "VIDEO",
          ).toUpperCase();

          let normalizedLessonType;
          if (typeFromServer === "PDF" || typeFromServer === "DOCUMENT") {
            normalizedLessonType = "PDF";
          } else if (typeFromServer === "QUIZ") {
            normalizedLessonType = "QUIZ";
          } else if (typeFromServer === "FLASHCARD") {
            normalizedLessonType = "FLASHCARD";
          } else if (
            typeFromServer === "RICH_TEXT" ||
            typeFromServer === "TEXT"
          ) {
            normalizedLessonType = "RICH_TEXT";
          } else if (
            typeFromServer === "ESSAY" ||
            typeFromServer === "ASSIGNMENT"
          ) {
            normalizedLessonType = "ESSAY";
          } else {
            normalizedLessonType = "VIDEO";
          }
          setLessonType(normalizedLessonType);
          setPersistedLessonType(normalizedLessonType);

          const loadedResources =
            lessonData.resources || lessonData.attachments || [];
          setResources(Array.isArray(loadedResources) ? loadedResources : []);
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
        const loaded = await assignmentService.getByLesson(lessonId, classId);
        if (cancelled) return;
        setAssignment(loaded);
        setAssignmentRubric(loaded?.rubric || "");
        setExistingAssignmentFile(
          loaded?.instructionFileUrl
            ? {
                fileUrl: loaded.instructionFileUrl,
                fileName:
                  loaded.instructionFileName ||
                  getFileNameFromUrl(loaded.instructionFileUrl) ||
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

  const uploadSummaryImage = useCallback(
    async (file) => {
      const validationError = validateSummaryImage(file);

      if (validationError) {
        showToast(validationError, "error");
        return null;
      }

      try {
        const uploadedImage = await courseContentService.uploadSummaryImage(file);
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
    },
    [getErrorMessage, showToast],
  );

  const uploadSummaryVideo = useCallback(
    async (file) => {
      const validationError = validateSummaryVideo(file);

      if (validationError) {
        showToast(validationError, "error");
        return null;
      }

      try {
        const uploadedVideo = await courseContentService.uploadSummaryVideo(file);
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
    },
    [getErrorMessage, showToast],
  );

  const handleSummaryChange = useCallback(
    (value) => {
      setSummary(value);
      setSummaryError("");
      setSummaryGenerated(false);
      markChanged();
    },
    [markChanged],
  );

  const escapeSummaryText = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const summaryToHtml = (value) => {
    const paragraphs = Array.isArray(value?.overviewParagraphs)
      ? value.overviewParagraphs.filter(
          (paragraph) => typeof paragraph === "string" && paragraph.trim(),
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

  const handleGenerateSummary = async () => {
    const requestedUrl = videoUrl.trim();
    if (!getYoutubeVideoId(requestedUrl)) {
      setVideoSummaryError(
        "Enter a valid HTTPS YouTube URL (youtube.com/watch?v= or youtu.be).",
      );
      return;
    }

    if (
      !isEmptyLessonHtml(summary) &&
      !window.confirm(
        "Generating a new summary will replace the current lesson description. Continue?",
      )
    ) {
      return;
    }

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
          : result.durationMinutes == null || result.durationMinutes === ""
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
    if (saveInProgressRef.current || quizQuestionsBusy) return;

    setSaveNotice(null);

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

    const isQuiz = lessonType === "QUIZ";
    const isFlashcard = lessonType === "FLASHCARD";
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
      openSection("basic");
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
      openSection("material");
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
        const latestResponse = await services.getLessonDetail(lessonId);
        latestQuizLesson = latestResponse?.data || latestResponse;
        latestQuizQuestions = parseQuizContent(
          latestQuizLesson?.content || "",
        ).questions;

        if (latestQuizQuestions.length === 0) {
          showSaveNotice({
            type: "error",
            title: "Lesson could not be saved",
            message:
              "Add at least one quiz question in step 2, then try again.",
          });
          openSection("material");
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
        ? serializeQuizContent(title.trim(), latestQuizQuestions)
        : cleanSummary;
      const durationSeconds =
        durationMinutes === ""
          ? null
          : lessonType === "ESSAY"
            ? 0
            : exactDurationSeconds ??
              Math.round(Number(durationMinutes || 0) * 60);

      const payload = isFlashcard
        ? {
            title: title.trim(),
            lessonType,
            durationSeconds,
            isPreview,
            status: normalizeLessonStatus(status),
            sortOrder:
              latestQuizLesson?.sortOrder ??
              existingLessonData?.sortOrder ??
              0,
          }
        : {
            title: title.trim(),
            lessonType,
            content,
            videoUrl: lessonType === "VIDEO" ? resolvedVideoUrl : null,
            attachmentUrl: lessonType === "PDF" ? uploadedFileUrl : null,
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
      const savedLesson = savedLessonResponse?.data || savedLessonResponse;
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
            message: "Review the assignment information and try again.",
          });
          return;
        }
      }

      setHasChanges(false);
      setSaveNotice({
        type: "success",
        title: "Lesson saved",
        message: "All lesson changes were saved successfully.",
      });
      if (isFlashcard) {
        showToast("Lesson metadata saved.", "success");
      } else {
        showToast("Update successfully!", "success");
        if (backPath) navigate(backPath);
      }
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
  const saveLessonAssignment = async ({ title: nextTitle, description }) => {
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
        isFlashtest: false,
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
      showToast(getErrorMessage(error, "Could not save assignment"), "error");
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
      return (parsedQuizContent.questions || []).length > 0;
    }
    return true;
  })();
  const detailsComplete = basicComplete && descriptionComplete;
  const settingsComplete = Boolean(status) && Number(durationMinutes || 0) >= 0;
  const totalSections = lessonType === "FLASHCARD" ? 2 : 3;
  const completedSections =
    lessonType === "FLASHCARD"
      ? [basicComplete, true].filter(Boolean).length
      : [detailsComplete, materialComplete, settingsComplete].filter(Boolean)
          .length;
  const completionPercent = Math.round(
    (completedSections / totalSections) * 100,
  );
  const editorBusy =
    loading ||
    uploadingPdf ||
    uploadingResources ||
    summaryGenerating ||
    assignmentSaving ||
    quizQuestionsBusy;
  const typeLabel = LESSON_TYPE_LABELS[lessonType] || lessonType;
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
      const count = parsedQuizContent.questions.length;
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
      <span className="sl-cm-lesson-editor__sticky-state" aria-live="polite">
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
        disabled={editorBusy || !hasChanges}
        form={lessonType === "FLASHCARD" ? lessonMetadataFormId : undefined}
        leftIcon={<Save size={16} />}
      >
        {assignmentSaving ? "Saving assignment..." : "Save changes"}
      </Button>
    </div>
  ) : null;

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
    <div
      className={[
        "sl-cm-lesson-editor",
        lessonSaveBarVisible ? "sl-cm-lesson-editor--save-bar-visible" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="sl-cm-lesson-editor__header">
        <div className="sl-cm-lesson-editor__header-copy">
          <button
            type="button"
            className="sl-cm-back"
            onClick={() => backPath && navigate(backPath)}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to curriculum
          </button>
          <h1 className="sl-cm-lesson-editor__title">
            {activeTab === "history" ? "Lesson audit history" : "Edit lesson"}
          </h1>
          {activeTab === "edit" && (
            <label className="sl-cm-lesson-editor__type-selector">
              <span>Lesson type</span>
              <select
                value={lessonType}
                onChange={(event) => {
                  setLessonType(event.target.value);
                  setExpandedSection("basic");
                  markChanged();
                }}
              >
                {Object.entries(LESSON_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
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
              setActiveTab(activeTab === "history" ? "edit" : "history");
            }}
          >
            {activeTab === "history" ? "Back to editor" : "Audit history"}
          </Button>
        )}
      </div>

      {activeTab === "edit" && saveNotice && (
        <div
          id="lesson-save-notice"
          className={`sl-cm-lesson-editor__notice sl-cm-lesson-editor__notice--${saveNotice.type}`}
          role={saveNotice.type === "error" ? "alert" : "status"}
          aria-live={saveNotice.type === "error" ? "assertive" : "polite"}
        >
          <span className="sl-cm-lesson-editor__notice-icon" aria-hidden="true">
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

      {activeTab === "edit" && lessonType !== "ESSAY" && (
        <section
          className="sl-cm-lesson-editor__progress"
          aria-label="Lesson completion"
        >
          <div className="sl-cm-lesson-editor__progress-copy">
            <div>
              <strong>Lesson completion</strong>
              <span>
                {completedSections} of {totalSections} required sections
                completed
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
          <p className="sl-cm-lesson-editor__save-state" aria-live="polite">
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
          <FlashcardLessonAuthoring
            lessonMetadataFormId={lessonMetadataFormId}
            handleSave={handleSave}
            typeLabel={typeLabel}
            statusLabel={statusLabel}
            durationMinutes={durationMinutes}
            isPreview={isPreview}
            setIsPreview={setIsPreview}
            basicComplete={basicComplete}
            settingsComplete={settingsComplete}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            title={title}
            setTitle={setTitle}
            setTitleError={setTitleError}
            markChanged={markChanged}
            titleError={titleError}
            updateDurationMinutes={updateDurationMinutes}
            status={status}
            setStatus={setStatus}
            openSection={openSection}
            courseId={courseId}
            lessonId={lessonId}
            initialFlashcardSetId={initialFlashcardSetId}
            flashcardSetReady={persistedLessonType === "FLASHCARD"}
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
            {lessonType === "VIDEO" ? (
              <div className="sl-video-lesson-form">
                <section className="sl-video-lesson-form__section">
                  <div className="sl-video-lesson-form__section-heading">
                    <h2>Video title</h2>
                  </div>

                  <div className="sl-video-lesson-form__info-grid">
                    <div className="sl-video-lesson-form__field">
                      <label
                        className="sl-cm-lesson-editor__field-label"
                        htmlFor="lesson-title-input"
                      >
                        Title <span className="required">*</span>
                      </label>
                      <input
                        id="lesson-title-input"
                        type="text"
                        value={title}
                        onChange={(event) => {
                          setTitle(event.target.value);
                          setTitleError("");
                          markChanged();
                        }}
                        className="sl-cm-lesson-editor__field-control"
                        aria-invalid={titleError ? "true" : undefined}
                        aria-describedby={
                          titleError ? "lesson-title-error" : undefined
                        }
                      />
                      {titleError && (
                        <p
                          id="lesson-title-error"
                          className="sl-cm-lesson-editor__field-help sl-cm-lesson-editor__field-help--error"
                          role="alert"
                        >
                          {titleError}
                        </p>
                      )}
                    </div>

                    <div className="sl-video-lesson-form__field">
                      <label
                        className="sl-cm-lesson-editor__field-label"
                        htmlFor="lesson-video-duration"
                      >
                        Estimated duration
                      </label>
                      <div className="sl-cm-lesson-editor__input-unit">
                        <input
                          id="lesson-video-duration"
                          type="number"
                          min="0"
                          inputMode="numeric"
                          aria-describedby="lesson-video-duration-unit"
                          value={durationMinutes}
                          onChange={(event) => {
                            updateDurationMinutes(event.target.value);
                          }}
                          className="sl-cm-lesson-editor__field-control"
                        />
                        <span id="lesson-video-duration-unit">minutes</span>
                      </div>
                    </div>

                  </div>

                  <div className="sl-video-lesson-form__settings-row">
                    <fieldset className="sl-video-lesson-form__status-field">
                      <legend className="sl-cm-lesson-editor__field-label">
                        Status
                      </legend>
                      <div className="sl-video-lesson-form__status-options">
                        {LESSON_STATUS_OPTIONS.map((option) => (
                          <label
                            key={option.value}
                            className="sl-video-lesson-form__status-option"
                          >
                            <input
                              type="radio"
                              name="lesson-video-status"
                              value={option.value}
                              checked={status === option.value}
                              onChange={(event) => {
                                setStatus(event.target.value);
                                markChanged();
                              }}
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <label className="sl-cm-lesson-editor__preview-setting sl-video-lesson-form__preview-setting">
                      <span className="sl-cm-lesson-editor__preview-copy">
                        <strong>Preview lesson</strong>
                        <small>
                          Let learners view this lesson before enrolling.
                        </small>
                      </span>
                      <span className="sl-cm-lesson-editor__switch">
                        <input
                          type="checkbox"
                          checked={isPreview}
                          onChange={(event) => {
                            setIsPreview(event.target.checked);
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
                </section>

                <section className="sl-video-lesson-form__section">
                  <div className="sl-video-lesson-form__section-heading">
                    <div>
                      <h2>Video source</h2>
                    </div>
                  </div>
                  <div className="sl-video-lesson-form__field">
                    <label
                      className="sl-cm-lesson-editor__field-label"
                      htmlFor="lesson-youtube-url"
                    >
                      YouTube URL <span className="required">*</span>
                    </label>
                    <input
                      id="lesson-youtube-url"
                      type="url"
                      inputMode="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(event) => {
                        const nextVideoUrl = event.target.value;
                        if (
                          getYoutubeVideoId(nextVideoUrl) !==
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
                      className="sl-cm-lesson-editor__field-control"
                      aria-describedby={[
                        "lesson-youtube-help",
                        videoSummaryError ? "lesson-youtube-error" : "",
                        hasInvalidYoutubeUrl
                          ? "lesson-youtube-format-error"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-invalid={
                        videoSummaryError || hasInvalidYoutubeUrl
                          ? "true"
                          : undefined
                      }
                    />
                    <p
                      id="lesson-youtube-help"
                      className="sl-cm-lesson-editor__field-help"
                    >
                      Use a public YouTube video with captions enabled.
                    </p>
                    {videoSummaryError && (
                      <p
                        id="lesson-youtube-error"
                        className="sl-cm-lesson-editor__field-help sl-cm-lesson-editor__field-help--error"
                        role="alert"
                      >
                        {videoSummaryError}
                      </p>
                    )}
                  </div>

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
                  ) : hasInvalidYoutubeUrl ? (
                    <div
                      id="lesson-youtube-format-error"
                      className="sl-video-lesson-form__url-error"
                      role="alert"
                    >
                      <AlertCircle size={19} aria-hidden="true" />
                      <div>
                        <strong>Invalid YouTube URL</strong>
                        <p>
                          Enter an HTTPS URL in youtube.com/watch?v=... or
                          youtu.be/... format.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="sl-video-lesson-form__preview-empty">
                      <CirclePlay size={32} aria-hidden="true" />
                      <span>
                        Paste a valid YouTube URL to preview the video.
                      </span>
                    </div>
                  )}
                </section>

                <section className="sl-video-lesson-form__section">
                  <div className="sl-video-lesson-form__details-heading">
                    <div>
                      <span>Lesson details</span>
                      <h2>Description</h2>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      leftIcon={
                        summaryGenerating ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Sparkles size={16} />
                        )
                      }
                      disabled={summaryGenerating}
                      onClick={handleGenerateSummary}
                    >
                      {summaryGenerating
                        ? "Getting transcript and generating summary..."
                        : "Generate summary"}
                    </Button>
                  </div>
                  {summaryGenerated && (
                    <p className="sl-video-lesson-form__ai-note" role="status">
                      AI-generated - review before saving.
                    </p>
                  )}
                  <RichTextEditor
                    value={summary}
                    onChange={handleSummaryChange}
                    placeholder="Write the lesson description or generate it from the YouTube transcript..."
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
              </div>
            ) : (
              <div className="sl-cm-lesson-editor__steps">
                <LessonEditorSection
                  id="lesson-step-basic"
                  step="1"
                  title={
                    lessonType === "QUIZ" ? "Title" : "Title and description"
                  }
                  description={
                    lessonType === "QUIZ"
                      ? "Add the title learners will see for this quiz."
                      : "Add the lesson title and explain what learners will study."
                  }
                  summary={
                    lessonType === "QUIZ"
                      ? detailsComplete
                        ? "Lesson title added"
                        : "Lesson title is required"
                      : detailsComplete
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
                  expanded={
                    lessonType === "ESSAY" || expandedSection === "basic"
                  }
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
                        Title <span className="required">*</span>
                      </label>
                      <input
                        id="lesson-title-input"
                        type="text"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          markChanged();
                          if (e.target.value.trim()) setTitleError("");
                        }}
                        className="sl-cm-lesson-editor__field-control"
                        aria-invalid={titleError ? "true" : undefined}
                        aria-describedby={
                          titleError ? "lesson-title-error" : undefined
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
                    {lessonType !== "QUIZ" && (
                      <div className="sl-cm-lesson-editor__description-field">
                        <div>
                          <label className="sl-cm-lesson-editor__field-label">
                            Description <span className="required">*</span>
                          </label>
                          <RichTextEditor
                            value={summary}
                            onChange={handleSummaryChange}
                            placeholder="Describe what learners will study..."
                            minHeight={220}
                            imageUploader={uploadSummaryImage}
                            videoUploader={uploadSummaryVideo}
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
                    )}
                  </div>

                  <div className="sl-lesson-step__footer">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openSection("material")}
                    >
                      Next: Material & resources
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
                    uploadingPdf || uploadingResources || assignmentLoading
                      ? "processing"
                      : materialComplete
                        ? "complete"
                        : "incomplete"
                  }
                  stateLabel={
                    uploadingPdf || uploadingResources || assignmentLoading
                      ? "Processing"
                      : materialComplete
                        ? "Complete"
                        : "Items missing"
                  }
                  expanded={
                    lessonType === "ESSAY" || expandedSection === "material"
                  }
                  onToggle={() =>
                    setExpandedSection((current) =>
                      current === "material" ? "" : "material",
                    )
                  }
                >
                  <div className="sl-cm-lesson-editor__material-layout">
                    {lessonType !== "QUIZ" && lessonType !== "ESSAY" && (
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

                    <div className="sl-cm-lesson-editor__panel-body">
                      {lessonType === "PDF" && (
                        <PdfMaterialUploader
                          attachmentUrl={uploadedFileUrl}
                          onAttachmentUrlChange={(nextUrl) => {
                            setUploadedFileUrl(nextUrl);
                            markChanged();
                          }}
                          showToast={showToast}
                          onBusyChange={setUploadingPdf}
                        />
                      )}
                      {lessonType === "QUIZ" && features.quizManager && (
                        <QuizQuestionsPanel
                          lessonId={lessonId}
                          courseId={courseId}
                          lessonTitle={title}
                          service={services}
                          disabled={loading}
                          onBusyChange={setQuizQuestionsBusy}
                          onSaved={(nextContent, savedLesson) => {
                            setTextContent(nextContent);
                            setExistingLessonData((current) => ({
                              ...current,
                              ...savedLesson,
                              content: nextContent,
                            }));
                          }}
                        />
                      )}
                      {lessonType === "ESSAY" && (
                        <div className="sl-cm-lesson-editor__essay-card">
                          {assignmentLoading ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                color: "#64748b",
                              }}
                            >
                              <Loader2 className="animate-spin" size={18} />
                              <span>Loading essay content...</span>
                            </div>
                          ) : (
                            <>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  flex: "1 1 auto",
                                  minHeight: 0,
                                }}
                              >
                                <span
                                  style={{
                                    display: "block",
                                    marginBottom: "8px",
                                    fontWeight: 600,
                                    color: "#1e293b",
                                    fontSize: "14px",
                                  }}
                                >
                                  Assignment File
                                </span>
                                {assignmentFile || existingAssignmentFile ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: "12px",
                                      width: "100%",
                                      flex: "1 1 auto",
                                      boxSizing: "border-box",
                                      minWidth: 0,
                                      padding: "12px 14px",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "10px",
                                      background: "#f8fafc",
                                      minHeight: "84px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        color: "#334155",
                                        flex: "1 1 auto",
                                        minWidth: 0,
                                      }}
                                    >
                                      <Paperclip size={16} />
                                      <span
                                        style={{
                                          display: "block",
                                          flex: "1 1 auto",
                                          minWidth: 0,
                                          maxWidth: "100%",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
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
                                        setAssignmentFile(null);
                                        setExistingAssignmentFile(null);
                                        markChanged();
                                      }}
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        cursor: "pointer",
                                        color: "#64748b",
                                      }}
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <label
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "12px",
                                      width: "100%",
                                      minHeight: "240px",
                                      flex: "1 1 auto",
                                      boxSizing: "border-box",
                                      padding: "18px",
                                      border: "1px dashed #94a3b8",
                                      borderRadius: "12px",
                                      cursor: "pointer",
                                      color: "#475569",
                                      background: "#fff",
                                    }}
                                  >
                                    <Paperclip size={20} />
                                    <span>Upload essay assignment file</span>
                                    <input
                                      type="file"
                                      hidden
                                      accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                                      onChange={(event) => {
                                        setAssignmentFile(
                                          event.target.files?.[0] || null,
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
                                currentDescription={summary}
                                compact
                                onDraftGenerated={({ rubric }) => {
                                  setAssignmentRubric(rubric);
                                  markChanged();
                                }}
                              />
                              <label className="sl-cm-lesson-editor__rubric-field">
                                <span className="sl-cm-lesson-editor__field-label">
                                  Assignment rubric
                                </span>
                                <textarea
                                  className="sl-cm-lesson-editor__field-control sl-cm-lesson-editor__rubric-control"
                                  value={assignmentRubric}
                                  rows={6}
                                  placeholder="Grading criteria generated by AI or entered by the trainer."
                                  onChange={(event) => {
                                    setAssignmentRubric(event.target.value);
                                    markChanged();
                                  }}
                                />
                              </label>
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
                  description={
                    lessonType === "ESSAY"
                      ? "Configure status and preview access. This assignment remains available until the course ends."
                      : "Configure status, duration, and preview access."
                  }
                  summary={
                    lessonType === "ESSAY"
                      ? `${statusLabel} \u00B7 Available until course end \u00B7 Preview ${isPreview ? "enabled" : "disabled"}`
                      : `${statusLabel} \u00B7 ${durationMinutes ? `${durationMinutes} min` : "No duration"} \u00B7 Preview ${isPreview ? "enabled" : "disabled"}`
                  }
                  state={settingsComplete ? "complete" : "incomplete"}
                  stateLabel={settingsComplete ? "Complete" : "Incomplete"}
                  expanded={
                    lessonType === "ESSAY" || expandedSection === "settings"
                  }
                  onToggle={() =>
                    setExpandedSection((current) =>
                      current === "settings" ? "" : "settings",
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
                        {LESSON_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {lessonType !== "ESSAY" && (
                      <div className="sl-cm-lesson-editor__settings-field">
                        <div>
                          <label
                            className="sl-cm-lesson-editor__field-label"
                            htmlFor="lesson-duration-input"
                          >
                            Estimated duration
                          </label>
                          <p>Used to estimate the learner's course duration.</p>
                        </div>
                        <div className="sl-cm-lesson-editor__input-unit">
                          <input
                            id="lesson-duration-input"
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={durationMinutes}
                            onChange={(event) => {
                              updateDurationMinutes(event.target.value);
                            }}
                            className="sl-cm-lesson-editor__field-control"
                          />
                          <span aria-hidden="true">minutes</span>
                        </div>
                      </div>
                    )}

                    <label className="sl-cm-lesson-editor__preview-setting sl-cm-lesson-editor__preview-setting--settings">
                      <span className="sl-cm-lesson-editor__preview-copy">
                        <strong>Preview lesson</strong>
                        <small id="lesson-preview-help">
                          Let learners view this lesson before enrolling.
                        </small>
                      </span>
                      <span className="sl-cm-lesson-editor__switch">
                        <input
                          type="checkbox"
                          checked={isPreview}
                          aria-describedby="lesson-preview-help"
                          onChange={(event) => {
                            setIsPreview(event.target.checked);
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
    </div>
  );
}

export default LessonDetailEditor;
