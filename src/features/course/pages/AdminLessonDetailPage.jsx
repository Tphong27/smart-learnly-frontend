import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseService } from "@/services/course.service";
import { useToast } from "@/shared/components/ui/Toast/useToast";


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

  // Active Tab state: 'edit' or 'history'
  const [activeTab, setActiveTab] = useState("edit");

  // Basic lesson info state
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [textContent, setTextContent] = useState("");
  const [lessonType, setLessonType] = useState("VIDEO");

  const [videoUrl, setVideoUrl] = useState("");
  const [mainContentFile, setMainContentFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [resources, setResources] = useState([]);
  const [uploadingMainFile, setUploadingMainFile] = useState(false);
  const [uploadingResources, setUploadingResources] = useState(false);

  // Audit Logs State
  const [editHistory, setEditHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

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

  // Format Instant from Spring Boot
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

  // Fetch initial lesson details
  useEffect(() => {
    const fetchLessonDetail = async () => {
      try {
        setPageLoading(true);
        const response = await courseService.getLessonDetail(lessonId);
        const lessonData = response?.data || response;

        if (lessonData) {
          setTitle(lessonData.title || "");
          setTextContent(lessonData.content || "");
          setVideoUrl(lessonData.videoUrl || "");

          const typeFromServer = String(
            lessonData.lessonType || lessonData.type || "",
          ).toUpperCase();

          if (typeFromServer === "PDF" || typeFromServer === "DOCUMENT") {
            setLessonType("DOCUMENT");
            setUploadedFileUrl(
              lessonData.attachmentUrl || lessonData.fileUrl || "",
            );
          } else {
            setLessonType("VIDEO");
          }

          const loadedResources =
            lessonData.resources || lessonData.attachments || [];
          if (Array.isArray(loadedResources)) {
            setResources(loadedResources);
          }
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

  // Fetch Audit Logs with Pagination
  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        setHistoryLoading(true);
        // Note: Make sure courseService.getLessonAuditLogs accepts pagination params
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

        // Extract pagination info based on your console log format
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
    setUploadingMainFile(true);
    setMainContentFile(file);
    try {
      const uploadedFile = await courseService.uploadLessonMaterial(file);
      setUploadedFileUrl(uploadedFile.url);
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

  const handleSave = async (e) => {
    e.preventDefault();
    const contentToSave =
      textContent === "<p><br></p>" ? "" : textContent.trim();
    if (loading || uploadingMainFile || uploadingResources) return;
    setLoading(true);

    try {
      const normalizedResources = resources.map((resource, index) => {
        const resourceUrl =
          typeof resource === "string" ? resource : resource.url;
        return {
          url: resourceUrl,
          objectPath:
            typeof resource === "string" ? null : resource.objectPath || null,
          name:
            typeof resource === "string"
              ? getFileNameFromUrl(resource)
              : resource.name || resource.fileName || null,
          fileName:
            typeof resource === "string"
              ? getFileNameFromUrl(resource)
              : resource.fileName || resource.name || null,
          fileSize:
            typeof resource === "string" ? null : (resource.fileSize ?? null),
          contentType:
            typeof resource === "string" ? null : resource.contentType || null,
          sortOrder: index,
        };
      });

      const payload = {
        title: title.trim(),
        lessonType: lessonType === "VIDEO" ? "VIDEO" : "PDF",
        type: lessonType === "VIDEO" ? "VIDEO" : "PDF",
        videoUrl: lessonType === "VIDEO" ? videoUrl.trim() : "",
        content: contentToSave,
        attachmentUrl: lessonType === "DOCUMENT" ? uploadedFileUrl : "",
        resources: normalizedResources,
        durationSeconds: 0,
        isPreview: false,
        status: "PUBLISHED",
      };

      await courseService.updateLesson(lessonId, payload);
      showToast("Lesson updated successfully!", "success");
      navigate(`/admin/courses/${courseId}/content`);
    } catch (error) {
      console.error(error);
      showToast(
        getErrorMessage(error, "Error connecting to backend server"),
        "error",
      );
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

      {/* TABS HEADER */}
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

      {/* CONTENT BY TAB */}
      {activeTab === "edit" ? (
        <form onSubmit={handleSave}>
          <div style={{ display: "flex", gap: "40px" }}>
            {/* LEFT COLUMN */}
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
                    <option value="VIDEO">📹 Video</option>
                    <option value="DOCUMENT">📄 Document</option>
                  </select>
                </div>
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
                  Summary <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  value={textContent}
                  onChange={(event) => setTextContent(event.target.value)}
                  placeholder="Enter summary here..."
                  rows={10}
                  style={{
                    width: "100%",
                    minHeight: "250px",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    fontSize: "15px",
                    lineHeight: 1.6,
                    boxSizing: "border-box",
                    backgroundColor: "#fff",
                  }}
                />
              </div>

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
                  <p style={{ margin: 0, fontSize: "14px", color: "#475569" }}>
                    {uploadingResources ? (
                      "Uploading resource files..."
                    ) : (
                      <>
                        <span style={{ color: "#2563eb", fontWeight: 600 }}>
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
                        <span style={{ color: "#334155", fontWeight: "500" }}>
                          {file instanceof File
                            ? file.name
                            : typeof file === "string"
                              ? getFileNameFromUrl(file)
                              : file.name || file.fileName || "Document"}
                        </span>
                        <X
                          size={14}
                          color="#ef4444"
                          style={{ cursor: "pointer" }}
                          onClick={() => removeResource(index)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
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
                <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>
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
                      <span style={{ fontWeight: "600" }}>Video URL</span>
                    </div>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="Enter video link..."
                      style={{
                        width: "100%",
                        padding: "11px 16px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}
                {lessonType === "DOCUMENT" && (
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
                        <p style={{ margin: 0, color: "#2563eb" }}>
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
                          <span style={{ color: "#2563eb", fontWeight: 700 }}>
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
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                    />
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
        /* AUDIT HISTORY TAB */
        <div
          style={{
            backgroundColor: "#fff",
            padding: "28px",
            borderRadius: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h3
            style={{ margin: "0 0 20px 0", fontSize: "18px", color: "#1e293b" }}
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
              style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}
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
                      <th style={{ padding: "12px 16px", fontWeight: "600" }}>
                        Timestamp
                      </th>
                      <th style={{ padding: "12px 16px", fontWeight: "600" }}>
                        Actor (Email)
                      </th>
                      <th style={{ padding: "12px 16px", fontWeight: "600" }}>
                        Role
                      </th>
                      <th style={{ padding: "12px 16px", fontWeight: "600" }}>
                        Action / Summary
                      </th>
                      <th style={{ padding: "12px 16px", fontWeight: "600" }}>
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
                        <td style={{ padding: "16px", color: "#64748b" }}>
                          {formatDateTime(log.occurredAt)}
                        </td>
                        <td style={{ padding: "16px", fontWeight: "500" }}>
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
                        <td style={{ padding: "16px", fontWeight: "500" }}>
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

              {/* PAGINATION CONTROLS */}
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
                  <div style={{ fontSize: "14px", color: "#64748b" }}>
                    Showing{" "}
                    <span style={{ fontWeight: 600, color: "#334155" }}>
                      {currentPage * pageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span style={{ fontWeight: 600, color: "#334155" }}>
                      {Math.min((currentPage + 1) * pageSize, totalElements)}
                    </span>{" "}
                    of{" "}
                    <span style={{ fontWeight: 600, color: "#334155" }}>
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
