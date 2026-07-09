import { useState, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";
import { getLessonStatusMeta } from "../utils/lesson-status";
import "../pages/AdminCourseContent.css";

const reorderArray = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

function sortByOrder(items) {
  return [...(items || [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
}

const DEFAULT_LESSON_TYPES = [
  { value: "video", label: "Video Lecture" },
  { value: "document", label: "Reading Material (PDF / Word)" },
  { value: "quiz", label: "Quiz" },
  { value: "flashcard", label: "Flashcard" },
];

function LessonIcon({ type }) {
  const t = String(type || "").toLowerCase();
  if (t === "video") {
    return (
      <div className="lesson-icon video">
        <span className="material-symbols-outlined">play_circle</span>
      </div>
    );
  }
  if (["document", "text", "pdf", "rich_text"].includes(t)) {
    return (
      <div className="lesson-icon doc">
        <span className="material-symbols-outlined">description</span>
      </div>
    );
  }
  if (t === "flashcard") {
    return (
      <div className="lesson-icon flashcard">
        <span className="material-symbols-outlined">view_carousel</span>
      </div>
    );
  }
  return (
    <div className="lesson-icon quiz">
      <span className="material-symbols-outlined">quiz</span>
    </div>
  );
}

function LessonStatusBadge({ status }) {
  const meta = getLessonStatusMeta(status);
  return (
    <span className={`badge status status-${meta.value}`}>{meta.label}</span>
  );
}

function SectionRow({
  section,
  index,
  lessons,
  loadingLessons,
  readOnly,
  onOpenCreateLesson,
  onEditSection,
  onDeleteSection,
  onEditLesson,
  onDeleteLesson,
  onManageQuestions,
  showManageQuestions,
  lessonEditLabel,
  dragHandleProps,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sortedLessons = useMemo(() => sortByOrder(lessons), [lessons]);

  return (
    <div className="section-item">
      <div className="section-header">
        <div
          className="section-title-wrapper"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          {!readOnly && (
            <span
              {...dragHandleProps}
              className="material-symbols-outlined drag-handle"
              style={{ cursor: "grab" }}
            >
              drag_indicator
            </span>
          )}

          <span
            className="material-symbols-outlined toggle-expand"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              cursor: "pointer",
              userSelect: "none",
              color: "#434655",
              transition: "transform 0.2s ease",
            }}
          >
            {isExpanded ? "expand_more" : "chevron_right"}
          </span>

          <h3
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ cursor: "pointer", userSelect: "none", margin: 0 }}
          >
            Section {index + 1}: {section?.title}
          </h3>
        </div>

        {!readOnly && (
          <div className="section-actions">
            <button
              type="button"
              className="icon-btn"
              title="Edit section"
              onClick={() => onEditSection?.(section)}
            >
              <span className="material-symbols-outlined">edit</span>
            </button>

            <button
              type="button"
              className="icon-btn delete"
              title="Delete section"
              onClick={() => onDeleteSection?.(section.id, section.title)}
            >
              <span className="material-symbols-outlined">delete</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsExpanded(true);
                onOpenCreateLesson?.(section);
              }}
              className="btn-outline"
            >
              + Add Lesson
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <Droppable
          droppableId={`section-${section.id}`}
          type="LESSON"
          isDropDisabled={readOnly}
        >
          {(provided) => (
            <div
              className="lessons-container"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {loadingLessons ? (
                <div
                  style={{
                    padding: "16px 48px",
                    color: "#737686",
                    fontStyle: "italic",
                    fontSize: "14px",
                  }}
                >
                  Loading lessons...
                </div>
              ) : sortedLessons.length > 0 ? (
                sortedLessons.map((lesson, lIndex) => (
                  <Draggable
                    key={lesson?.id || lIndex}
                    draggableId={`lesson-${lesson.id}`}
                    index={lIndex}
                    isDragDisabled={readOnly}
                  >
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className="lesson-item"
                        style={{
                          ...dragProvided.draggableProps.style,
                          background: snapshot.isDragging
                            ? "#e8eaff"
                            : undefined,
                        }}
                      >
                        <div className="lesson-info">
                          {!readOnly && (
                            <span className="material-symbols-outlined drag-handle">
                              drag_indicator
                            </span>
                          )}
                          <LessonIcon type={lesson?.lessonType} />
                          <span className="lesson-title">
                            {index + 1}.{lIndex + 1}. {lesson?.title}
                          </span>
                          <span className="badge type">
                            {lesson?.lessonType || "VIDEO"}
                          </span>
                          <LessonStatusBadge status={lesson?.status} />
                          {lesson?.isPreview && (
                            <span className="badge preview">Preview</span>
                          )}
                        </div>

                        <div className="lesson-actions">
                          <span className="lesson-duration">
                            {lesson?.durationSeconds
                              ? `${Math.floor(lesson.durationSeconds / 60)} mins`
                              : "--"}
                          </span>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() =>
                                lesson?.id && onEditLesson?.(lesson, section)
                              }
                              className="btn-outline"
                            >
                              {lessonEditLabel || "Edit content"}
                            </button>
                          )}
                          {!readOnly &&
                            showManageQuestions &&
                            String(lesson?.lessonType).toUpperCase() ===
                              "QUIZ" && (
                              <button
                                type="button"
                                onClick={() =>
                                  lesson?.id && onManageQuestions?.(lesson)
                                }
                                className="btn-outline"
                              >
                                Manage questions
                              </button>
                            )}
                          {!readOnly && (
                            <button
                              type="button"
                              className="icon-btn delete"
                              title="Delete lesson"
                              onClick={() =>
                                lesson?.id &&
                                onDeleteLesson?.(lesson.id, lesson.title, lesson)
                              }
                            >
                              <span className="material-symbols-outlined">
                                delete
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))
              ) : (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#737686",
                    fontSize: "14px",
                  }}
                >
                  This section has no lessons yet.
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
}

function SectionFormModal({ open, title, initialValue, submitLabel, onSubmit, onClose }) {
  if (!open) return null;
  return (
    <SectionFormModalInner
      title={title}
      initialValue={initialValue}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
}

function SectionFormModalInner({ title, initialValue, submitLabel, onSubmit, onClose }) {
  const [value, setValue] = useState(initialValue || "");

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
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
                Section Name <span style={{ color: "#ba1a1a" }}>*</span>
              </label>
              <input
                type="text"
                required
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="e.g., Section 1: Environment Setup..."
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LessonCreateModal({ open, lessonTypeOptions, onSubmit, onClose }) {
  if (!open) return null;
  return (
    <LessonCreateModalInner
      lessonTypeOptions={lessonTypeOptions}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
}

function LessonCreateModalInner({ lessonTypeOptions, onSubmit, onClose }) {
  const [data, setData] = useState({
    title: "",
    lessonType: lessonTypeOptions?.[0]?.value || "video",
    isPreview: false,
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!data.title.trim()) return;
    onSubmit?.({ ...data, title: data.title.trim() });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add New Lesson</h3>
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
                value={data.title}
                onChange={(event) =>
                  setData((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="e.g., 1.1. ReactJS Overview"
              />
            </div>
            <div className="form-group">
              <label>
                Lesson Type <span style={{ color: "#ba1a1a" }}>*</span>
              </label>
              <select
                value={data.lessonType}
                onChange={(event) =>
                  setData((prev) => ({
                    ...prev,
                    lessonType: event.target.value,
                  }))
                }
              >
                {lessonTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                background: "#f3f3fe",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #c3c6d7",
              }}
            >
              <input
                id="previewMode"
                type="checkbox"
                checked={data.isPreview}
                onChange={(event) =>
                  setData((prev) => ({
                    ...prev,
                    isPreview: event.target.checked,
                  }))
                }
                style={{ width: "16px", height: "16px", marginTop: "2px" }}
              />
              <label
                htmlFor="previewMode"
                style={{ cursor: "pointer", margin: 0 }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#191b23",
                  }}
                >
                  Allow preview
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#434655",
                    marginTop: "4px",
                  }}
                >
                  Students who haven't purchased the course can still view
                  this.
                </div>
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Lesson
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CurriculumStructureEditor({
  sections,
  getLessons,
  isSectionLessonsLoading,
  stats,
  readOnly = false,
  lessonTypeOptions = DEFAULT_LESSON_TYPES,
  emptyMessage = "The course has no content structure yet. Let's create the first section!",
  emptyAddTitle = "Add a new section",
  emptyAddSubtitle = "Build a logical structure to help students follow along easily.",
  showManageQuestions = false,
  lessonEditLabel = "Edit content",
  onCreateSection,
  onUpdateSection,
  onDeleteSection,
  onReorderSections,
  onCreateLesson,
  onDeleteLesson,
  onReorderLessons,
  onEditLesson,
  onManageQuestions,
}) {
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [lessonModalSection, setLessonModalSection] = useState(null);

  const sortedSections = useMemo(() => sortByOrder(sections), [sections]);

  const onDragEnd = async (result) => {
    if (readOnly) return;
    const { destination, source, type } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    if (type === "SECTION") {
      const reordered = reorderArray(
        sortedSections,
        source.index,
        destination.index,
      );
      onReorderSections?.(reordered.map((section) => section.id));
      return;
    }

    if (type === "LESSON") {
      const sourceSectionId = source.droppableId.replace("section-", "");
      const destSectionId = destination.droppableId.replace("section-", "");
      if (sourceSectionId !== destSectionId) return; // cross-section not supported

      const section = sortedSections.find(
        (item) => String(item.id) === sourceSectionId,
      );
      if (!section) return;

      const lessons = sortByOrder(getLessons?.(section) || []);
      const reordered = reorderArray(lessons, source.index, destination.index);
      onReorderLessons?.(
        section.id,
        reordered.map((lesson) => lesson.id),
      );
    }
  };

  const handleCreateSection = async (title) => {
    await onCreateSection?.({ title });
    setIsSectionModalOpen(false);
  };

  const handleUpdateSection = async (title) => {
    if (!editingSection?.id) return;
    await onUpdateSection?.(editingSection.id, { title });
    setEditingSection(null);
  };

  const handleCreateLesson = async (payload) => {
    if (!lessonModalSection?.id) return;
    await onCreateLesson?.(lessonModalSection.id, payload);
    setLessonModalSection(null);
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        {stats && (
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-value">{stats.totalSections ?? 0}</span>
              <span className="stat-label">Sections</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalLessons ?? 0}</span>
              <span className="stat-label">Total Lessons</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalVideos ?? 0}</span>
              <span className="stat-label">Videos</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalDocuments ?? 0}</span>
              <span className="stat-label">Documents</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalQuizzes ?? 0}</span>
              <span className="stat-label">Quizzes</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalFlashcards ?? 0}</span>
              <span className="stat-label">Flashcards</span>
            </div>
          </div>
        )}

        <Droppable
          droppableId="sections"
          type="SECTION"
          isDropDisabled={readOnly}
        >
          {(provided) => (
            <div
              className="workspace-card"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              <div className="sections-list">
                {sortedSections.length > 0 ? (
                  sortedSections.map((section, index) => (
                    <Draggable
                      key={section.id}
                      draggableId={`section-${section.id}`}
                      index={index}
                      isDragDisabled={readOnly}
                    >
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          style={{
                            ...dragProvided.draggableProps.style,
                            marginBottom: 16,
                          }}
                        >
                          <SectionRow
                            section={section}
                            index={index}
                            readOnly={readOnly}
                            lessons={getLessons?.(section) || []}
                            loadingLessons={
                              isSectionLessonsLoading?.(section.id) || false
                            }
                            onOpenCreateLesson={(s) => setLessonModalSection(s)}
                            onEditSection={(s) => setEditingSection(s)}
                            onDeleteSection={onDeleteSection}
                            onEditLesson={onEditLesson}
                            onDeleteLesson={onDeleteLesson}
                            onManageQuestions={onManageQuestions}
                            showManageQuestions={showManageQuestions}
                            lessonEditLabel={lessonEditLabel}
                            dragHandleProps={dragProvided.dragHandleProps}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#737686",
                      padding: "40px",
                    }}
                  >
                    {emptyMessage}
                  </div>
                )}
                {provided.placeholder}
              </div>

              {!readOnly && (
                <div
                  onClick={() => setIsSectionModalOpen(true)}
                  className="empty-add-area"
                >
                  <div className="icon-circle">
                    <span className="material-symbols-outlined">add</span>
                  </div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
                    {emptyAddTitle}
                  </h4>
                  <p style={{ margin: 0, color: "#434655", fontSize: "14px" }}>
                    {emptyAddSubtitle}
                  </p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <SectionFormModal
        open={isSectionModalOpen}
        title="Add New Section"
        submitLabel="Save Section"
        initialValue=""
        onSubmit={handleCreateSection}
        onClose={() => setIsSectionModalOpen(false)}
      />

      <SectionFormModal
        open={Boolean(editingSection)}
        title="Edit Section"
        submitLabel="Update Section"
        initialValue={editingSection?.title || ""}
        onSubmit={handleUpdateSection}
        onClose={() => setEditingSection(null)}
      />

      <LessonCreateModal
        open={Boolean(lessonModalSection)}
        lessonTypeOptions={lessonTypeOptions}
        onSubmit={handleCreateLesson}
        onClose={() => setLessonModalSection(null)}
      />
    </>
  );
}

