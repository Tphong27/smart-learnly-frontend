import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import "../pages/AdminCourseContent.css";

const DEFAULT_LESSON_TYPES = [
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF / Document" },
  { value: "rich_text", label: "Rich Text" },
  { value: "quiz", label: "Quiz" },
  { value: "flashcard", label: "Flashcard" },
  { value: "assignment", label: "Assignment" },
  { value: "essay", label: "Essay" },
];

const DEFAULT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "inactive", label: "Inactive" },
];

function normalizeResource(resource) {
  return {
    id: resource?.id || null,
    url: resource?.url || "",
    objectPath: resource?.objectPath || null,
    name: resource?.name || resource?.fileName || "",
    fileName: resource?.fileName || resource?.name || "",
    fileSize: Number(resource?.fileSize || 0),
    contentType: resource?.contentType || null,
    sortOrder: Number(resource?.sortOrder || 0),
  };
}

function toFormState(lesson) {
  return {
    title: lesson?.title || "",
    lessonType: lesson?.lessonType || lesson?.type || "video",
    status: lesson?.status || "draft",
    videoUrl: lesson?.videoUrl || "",
    content: lesson?.content || "",
    attachmentUrl: lesson?.attachmentUrl || "",
    durationSeconds: Number(lesson?.durationSeconds || 0),
    isPreview: Boolean(lesson?.isPreview),
    sortOrder: Number(lesson?.sortOrder || 0),
    resources: Array.isArray(lesson?.resources)
      ? lesson.resources.map(normalizeResource)
      : [],
  };
}

export function CurriculumLessonEditorModal(props) {
  if (!props.open) return null;
  return <CurriculumLessonEditorModalInner {...props} />;
}

function CurriculumLessonEditorModalInner({
  lesson,
  title = "Edit lesson",
  lessonTypeOptions = DEFAULT_LESSON_TYPES,
  statusOptions = DEFAULT_STATUSES,
  submitting = false,
  onSubmit,
  onClose,
}) {
  const [form, setForm] = useState(() => toFormState(lesson));

  const hasVideo = useMemo(
    () => ["video"].includes(String(form.lessonType).toLowerCase()),
    [form.lessonType],
  );

  const hasAttachment = useMemo(
    () =>
      ["pdf", "document", "assignment"].includes(
        String(form.lessonType).toLowerCase(),
      ),
    [form.lessonType],
  );

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateResource = (index, key, value) => {
    setForm((prev) => {
      const nextResources = [...prev.resources];
      nextResources[index] = { ...nextResources[index], [key]: value };
      if (key === "name") nextResources[index].fileName = value;
      return { ...prev, resources: nextResources };
    });
  };

  const addResource = () => {
    setForm((prev) => ({
      ...prev,
      resources: [
        ...prev.resources,
        normalizeResource({ sortOrder: prev.resources.length }),
      ],
    }));
  };

  const removeResource = (index) => {
    setForm((prev) => {
      const nextResources = prev.resources.filter((_, i) => i !== index);
      return {
        ...prev,
        resources: nextResources.map((resource, i) => ({
          ...resource,
          sortOrder: i,
        })),
      };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;

    const cleanedResources = form.resources
      .filter((resource) => (resource.url || "").trim())
      .map((resource, index) => ({
        ...resource,
        url: resource.url.trim(),
        name: (resource.name || resource.fileName || "Resource").trim(),
        fileName: (resource.fileName || resource.name || "Resource").trim(),
        sortOrder: index,
      }));

    onSubmit?.({
      ...form,
      title: form.title.trim(),
      videoUrl: form.videoUrl?.trim() || null,
      content: form.content || "",
      attachmentUrl: form.attachmentUrl?.trim() || null,
      durationSeconds: Number(form.durationSeconds || 0),
      resources: cleanedResources,
      // Provide both keys for backend compatibility
      type: form.lessonType,
    });
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{ maxWidth: 720, maxHeight: "90vh", overflow: "auto" }}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>
                Lesson Title <span style={{ color: "#ba1a1a" }}>*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="e.g., 1.1. ReactJS Overview"
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div className="form-group">
                <label>Lesson Type</label>
                <select
                  value={form.lessonType}
                  onChange={(e) => updateField("lessonType", e.target.value)}
                >
                  {lessonTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hasVideo && (
              <div className="form-group">
                <label>Video URL</label>
                <input
                  type="text"
                  value={form.videoUrl}
                  onChange={(e) => updateField("videoUrl", e.target.value)}
                  placeholder="https://... or HLS manifest URL"
                />
              </div>
            )}

            {hasAttachment && (
              <div className="form-group">
                <label>Attachment URL</label>
                <input
                  type="text"
                  value={form.attachmentUrl}
                  onChange={(e) =>
                    updateField("attachmentUrl", e.target.value)
                  }
                  placeholder="https://... link to PDF or document"
                />
              </div>
            )}

            <div className="form-group">
              <label>Content</label>
              <textarea
                value={form.content}
                onChange={(e) => updateField("content", e.target.value)}
                rows={6}
                placeholder="Lesson description, rich text, or inline quiz JSON"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #c3c6d7",
                  borderRadius: 8,
                  fontFamily: "inherit",
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div className="form-group">
                <label>Duration (seconds)</label>
                <input
                  type="number"
                  min={0}
                  value={form.durationSeconds}
                  onChange={(e) =>
                    updateField("durationSeconds", e.target.value)
                  }
                />
              </div>
              <div
                className="form-group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 26,
                }}
              >
                <input
                  id="previewToggle"
                  type="checkbox"
                  checked={form.isPreview}
                  onChange={(e) => updateField("isPreview", e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="previewToggle" style={{ margin: 0 }}>
                  Allow preview
                </label>
              </div>
            </div>

            <div className="form-group">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <label style={{ margin: 0 }}>Resources</label>
                <button
                  type="button"
                  onClick={addResource}
                  className="btn-outline"
                >
                  <Plus size={14} style={{ verticalAlign: "middle" }} /> Add
                  resource
                </button>
              </div>

              {form.resources.length === 0 ? (
                <p
                  style={{
                    color: "#737686",
                    fontSize: 13,
                    marginTop: 8,
                  }}
                >
                  No resources attached yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {form.resources.map((resource, index) => (
                    <div
                      key={resource.id || `new-${index}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1.6fr auto",
                        gap: 8,
                        alignItems: "center",
                        padding: 10,
                        background: "#faf8ff",
                        border: "1px solid #e1e2ed",
                        borderRadius: 8,
                      }}
                    >
                      <input
                        type="text"
                        value={resource.name}
                        onChange={(e) =>
                          updateResource(index, "name", e.target.value)
                        }
                        placeholder="Resource name"
                        style={{
                          padding: "8px 10px",
                          border: "1px solid #c3c6d7",
                          borderRadius: 6,
                          fontSize: 13,
                        }}
                      />
                      <input
                        type="text"
                        value={resource.url}
                        onChange={(e) =>
                          updateResource(index, "url", e.target.value)
                        }
                        placeholder="https://..."
                        style={{
                          padding: "8px 10px",
                          border: "1px solid #c3c6d7",
                          borderRadius: 6,
                          fontSize: 13,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeResource(index)}
                        className="icon-btn delete"
                        title="Remove resource"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save lesson"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
