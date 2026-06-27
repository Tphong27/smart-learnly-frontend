import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseService } from "@/services/course.service";
import { useToast } from "@/shared/components/ui/Toast/useToast";
import RichTextEditor from "@/shared/components/rich-text/RichTextEditor";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRef } from "react";

export default function AdminLessonDetailPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { showToast: emitToast } = useToast();
  const showToast = useCallback(
    (message, type) => emitToast({ message, type }),
    [emitToast],
  );

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
  const [uploadingMainFile, setUploadingMainFile] = useState(false);
  const [uploadingResources, setUploadingResources] = useState(false);

  const [editHistory, setEditHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [summary, setSummary] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [status, setStatus] = useState("DRAFT");
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
            Boolean(lessonData.isPreview ?? lessonData.isPreviewable),
          );
          setStatus(String(lessonData.status || "DRAFT").toUpperCase());
          setDurationSeconds(Number(lessonData.durationSeconds || 0));

          const typeFromServer = String(
            lessonData.lessonType || lessonData.type || "VIDEO",
          ).toUpperCase();

          if (typeFromServer === "PDF" || typeFromServer === "DOCUMENT") {
            setLessonType("PDF");
          } else if (typeFromServer === "QUIZ") {
            setLessonType("QUIZ");
          } else {
            setLessonType("VIDEO");
          }

          const loadedResources =
            lessonData.resources || lessonData.attachments || [];
          setResources(Array.isArray(loadedResources) ? loadedResources : []);
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
          "Only PDF, DOC or DOCX files are supported for reading material",
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
      const uploadedFile = await courseService.uploadLessonMaterial(file);
      setUploadedFileUrl(uploadedFile.url);
      if (lessonType === "VIDEO") {
        setVideoUrl(uploadedFile.url);
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
        selectedFiles.map((file) => courseService.uploadLessonResource(file)),
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
    const cleanSummary = sanitizeLessonHtml(summary);

    if (!isQuiz && isEmptyLessonHtml(cleanSummary)) {
      showToast("Lesson Summary Blank", "error");
      return;
    }

    setLoading(true);

    try {
      const normalizedResources = isQuiz
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
        : cleanSummary;

      const payload = {
        title: title.trim(),
        lessonType,
        content,
        videoUrl: lessonType === "VIDEO" ? videoUrl.trim() : null,
        attachmentUrl: lessonType === "PDF" ? uploadedFileUrl : null,
        durationSeconds: Number(durationSeconds || 0),
        isPreview,
        status,
        resources: normalizedResources,
        sortOrder: existingLessonData?.sortOrder ?? 0,
      };

      await courseService.updateLesson(lessonId, payload);

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
            color: activeTab === "history" ? "#2563eb" : "#64748b",
            borderBottom:
              activeTab === "history"
                ? "2px solid #2563eb"
                : "2px solid transparent",
            transition: "all 0.2s",
          }}
        >
          <History size={18} /> Audit History
        </button>
      </div>

      {activeTab === "edit" ? (
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
              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: "2" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#1e293b",
                      fontSize: "14px",
                    }}
                  >
                    Title <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
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
                <div style={{ flex: "1" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#1e293b",
                      fontSize: "14px",
                    }}
                  >
                    Lesson Type <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value)}
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
                    <option value="VIDEO">Video Lecture</option>
                    <option value="PDF">Document / Reading</option>
                    <option value="QUIZ">Quiz</option>
                  </select>
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
                    value={parseQuizContent(textContent).title}
                    onChange={(e) => {
                      const parsed = parseQuizContent(textContent);
                      setTextContent(
                        serializeQuizContent(e.target.value, parsed.questions),
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
                    Manage quiz questions from the course content page using the
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
                    Summary <span style={{ color: "#ef4444" }}>*</span>
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

              {lessonType !== "QUIZ" && (
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
                    !uploadingResources && resourceInputRef.current?.click()
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
                    cursor: uploadingResources ? "wait" : "pointer",
                    color: "#64748b",
                  }}
                >
                  <CloudUpload size={24} color="#64748b" />
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
                    {resources.map((file, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          backgroundColor: "#f1f5f9",
                          borderRadius: "6px",
                          fontSize: "13px",
                        }}
                      >
                        <span
                          style={{
                            color: "#334155",
                            fontWeight: "500",
                          }}
                        >
                          {file instanceof File
                            ? file.name
                            : typeof file === "string"
                              ? getFileNameFromUrl(file)
                              : file.name || file.fileName || "Document"}
                        </span>
                        <X
                          size={14}
                          color="#ef4444"
                          style={{
                            cursor: "pointer",
                          }}
                          onClick={() => removeResource(index)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>

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
                        gap: "8px",
                        marginBottom: "16px",
                        color: "#2563eb",
                      }}
                    >
                      <Video size={24} />
                      <span style={{ fontWeight: "600" }}>Upload Video</span>
                    </div>
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDropMainFile}
                      onClick={() =>
                        !uploadingMainFile && mainFileInputRef.current?.click()
                      }
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "16px",
                        height: "200px",
                        borderRadius: "12px",
                        border:
                          mainContentFile || uploadedFileUrl || videoUrl
                            ? "2px solid #10b981"
                            : "2px dashed #cbd5e1",
                        backgroundColor:
                          mainContentFile || uploadedFileUrl || videoUrl
                            ? "#f0fdf4"
                            : "#fff",
                        cursor: uploadingMainFile ? "wait" : "pointer",
                        textAlign: "center",
                        padding: "20px",
                      }}
                    >
                      {uploadingMainFile ? (
                        <>
                          <CloudUpload size={36} color="#2563eb" />
                          <p
                            style={{
                              margin: 0,
                              color: "#2563eb",
                            }}
                          >
                            Uploading...
                          </p>
                        </>
                      ) : mainContentFile || uploadedFileUrl || videoUrl ? (
                        <>
                          <Video size={36} color="#10b981" />
                          <p
                            style={{
                              margin: 0,
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#065f46",
                            }}
                          >
                            {mainContentFile
                              ? mainContentFile.name
                              : getFileNameFromUrl(uploadedFileUrl || videoUrl)}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "#059669",
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
                              backgroundColor: "#e2e8f0",
                              borderRadius: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <FileText size={24} color="#64748b" />
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "14px",
                              fontWeight: "600",
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
                              margin: 0,
                              fontSize: "12px",
                              color: "#64748b",
                            }}
                          >
                            Supports MP4, WebM, MOV
                          </p>
                        </>
                      )}
                      <input
                        type="file"
                        ref={mainFileInputRef}
                        onChange={handleMainFileSelect}
                        disabled={uploadingMainFile}
                        style={{ display: "none" }}
                        accept=".mp4,.webm,.mov,.avi,.mkv"
                      />
                    </div>
                    {videoUrl && (
                      <div style={{ marginTop: 12 }}>
                        <label
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          Or paste video URL
                        </label>
                        <input
                          type="url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://..."
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13px",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {lessonType === "PDF" && (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDropMainFile}
                    onClick={() =>
                      !uploadingMainFile && mainFileInputRef.current?.click()
                    }
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "16px",
                      height: "300px",
                      borderRadius: "16px",
                      border:
                        mainContentFile || uploadedFileUrl
                          ? "2px solid #10b981"
                          : "2px dashed #cbd5e1",
                      backgroundColor:
                        mainContentFile || uploadedFileUrl ? "#f0fdf4" : "#fff",
                      cursor: uploadingMainFile ? "wait" : "pointer",
                      textAlign: "center",
                      padding: "40px",
                    }}
                  >
                    {uploadingMainFile ? (
                      <>
                        <CloudUpload size={48} color="#2563eb" />
                        <p
                          style={{
                            margin: 0,
                            color: "#2563eb",
                          }}
                        >
                          Uploading...
                        </p>
                      </>
                    ) : mainContentFile || uploadedFileUrl ? (
                      <>
                        <FileIcon size={48} color="#10b981" />
                        <p
                          style={{
                            margin: 0,
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#065f46",
                          }}
                        >
                          {mainContentFile
                            ? mainContentFile.name
                            : getFileNameFromUrl(uploadedFileUrl)}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "13px",
                            color: "#059669",
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
                            backgroundColor: "#e2e8f0",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FileText size={24} color="#64748b" />
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "16px",
                            fontWeight: "600",
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
                      </>
                    )}
                    <input
                      type="file"
                      ref={mainFileInputRef}
                      onChange={handleMainFileSelect}
                      disabled={uploadingMainFile}
                      style={{ display: "none" }}
                      accept=".pdf,.doc,.docx"
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
                      Quiz content is edited in the left panel. Add questions
                      and options using the Quiz Editor.
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
                  disabled={loading || uploadingMainFile || uploadingResources}
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
                  <Save size={18} /> {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/courses/${courseId}/content`)}
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
                        borderBottom: "2px solid #edf2f7",
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
                          borderBottom: "1px solid #edf2f7",
                          color: "#334155",
                        }}
                      >
                        <td
                          style={{
                            padding: "16px",
                            color: "#64748b",
                          }}
                        >
                          {formatDateTime(log.occurredAt)}
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
                              backgroundColor: "#f1f5f9",
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
                                log.result === "SUCCESS"
                                  ? "#dcfce7"
                                  : "#fee2e2",
                              color:
                                log.result === "SUCCESS"
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
                      {Math.min((currentPage + 1) * pageSize, totalElements)}
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
                        setCurrentPage((prev) => Math.max(0, prev - 1))
                      }
                      disabled={currentPage === 0}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        backgroundColor: currentPage === 0 ? "#f8fafc" : "#fff",
                        color: currentPage === 0 ? "#94a3b8" : "#334155",
                        cursor: currentPage === 0 ? "not-allowed" : "pointer",
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
                      Page {currentPage + 1} of {totalPages}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(totalPages - 1, prev + 1),
                        )
                      }
                      disabled={
                        currentPage >= totalPages - 1 || totalPages === 0
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        backgroundColor:
                          currentPage >= totalPages - 1 || totalPages === 0
                            ? "#f8fafc"
                            : "#fff",
                        color:
                          currentPage >= totalPages - 1 || totalPages === 0
                            ? "#94a3b8"
                            : "#334155",
                        cursor:
                          currentPage >= totalPages - 1 || totalPages === 0
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
