import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseService } from "@/services/course.service";
import { useToast } from "@/shared/components/ui/Toast/useToast";
import { ArrowLeft, Save } from "lucide-react";

export default function AdminLessonDetailPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [lessonType, setLessonType] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // States 100% synchronized with Java DTO fields
  const [videoUrl, setVideoUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState(""); // Matches attachmentUrl in Java
  const [isPreviewable, setIsPreviewable] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [lessonStatus, setLessonStatus] = useState("PUBLISHED");

  // Populate form with existing data from server on load
  useEffect(() => {
    const fetchLessonDetail = async () => {
      try {
        setPageLoading(true);
        const response = await courseService.getLessonDetail(lessonId);
        const lessonData = response?.data || response;

        if (lessonData) {
          setTitle(lessonData.title || "");

          // Normalize type from Java to lowercase for Select Option
          const type = lessonData.type?.toLowerCase() || "pdf";
          setLessonType(type === "rich_text" ? "rich_text" : type);

          setIsPreviewable(lessonData.preview || false);
          setVideoUrl(lessonData.videoUrl || "");
          setTextContent(lessonData.content || "");
          setAttachmentUrl(lessonData.attachmentUrl || "");
          setDurationSeconds(lessonData.durationSeconds || 0);
          setLessonStatus(lessonData.status || "PUBLISHED");
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

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🛠️ SYNC PAYLOAD: Exactly matches the LessonRequest structure in Java
      const payload = {
        title: title.trim(),
        lessonType:
          lessonType === "rich_text" ? "RICH_TEXT" : lessonType.toUpperCase(), // Matches: VIDEO, PDF, RICH_TEXT
        videoUrl: lessonType === "video" ? videoUrl.trim() : "",
        content: lessonType === "rich_text" ? textContent.trim() : "",
        attachmentUrl: lessonType === "pdf" ? attachmentUrl.trim() : "", // Maps correctly to attachmentUrl
        durationSeconds: Number(durationSeconds),
        isPreview: isPreviewable, // Maps to the Boolean isPreview() variable of the Java Record/DTO
        status: lessonStatus,
      };

      // Send pure JSON Object to PUT endpoint
      await courseService.updateLesson(lessonId, payload);

      showToast("Lesson content updated successfully!", "success");
      navigate(`/admin/courses/${courseId}/content`);
    } catch (error) {
      console.error("Detailed error:", error);
      let errorText = "Error connecting to Backend Server";
      if (error?.response?.data) {
        errorText =
          error.response.data.message || JSON.stringify(error.response.data);
      }
      showToast(errorText, "error");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div
        style={{
          padding: "40px",
          fontWeight: "bold",
          color: "#64748b",
          textAlign: "center",
        }}
      >
        Loading lesson data from the system...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "850px",
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
          marginBottom: "28px",
          color: "#0f172a",
          fontSize: "26px",
          fontWeight: "700",
        }}
      >
        Lesson Content Configuration
      </h1>

      <form
        onSubmit={handleSave}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          backgroundColor: "#fff",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        {/* Lesson Title */}
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
            Lesson Title <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "15px",
              boxSizing: "border-box",
            }}
            required
          />
        </div>

        {/* Lesson Type - Matches Java Backend Enum */}
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
            Lesson Type
          </label>
          <select
            value={lessonType}
            onChange={(e) => setLessonType(e.target.value)}
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#fff",
              fontSize: "15px",
              boxSizing: "border-box",
            }}
          >
            <option value="video">📹 Video Lecture (VIDEO)</option>
            <option value="pdf">📄 Document Attachment (PDF)</option>
            <option value="rich_text">📝 Rich Text Content (RICH_TEXT)</option>
          </select>
        </div>

        {/* Dynamic Form Rendering Based on Type */}
        {lessonType === "video" && (
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
              Video Lecture URL
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Enter the lesson video URL..."
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {lessonType === "pdf" && (
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
              Document File URL (Attachment)
            </label>
            <input
              type="text"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="Enter the link to the study material (.pdf, .docx)..."
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {lessonType === "rich_text" && (
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
              Detailed Content
            </label>
            <textarea
              rows={8}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter the text content for the lesson here..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                fontFamily: "inherit",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>
        )}

        {/* Preview Configuration */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="checkbox"
            id="isPreview"
            checked={isPreviewable}
            onChange={(e) => setIsPreviewable(e.target.checked)}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          <label
            htmlFor="isPreview"
            style={{
              fontSize: "14px",
              color: "#334155",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Allow free preview (Preview)
          </label>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "12px",
            borderTop: "1px solid #f1f5f9",
            paddingTop: "18px",
          }}
        >
          <button
            type="submit"
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "11px 24px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            <Save size={16} /> {loading ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/courses/${courseId}/content`)}
            style={{
              backgroundColor: "#fff",
              border: "1px solid #cbd5e1",
              padding: "11px 24px",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#475569",
              fontWeight: "500",
              fontSize: "14px",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
