import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseService } from "@/services/course.service";
import { useToast } from "@/shared/components/ui/Toast/useToast";
import {
  ArrowLeft,
  Save,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Table,
  Link,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  CloudUpload,
  Video,
  File as FileIcon,
  X,
} from "lucide-react";

export default function AdminLessonDetailPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [textContent, setTextContent] = useState("");
  const [lessonType, setLessonType] = useState("VIDEO");

  const [videoUrl, setVideoUrl] = useState("");
  const [mainContentFile, setMainContentFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [resources, setResources] = useState([]);

  const mainFileInputRef = useRef(null);
  const resourceInputRef = useRef(null);

  const toolbarButtons = [
    { icon: Bold, label: "Bold" },
    { icon: Italic, label: "Italic" },
    { icon: Underline, label: "Underline" },
    { icon: FileText, label: "Bullet List" },
    { icon: ListOrdered, label: "Ordered List" },
    { icon: List, label: "List" },
    { icon: Table, label: "Table" },
    { icon: Link, label: "Link" },
    { icon: ImageIcon, label: "Image" },
    { text: "< / >", label: "Code" },
    { text: "?", label: "Help" },
  ];

  // Helper function: Extract filename from URL
  const getFileNameFromUrl = (url) => {
    if (!url) return "";
    return url.substring(url.lastIndexOf("/") + 1);
  };

  // Fetch lesson data on mount
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

          // 🛠️ FIX 3: Convert to uppercase to compare, check both 'type' and 'lessonType'
          const typeFromServer = String(
            lessonData.lessonType || lessonData.type || "",
          ).toUpperCase();

          if (typeFromServer === "PDF" || typeFromServer === "DOCUMENT") {
            setLessonType("DOCUMENT");
            // Fallback for different backend file URL property names
            setUploadedFileUrl(
              lessonData.attachmentUrl || lessonData.fileUrl || "",
            );
          } else {
            setLessonType("VIDEO");
          }

          // Restore resources if available
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
  }, [lessonId]);

  const handleDragOver = (e) => e.preventDefault();

  const handleDropMainFile = async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setMainContentFile(file);
      await fakeUploadFile(file);
    }
  };

  const handleMainFileSelect = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setMainContentFile(file);
      await fakeUploadFile(file);
    }
  };

  const fakeUploadFile = async (file) => {
    try {
      const mockUrl = `https://smart-learnly-storage.com/files/${file.name}`;
      setUploadedFileUrl(mockUrl);
      showToast(`Successfully uploaded ${file.name}!`, "success");
    } catch (err) {
      showToast("Error uploading file to the system", "error");
    }
  };

  const handleDropResources = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setResources([...resources, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleResourceSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setResources([...resources, ...Array.from(e.target.files)]);
    }
  };

  const removeResource = (indexToRemove) => {
    setResources(resources.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        // Send both keys as fallback depending on Java Entity definitions
        lessonType: lessonType === "VIDEO" ? "VIDEO" : "PDF",
        type: lessonType === "VIDEO" ? "VIDEO" : "PDF",
        videoUrl: lessonType === "VIDEO" ? videoUrl.trim() : "",
        content: textContent.trim(),
        attachmentUrl: lessonType === "DOCUMENT" ? uploadedFileUrl : "",
        // 🛠️ FIX 2: Send resources array to backend
        resources: resources,
        durationSeconds: 0,
        isPreview: false,
        status: "PUBLISHED",
      };

      await courseService.updateLesson(lessonId, payload);

      showToast("Lesson updated successfully!", "success");
      navigate(`/admin/courses/${courseId}/content`);
    } catch (error) {
      console.error("Detailed error:", error);
      let errorText = "Error connecting to the backend server";
      if (error?.response?.data) {
        errorText =
          error.response.data.message || JSON.stringify(error.response.data);
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
          marginBottom: "32px",
          color: "#0f172a",
          fontSize: "28px",
          fontWeight: "700",
        }}
      >
        Update Lesson
      </h1>

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
                  placeholder="e.g., Environment Setup..."
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
              <div
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    backgroundColor: "#f8fafc",
                    padding: "8px 14px",
                    borderBottom: "1px solid #cbd5e1",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    sans-serif
                  </span>
                  <AlertTriangle
                    size={16}
                    color="#ef4444"
                    style={{ cursor: "pointer" }}
                  />
                  <span style={{ margin: "0 4px", color: "#cbd5e1" }}>||</span>
                  {toolbarButtons.map((btn, index) => {
                    const Icon = btn.icon;
                    return (
                      <button
                        key={index}
                        type="button"
                        title={btn.label}
                        style={{
                          background: "none",
                          border: "none",
                          padding: "4px",
                          cursor: "pointer",
                          color: "#475569",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {Icon ? (
                          <Icon size={18} />
                        ) : (
                          <span style={{ fontSize: "14px", fontWeight: 600 }}>
                            {btn.text}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  rows={8}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter summary here..."
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "none",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    resize: "vertical",
                    outline: "none",
                  }}
                  required
                />
              </div>
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
                onClick={() => resourceInputRef.current.click()}
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
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <CloudUpload size={24} color="#64748b" />
                <p style={{ margin: 0, fontSize: "14px", color: "#475569" }}>
                  Drag and drop or{" "}
                  <span style={{ color: "#2563eb", fontWeight: 600 }}>
                    Choose file
                  </span>
                </p>
                <input
                  type="file"
                  multiple
                  ref={resourceInputRef}
                  onChange={handleResourceSelect}
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
                            : file.name || "Document"}
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
                    placeholder="Enter video link (Cloudflare, AWS S3, MP4, YouTube...)"
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
                  onClick={() => mainFileInputRef.current.click()}
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
                    cursor: "pointer",
                    textAlign: "center",
                    padding: "40px",
                  }}
                >
                  {mainContentFile || uploadedFileUrl ? (
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
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          color: "#64748b",
                        }}
                      >
                        PDF, DOCX, PPTX
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    ref={mainFileInputRef}
                    onChange={handleMainFileSelect}
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
    </div>
  );
}
